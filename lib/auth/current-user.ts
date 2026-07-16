import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/app/utils/supabase/server';

/**
 * Request-scoped, cached authenticated-user lookup for SERVER components.
 *
 * `supabase.auth.getUser()` is a NETWORK call to Supabase Auth that verifies the
 * cookie token. A single page render often needs the user in several places at
 * once (a layout, its page, and nested async components), and calling getUser in
 * each one fires a separate request, all from the server's single IP. Under load
 * that shared IP can trip Supabase's per-IP auth rate limit and break sessions
 * site-wide.
 *
 * React's `cache()` memoises the result for the duration of one server request,
 * so the whole render tree shares a single getUser call. Use this everywhere a
 * server component needs the current user; keep creating a Supabase client
 * separately for data queries (that part is local and cheap).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
