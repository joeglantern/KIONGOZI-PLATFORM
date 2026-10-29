// Deleting a post: it disappears at once with "Post deleted · Undo" (no "Are you sure?").
// The server delete happens only after the Undo window closes.
import apiClient from './apiClient';
import { withUndo } from './alert';
import { useSocialStore } from '../stores/socialStore';

type Post = { id: string; repost_of_id?: string | null };

/** Removes a post from a screen's own list and gives back a function that puts it back where it was */
export function hideFromList<T extends Post>(set: (fn: (prev: T[]) => T[]) => void, postId: string) {
  let saved: T[] | null = null;
  set(prev => {
    saved = prev;
    return prev.filter(p => p.id !== postId && p.repost_of_id !== postId);
  });
  return () => { if (saved) { const s = saved; set(() => s); } };
}

export function deletePostWithUndo(postId: string, local?: { hide?: () => (() => void) | void; after?: () => void }) {
  let restoreStore: (() => void) | null = null;
  let restoreLocal: (() => void) | void;
  withUndo('Post deleted', {
    hide: () => {
      const st = useSocialStore.getState();
      const snap = { feedPosts: st.feedPosts, explorePosts: st.explorePosts, forYouPosts: st.forYouPosts, bookmarkPosts: st.bookmarkPosts };
      st.deletePost(postId);
      restoreStore = () => useSocialStore.setState(snap as any);
      restoreLocal = local?.hide?.();
      local?.after?.();
    },
    restore: () => {
      restoreStore?.();
      if (typeof restoreLocal === 'function') restoreLocal();
    },
    commit: async () => {
      const r: any = await apiClient.deletePost(postId);
      if (!r?.success) throw new Error(r?.error || 'Delete failed');
    },
  });
}
