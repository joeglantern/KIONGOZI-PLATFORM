import { create } from 'zustand';
import apiClient from '../utils/apiClient';

export interface PublicProfile {
  id: string;
  full_name: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  is_bot?: boolean;
  is_verified?: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  isFollowing?: boolean;
}

interface ProfileState {
  profiles: Record<string, PublicProfile>; // username -> profile
  loading: Record<string, boolean>;

  fetchProfile: (username: string) => Promise<PublicProfile | null>;
  updateFollowState: (username: string, isFollowing: boolean) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: {},
  loading: {},

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

  updateFollowState: (username: string, isFollowing: boolean) => {
    set(s => {
      const profile = s.profiles[username];
      if (!profile) return s;
      return {
        profiles: {
          ...s.profiles,
          [username]: {
            ...profile,
            isFollowing,
            follower_count: isFollowing ? profile.follower_count + 1 : Math.max(0, profile.follower_count - 1)
          }
        }
      };
    });
  },

  reset: () => set({ profiles: {}, loading: {} })
}));
