"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';

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

      // Try to get user from the API
      const response = await apiClient.getCurrentUser();

      if (response.success && response.data) {
        setUser(response.data);
      } else {
        // If no API endpoint, try to extract from localStorage token
        const token = getTokenFromStorage();
        if (token) {
          const userData = extractUserFromToken(token);
          if (userData) {
            setUser(userData);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Failed to fetch user data');
      setUser(null);
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

      // Clear all auth-related data from localStorage
      if (typeof window !== 'undefined') {
        const keysToRemove = [
          'sb-jdncfyagppohtksogzkx-auth-token',
          'supabase_token',
          'token',
          'chat-dark-mode',
          'chat-sidebar-open',
          'chat-current-conversation'
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        // Clear window token
        (window as any).supabaseToken = null;
      }

      // Try to call logout endpoint
      try {
        await apiClient.logout();
      } catch (err) {
        console.log('Logout endpoint not available, continuing with local cleanup');
      }

      setUser(null);
      setError(null);

      // Redirect to login or home page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get token from localStorage
  const getTokenFromStorage = (): string | null => {
    if (typeof window === 'undefined') return null;

    // Try Supabase's standard format first
    const supabaseToken = localStorage.getItem('sb-jdncfyagppohtksogzkx-auth-token');
    if (supabaseToken) {
      try {
        const parsed = JSON.parse(supabaseToken);
        if (parsed.access_token) return parsed.access_token;
      } catch {}
    }

    // Fallback to direct token storage
    return localStorage.getItem('supabase_token') || localStorage.getItem('token');
  };

  // Helper function to extract user data from JWT token
  const extractUserFromToken = (token: string): User | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub || payload.user_id || 'unknown',
        email: payload.email || 'user@example.com',
        full_name: payload.full_name || payload.name || 'User',
        first_name: payload.first_name || payload.given_name,
        last_name: payload.last_name || payload.family_name,
        avatar_url: payload.avatar_url || payload.picture,
        role: payload.role || 'user',
        created_at: payload.created_at || new Date().toISOString(),
        updated_at: payload.updated_at || new Date().toISOString()
      };
    } catch (err) {
      console.error('Failed to extract user from token:', err);
      return null;
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