"use client";

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
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
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize fetchProfile
  const fetchProfile = async (userId: string) => {
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
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user); // Only set if exists
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // OPTIMIZATION: Only update if the user ID actually changed
      // This prevents "tab focus" events from triggering a full app re-render
      // if the session was just refreshed but the user is the same.
      const currentUserId = user?.id;
      const newUserId = session?.user?.id;

      if (newUserId !== currentUserId) {
        setUser(session?.user ?? null);
        if (newUserId) {
          fetchProfile(newUserId);
        } else {
          setProfile(null);
        }
      }

      // Always ensure loading is false after a check
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]); // Removed 'user' from dependency to avoid re-subscribing loop

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // MEMOIZED VALUE
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signOut,
    refreshProfile
  }), [user, profile, loading]);

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
