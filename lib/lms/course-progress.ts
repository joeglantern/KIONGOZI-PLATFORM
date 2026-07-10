type SupabaseLike = {
    from: (table: string) => any;
};

export type CourseProgressSnapshot = {
    progressPercentage: number;
    completedItems: number;
    totalItems: number;
    finalQuizRequired: boolean;
    finalQuizPassed: boolean;
};

export async function getCourseProgressSnapshot(
    supabase: SupabaseLike,
    userId: string,
    courseId: string
): Promise<CourseProgressSnapshot> {
    const [{ data: courseModules }, { data: scormPackages }, { data: finalQuiz }] = await Promise.all([
        supabase
            .from('course_modules')
            .select('module_id')
            .eq('course_id', courseId),
        supabase
            .from('scorm_packages')
            .select('id')
            .eq('course_id', courseId)
            .eq('status', 'active'),
        supabase
            .from('quizzes')
            .select('id')
            .eq('course_id', courseId)
            .is('module_id', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
    ]);

    const moduleIds = (courseModules ?? []).map((moduleLink: any) => moduleLink.module_id).filter(Boolean);
    const scormIds = (scormPackages ?? []).map((pkg: any) => pkg.id).filter(Boolean);
    const finalQuizId = finalQuiz?.id ?? null;

    let completedModuleCount = 0;
    if (moduleIds.length > 0) {
        const { data: completedModules } = await supabase
            .from('user_progress')
            .select('module_id')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .in('module_id', moduleIds);

        completedModuleCount = new Set((completedModules ?? []).map((progress: any) => progress.module_id)).size;
    }

    let completedScormCount = 0;
    if (scormIds.length > 0) {
        const { data: completedScorm } = await supabase
            .from('scorm_registrations')
            .select('package_id')
            .eq('user_id', userId)
            .in('package_id', scormIds)
            .in('lesson_status', ['completed', 'passed']);

        completedScormCount = new Set((completedScorm ?? []).map((registration: any) => registration.package_id)).size;
    }

    let finalQuizPassed = false;
    if (finalQuizId) {
        const { data: finalPass } = await supabase
            .from('quiz_attempts')
            .select('id')
            .eq('user_id', userId)
            .eq('quiz_id', finalQuizId)
            .eq('passed', true)
            .limit(1)
            .maybeSingle();

        finalQuizPassed = !!finalPass;
    }

    const finalQuizRequired = !!finalQuizId;
    const totalItems = moduleIds.length + scormIds.length + (finalQuizRequired ? 1 : 0);
    const completedItems = completedModuleCount + completedScormCount + (finalQuizPassed ? 1 : 0);
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
        progressPercentage,
        completedItems,
        totalItems,
        finalQuizRequired,
        finalQuizPassed,
    };
}

export async function syncCourseEnrollmentProgress(
    supabase: SupabaseLike,
    userId: string,
    courseId: string
): Promise<CourseProgressSnapshot> {
    const snapshot = await getCourseProgressSnapshot(supabase, userId, courseId);
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
        progress_percentage: snapshot.progressPercentage,
        last_accessed_at: now,
        status: snapshot.progressPercentage === 100 ? 'completed' : 'active',
    };

    if (snapshot.progressPercentage === 100) {
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('completed_at')
            .eq('course_id', courseId)
            .eq('user_id', userId)
            .maybeSingle();

        updatePayload.completed_at = enrollment?.completed_at ?? now;
    }

    await supabase
        .from('course_enrollments')
        .update(updatePayload)
        .eq('course_id', courseId)
        .eq('user_id', userId);

    return snapshot;
}
