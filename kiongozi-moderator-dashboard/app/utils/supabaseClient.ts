import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let client: SupabaseClient | undefined;

const resolveCreds = () => {
  if (supabaseUrl && supabaseAnonKey) return { url: supabaseUrl, key: supabaseAnonKey };
  if (typeof window !== 'undefined') {
    const w = window as any;
    if (w.__SUPABASE_URL__ && w.__SUPABASE_ANON_KEY__) {
      return { url: w.__SUPABASE_URL__ as string, key: w.__SUPABASE_ANON_KEY__ as string };
    }
  }
  return { url: '', key: '' };
};

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { url, key } = resolveCreds();
  if (!url || !key) {
    throw new Error('Supabase is not configured');
  }
  client = createClient(url, key);
  return client;
}

// Keep a best-effort default export for places that guard for undefined.
const eager = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : undefined;
export const supabase = eager as SupabaseClient | undefined;

let clientPromise: Promise<SupabaseClient> | null = null;
export async function getSupabaseAsync(): Promise<SupabaseClient> {
  if (client) return client;
  try {
    const { url, key } = resolveCreds();
    if (url && key) {
      client = createClient(url, key);
      return client;
    }
    // Fallback: fetch public env from API route at runtime
    const res = await fetch('/api/supabase-env');
    if (res.ok) {
      const json = await res.json();
      if (json.url && json.key) {
        client = createClient(json.url, json.key);
        return client as SupabaseClient;
      }
    }
  } catch {}
  // Last resort throw
  throw new Error('Supabase is not configured');
}

