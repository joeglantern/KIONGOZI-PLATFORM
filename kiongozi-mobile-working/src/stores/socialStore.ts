import { create } from 'zustand';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/apiClient';
import { prefs } from './prefsStore';
import { saveSnap } from '../utils/snapshot';

// ── Open from cache (WhatsApp trick): the first page of each feed is saved on the phone and shown
// instantly on the next launch while the fresh feed loads quietly.
const CACHE = { forYou: 'kchat.feedCache.forYou.v1', following: 'kchat.feedCache.following.v1' };
function saveCache(key: string, posts: any[]) {
  if (!prefs().features.feed_cache) return;
  AsyncStorage.setItem(key, JSON.stringify(posts.slice(0, 20))).catch(() => {});
}
async function readCache(key: string): Promise<any[] | null> {
  try { const v = await AsyncStorage.getItem(key); const a = v ? JSON.parse(v) : null; return Array.isArray(a) && a.length ? a : null; } catch { return null; }
}

// One card per post: a page never repeats something already in the list (by the original's id),
// even if ranking shifted between pages or several people reposted it.
const key = (p: any) => p?.repost_of_id || p?.id;
function appendUnique(prev: any[], next: any[]) {
  const seen = new Set(prev.map(key));
  return [...prev, ...next.filter(p => { const k = key(p); if (seen.has(k)) return false; seen.add(k); return true; })];
}
const uniq = (list: any[]) => appendUnique([], list);

// ── Prefetch (Instagram trick): download the next posts' photos before they scroll into view
const prefetched = new Set<string>();
function prefetchMedia(posts: any[]) {
  const p = prefs();
  if (p.lowData || !p.features.prefetch) return;
  const urls: string[] = [];
  for (const post of posts.slice(0, 12)) {
    const src = post?.repost_of || post;
    const img = (src?.post_media || []).find((m: any) => m.media_type === 'image')?.url
      || (src?.post_media || []).find((m: any) => m.media_type === 'video')?.thumbnail_url;
    if (img) urls.push(img);
    if (src?.profiles?.avatar_url) urls.push(src.profiles.avatar_url);
  }
  for (const u of urls) {
    if (prefetched.has(u)) continue;
    prefetched.add(u);
    Image.prefetch(u).catch(() => {});
  }
}

export interface PostMedia {
  id: string;
  media_type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  order_index: number;
  /** tiny blurred preview (data URI) */
  placeholder?: string | null;
}

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_bot?: boolean;
  is_verified?: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: 'public' | 'followers';
  like_count: number;
  comment_count: number;
  repost_count: number;
  view_count: number;
  is_bot_reply: boolean;
  created_at: string;
  updated_at: string;
  parent_post_id?: string;
  repost_of_id?: string;
  repost_of?: Post;
  profiles: Profile;
  post_media?: PostMedia[];
  // client-side only
  isLiked?: boolean;
  isBookmarked?: boolean;
  isReposted?: boolean;
  recentReposters?: { id: string; username: string; avatar_url?: string }[];
}

// Global per-post interaction state — source of truth for likes across all screens
export interface PostInteraction {
  isLiked: boolean;
  like_count: number;
  isBookmarked: boolean;
  isReposted: boolean;
  repost_count: number;
  /** set once the user taps something on this post; fresh server data then no longer overwrites it */
  touched?: boolean;
}

interface SocialState {
  feedPosts: Post[];
  explorePosts: Post[];
  feedCursor: string | null;
  exploreCursor: string | null;
  feedLoading: boolean;
  exploreLoading: boolean;
  feedRefreshing: boolean;

  // For You feed (offset-based)
  forYouPosts: Post[];
  forYouOffset: number;
  forYouLoading: boolean;
  forYouRefreshing: boolean;
  hasMoreForYou: boolean;

  // Bookmarks
  bookmarkPosts: Post[];
  bookmarkCursor: string | null;
  bookmarkLoading: boolean;

  // Global like state — keyed by post id, used by every PostCard
  postInteractions: Record<string, PostInteraction>;

  // Block/mute state
  blockedUserIds: string[];
  mutedUserIds: string[];

  // Actions
  fetchFeed: (refresh?: boolean) => Promise<void>;
  fetchExploreFeed: (refresh?: boolean) => Promise<void>;
  fetchForYouFeed: (refresh?: boolean) => Promise<void>;
  /** Show the feeds saved on the phone (only if nothing is loaded yet) */
  hydrateFromCache: () => Promise<void>;
  fetchBookmarks: (refresh?: boolean) => Promise<void>;
  prependPost: (post: Post) => void;
  seedInteraction: (post: Post) => void;
  setInteraction: (postId: string, patch: Partial<PostInteraction>) => void;
  toggleRepost: (postId: string, delta: 1 | -1) => void;
  deletePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  loadBlockedAndMuted: () => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  muteUser: (userId: string) => Promise<void>;
  unmuteUser: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  feedPosts: [],
  explorePosts: [],
  feedCursor: null,
  exploreCursor: null,
  feedLoading: false,
  exploreLoading: false,
  feedRefreshing: false,

  forYouPosts: [],
  forYouOffset: 0,
  forYouLoading: false,
  forYouRefreshing: false,
  hasMoreForYou: true,

  bookmarkPosts: [],
  bookmarkCursor: null,
  bookmarkLoading: false,

  postInteractions: {},

  blockedUserIds: [],
  mutedUserIds: [],

  fetchFeed: async (refresh = false) => {
    const state = get();
    if (state.feedLoading) return;

    set(refresh ? { feedRefreshing: true } : { feedLoading: true });

    try {
      const cursor = refresh ? undefined : state.feedCursor ?? undefined;
      const res = await apiClient.getFeed(cursor);
      if (res.success && res.data) {
        set(prev => ({
          feedPosts: refresh ? uniq(res.data) : appendUnique(prev.feedPosts, res.data),
          feedCursor: res.nextCursor || null,
        }));
        if (refresh) saveCache(CACHE.following, res.data as any[]);
        prefetchMedia(res.data as any[]);
      }
    } catch (e) {
      console.error('fetchFeed error:', e);
      throw e;
    } finally {
      set({ feedLoading: false, feedRefreshing: false });
    }
  },

  fetchExploreFeed: async (refresh = false) => {
    const state = get();
    if (state.exploreLoading) return;

    set({ exploreLoading: true });

    try {
      const cursor = refresh ? undefined : state.exploreCursor ?? undefined;
      const res = await apiClient.getExploreFeed(cursor);
      if (res.success && res.data) {
        set(prev => ({
          explorePosts: refresh ? res.data : [...prev.explorePosts, ...res.data],
          exploreCursor: res.nextCursor || null,
        }));
        if (refresh) saveSnap('explore', (res.data as Post[]).slice(0, 30));
      }
    } catch (e) {
      console.error('fetchExploreFeed error:', e);
    } finally {
      set({ exploreLoading: false });
    }
  },

  hydrateFromCache: async () => {
    if (!prefs().features.feed_cache) return;
    const [forYou, following] = await Promise.all([readCache(CACHE.forYou), readCache(CACHE.following)]);
    set(prev => ({
      forYouPosts: prev.forYouPosts.length || !forYou ? prev.forYouPosts : forYou,
      feedPosts: prev.feedPosts.length || !following ? prev.feedPosts : following,
    }));
  },

  fetchForYouFeed: async (refresh = false) => {
    const state = get();
    if (state.forYouLoading) return;

    const offset = refresh ? 0 : state.forYouOffset;
    set(refresh ? { forYouRefreshing: true, forYouLoading: true } : { forYouLoading: true });

    try {
      const res = await apiClient.getForYouFeed(offset);
      if (res.success && res.data) {
        set(prev => ({
          forYouPosts: refresh ? uniq(res.data) : appendUnique(prev.forYouPosts, res.data),
          forYouOffset: res.nextCursor != null ? Number(res.nextCursor) : offset + (res.data?.length || 0),
          hasMoreForYou: res.nextCursor !== null,
        }));
        if (refresh) saveCache(CACHE.forYou, res.data as any[]);
        prefetchMedia(res.data as any[]);
      }
    } catch (e) {
      console.error('fetchForYouFeed error:', e);
      throw e;
    } finally {
      set({ forYouLoading: false, forYouRefreshing: false });
    }
  },

  fetchBookmarks: async (refresh = false) => {
    const state = get();
    if (state.bookmarkLoading) return;

    set({ bookmarkLoading: true });

    try {
      const cursor = refresh ? undefined : state.bookmarkCursor ?? undefined;
      const res = await apiClient.getBookmarks(cursor);
      if (res.success && res.data) {
        set(prev => ({
          bookmarkPosts: refresh ? res.data : [...prev.bookmarkPosts, ...res.data],
          bookmarkCursor: res.nextCursor || null,
        }));
      }
    } catch (e) {
      console.error('fetchBookmarks error:', e);
    } finally {
      set({ bookmarkLoading: false });
    }
  },

  prependPost: (post: Post) => {
    set(state => ({
      feedPosts: [post, ...state.feedPosts],
      forYouPosts: [post, ...state.forYouPosts],
    }));
  },

  // Keep the interaction map in step with the latest server data for a post,
  // unless the user has already tapped something on it this session.
  seedInteraction: (post: Post) => {
    set(state => {
      const cur = state.postInteractions[post.id];
      if (cur?.touched) return state;
      const next: PostInteraction = {
        isLiked: post.isLiked ?? false,
        like_count: post.like_count ?? 0,
        isBookmarked: post.isBookmarked ?? false,
        isReposted: post.isReposted ?? false,
        repost_count: post.repost_count ?? 0,
      };
      if (cur && cur.isLiked === next.isLiked && cur.like_count === next.like_count &&
          cur.isBookmarked === next.isBookmarked && cur.isReposted === next.isReposted &&
          cur.repost_count === next.repost_count) return state;
      return { postInteractions: { ...state.postInteractions, [post.id]: next } };
    });
  },

  // Change a post's interaction state everywhere: the map plus every cached list,
  // including originals nested inside repost cards.
  setInteraction: (postId: string, patch: Partial<PostInteraction>) => {
    set(state => {
      const cur = state.postInteractions[postId];
      if (!cur) return state;
      const next = { ...cur, ...patch, touched: true };
      const { touched, ...fields } = next;
      const apply = (posts: Post[]) => posts.map(p => {
        if (p.id === postId) return { ...p, ...fields };
        if (p.repost_of?.id === postId) return { ...p, repost_of: { ...p.repost_of, ...fields } };
        return p;
      });
      return {
        postInteractions: { ...state.postInteractions, [postId]: next },
        feedPosts: apply(state.feedPosts),
        explorePosts: apply(state.explorePosts),
        forYouPosts: apply(state.forYouPosts),
        bookmarkPosts: apply(state.bookmarkPosts),
      };
    });
  },

  toggleRepost: (postId: string, delta: 1 | -1) => {
    const update = (posts: Post[]) =>
      posts.map(p => p.id === postId
        ? { ...p, repost_count: Math.max(0, p.repost_count + delta), isReposted: delta === 1 }
        : p);
    set(state => ({
      feedPosts: update(state.feedPosts),
      explorePosts: update(state.explorePosts),
      forYouPosts: update(state.forYouPosts),
    }));
  },

  deletePost: (postId: string) => {
    const remove = (posts: Post[]) =>
      posts.filter(p => p.id !== postId && p.repost_of_id !== postId);
    set(state => ({
      feedPosts: remove(state.feedPosts),
      explorePosts: remove(state.explorePosts),
      forYouPosts: remove(state.forYouPosts),
      bookmarkPosts: remove(state.bookmarkPosts),
    }));
  },

  updatePost: (postId: string, updates: Partial<Post>) => {
    const apply = (posts: Post[]) =>
      posts.map(p => p.id === postId ? { ...p, ...updates } : p);
    set(state => ({
      feedPosts: apply(state.feedPosts),
      explorePosts: apply(state.explorePosts),
      forYouPosts: apply(state.forYouPosts),
      bookmarkPosts: apply(state.bookmarkPosts),
    }));
  },

  loadBlockedAndMuted: async () => {
    try {
      const [blockedRes, mutedRes] = await Promise.all([
        apiClient.getBlockedUsers(),
        apiClient.getMutedUsers(),
      ]);
      set({
        blockedUserIds: blockedRes.success ? (blockedRes.data || []).map((u: any) => u.id) : [],
        mutedUserIds: mutedRes.success ? (mutedRes.data || []).map((u: any) => u.id) : [],
      });
    } catch (e) {
      console.error('loadBlockedAndMuted error:', e);
    }
  },

  blockUser: async (userId: string) => {
    const prev = get().blockedUserIds;
    // Optimistic
    set(state => ({ blockedUserIds: [...state.blockedUserIds, userId] }));
    // Remove their posts from all feeds
    set(state => ({
      feedPosts: state.feedPosts.filter(p => p.user_id !== userId),
      forYouPosts: state.forYouPosts.filter(p => p.user_id !== userId),
      explorePosts: state.explorePosts.filter(p => p.user_id !== userId),
    }));
    try {
      const res = await apiClient.blockUser(userId);
      if (!res.success && res.error !== 'Already blocked') {
        set({ blockedUserIds: prev });
      }
    } catch {
      set({ blockedUserIds: prev });
    }
  },

  unblockUser: async (userId: string) => {
    const prev = get().blockedUserIds;
    set(state => ({ blockedUserIds: state.blockedUserIds.filter(id => id !== userId) }));
    try {
      const res = await apiClient.unblockUser(userId);
      if (!res.success) {
        set({ blockedUserIds: prev });
      }
    } catch {
      set({ blockedUserIds: prev });
    }
  },

  muteUser: async (userId: string) => {
    const prev = get().mutedUserIds;
    set(state => ({ mutedUserIds: [...state.mutedUserIds, userId] }));
    // Remove their posts from all feeds
    set(state => ({
      feedPosts: state.feedPosts.filter(p => p.user_id !== userId),
      forYouPosts: state.forYouPosts.filter(p => p.user_id !== userId),
      explorePosts: state.explorePosts.filter(p => p.user_id !== userId),
    }));
    try {
      const res = await apiClient.muteUser(userId);
      if (!res.success && res.error !== 'Already muted') {
        set({ mutedUserIds: prev });
      }
    } catch {
      set({ mutedUserIds: prev });
    }
  },

  unmuteUser: async (userId: string) => {
    const prev = get().mutedUserIds;
    set(state => ({ mutedUserIds: state.mutedUserIds.filter(id => id !== userId) }));
    try {
      const res = await apiClient.unmuteUser(userId);
      if (!res.success) {
        set({ mutedUserIds: prev });
      }
    } catch {
      set({ mutedUserIds: prev });
    }
  },

  reset: () => (AsyncStorage.multiRemove(Object.values(CACHE)).catch(() => {}), set({
    feedPosts: [],
    explorePosts: [],
    feedCursor: null,
    exploreCursor: null,
    feedLoading: false,
    exploreLoading: false,
    feedRefreshing: false,
    forYouPosts: [],
    forYouOffset: 0,
    forYouLoading: false,
    forYouRefreshing: false,
    hasMoreForYou: true,
    bookmarkPosts: [],
    bookmarkCursor: null,
    bookmarkLoading: false,
    postInteractions: {},
    blockedUserIds: [],
    mutedUserIds: [],
  }))
}));
