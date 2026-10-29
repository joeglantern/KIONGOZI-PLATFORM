// Like / bookmark / repost taps: the UI flips instantly, then this keeps the server in step.
// One request per post+action at a time; rapid taps just change the wanted state and the
// loop sends whatever is still needed. The final state is always what the server confirmed.
import apiClient from '../utils/apiClient';
import { useSocialStore, PostInteraction } from './socialStore';
import { enqueue, isNetworkError, settleInteraction } from '../utils/outbox';

export type InteractionKind = 'like' | 'bookmark' | 'repost';

const FIELD = { like: 'isLiked', bookmark: 'isBookmarked', repost: 'isReposted' } as const;
const COUNT = { like: 'like_count', bookmark: null, repost: 'repost_count' } as const;

const busy = new Set<string>();
const serverState = new Map<string, boolean>(); // last state the server confirmed, while syncing

const get = (postId: string) => useSocialStore.getState().postInteractions[postId];

function setState(postId: string, kind: InteractionKind, on: boolean, count?: number) {
  const cur = get(postId);
  if (!cur) return;
  const patch: Partial<PostInteraction> = { [FIELD[kind]]: on };
  const countKey = COUNT[kind];
  if (countKey) {
    patch[countKey] = count ?? (cur[FIELD[kind]] === on ? cur[countKey] : Math.max(0, cur[countKey] + (on ? 1 : -1)));
  }
  useSocialStore.getState().setInteraction(postId, patch);
}

/** Flip like/bookmark/repost for a post. `want` forces a state (e.g. double-tap only likes). */
export function toggleInteraction(postId: string, kind: InteractionKind, want?: boolean) {
  const cur = get(postId);
  if (!cur) return;
  const key = `${kind}:${postId}`;
  const now = cur[FIELD[kind]];
  const next = want ?? !now;
  if (next === now) return;
  if (!serverState.has(key)) serverState.set(key, now);
  setState(postId, kind, next);
  pump(postId, kind);
}

/** For callers that changed the server themselves (e.g. a quote post counts as a repost). */
export function markInteraction(postId: string, kind: InteractionKind, on: boolean) {
  if (!get(postId) || busy.has(`${kind}:${postId}`)) return;
  setState(postId, kind, on);
}

type SendResult = { ok: boolean; on?: boolean; count?: number; network?: boolean };

async function send(kind: InteractionKind, postId: string, want: boolean): Promise<SendResult> {
  if (kind === 'like') {
    const r: any = await apiClient.likePost(postId); // server toggles and tells us the result
    return r.success ? { ok: true, on: !!r.liked, count: typeof r.like_count === 'number' ? r.like_count : undefined } : { ok: false, network: isNetworkError(r) };
  }
  if (kind === 'bookmark') {
    const r: any = await apiClient.bookmarkPost(postId);
    return r.success ? { ok: true, on: !!r.bookmarked } : { ok: false, network: isNetworkError(r) };
  }
  const r: any = want ? await apiClient.repostPost(postId) : await apiClient.unrepostPost(postId);
  if (r.success) return { ok: true, on: want };
  // Already in the wanted state on the server: treat as done
  if (want && /already reposted/i.test(r.error || '')) return { ok: true, on: true };
  if (!want && /not found/i.test(r.error || '')) return { ok: true, on: false };
  return { ok: false, network: isNetworkError(r) };
}

/** Used by the outbox after a restart: make the server match `want` (likes/bookmarks are toggles). */
export async function ensureInteraction(postId: string, kind: InteractionKind, want: boolean): Promise<'done' | 'network' | 'rejected'> {
  for (let i = 0; i < 2; i++) {
    const r = await send(kind, postId, want);
    if (!r.ok) return r.network ? 'network' : 'rejected';
    if (r.on === want) {
      if (get(postId)) setState(postId, kind, want, r.count);
      return 'done';
    }
  }
  return 'rejected';
}

async function pump(postId: string, kind: InteractionKind) {
  const key = `${kind}:${postId}`;
  if (busy.has(key)) return;
  busy.add(key);
  try {
    for (let i = 0; i < 5; i++) {
      const cur = get(postId);
      if (!cur) return;
      const want = cur[FIELD[kind]];
      if (want === serverState.get(key)) return;
      let res: SendResult;
      try { res = await send(kind, postId, want); } catch { res = { ok: false, network: true }; }
      if (!res.ok && res.network) {
        // No connection: keep what they tapped and send it when the connection is back
        enqueue({ t: 'ix', kind, postId, want });
        return;
      }
      if (res.ok) settleInteraction(kind, postId);
      if (!res.ok) {
        // Failed (offline, rate limited, server error): show what the server really has
        setState(postId, kind, serverState.get(key)!);
        return;
      }
      serverState.set(key, res.on!);
      const after = get(postId);
      if (after && after[FIELD[kind]] === res.on) {
        // Settled; take the server's count when it gives one
        if (res.count !== undefined) setState(postId, kind, res.on!, res.count);
      }
    }
    // Still not settled after several tries: show the server's state
    setState(postId, kind, serverState.get(key)!);
  } finally {
    busy.delete(key);
    serverState.delete(key);
  }
}
