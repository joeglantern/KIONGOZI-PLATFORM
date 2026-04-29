export type AuthoringTarget =
    | { type: 'settings' }
    | { type: 'scorm' }
    | { type: 'module'; id: string }
    | { type: 'quiz'; id: string | null };

export type CourseRevisionEntityType = 'course' | 'module' | 'quiz' | 'publish' | 'scorm';

export type CourseReadinessState = 'needs_attention' | 'ready_to_publish' | 'published';

export interface CourseRevisionRecord {
    id: string;
    course_id: string;
    entity_type: CourseRevisionEntityType;
    entity_id: string | null;
    summary: string;
    snapshot: Record<string, any> | null;
    created_by: string;
    created_at: string;
}

export interface LogCourseRevisionInput {
    courseId: string;
    entityType: CourseRevisionEntityType;
    entityId?: string | null;
    summary: string;
    snapshot?: Record<string, any> | null;
    createdBy?: string | null;
}

export interface CourseValidationMeta {
    id: string;
    title: string;
    description?: string | null;
    category_id?: string | null;
    thumbnail_url?: string | null;
    status?: string | null;
    updated_at?: string | null;
    published_at?: string | null;
}

export interface ModuleValidationRecord {
    moduleId: string;
    courseModuleId: string;
    title?: string | null;
    description?: string | null;
    content?: string | null;
    media_type?: string | null;
    media_url?: string | null;
}

export interface QuizValidationRecord {
    id: string;
    title?: string | null;
    questionCount: number;
    invalidQuestionCount: number;
    missingCorrectAnswerCount: number;
}

export interface ScormValidationRecord {
    id: string;
    title?: string | null;
}

export interface ValidationCheck {
    id: string;
    label: string;
    description: string;
    passed: boolean;
    blocking: boolean;
}

export interface ValidationIssue {
    id: string;
    level: 'blocking' | 'warning';
    label: string;
    description: string;
    target: AuthoringTarget;
}

export interface CourseReadinessSummary {
    status: CourseReadinessState;
    statusLabel: string;
    checks: ValidationCheck[];
    issues: ValidationIssue[];
    blockingCount: number;
    warningCount: number;
    completedChecks: number;
    totalChecks: number;
}

export function stripRichText(value?: string | null) {
    if (!value) return '';

    return value
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#160;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function hasMeaningfulRichText(value?: string | null) {
    return stripRichText(value).length > 0;
}

export async function logCourseRevision(supabase: any, input: LogCourseRevisionInput) {
    if (!input.createdBy) return null;

    const { data, error } = await supabase
        .from('course_revisions')
        .insert({
            course_id: input.courseId,
            entity_type: input.entityType,
            entity_id: input.entityId || null,
            summary: input.summary,
            snapshot: input.snapshot || null,
            created_by: input.createdBy,
        })
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[course-revisions] Failed to log revision:', error);
        return null;
    }

    return data;
}

export function buildCourseReadiness(params: {
    course: CourseValidationMeta;
    modules: ModuleValidationRecord[];
    quizzes: QuizValidationRecord[];
    scormPackages: ScormValidationRecord[];
}): CourseReadinessSummary {
    const { course, modules, quizzes, scormPackages } = params;

    const issues: ValidationIssue[] = [];

    if (!course.title?.trim()) {
        issues.push({
            id: 'course-title',
            level: 'blocking',
            label: 'Course title is missing',
            description: 'Add a course title before publishing.',
            target: { type: 'settings' },
        });
    }

    if (!hasMeaningfulRichText(course.description)) {
        issues.push({
            id: 'course-description',
            level: 'blocking',
            label: 'Course description is missing',
            description: 'Write a course description so learners know what they are enrolling in.',
            target: { type: 'settings' },
        });
    }

    if (!course.thumbnail_url) {
        issues.push({
            id: 'course-thumbnail',
            level: 'blocking',
            label: 'Course thumbnail is missing',
            description: 'Upload a thumbnail to improve discovery and trust.',
            target: { type: 'settings' },
        });
    }

    if (!course.category_id) {
        issues.push({
            id: 'course-category',
            level: 'blocking',
            label: 'Course category is missing',
            description: 'Assign a category so the course shows up in the right place.',
            target: { type: 'settings' },
        });
    }

    const curriculumCount = modules.length + quizzes.length + scormPackages.length;
    if (curriculumCount === 0) {
        issues.push({
            id: 'course-curriculum',
            level: 'blocking',
            label: 'No curriculum items yet',
            description: 'Add at least one lesson, quiz, or SCORM package before publishing.',
            target: { type: 'settings' },
        });
    }

    for (const module of modules) {
        if (!module.title?.trim()) {
            issues.push({
                id: `module-title-${module.courseModuleId}`,
                level: 'blocking',
                label: 'A lesson is missing a title',
                description: 'Give each lesson a descriptive title before publishing.',
                target: { type: 'module', id: module.courseModuleId },
            });
        }

        if (module.media_type === 'text' && !hasMeaningfulRichText(module.content)) {
            issues.push({
                id: `module-content-${module.courseModuleId}`,
                level: 'blocking',
                label: `${module.title || 'A lesson'} has no body content`,
                description: 'Text lessons need lesson content before learners can use them.',
                target: { type: 'module', id: module.courseModuleId },
            });
        }

        if (module.media_type && module.media_type !== 'text' && !module.media_url) {
            issues.push({
                id: `module-media-${module.courseModuleId}`,
                level: 'blocking',
                label: `${module.title || 'A lesson'} is missing its media file`,
                description: 'Video and audio lessons need an uploaded media file before publishing.',
                target: { type: 'module', id: module.courseModuleId },
            });
        }

        if (!module.description?.trim()) {
            issues.push({
                id: `module-description-${module.courseModuleId}`,
                level: 'warning',
                label: `${module.title || 'A lesson'} has no short description`,
                description: 'Add a short description to improve the course outline and learner context.',
                target: { type: 'module', id: module.courseModuleId },
            });
        }
    }

    for (const quiz of quizzes) {
        if (!quiz.title?.trim()) {
            issues.push({
                id: `quiz-title-${quiz.id}`,
                level: 'blocking',
                label: 'A quiz is missing a title',
                description: 'Give each quiz a title before publishing.',
                target: { type: 'quiz', id: quiz.id },
            });
        }

        if (quiz.questionCount === 0) {
            issues.push({
                id: `quiz-questions-${quiz.id}`,
                level: 'blocking',
                label: `${quiz.title || 'A quiz'} has no questions`,
                description: 'Add at least one question before publishing.',
                target: { type: 'quiz', id: quiz.id },
            });
        }

        if (quiz.invalidQuestionCount > 0) {
            issues.push({
                id: `quiz-invalid-${quiz.id}`,
                level: 'blocking',
                label: `${quiz.title || 'A quiz'} has incomplete questions`,
                description: `${quiz.invalidQuestionCount} question(s) are missing text or enough answer options.`,
                target: { type: 'quiz', id: quiz.id },
            });
        }

        if (quiz.missingCorrectAnswerCount > 0) {
            issues.push({
                id: `quiz-correct-${quiz.id}`,
                level: 'blocking',
                label: `${quiz.title || 'A quiz'} has questions without a correct answer`,
                description: `${quiz.missingCorrectAnswerCount} question(s) need a correct answer selected.`,
                target: { type: 'quiz', id: quiz.id },
            });
        }
    }

    const blockingCount = issues.filter((issue) => issue.level === 'blocking').length;
    const warningCount = issues.filter((issue) => issue.level === 'warning').length;

    const checks: ValidationCheck[] = [
        {
            id: 'check-title',
            label: 'Course title',
            description: 'Learners should immediately understand what this course is about.',
            passed: !!course.title?.trim(),
            blocking: true,
        },
        {
            id: 'check-description',
            label: 'Course description',
            description: 'A clear description helps enrollment and sets expectations.',
            passed: hasMeaningfulRichText(course.description),
            blocking: true,
        },
        {
            id: 'check-thumbnail',
            label: 'Course thumbnail',
            description: 'A thumbnail improves discoverability in course lists.',
            passed: !!course.thumbnail_url,
            blocking: true,
        },
        {
            id: 'check-category',
            label: 'Category',
            description: 'Categories keep the course discoverable and organized.',
            passed: !!course.category_id,
            blocking: true,
        },
        {
            id: 'check-curriculum',
            label: 'Curriculum items',
            description: 'At least one lesson, quiz, or SCORM package is required.',
            passed: curriculumCount > 0,
            blocking: true,
        },
        {
            id: 'check-lessons',
            label: 'Lessons are complete',
            description: 'Each lesson has the content or media it needs.',
            passed: modules.length > 0 && !issues.some((issue) => issue.id.startsWith('module-') && issue.level === 'blocking'),
            blocking: true,
        },
        // Only show quiz check when quizzes actually exist — no quizzes means nothing to validate
        ...(quizzes.length > 0 ? [{
            id: 'check-quizzes',
            label: 'Quizzes are valid',
            description: 'Each quiz has complete questions and correct answers.',
            passed: !issues.some((issue) => issue.id.startsWith('quiz-') && issue.level === 'blocking'),
            blocking: true,
        }] : []),
    ];

    const status: CourseReadinessState = course.status === 'published'
        ? 'published'
        : blockingCount > 0
            ? 'needs_attention'
            : 'ready_to_publish';

    return {
        status,
        statusLabel:
            status === 'published'
                ? 'Published'
                : status === 'ready_to_publish'
                    ? 'Ready to publish'
                    : 'Needs attention',
        checks,
        issues,
        blockingCount,
        warningCount,
        completedChecks: checks.filter((check) => check.passed).length,
        totalChecks: checks.length,
    };
}
