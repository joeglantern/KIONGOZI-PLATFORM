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
  is_private?: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  isFollowing?: boolean;
  followRequestStatus?: string | null;
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
  updateFollowState: (username: string, isFollowing: boolean) => void;
  setFollowerCount: (username: string, count: number) => void;
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

  updateFollowState: (username: string, isFollowing: boolean) => {
    set(s => {
      const profile = s.profiles[username];
      const updatedProfiles = profile ? {
        ...s.profiles,
        [username]: {
          ...profile,
          isFollowing,
          follower_count: isFollowing
            ? profile.follower_count + 1
            : Math.max(0, profile.follower_count - 1)
        }
      } : s.profiles;

      // Also update the current user's following_count
      const updatedCurrentUser = s.currentUserProfile ? {
        ...s.currentUserProfile,
        following_count: isFollowing
          ? s.currentUserProfile.following_count + 1
          : Math.max(0, s.currentUserProfile.following_count - 1)
      } : s.currentUserProfile;

      return { profiles: updatedProfiles, currentUserProfile: updatedCurrentUser };
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

  reset: () => set({ profiles: {}, loading: {}, currentUserProfile: null, currentUserLoading: false })
}));
