import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import apiClient from '../utils/apiClient';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean; email?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  checkEmailVerified: () => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      // If refresh token is invalid, clear the session silently
      if (error) {
        console.log('Session restoration failed (token may be expired), clearing session');
        await supabase.auth.signOut({ scope: 'local' });
        await apiClient.removeAuthToken();
        set({ user: null, initialized: true });
        return;
      }

      if (session?.access_token) {
        // Save token for API client
        await apiClient.saveAuthToken(session.access_token);
        set({ user: session.user, initialized: true });
      } else {
        set({ user: null, initialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          if (session?.access_token) {
            await apiClient.saveAuthToken(session.access_token);
            set({ user: session.user });
          }
        } else if (event === 'SIGNED_OUT') {
          await apiClient.removeAuthToken();
          set({ user: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear any stale data
      await apiClient.removeAuthToken();
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

  signUp: async (email: string, password: string, firstName: string, lastName: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: 'kiongozi://auth/callback',
        },
      });

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // User created but needs email verification
        set({ loading: false });
        return {
          success: true,
          needsVerification: true,
          email: email
        };
      }

      // Email confirmed (auto-confirm enabled or already verified)
      if (data.session?.access_token) {
        await apiClient.saveAuthToken(data.session.access_token);
        set({ user: data.user, loading: false });
        return { success: true };
      }

      set({ loading: false });
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

  resendVerificationEmail: async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  checkEmailVerified: async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session?.access_token) {
        await apiClient.saveAuthToken(data.session.access_token);
        set({ user: data.user });
        return { success: true };
      }

      return { success: false, error: 'Email not verified yet' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
}));