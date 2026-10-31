import { create } from 'zustand';
import apiClient from '../utils/apiClient';
import { saveSnap, readSnap } from '../utils/snapshot';

export interface PublicProfile {
  id: string;
  full_name: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  is_bot?: boolean;
  is_verified?: boolean;
  is_private?: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  isFollowing?: boolean;
  followRequestStatus?: string | null;
  isBlockedBy?: boolean;
}

interface ProfileState {
  profiles: Record<string, PublicProfile>; // username -> profile
  loading: Record<string, boolean>;

  // Current user's own profile (for ProfileTabScreen + EditProfileScreen)
  currentUserProfile: PublicProfile | null;
  currentUserLoading: boolean;

  fetchProfile: (username: string) => Promise<PublicProfile | null>;
  fetchCurrentUserProfile: (username?: string) => Promise<void>;
  updateCurrentUserProfile: (updates: Partial<PublicProfile>) => void;
  /** Follow state and counts are changed by stores/followSync (one place, no double counting) */
  setFollowerCount: (username: string, count: number) => void;
  /** Last-seen own profile, so Profile opens offline */
  hydrate: () => Promise<void>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: {},
  loading: {},
  currentUserProfile: null,
  currentUserLoading: false,

  fetchProfile: async (username: string) => {
    const cached = get().profiles[username];
    if (cached) return cached;

    set(s => ({ loading: { ...s.loading, [username]: true } }));
    try {
      const res = await apiClient.getPublicProfile(username);
      if (res.success && res.data) {
        set(s => ({ profiles: { ...s.profiles, [username]: res.data } }));
        return res.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      set(s => ({ loading: { ...s.loading, [username]: false } }));
    }
  },

  fetchCurrentUserProfile: async (_username?: string) => {
    set({ currentUserLoading: true });
    try {
      const res = await apiClient.getMyProfile();
      if (res.success && res.data) {
        set({ currentUserProfile: res.data });
        saveSnap('me', res.data);
        // Also cache in profiles map by username for PublicProfileScreen lookups
        if (res.data.username) {
          set(s => ({ profiles: { ...s.profiles, [res.data.username]: res.data } }));
        }
      }
    } catch {}
    set({ currentUserLoading: false });
  },

  updateCurrentUserProfile: (updates: Partial<PublicProfile>) => {
    set(s => {
      if (!s.currentUserProfile) return s;
      return { currentUserProfile: { ...s.currentUserProfile, ...updates } };
    });
  },

  setFollowerCount: (username: string, count: number) => {
    set(s => {
      const profile = s.profiles[username];
      if (!profile) return s;
      return {
        profiles: {
          ...s.profiles,
          [username]: { ...profile, follower_count: count }
        }
      };
    });
  },

  hydrate: async () => {
    if (get().currentUserProfile) return;
    const me = await readSnap<PublicProfile>('me');
    if (me && !get().currentUserProfile) set(s => ({ currentUserProfile: me, profiles: me.username ? { ...s.profiles, [me.username]: me } : s.profiles }));
  },

  reset: () => set({ profiles: {}, loading: {}, currentUserProfile: null, currentUserLoading: false })
}));
