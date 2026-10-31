// Pinned post on your profile (X style): one at a time, pinning another replaces it.
// The pin flips at once on every screen (profile lists read it from here), the server settles behind,
// and the toast offers Undo. If the server says no, the old pin comes back.
import { create } from 'zustand';
import apiClient from '../utils/apiClient';
import { toast } from '../utils/alert';
import { useProfileStore } from './profileStore';

type Pin = { id: string | null; post?: any };

interface PinState {
  /** userId -> what this phone knows is pinned right now (missing = use what the server sent) */
  byUser: Record<string, Pin>;
  set: (userId: string, pin: Pin) => void;
}

export const usePinStore = create<PinState>((set) => ({
  byUser: {},
  set: (userId, pin) => set(s => ({ byUser: { ...s.byUser, [userId]: pin } })),
}));

function mirrorToProfile(userId: string, pin: Pin) {
  const me = useProfileStore.getState().currentUserProfile as any;
  if (me?.id === userId) {
    useProfileStore.getState().updateCurrentUserProfile({ pinned_post_id: pin.id, pinned_post: pin.id ? pin.post ?? null : null } as any);
  }
}

function current(userId: string): Pin {
  const local = usePinStore.getState().byUser[userId];
  if (local) return local;
  const me = useProfileStore.getState().currentUserProfile as any;
  if (me?.id === userId) return { id: me.pinned_post_id ?? null, post: me.pinned_post ?? undefined };
  return { id: null };
}

function apply(userId: string, pin: Pin) {
  usePinStore.getState().set(userId, pin);
  mirrorToProfile(userId, pin);
}

/** Can this post go on top of the profile? Your own top-level posts, not replies. */
export function canPin(post: any, currentUserId?: string) {
  return !!(post && currentUserId && post.user_id === currentUserId && !post.parent_post_id);
}

/** The id of the post pinned on this person's profile, as this phone knows it */
export function usePinnedId(userId?: string, serverId?: string | null): string | null {
  const local = usePinStore(s => (userId ? s.byUser[userId] : undefined));
  const meId = useProfileStore(s => (userId && (s.currentUserProfile as any)?.id === userId ? (s.currentUserProfile as any)?.pinned_post_id : undefined));
  if (local) return local.id;
  return serverId !== undefined ? serverId ?? null : meId ?? null;
}

/**
 * What a profile list puts first: the pinned post (or null). `server` is what the profile response
 * carried; `list` is the loaded posts, used when only the id is known.
 */
export function usePinnedPost(userId: string | undefined, server: { id?: string | null; post?: any } | null, list: any[]): any | null {
  const local = usePinStore(s => (userId ? s.byUser[userId] : undefined));
  const id = local ? local.id : server?.id ?? null;
  if (!id) return null;
  if (local?.post && local.post.id === id) return local.post;
  if (server?.post && server.post.id === id) return server.post;
  return list.find(p => p?.id === id) ?? null;
}

/** Pin (or unpin, if it is the pinned one) from the post menu */
export function togglePin(post: any, userId: string) {
  if (!post?.id || !userId) return;
  const before = current(userId);
  if (before.id === post.id) {
    apply(userId, { id: null });
    apiClient.unpinPost(post.id).then((r: any) => {
      if (!r?.success) throw new Error(r?.error);
    }).catch((e: any) => {
      apply(userId, before);
      toast("Couldn't unpin that post", { kind: 'error', message: e?.message || 'Check your connection and try again.' });
    });
    toast('Unpinned from your profile');
    return;
  }

  apply(userId, { id: post.id, post });
  const undo = () => {
    apply(userId, before);
    (before.id ? apiClient.pinPost(before.id) : apiClient.unpinPost(post.id)).catch(() => {});
  };
  apiClient.pinPost(post.id).then((r: any) => {
    if (!r?.success) throw new Error(r?.error);
  }).catch((e: any) => {
    if (current(userId).id !== post.id) return; // already undone
    apply(userId, before);
    toast("Couldn't pin that post", { kind: 'error', message: e?.message || 'Check your connection and try again.' });
  });
  toast('Pinned to your profile', { kind: 'success', icon: 'pin', action: { label: 'Undo', onPress: undo } });
}

/** A pinned post being deleted: drop it from the top now (the server clears the pin itself). Gives back a restore. */
export function hidePinned(userId: string | undefined, postId: string): () => void {
  if (!userId) return () => {};
  const before = current(userId);
  if (before.id !== postId) return () => {};
  apply(userId, { id: null });
  return () => apply(userId, before);
}

/** A fresh profile from the server wins over what this phone remembered */
export function settlePin(userId: string | undefined) {
  if (!userId) return;
  const s = usePinStore.getState().byUser;
  if (!s[userId]) return;
  const next = { ...s };
  delete next[userId];
  usePinStore.setState({ byUser: next });
}
