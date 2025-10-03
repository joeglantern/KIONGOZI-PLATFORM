import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import apiClient from '../utils/apiClient';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        // Save token for API client
        await apiClient.saveAuthToken(session.access_token);
        set({ user: session.user, initialized: true });
      } else {
        set({ user: null, initialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.access_token) {
          await apiClient.saveAuthToken(session.access_token);
          set({ user: session.user });
        } else {
          await apiClient.removeAuthToken();
          set({ user: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, initialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      if (data.session?.access_token) {
        await apiClient.saveAuthToken(data.session.access_token);
      }

      set({ user: data.user, loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      if (data.session?.access_token) {
        await apiClient.saveAuthToken(data.session.access_token);
      }

      set({ user: data.user, loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'kiongozi://auth/callback',
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Check if we got a URL to open
      if (data?.url) {
        const { Linking } = require('react-native');
        await Linking.openURL(data.url);
      }

      // OAuth will handle the redirect, session will be set via onAuthStateChange
      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      await apiClient.removeAuthToken();
      set({ user: null });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },
}));