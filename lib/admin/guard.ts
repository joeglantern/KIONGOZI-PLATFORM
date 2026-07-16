import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth/current-user';

type AdminGuardOk = {
    ok: true;
    supabase: Awaited<ReturnType<typeof createClient>>;
    userId: string;
};
type AdminGuardErr = { ok: false; status: 401 | 403; error: string };

/**
 * Server-side admin gate for API route handlers. Verifies the cookie session
 * token (getUser) and the admin role before any write. Returns a user-scoped
 * Supabase client on success, so writes still pass through RLS as the caller.
 */
export async function requireAdmin(): Promise<AdminGuardOk | AdminGuardErr> {
    const user = await getCurrentUser();
    if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
    const supabase = await createClient();

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        return { ok: false, status: 403, error: 'Forbidden' };
    }

    return { ok: true, supabase, userId: user.id };
}
