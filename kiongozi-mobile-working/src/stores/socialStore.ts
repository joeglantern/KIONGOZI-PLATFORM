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
}

interface SocialState {
  feedPosts: Post[];
  explorePosts: Post[];
  feedCursor: string | null;
  exploreCursor: string | null;
  feedLoading: boolean;
  exploreLoading: boolean;
  feedRefreshing: boolean;

  // Actions
  fetchFeed: (refresh?: boolean) => Promise<void>;
  fetchExploreFeed: (refresh?: boolean) => Promise<void>;
  prependPost: (post: Post) => void;
  toggleLike: (postId: string) => void;
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

  prependPost: (post: Post) => {
    set(state => ({ feedPosts: [post, ...state.feedPosts] }));
  },

  toggleLike: (postId: string) => {
    set(state => ({
      feedPosts: state.feedPosts.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, like_count: p.isLiked ? p.like_count - 1 : p.like_count + 1 }
          : p
      ),
      explorePosts: state.explorePosts.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, like_count: p.isLiked ? p.like_count - 1 : p.like_count + 1 }
          : p
      )
    }));
  },

  deletePost: (postId: string) => {
    set(state => ({
      feedPosts: state.feedPosts.filter(p => p.id !== postId),
      explorePosts: state.explorePosts.filter(p => p.id !== postId),
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
  })
}));
