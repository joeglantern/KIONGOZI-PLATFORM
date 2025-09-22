import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Missing URL or anon key.');
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

// Export default client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);