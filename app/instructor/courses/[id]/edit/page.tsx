import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { redirect } from 'next/navigation';
import EditCourseClient from './EditCourseClient';

export default async function EditCoursePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ panel?: string }>;
}) {
    const { id: courseId } = await params;
    const { panel } = await searchParams;
    const supabase = await createClient();

    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=/instructor/courses/${courseId}/edit`);

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
        redirect('/dashboard');
    }

    const [{ data: course }, { data: mods }, { data: quizData }] = await Promise.all([
        supabase
            .from('courses')
            .select('id, title, status, review_status, description, category_id, difficulty_level, estimated_duration_hours, thumbnail_url, updated_at, published_at, author_id, deleted_at')
            .eq('id', courseId)
            .maybeSingle(),
        supabase
            .from('course_modules')
            .select('id, order_index, is_required, learning_modules(id, title, media_type, estimated_duration_minutes)')
            .eq('course_id', courseId)
            .order('order_index'),
        supabase
            .from('quizzes')
            .select('id, title, passing_score, module_id')
            .eq('course_id', courseId),
    ]);

    if (!course || course.deleted_at) redirect('/instructor/courses');
    if (profile.role !== 'admin' && course.author_id !== user.id) redirect('/instructor/courses');

    return (
        <EditCourseClient
            initialPanel={panel === 'scorm' ? 'scorm' : 'settings'}
            courseId={courseId}
            userId={user.id}
            initialCourse={course as any}
            initialRawModules={mods as any}
            initialQuizzes={quizData ?? []}
        />
    );
}
