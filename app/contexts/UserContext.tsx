"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/app/utils/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  role: 'user' | 'instructor' | 'admin';
  status: string;
  total_xp: number;
  level: number;
  bio?: string;
  total_badges?: number;
  current_streak?: number;
  max_streak?: number;
  last_activity_date?: string;
  created_at: string;
  updated_at: string;
}

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Stable client reference — never re-created on re-render
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile completion interceptor
  useEffect(() => {
    if (!loading && user && profile) {
      const hasDisplayName = Boolean(profile.first_name?.trim() || profile.full_name?.trim());
      const isMissingInfo = !profile.username || !hasDisplayName;
      const isCurrentlyCompleting = pathname === '/complete-profile';

      // Prevent routing loops
      if (isMissingInfo && !isCurrentlyCompleting) {
        const nextParam = pathname && pathname !== '/complete-profile'
          ? `?next=${encodeURIComponent(pathname)}`
          : '';
        router.replace(`/complete-profile${nextParam}`);
      }
    }
  }, [loading, user, profile, pathname, router]);

  // Memoize fetchProfile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      // Only update if data is different? React state handles strict equality check for us
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Don't clear profile on temporary errors
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [fetchProfile, user]);

  useEffect(() => {
    const syncSession = async (session: { user: User } | null) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  }, [supabase]);

  // MEMOIZED VALUE
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signOut,
    refreshProfile
  }), [user, profile, loading, signOut, refreshProfile]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
