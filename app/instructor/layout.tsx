import { redirect } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/server';
import { InstructorShell } from './components/InstructorShell';

/**
 * Server-side authoritative guard for the instructor area. Verifies the token
 * and role server-side before rendering the client shell, no content flash,
 * nothing a client-only guard could miss. Middleware already handles the
 * unauthenticated redirect; this enforces instructor/admin role.
 */
export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?next=/instructor/dashboard');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
        redirect('/dashboard');
    }

    return <InstructorShell>{children}</InstructorShell>;
}
