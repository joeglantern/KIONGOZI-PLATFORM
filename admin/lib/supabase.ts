import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client for public operations (now only used for basic operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Note: Admin operations now use server-side API routes for security

export type Profile = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  text: string;
  is_user: boolean;
  type: 'chat' | 'research';
  research_data?: any;
  created_at: string;
};