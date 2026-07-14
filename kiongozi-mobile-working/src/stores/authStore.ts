import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import apiClient from '../utils/apiClient';
import type { User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  sessionExpired: boolean; // true when session expired externally (not user-initiated sign-out)
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, username?: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean; email?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  checkEmailVerified: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  sessionExpired: false,

  initialize: async () => {
    try {
      // getSession() reads from local SecureStore — safe to call offline.
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        // Only sign out for definitive auth invalidation errors, not network errors.
        const isAuthInvalid = error.message?.toLowerCase().includes('refresh_token') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('expired');
        if (isAuthInvalid) {
          await supabase.auth.signOut({ scope: 'local' });
        }
        console.warn('Session check error:', error.message);
        set({ user: null, initialized: true });
        return;
      }

      set({ user: session?.user ?? null, initialized: true });

      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          set({ user: session?.user ?? null });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, sessionExpired: !!get().user });
          const { useSocialStore } = require('./socialStore');
          const { useDMStore } = require('./dmStore');
          const { useProfileStore } = require('./profileStore');
          const { useNotificationStore } = require('./notificationStore');
          useSocialStore.getState().reset();
          useDMStore.getState().reset();
          useProfileStore.getState().reset();
          useNotificationStore.getState().reset();
        }
        // TOKEN_REFRESH_FAILED: keep the user logged in — they'll get 401s on
        // expired requests, but opening the app offline won't force a sign-out.
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

      set({ user: data.user, loading: false, sessionExpired: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  signUp: async (email: string, password: string, firstName: string, lastName: string, username?: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            ...(username ? { username } : {}),
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

      if (data.session) {
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
      const redirectUri = 'kiongozi://auth/callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        set({ loading: false });
        return { success: false, error: error?.message || 'Failed to get OAuth URL' };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type !== 'success') {
        set({ loading: false });
        return {
          success: false,
          error: result.type === 'cancel' ? 'Sign-in cancelled' : 'Sign-in failed',
        };
      }

      // PKCE: extract the auth code and exchange for a session
      const url = new URL(result.url);

      // PKCE flow: code in query params
      const code = url.searchParams.get('code');
      if (code) {
        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          set({ loading: false });
          return { success: false, error: exchangeError.message };
        }
        set({ user: sessionData.user, loading: false, sessionExpired: false });
        return { success: true };
      }

      // Implicit flow fallback: tokens in hash fragment
      const hashParams = new URLSearchParams(url.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          set({ loading: false });
          return { success: false, error: sessionError.message };
        }
        const { data: { user } } = await supabase.auth.getUser();
        set({ user, loading: false, sessionExpired: false });
        return { success: true };
      }

      set({ loading: false });
      return { success: false, error: 'Google sign-in failed — please try again' };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, sessionExpired: false });
      const { useSocialStore } = require('./socialStore');
      const { useDMStore } = require('./dmStore');
      const { useProfileStore } = require('./profileStore');
      const { useNotificationStore } = require('./notificationStore');
      useSocialStore.getState().reset();
      useDMStore.getState().reset();
      useProfileStore.getState().reset();
      useNotificationStore.getState().reset();
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

      if (data.session) {
        set({ user: data.user });
        return { success: true };
      }

      return { success: false, error: 'Email not verified yet' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'kiongozi://reset-password',
      });
      return error ? { success: false, error: error.message } : { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  updatePassword: async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return error ? { success: false, error: error.message } : { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
}));