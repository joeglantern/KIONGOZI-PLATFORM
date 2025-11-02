"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from '../utils/supabaseClient';

export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get Supabase client (same as mobile app pattern)
      const supabase = getSupabase();

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Store token in window for API client (critical for avoiding race conditions)
        if (typeof window !== 'undefined') {
          (window as any).supabaseToken = session.access_token;
        }

        // Fetch full profile from database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, full_name, avatar_url, role, created_at, updated_at')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Failed to fetch profile from database:', profileError);
          // Fall back to session user data
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            first_name: session.user.user_metadata?.first_name,
            last_name: session.user.user_metadata?.last_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            role: session.user.role || 'user',
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString()
          });
        } else if (profile) {
          console.log('✅ User profile loaded from database:', profile);
          setUser({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url,
            role: profile.role,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          });
        }
      } else {
        // No session - clear token
        if (typeof window !== 'undefined') {
          (window as any).supabaseToken = '';
        }
        setUser(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Failed to fetch user data');
      setUser(null);
      // Clear token on error
      if (typeof window !== 'undefined') {
        (window as any).supabaseToken = '';
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const logout = async () => {
    try {
      setLoading(true);

      // Get Supabase client and sign out (same as mobile app)
      const supabase = getSupabase();
      await supabase.auth.signOut();

      setUser(null);
      setError(null);

      // Clear token from window
      if (typeof window !== 'undefined') {
        (window as any).supabaseToken = '';
      }

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message || 'Logout failed');
      // Clear token even on error
      if (typeof window !== 'undefined') {
        (window as any).supabaseToken = '';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value: UserContextType = {
    user,
    loading,
    error,
    refreshUser,
    logout,
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};