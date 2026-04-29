import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
import EditCourseClient from './EditCourseClient';

export default async function EditCoursePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: courseId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
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
            .select('id, title, status, review_status, description, category_id, difficulty_level, estimated_duration_hours, thumbnail_url, updated_at, published_at, author_id')
            .eq('id', courseId)
            .single(),
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

    if (!course) redirect('/instructor/courses');
    if (profile.role !== 'admin' && course.author_id !== user.id) redirect('/instructor/courses');

    return (
        <EditCourseClient
            courseId={courseId}
            userId={user.id}
            initialCourse={course as any}
            initialRawModules={mods as any}
            initialQuizzes={quizData ?? []}
        />
    );
}
