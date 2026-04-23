import { NextRequest, NextResponse } from 'next/server';
import { User, createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/app/utils/supabase/server';

type PackageRelation = {
    author_id: string | null;
};

type ScormPackageRecord = {
    id: string;
    title: string;
    entry_point: string;
    course_id: string;
    version: string;
    storage_path: string;
    status: string;
    courses?: PackageRelation | PackageRelation[] | null;
};

export function createServiceRoleClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

function getSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
    if (!relation) return null;
    return Array.isArray(relation) ? relation[0] ?? null : relation;
}

async function getRequestUser(request: NextRequest, serviceClient: ReturnType<typeof createServiceRoleClient>) {
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await serviceClient.auth.getUser(token);
        if (error) return null;
        return user;
    }

    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    return user;
}

export async function authorizeScormPackageAccess(request: NextRequest, packageId: string) {
    const serviceClient = createServiceRoleClient();
    const user = await getRequestUser(request, serviceClient);

    if (!user) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const { data: pkg, error: pkgError } = await serviceClient
        .from('scorm_packages')
        .select('id, title, entry_point, course_id, version, storage_path, status, courses(author_id)')
        .eq('id', packageId)
        .single<ScormPackageRecord>();

    if (pkgError || !pkg) {
        return {
            error: NextResponse.json({ error: 'Package not found' }, { status: 404 }),
        };
    }

    const course = getSingleRelation(pkg.courses);

    const { data: profile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const isPrivileged =
        profile?.role === 'admin' ||
        course?.author_id === user.id;

    if (!isPrivileged) {
        const { data: enrollment } = await serviceClient
            .from('course_enrollments')
            .select('id, status')
            .eq('course_id', pkg.course_id)
            .eq('user_id', user.id)
            .in('status', ['active', 'completed'])
            .maybeSingle();

        if (!enrollment) {
            return {
                error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
            };
        }
    }

    return {
        serviceClient,
        user: user as User,
        pkg,
        profile,
        isPrivileged,
    };
}
