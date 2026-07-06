import { redirect } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/server';

/**
 * Server-side authoritative guard for the admin area. Runs a real token
 * verification (getUser) plus a role lookup before any admin UI renders, so
 * there is no client-only guard to bypass and no flash of protected content.
 * Middleware already bounces unauthenticated requests; this enforces the role.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?next=/admin/dashboard');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        redirect('/dashboard');
    }

    return <>{children}</>;
}
