import type { User } from '@supabase/supabase-js';
import { createClient } from '@/app/utils/supabase/server';

type UserGuardOk = {
    ok: true;
    supabase: Awaited<ReturnType<typeof createClient>>;
    user: User;
};
type UserGuardErr = { ok: false; status: 401; error: string };

/**
 * Server-side authenticated-user gate for API route handlers. Verifies the
 * cookie session (getUser) and returns a user-scoped Supabase client so writes
 * still pass through RLS as the caller. Mirrors requireAdmin() without the role check.
 */
export async function requireUser(): Promise<UserGuardOk | UserGuardErr> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
    return { ok: true, supabase, user };
}
