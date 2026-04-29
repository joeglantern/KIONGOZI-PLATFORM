import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
import ModuleViewerClient from './ModuleViewerClient';

export default async function ModuleViewerPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; moduleId: string }>;
    searchParams: Promise<{ preview?: string }>;
}) {
    const { id: courseId, moduleId } = await params;
    const { preview } = await searchParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=/courses/${courseId}/modules/${moduleId}`);

    // Profile + course + membership check — all in parallel
    const [{ data: profile }, { data: course }, { data: courseModule }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('courses').select('id, title, author_id').eq('id', courseId).maybeSingle(),
        supabase
            .from('course_modules')
            .select('id')
            .eq('course_id', courseId)
            .eq('module_id', moduleId)
            .maybeSingle(),
    ]);

    if (!course) redirect('/courses');
    if (!courseModule) redirect(`/courses/${courseId}`);

    const isPrivileged =
        profile?.role === 'admin' || course.author_id === user.id;
    const isPreviewMode = preview === '1' && isPrivileged;

    if (!isPrivileged) {
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .eq('user_id', user.id)
            .in('status', ['active', 'completed'])
            .maybeSingle();

        if (!enrollment) redirect(`/courses/${courseId}`);
    }

    // Module content + sidebar list + progress + quiz — all in parallel
    const [
        { data: moduleData },
        { data: courseModuleLinks },
        { data: progressRows },
        { data: quiz },
    ] = await Promise.all([
        supabase
            .from('learning_modules')
            .select('id, title, description, content, media_type, media_url, transcription, estimated_duration_minutes, difficulty_level')
            .eq('id', moduleId)
            .maybeSingle(),
        supabase
            .from('course_modules')
            .select('order_index, module_id')
            .eq('course_id', courseId)
            .order('order_index'),
        supabase
            .from('user_progress')
            .select('module_id, status, notes')
            .eq('user_id', user.id)
            .eq('course_id', courseId),
        supabase
            .from('quizzes')
            .select('id, title, passing_score')
            .eq('module_id', moduleId)
            .maybeSingle(),
    ]);

    if (!moduleData) redirect(`/courses/${courseId}`);

    // Fetch sidebar module titles
    const moduleIds = (courseModuleLinks ?? []).map((l: any) => l.module_id).filter(Boolean);
    let moduleRows: any[] = [];
    if (moduleIds.length > 0) {
        const source = isPrivileged ? 'learning_modules' : 'learning_module_previews';
        const { data } = await supabase
            .from(source)
            .select('id, title, description, estimated_duration_minutes, media_type')
            .in('id', moduleIds);
        moduleRows = data ?? [];
    }

    const moduleMap = new Map(moduleRows.map((m: any) => [m.id, m]));
    const allModules = (courseModuleLinks ?? [])
        .map((link: any) => {
            const m = moduleMap.get(link.module_id);
            if (!m) return null;
            return {
                order_index: link.order_index,
                module_id: link.module_id,
                learning_modules: m,
            };
        })
        .filter(Boolean);

    return (
        <ModuleViewerClient
            key={moduleId}
            userId={user.id}
            userEmail={user.email ?? ''}
            profile={profile}
            course={course}
            moduleData={moduleData}
            allModules={allModules as any[]}
            initialProgress={progressRows ?? []}
            quiz={quiz}
            isPrivileged={isPrivileged}
            isPreviewMode={isPreviewMode}
            courseId={courseId}
            moduleId={moduleId}
        />
    );
}
