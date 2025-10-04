import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// EXPO_PUBLIC_ variables are automatically inlined by Metro bundler during build
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase Config:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing',
  urlValue: supabaseUrl,
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