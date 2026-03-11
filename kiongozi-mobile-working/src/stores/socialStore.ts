import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface PostMedia {
  id: string;
  media_type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  order_index: number;
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
  profiles: Profile;
  post_media?: PostMedia[];
  // client-side only
  isLiked?: boolean;
  isBookmarked?: boolean;
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

  // Actions
  fetchFeed: (refresh?: boolean) => Promise<void>;
  fetchExploreFeed: (refresh?: boolean) => Promise<void>;
  fetchForYouFeed: (refresh?: boolean) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  fetchBookmarks: (refresh?: boolean) => Promise<void>;
  prependPost: (post: Post) => void;
  toggleLike: (postId: string) => void;
  toggleRepostCount: (postId: string, delta: 1 | -1) => void;
  deletePost: (postId: string) => void;
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

  fetchFeed: async (refresh = false) => {
    const state = get();
    if (state.feedLoading) return;

    set(refresh ? { feedRefreshing: true } : { feedLoading: true });

    try {
      const cursor = refresh ? undefined : state.feedCursor ?? undefined;
      const res = await apiClient.getFeed(cursor);
      if (res.success && res.data) {
        set(prev => ({
          feedPosts: refresh ? res.data : [...prev.feedPosts, ...res.data],
          feedCursor: res.nextCursor || null,
        }));
      }
    } catch (e) {
      console.error('fetchFeed error:', e);
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
      }
    } catch (e) {
      console.error('fetchExploreFeed error:', e);
    } finally {
      set({ exploreLoading: false });
    }
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
          forYouPosts: refresh ? res.data : [...prev.forYouPosts, ...res.data],
          forYouOffset: offset + (res.data?.length || 0),
          hasMoreForYou: res.nextCursor != null,
        }));
      }
    } catch (e) {
      console.error('fetchForYouFeed error:', e);
    } finally {
      set({ forYouLoading: false, forYouRefreshing: false });
    }
  },

  toggleBookmark: async (postId: string) => {
    // Optimistic update across all feeds
    const toggleInList = (posts: Post[]) =>
      posts.map(p => p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p);

    set(state => ({
      feedPosts: toggleInList(state.feedPosts),
      forYouPosts: toggleInList(state.forYouPosts),
      explorePosts: toggleInList(state.explorePosts),
    }));

    try {
      const res = await apiClient.bookmarkPost(postId);
      if (!res.success) {
        // Revert on error
        set(state => ({
          feedPosts: toggleInList(state.feedPosts),
          forYouPosts: toggleInList(state.forYouPosts),
          explorePosts: toggleInList(state.explorePosts),
        }));
      }
    } catch {
      // Revert on error
      set(state => ({
        feedPosts: toggleInList(state.feedPosts),
        forYouPosts: toggleInList(state.forYouPosts),
        explorePosts: toggleInList(state.explorePosts),
      }));
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
    set(state => ({ feedPosts: [post, ...state.feedPosts] }));
  },

  toggleLike: (postId: string) => {
    const toggle = (posts: Post[]) =>
      posts.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, like_count: p.isLiked ? p.like_count - 1 : p.like_count + 1 }
          : p
      );
    set(state => ({
      feedPosts: toggle(state.feedPosts),
      explorePosts: toggle(state.explorePosts),
      forYouPosts: toggle(state.forYouPosts),
    }));
  },

  toggleRepostCount: (postId: string, delta: 1 | -1) => {
    const update = (posts: Post[]) =>
      posts.map(p => p.id === postId
        ? { ...p, repost_count: Math.max(0, p.repost_count + delta) }
        : p);
    set(state => ({
      feedPosts: update(state.feedPosts),
      explorePosts: update(state.explorePosts),
      forYouPosts: update(state.forYouPosts),
    }));
  },

  deletePost: (postId: string) => {
    set(state => ({
      feedPosts: state.feedPosts.filter(p => p.id !== postId),
      explorePosts: state.explorePosts.filter(p => p.id !== postId),
      forYouPosts: state.forYouPosts.filter(p => p.id !== postId),
      bookmarkPosts: state.bookmarkPosts.filter(p => p.id !== postId),
    }));
  },

  reset: () => set({
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
  })
}));
