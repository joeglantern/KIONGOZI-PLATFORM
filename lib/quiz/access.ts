import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getRequestUser } from '@/lib/auth/request-user';

export async function authorizeInstructorCourseAccess(request: NextRequest, courseId: string) {
    const serviceClient = createServiceClient();
    const user = await getRequestUser(request, serviceClient);

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const [{ data: profile }, { data: course, error: courseError }] = await Promise.all([
        serviceClient.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        serviceClient.from('courses').select('id, author_id').eq('id', courseId).maybeSingle(),
    ]);

    if (courseError || !course) {
        return { error: NextResponse.json({ error: 'Course not found' }, { status: 404 }) };
    }

    if (profile?.role !== 'admin' && course.author_id !== user.id) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { serviceClient, user, profile, course };
}

export async function authorizeQuizAccess(request: NextRequest, courseId: string, quizId: string) {
    const serviceClient = createServiceClient();
    const user = await getRequestUser(request, serviceClient);

    if (!user) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const [{ data: profile }, { data: quiz, error: quizError }, { data: course, error: courseError }] = await Promise.all([
        serviceClient.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        serviceClient.from('quizzes').select('id, course_id, module_id, title, description, passing_score, time_limit_minutes').eq('id', quizId).eq('course_id', courseId).maybeSingle(),
        serviceClient.from('courses').select('author_id').eq('id', courseId).maybeSingle(),
    ]);

    if (quizError || !quiz) {
        return {
            error: NextResponse.json({ error: 'Quiz not found' }, { status: 404 }),
        };
    }

    if (courseError || !course) {
        return {
            error: NextResponse.json({ error: 'Course not found' }, { status: 404 }),
        };
    }

    const isPrivileged = profile?.role === 'admin' || course.author_id === user.id;

    if (!isPrivileged) {
        const { data: enrollment } = await serviceClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
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
        user,
        profile,
        course,
        quiz,
        isPrivileged,
    };
}
