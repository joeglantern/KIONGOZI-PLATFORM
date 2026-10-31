// Follow / unfollow taps: the button flips at once (Following, or Requested for a private account),
// then this keeps the server in step. One request per person at a time; rapid taps just change the
// wanted state and the loop sends what is still needed. The final state is what the server confirmed.
// Their follower count and my following count change in one place here, so no screen double-counts.
import { create } from 'zustand';
import { useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useProfileStore } from './profileStore';
import { useAuthStore } from './authStore';
import { enqueue, isNetworkError, settleFollow } from '../utils/outbox';
import { toast } from '../utils/alert';

export type FollowStatus = 'none' | 'following' | 'requested';

export interface FollowEntry {
  status: FollowStatus;
  isPrivate: boolean;
  /** their follower count, when a screen shows it */
  followerCount?: number;
  username?: string;
  /** tapped this session: fresh list data no longer overwrites the status */
  touched?: boolean;
}

/** Whatever shape the server gave us for a person (profile, search row, baraza person, follow list row) */
export interface FollowSeed {
  isFollowing?: boolean; is_following?: boolean; following?: boolean;
  followRequestStatus?: string | null; follow_request_status?: string | null;
  is_private?: boolean; isPrivate?: boolean;
  follower_count?: number;
  username?: string;
}

interface FollowSyncState { follows: Record<string, FollowEntry> }

export const useFollowSync = create<FollowSyncState>(() => ({ follows: {} }));

const EMPTY: FollowEntry = { status: 'none', isPrivate: false };
const busy = new Set<string>();
const serverState = new Map<string, FollowStatus>(); // last state the server confirmed, while syncing
const lastLocalChange = new Map<string, number>();   // so my own realtime follow events are not counted twice

const get = (userId: string) => useFollowSync.getState().follows[userId];

export function entryFromSeed(seed: FollowSeed): FollowEntry {
  const requested = (seed.followRequestStatus ?? seed.follow_request_status) === 'pending';
  const on = !!(seed.isFollowing ?? seed.is_following ?? seed.following);
  return {
    status: on ? 'following' : requested ? 'requested' : 'none',
    isPrivate: !!(seed.is_private ?? seed.isPrivate),
    followerCount: typeof seed.follower_count === 'number' ? seed.follower_count : undefined,
    username: seed.username,
  };
}

/** Teach the store what the server says about a person. A status they tapped this session is kept. */
export function seedFollow(userId: string, seed: FollowSeed) {
  if (!userId) return;
  const cur = get(userId);
  const next = entryFromSeed(seed);
  const merged: FollowEntry = cur?.touched
    ? {
        ...cur,
        isPrivate: next.isPrivate || cur.isPrivate,
        username: next.username || cur.username,
        followerCount: !busy.has(userId) && next.followerCount !== undefined ? next.followerCount : cur.followerCount,
      }
    : { ...next, followerCount: next.followerCount ?? cur?.followerCount, username: next.username || cur?.username };
  if (cur && cur.status === merged.status && cur.isPrivate === merged.isPrivate &&
      cur.followerCount === merged.followerCount && cur.username === merged.username) return;
  useFollowSync.setState(s => ({ follows: { ...s.follows, [userId]: merged } }));
}

/** Current follow state of a person, seeded from whatever the screen already knows about them. */
export function useFollowState(userId?: string | null, seed?: FollowSeed | null): FollowEntry {
  const entry = useFollowSync(s => (userId ? s.follows[userId] : undefined));
  const sIsFollowing = seed?.isFollowing ?? seed?.is_following ?? seed?.following;
  const sRequest = seed?.followRequestStatus ?? seed?.follow_request_status;
  const sPrivate = seed?.is_private ?? seed?.isPrivate;
  useEffect(() => {
    if (userId && seed) seedFollow(userId, seed);
  }, [userId, sIsFollowing, sRequest, sPrivate, seed?.follower_count, seed?.username]);
  return entry ?? (seed ? entryFromSeed(seed) : EMPTY);
}

// Write a status (and the count change it implies) to this store and the profile store
function apply(userId: string, status: FollowStatus) {
  const cur = get(userId);
  if (!cur) return;
  const delta = (status === 'following' ? 1 : 0) - (cur.status === 'following' ? 1 : 0);
  if (delta) lastLocalChange.set(userId, Date.now());
  useFollowSync.setState(s => ({
    follows: {
      ...s.follows,
      [userId]: {
        ...cur, status, touched: true,
        followerCount: cur.followerCount === undefined ? undefined : Math.max(0, cur.followerCount + delta),
      },
    },
  }));
  useProfileStore.setState(s => {
    let profiles = s.profiles;
    const key = cur.username && s.profiles[cur.username]?.id === userId
      ? cur.username
      : Object.keys(s.profiles).find(k => s.profiles[k]?.id === userId);
    if (key) {
      const p = s.profiles[key];
      profiles = {
        ...profiles,
        [key]: {
          ...p,
          isFollowing: status === 'following',
          followRequestStatus: status === 'requested' ? 'pending' : null,
          follower_count: Math.max(0, (p.follower_count || 0) + delta),
        },
      };
    }
    let me = s.currentUserProfile;
    if (me && delta) {
      me = { ...me, following_count: Math.max(0, (me.following_count || 0) + delta) };
      if (me.username && profiles[me.username]) profiles = { ...profiles, [me.username]: { ...profiles[me.username], following_count: me.following_count } };
    }
    return { profiles, currentUserProfile: me };
  });
}

/** Flip follow for a person. `seed` lets a screen toggle before the store has seen them. */
export function toggleFollow(userId: string, seed?: FollowSeed | null) {
  if (!userId) return;
  if (!get(userId) && seed) seedFollow(userId, seed);
  const cur = get(userId);
  if (!cur) return;
  const now = cur.status;
  const next: FollowStatus = now === 'none' ? (cur.isPrivate ? 'requested' : 'following') : 'none';
  if (!serverState.has(userId)) serverState.set(userId, now);
  apply(userId, next);
  pump(userId);
}

/** For the outbox: a queued follow/unfollow went through, show what the server made of it. */
export function confirmFollow(userId: string, status: FollowStatus) {
  if (!get(userId) || busy.has(userId)) return;
  apply(userId, status);
}

/**
 * A realtime follow row for this person (someone else followed or unfollowed them).
 * Ignored when it is my own tap echoing back, so the count does not move twice.
 */
export function onRealtimeFollow(userId: string, delta: 1 | -1, followerId?: string) {
  const me = useAuthStore.getState().user?.id;
  if (followerId && me && followerId === me) return;
  const at = lastLocalChange.get(userId);
  if (!followerId && at && Date.now() - at < 8000) return;
  const cur = get(userId);
  if (cur && cur.followerCount !== undefined) {
    useFollowSync.setState(s => ({ follows: { ...s.follows, [userId]: { ...cur, followerCount: Math.max(0, (cur.followerCount || 0) + delta) } } }));
  }
  useProfileStore.setState(s => {
    const key = Object.keys(s.profiles).find(k => s.profiles[k]?.id === userId);
    if (!key) return s;
    const p = s.profiles[key];
    return { profiles: { ...s.profiles, [key]: { ...p, follower_count: Math.max(0, (p.follower_count || 0) + delta) } } };
  });
}

type SendResult = { ok: boolean; status?: FollowStatus; network?: boolean };

async function send(userId: string, wantOn: boolean): Promise<SendResult> {
  if (wantOn) {
    const r: any = await apiClient.followUserNow(userId);
    if (r?.success) return { ok: true, status: r.status === 'requested' ? 'requested' : 'following' };
    const err = r?.error || '';
    if (/already following/i.test(err)) return { ok: true, status: 'following' };
    if (/request already/i.test(err)) return { ok: true, status: 'requested' };
    return { ok: false, network: isNetworkError(r) };
  }
  const r: any = await apiClient.unfollowUserNow(userId);
  if (r?.success) return { ok: true, status: 'none' };
  if (/not following|not found/i.test(r?.error || '')) return { ok: true, status: 'none' };
  return { ok: false, network: isNetworkError(r) };
}

async function pump(userId: string) {
  if (busy.has(userId)) return;
  busy.add(userId);
  try {
    for (let i = 0; i < 5; i++) {
      const cur = get(userId);
      if (!cur) return;
      const want = cur.status;
      const server = serverState.get(userId) ?? 'none';
      const wantOn = want !== 'none';
      if (wantOn === (server !== 'none')) {
        // Settled. "Requested" vs "Following" is the server's call, so show its word
        if (want !== server) apply(userId, server);
        return;
      }
      let res: SendResult;
      try { res = await send(userId, wantOn); } catch { res = { ok: false, network: true }; }
      if (!res.ok && res.network) {
        // No connection: keep what they tapped and send it when the connection is back
        enqueue({ t: 'follow', userId, want: wantOn });
        return;
      }
      if (!res.ok) {
        apply(userId, server);
        toast(wantOn ? "Couldn't follow" : "Couldn't unfollow", { kind: 'error' });
        return;
      }
      settleFollow(userId);
      serverState.set(userId, res.status!);
    }
    apply(userId, serverState.get(userId) ?? 'none');
  } finally {
    busy.delete(userId);
    serverState.delete(userId);
  }
}
