import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getRequestUser } from '@/lib/auth/request-user';

export async function authorizeModuleContentAccess(request: NextRequest, courseId: string, moduleId: string) {
    const serviceClient = createServiceClient();
    const user = await getRequestUser(request, serviceClient);

    if (!user) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const [{ data: profile }, { data: course, error: courseError }, { data: courseModule, error: courseModuleError }] = await Promise.all([
        serviceClient.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        serviceClient.from('courses').select('id, title, author_id').eq('id', courseId).maybeSingle(),
        serviceClient.from('course_modules').select('id').eq('course_id', courseId).eq('module_id', moduleId).maybeSingle(),
    ]);

    if (courseError || !course) {
        return {
            error: NextResponse.json({ error: 'Course not found' }, { status: 404 }),
        };
    }

    if (courseModuleError || !courseModule) {
        return {
            error: NextResponse.json({ error: 'Module not found in this course' }, { status: 404 }),
        };
    }

    const isPrivileged = profile?.role === 'admin' || course.author_id === user.id;

    const [enrollmentResult, { data: module, error: moduleError }] = await Promise.all([
        isPrivileged
            ? Promise.resolve({ data: null })
            : serviceClient.from('course_enrollments').select('id').eq('course_id', courseId).eq('user_id', user.id).in('status', ['active', 'completed']).maybeSingle(),
        serviceClient.from('learning_modules').select('*').eq('id', moduleId).maybeSingle(),
    ]);

    if (!isPrivileged && !enrollmentResult.data) {
        return {
            error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        };
    }

    if (moduleError || !module) {
        return {
            error: NextResponse.json({ error: 'Module not found' }, { status: 404 }),
        };
    }

    return {
        serviceClient,
        user,
        profile,
        course,
        module,
        isPrivileged,
    };
}
