import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore silently fails/warns above 2048 bytes on Android, and a Supabase
// session (access token + refresh token + user metadata) exceeds that. Values
// are split into chunks under indexed keys, with a `<key>.chunks` count entry.
// A missing chunk means the stored session is corrupt — return null so
// supabase-js treats it as signed out instead of using a broken session.
const CHUNK_SIZE = 2000;

const ChunkedSecureStore = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const countRaw = await SecureStore.getItemAsync(`${key}.chunks`);
      if (!countRaw) {
        // Legacy value stored before chunking existed
        return await SecureStore.getItemAsync(key);
      }
      const count = parseInt(countRaw, 10);
      if (!Number.isFinite(count) || count <= 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(`${key}.${i}`);
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const prevRaw = await SecureStore.getItemAsync(`${key}.chunks`);
      const prevCount = prevRaw ? parseInt(prevRaw, 10) : 0;

      const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
      for (let i = 0; i < count; i++) {
        await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      }
      await SecureStore.setItemAsync(`${key}.chunks`, String(count));

      // Remove leftover chunks from a previously longer value + legacy key
      for (let i = count; i < prevCount; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore write failed:', e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const countRaw = await SecureStore.getItemAsync(`${key}.chunks`);
      const count = countRaw ? parseInt(countRaw, 10) : 0;
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}.chunks`);
      await SecureStore.deleteItemAsync(key);
    } catch {
      // best effort
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ChunkedSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
