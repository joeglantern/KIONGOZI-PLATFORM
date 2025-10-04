import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Try to get from app.config.js extra, fallback to process.env for dev
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase Config:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing',
  urlValue: supabaseUrl,
  source: Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ? 'app.config' : 'process.env',
});

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration missing!', { supabaseUrl, supabaseAnonKey });
    throw new Error('Supabase is not configured. Missing URL or anon key.');
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

// Export default client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);