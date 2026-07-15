import { NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { getRequestUser } from '@/lib/auth/request-user';

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

function getSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
    if (!relation) return null;
    return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function authorizeScormPackageAccess(request: NextRequest, packageId: string) {
    const serviceClient = createServiceClient();
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
