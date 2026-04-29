"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/app/utils/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ReadinessRail } from '@/components/instructor/ReadinessRail';
import {
    buildCourseReadiness,
    logCourseRevision,
    type AuthoringTarget,
    type CourseReadinessSummary,
    type CourseRevisionRecord,
    type ModuleValidationRecord,
    type QuizValidationRecord,
    type ScormValidationRecord,
} from '@/lib/course-authoring';
import {
    ArrowLeft,
    Loader2,
    Plus,
    BookOpen,
    Trash2,
    GripVertical,
    Settings,
    Package,
    HelpCircle,
    Eye,
    ChevronLeft,
} from 'lucide-react';

function PanelLoader() {
    return (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
        </div>
    );
}

const ModuleEditorPanel = dynamic(
    () => import('@/components/instructor/ModuleEditorPanel'),
    { ssr: false, loading: () => <PanelLoader /> }
);

const CourseSettingsPanel = dynamic(
    () => import('@/components/instructor/CourseSettingsPanel'),
    { ssr: false, loading: () => <PanelLoader /> }
);

const QuizBuilder = dynamic(
    () => import('@/components/quiz/QuizBuilder'),
    { ssr: false, loading: () => <PanelLoader /> }
);

const ScormUpload = dynamic(
    () => import('@/components/scorm/ScormUpload'),
    { ssr: false, loading: () => <PanelLoader /> }
);

type Selection =
    | { type: 'settings' }
    | { type: 'scorm' }
    | { type: 'module'; id: string }
    // moduleId = learning_module id this quiz follows; null = end-of-course quiz
    | { type: 'quiz'; id: string | null; moduleId: string | null };

interface CourseModule {
    id: string;
    order_index: number;
    is_required: boolean;
    learning_modules: {
        id: string;
        title: string;
        media_type: string;
        estimated_duration_minutes: number;
    };
}

interface Quiz {
    id: string;
    title: string;
    passing_score: number;
    module_id: string | null; // null = end-of-course quiz
}

interface CourseMeta {
    id: string;
    title: string;
    status: string;
    review_status?: string | null;
    description?: string | null;
    category_id?: string | null;
    difficulty_level?: string | null;
    estimated_duration_hours?: number | null;
    thumbnail_url?: string | null;
    updated_at?: string | null;
    published_at?: string | null;
    author_id?: string | null;
}

interface RawCourseModule {
    id: string;
    order_index: number | null;
    is_required: boolean | null;
    learning_modules:
        | {
            id: string;
            title: string | null;
            media_type: string | null;
            estimated_duration_minutes: number | null;
        }
        | Array<{
            id: string;
            title: string | null;
            media_type: string | null;
            estimated_duration_minutes: number | null;
        }>
        | null;
}

function normalizeCourseModules(rows: RawCourseModule[] | null | undefined): CourseModule[] {
    return (rows || [])
        .map((row, index) => {
            const learningModule = Array.isArray(row.learning_modules)
                ? row.learning_modules[0]
                : row.learning_modules;

            if (!learningModule) {
                return null;
            }

            return {
                id: row.id,
                order_index: row.order_index ?? index,
                is_required: row.is_required ?? true,
                learning_modules: {
                    id: learningModule.id,
                    title: learningModule.title || 'Untitled Module',
                    media_type: learningModule.media_type || 'text',
                    estimated_duration_minutes: learningModule.estimated_duration_minutes ?? 30,
                },
            };
        })
        .filter((row): row is CourseModule => row !== null)
        .sort((a, b) => a.order_index - b.order_index);
}

function reindexModules(items: CourseModule[]): CourseModule[] {
    return items.map((item, index) => ({
        ...item,
        order_index: index,
    }));
}

interface EditCourseClientProps {
    courseId: string;
    userId: string;
    initialCourse: CourseMeta;
    initialRawModules: RawCourseModule[] | null;
    initialQuizzes: Quiz[];
}

export default function EditCourseClient({
    courseId,
    userId,
    initialCourse,
    initialRawModules,
    initialQuizzes,
}: EditCourseClientProps) {
    const supabase = useMemo(() => createClient(), []);
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [courseTitle, setCourseTitle] = useState(initialCourse.title ?? '');
    const [courseStatus, setCourseStatus] = useState(initialCourse.status ?? 'draft');
    const [courseMeta, setCourseMeta] = useState<CourseMeta | null>(initialCourse);
    const [modules, setModules] = useState<CourseModule[]>(() => normalizeCourseModules(initialRawModules));
    const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
    const [selection, setSelection] = useState<Selection>({ type: 'settings' });
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [validationLoading, setValidationLoading] = useState(false);
    // Seed from server data immediately so readiness rail isn't wrong before validation fetch completes
    const [moduleValidation, setModuleValidation] = useState<ModuleValidationRecord[]>(() =>
        normalizeCourseModules(initialRawModules).map(m => ({
            moduleId: m.learning_modules.id,
            courseModuleId: m.id,
            title: m.learning_modules.title,
            description: '',
            content: '',
            media_type: m.learning_modules.media_type,
            media_url: '',
        }))
    );
    const [quizValidation, setQuizValidation] = useState<QuizValidationRecord[]>([]);
    const [scormPackages, setScormPackages] = useState<ScormValidationRecord[]>([]);
    const [revisions, setRevisions] = useState<CourseRevisionRecord[]>([]);
    const [revisionsLoading, setRevisionsLoading] = useState(false);
    const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
    const [panelRefreshNonce, setPanelRefreshNonce] = useState(0);

    const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const metaRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadRevisions = useCallback(async () => {
        try {
            setRevisionsLoading(true);
            const { data, error } = await supabase
                .from('course_revisions')
                .select('id, course_id, entity_type, entity_id, summary, snapshot, created_by, created_at')
                .eq('course_id', courseId)
                .order('created_at', { ascending: false })
                .limit(12);

            if (error) throw error;
            setRevisions(data || []);
        } catch (error) {
            console.error('[EditCourse] loadRevisions error:', error);
        } finally {
            setRevisionsLoading(false);
        }
    }, [courseId, supabase]);

    const loadValidationData = useCallback(async (sourceModules?: CourseModule[], sourceQuizzes?: Quiz[]) => {
        const activeModules = sourceModules ?? modules;
        const activeQuizzes = sourceQuizzes ?? quizzes;

        try {
            setValidationLoading(true);

            const moduleIds = activeModules.map((item) => item.learning_modules.id);
            const quizIds = activeQuizzes.map((item) => item.id);

            const [moduleResult, scormResult, questionResult] = await Promise.all([
                moduleIds.length
                    ? supabase
                        .from('learning_modules')
                        .select('id, title, description, content, media_type, media_url')
                        .in('id', moduleIds)
                    : Promise.resolve({ data: [], error: null }),
                supabase
                    .from('scorm_packages')
                    .select('id, title')
                    .eq('course_id', courseId)
                    .eq('status', 'active'),
                quizIds.length
                    ? supabase
                        .from('quiz_questions')
                        .select('id, quiz_id, question_text')
                        .in('quiz_id', quizIds)
                    : Promise.resolve({ data: [], error: null }),
            ]);

            if (moduleResult.error) throw moduleResult.error;
            if (scormResult.error) throw scormResult.error;
            if (questionResult.error) throw questionResult.error;

            const questionRows = questionResult.data || [];
            const questionIds = questionRows.map((row: any) => row.id);

            const optionResult = questionIds.length
                ? await supabase
                    .from('quiz_options')
                    .select('question_id, option_text, is_correct')
                    .in('question_id', questionIds)
                : { data: [], error: null };

            if (optionResult.error) throw optionResult.error;

            const moduleMap = new Map((moduleResult.data || []).map((row: any) => [row.id, row]));
            const questionMap = new Map<string, any[]>();
            const optionMap = new Map<string, any[]>();

            questionRows.forEach((row: any) => {
                questionMap.set(row.quiz_id, [...(questionMap.get(row.quiz_id) || []), row]);
            });

            (optionResult.data || []).forEach((row: any) => {
                optionMap.set(row.question_id, [...(optionMap.get(row.question_id) || []), row]);
            });

            setModuleValidation(
                activeModules.map((moduleLink) => {
                    const row = moduleMap.get(moduleLink.learning_modules.id);
                    return {
                        moduleId: moduleLink.learning_modules.id,
                        courseModuleId: moduleLink.id,
                        title: row?.title || moduleLink.learning_modules.title,
                        description: row?.description || '',
                        content: row?.content || '',
                        media_type: row?.media_type || moduleLink.learning_modules.media_type,
                        media_url: row?.media_url || '',
                    };
                })
            );

            setQuizValidation(
                activeQuizzes.map((quiz) => {
                    const quizQuestions = questionMap.get(quiz.id) || [];

                    return {
                        id: quiz.id,
                        title: quiz.title,
                        questionCount: quizQuestions.length,
                        invalidQuestionCount: quizQuestions.filter((question) => {
                            const options = optionMap.get(question.id) || [];
                            const filledOptions = options.filter((option) => option.option_text?.trim());
                            return !question.question_text?.trim() || filledOptions.length < 2;
                        }).length,
                        missingCorrectAnswerCount: quizQuestions.filter((question) => {
                            const options = optionMap.get(question.id) || [];
                            return !options.some((option) => option.is_correct);
                        }).length,
                    };
                })
            );

            setScormPackages(scormResult.data || []);
        } catch (error) {
            console.error('[EditCourse] loadValidationData error:', error);
        } finally {
            setValidationLoading(false);
        }
    }, [courseId, modules, quizzes, supabase]);

    const loadData = useCallback(async () => {
        try {
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

            if (course) {
                setCourseTitle(course.title || '');
                setCourseStatus(course.status || 'draft');
                setCourseMeta(course);
            }

            const normalizedModules = normalizeCourseModules(mods as RawCourseModule[] | null);
            const nextQuizzes = quizData || [];
            setModules(normalizedModules);
            setQuizzes(nextQuizzes);

            void Promise.all([
                loadValidationData(normalizedModules, nextQuizzes),
                loadRevisions(),
            ]);
        } catch (err) {
            console.error('[EditCourse] loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [courseId, loadRevisions, loadValidationData, supabase]);

    const scheduleMetadataRefresh = useCallback(() => {
        if (metaRefreshTimer.current) clearTimeout(metaRefreshTimer.current);
        metaRefreshTimer.current = setTimeout(() => {
            void Promise.all([loadValidationData(), loadRevisions()]);
        }, 300);
    }, [loadRevisions, loadValidationData]);

    const persistModuleOrder = useCallback(async (items: CourseModule[]) => {
        const orderedModules = reindexModules(items);
        setModules(orderedModules);

        const results = await Promise.all(
            orderedModules.map((item) =>
                supabase
                    .from('course_modules')
                    .update({ order_index: item.order_index })
                    .eq('id', item.id)
            )
        );

        const orderError = results.find((result) => result.error)?.error;
        if (orderError) {
            toast({ title: 'Failed to save module order', description: orderError.message, variant: 'destructive' });
            await loadData();
            return;
        }

        scheduleMetadataRefresh();
    }, [loadData, scheduleMetadataRefresh, supabase, toast]);

    // Initial data comes from server — only fetch validation & revisions on mount
    useEffect(() => {
        void Promise.all([
            loadValidationData(modules, quizzes),
            loadRevisions(),
        ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTitleChange = (val: string) => {
        setCourseTitle(val);
        setCourseMeta((prev) => prev ? { ...prev, title: val } : prev);
        if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
        titleSaveTimer.current = setTimeout(async () => {
            await supabase.from('courses').update({ title: val.trim() || 'Untitled Course' }).eq('id', courseId);
        }, 800);
    };

    const readiness = useMemo<CourseReadinessSummary | null>(() => {
        if (!courseMeta) return null;

        return buildCourseReadiness({
            course: {
                id: courseMeta.id,
                title: courseTitle,
                description: courseMeta.description,
                category_id: courseMeta.category_id,
                thumbnail_url: courseMeta.thumbnail_url,
                status: courseStatus,
                updated_at: courseMeta.updated_at,
                published_at: courseMeta.published_at,
            },
            modules: moduleValidation,
            quizzes: quizValidation,
            scormPackages,
        });
    }, [courseMeta, courseStatus, courseTitle, moduleValidation, quizValidation, scormPackages]);

    const handleTogglePublish = async () => {
        if (courseStatus !== 'published' && readiness?.blockingCount) {
            toast({
                title: 'Fix blockers before publishing',
                description: readiness.issues[0]?.label || 'This course still has publish blockers.',
                variant: 'destructive',
            });

            const firstIssue = readiness.issues[0];
            if (firstIssue) {
                if (firstIssue.target.type === 'settings' || firstIssue.target.type === 'scorm') {
                    setSelection({ type: firstIssue.target.type });
                } else {
                    setSelection(firstIssue.target as Selection);
                }
            }
            return;
        }

        const newStatus = courseStatus === 'published' ? 'draft' : 'published';

        try {
            setPublishing(true);
            const publishedAt = newStatus === 'published' ? new Date().toISOString() : null;
            const { error } = await supabase.from('courses').update({
                status: newStatus,
                review_status: newStatus === 'published' ? 'approved' : readiness?.blockingCount ? 'draft' : 'approved',
                published_at: publishedAt,
            }).eq('id', courseId);
            if (error) throw error;

            setCourseStatus(newStatus);
            setCourseMeta((prev) => prev ? { ...prev, status: newStatus, published_at: publishedAt } : prev);

            await logCourseRevision(supabase, {
                courseId,
                entityType: 'publish',
                summary: newStatus === 'published' ? 'Published course' : 'Returned course to draft',
                snapshot: {
                    status: newStatus,
                    published_at: publishedAt,
                },
                createdBy: userId,
            });
            void loadRevisions();

            toast({ title: newStatus === 'published' ? 'Course published' : 'Course set to draft' });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setPublishing(false);
        }
    };

    const handleAddModule = async () => {
        const nextOrderIndex = modules.reduce((maxOrder, item) => Math.max(maxOrder, item.order_index), -1) + 1;

        try {
            const { data: mod, error: modErr } = await supabase
                .from('learning_modules')
                .insert({
                    title: 'Untitled Module',
                    media_type: 'text',
                    author_id: userId,
                    status: 'draft',
                    estimated_duration_minutes: 30,
                    difficulty_level: 'beginner',
                })
                .select('id')
                .single();
            if (modErr) throw modErr;

            const { data: link, error: linkErr } = await supabase
                .from('course_modules')
                .insert({
                    course_id: courseId,
                    module_id: mod.id,
                    order_index: nextOrderIndex,
                    is_required: true,
                })
                .select('id')
                .single();
            if (linkErr) throw linkErr;

            const newMod: CourseModule = {
                id: link.id,
                order_index: nextOrderIndex,
                is_required: true,
                learning_modules: {
                    id: mod.id,
                    title: 'Untitled Module',
                    media_type: 'text',
                    estimated_duration_minutes: 30,
                },
            };
            setModules(prev => [...prev, newMod]);
            setSelection({ type: 'module', id: link.id });
            scheduleMetadataRefresh();
        } catch (err: any) {
            toast({ title: 'Error creating module', description: err.message, variant: 'destructive' });
        }
    };

    const handleDeleteModule = useCallback(async (m: CourseModule) => {
        if (!confirm(`Delete "${m.learning_modules.title}"? This cannot be undone.`)) return;

        try {
            await Promise.all([
                supabase.from('course_modules').delete().eq('id', m.id),
                supabase.from('learning_modules').delete().eq('id', m.learning_modules.id),
            ]);

            const remainingModules = modules.filter((mod) => mod.id !== m.id);
            await persistModuleOrder(remainingModules);
            if (selection?.type === 'module' && selection.id === m.id) {
                setSelection({ type: 'settings' });
            }
            toast({ title: 'Module deleted' });
        } catch (err: any) {
            toast({ title: 'Error deleting module', description: err.message, variant: 'destructive' });
        }
    }, [modules, persistModuleOrder, selection, supabase, toast]);

    const handleModuleSaved = useCallback((data: { title: string; media_type: string; estimated_duration_minutes: number }) => {
        if (selection?.type !== 'module') return;
        const selId = selection.id;
        setModules(prev => prev.map(m =>
            m.id === selId
                ? { ...m, learning_modules: { ...m.learning_modules, ...data } }
                : m
        ));
        scheduleMetadataRefresh();
    }, [scheduleMetadataRefresh, selection]);

    const handleCourseSettingsSaved = useCallback((data: {
        description: string;
        difficulty_level: string;
        category_id: string;
        estimated_duration_hours: number;
        thumbnail_url: string;
    }) => {
        setCourseMeta((prev) => prev ? {
            ...prev,
            description: data.description,
            difficulty_level: data.difficulty_level,
            category_id: data.category_id || null,
            estimated_duration_hours: data.estimated_duration_hours,
            thumbnail_url: data.thumbnail_url || null,
            updated_at: new Date().toISOString(),
        } : prev);
    }, []);

    const handleDragStart = (idx: number) => setDragIndex(idx);

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === idx) return;
        const reordered = [...modules];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(idx, 0, moved);
        setModules(reindexModules(reordered));
        setDragIndex(idx);
    };

    const handleDrop = async () => {
        if (dragIndex === null) return;
        setDragIndex(null);
        await persistModuleOrder(modules);
    };

    // Full refresh (e.g. after restore) shows a brief spinner
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const selectedModule = selection.type === 'module'
        ? modules.find(m => m.id === selection.id)
        : null;

    const selectedModuleEntityId = selectedModule?.learning_modules.id || null;

    const decoratedRevisions = revisions.map((revision) => ({
        ...revision,
        restorable:
            (selection.type === 'settings' && revision.entity_type === 'course') ||
            (selection.type === 'module' && revision.entity_type === 'module' && revision.entity_id === selectedModuleEntityId),
    }));

    const handlePreviewCourse = () => {
        window.open(`/courses/${courseId}?preview=1`, '_blank', 'noopener,noreferrer');
    };

    const handlePreviewCurrentItem = () => {
        if (selection.type === 'module' && selectedModule) {
            window.open(`/courses/${courseId}/modules/${selectedModule.learning_modules.id}?preview=1`, '_blank', 'noopener,noreferrer');
            return;
        }

        handlePreviewCourse();
    };

    const handleSelectIssue = (issue: { target: AuthoringTarget }) => {
        if (issue.target.type === 'settings' || issue.target.type === 'scorm') {
            setSelection({ type: issue.target.type });
            return;
        }

        setSelection(issue.target as Selection);
    };

    const handleRestoreRevision = async (revisionId: string) => {
        const revision = revisions.find((item) => item.id === revisionId);
        if (!revision?.snapshot) return;

        try {
            setRestoringRevisionId(revisionId);

            if (revision.entity_type === 'course') {
                const snapshot = revision.snapshot as Record<string, any>;
                const { error } = await supabase
                    .from('courses')
                    .update({
                        description: snapshot.description || null,
                        difficulty_level: snapshot.difficulty_level,
                        category_id: snapshot.category_id || null,
                        estimated_duration_hours: snapshot.estimated_duration_hours,
                        thumbnail_url: snapshot.thumbnail_url || null,
                    })
                    .eq('id', courseId);

                if (error) throw error;
                setSelection({ type: 'settings' });
            }

            if (revision.entity_type === 'module') {
                const snapshot = revision.snapshot as Record<string, any>;
                const [{ error: moduleError }, { error: courseModuleError }] = await Promise.all([
                    supabase
                        .from('learning_modules')
                        .update({
                            title: snapshot.title || 'Untitled Module',
                            description: snapshot.description || null,
                            content: snapshot.content || null,
                            media_type: snapshot.media_type || 'text',
                            media_url: snapshot.media_url || null,
                            transcription: snapshot.transcription || null,
                            estimated_duration_minutes: snapshot.estimated_duration_minutes || 30,
                            difficulty_level: snapshot.difficulty_level || 'beginner',
                            learning_objectives: snapshot.learning_objectives
                                ? String(snapshot.learning_objectives).split('\n').map((item) => item.trim()).filter(Boolean)
                                : null,
                        })
                        .eq('id', revision.entity_id),
                    snapshot.course_module_id
                        ? supabase
                            .from('course_modules')
                            .update({
                                is_required: snapshot.is_required ?? true,
                            })
                            .eq('id', snapshot.course_module_id)
                        : Promise.resolve({ error: null }),
                ]);

                if (moduleError) throw moduleError;
                if (courseModuleError) throw courseModuleError;
            }

            await logCourseRevision(supabase, {
                courseId,
                entityType: revision.entity_type === 'module' ? 'module' : 'course',
                entityId: revision.entity_id,
                summary: `Restored ${revision.entity_type} from version history`,
                snapshot: revision.snapshot,
                createdBy: userId,
            });

            setPanelRefreshNonce((value) => value + 1);
            await loadData();
            toast({ title: 'Revision restored' });
        } catch (error: any) {
            toast({ title: 'Restore failed', description: error.message, variant: 'destructive' });
        } finally {
            setRestoringRevisionId(null);
        }
    };

    return (
        <div
                className="-m-4 lg:-m-8 flex flex-col overflow-hidden bg-white dark:bg-gray-950"
                style={{ height: 'calc(100vh - 64px)' }}
            >
                <div className="h-14 flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 gap-4 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setSidebarOpen(s => !s)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                        >
                            <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${sidebarOpen ? '' : 'rotate-180'}`} />
                        </button>

                        <Link
                            href="/instructor/courses"
                            className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0"
                            title="Back to My Courses"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>

                        <input
                            value={courseTitle}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            className="font-black text-gray-900 dark:text-white bg-transparent border-none outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded-lg px-2 py-1 text-sm min-w-0 flex-1 max-w-xs"
                            placeholder="Course title…"
                        />

                        <span className={`flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            readiness?.status === 'published'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : readiness?.status === 'ready_to_publish'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                            {readiness?.statusLabel || courseStatus}
                        </span>

                        {readiness && readiness.blockingCount > 0 && (
                            <span className="hidden md:inline-flex flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                                {readiness.blockingCount} blocker{readiness.blockingCount === 1 ? '' : 's'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePreviewCourse}
                            className="text-gray-500 font-bold gap-1.5 hidden sm:flex"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleTogglePublish}
                            disabled={publishing || (!!validationLoading && !readiness) || (courseStatus !== 'published' && !!readiness?.blockingCount)}
                            className={`font-bold rounded-lg px-4 text-xs h-8 ${courseStatus === 'published'
                                ? 'bg-green-100 hover:bg-red-50 text-green-700 hover:text-red-600 border border-green-200 hover:border-red-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                : readiness?.blockingCount
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20'
                                }`}
                        >
                            {publishing
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : courseStatus === 'published' ? 'Published ✓' : 'Publish'
                            }
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 min-h-0">
                    <div className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 flex flex-col overflow-hidden transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0'}`}>
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            <SidebarButton
                                icon={<Settings className="w-4 h-4 flex-shrink-0" />}
                                label="Course Settings"
                                active={selection.type === 'settings'}
                                onClick={() => setSelection({ type: 'settings' })}
                            />

                            {/* ── Lessons + inline quizzes ── */}
                            <div className="pt-4">
                                <div className="flex items-center justify-between px-3 mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lessons</span>
                                    <button
                                        onClick={handleAddModule}
                                        className="w-5 h-5 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors"
                                        title="Add lesson"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>

                                {modules.length === 0 ? (
                                    <button
                                        onClick={handleAddModule}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-orange-500 hover:bg-white dark:hover:bg-gray-800 transition-all border-2 border-dashed border-gray-200 dark:border-gray-700"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add your first lesson
                                    </button>
                                ) : (
                                    <div className="space-y-1">
                                        {modules.map((m, idx) => {
                                            const hasIssue = readiness?.issues.some((issue) => issue.target.type === 'module' && issue.target.id === m.id && issue.level === 'blocking');
                                            const moduleQuiz = quizzes.find(q => q.module_id === m.learning_modules.id);
                                            const quizSelected = selection.type === 'quiz' && selection.moduleId === m.learning_modules.id;
                                            const moduleSelected = selection.type === 'module' && selection.id === m.id;
                                            return (
                                                <div key={m.id} className="space-y-0.5">
                                                    {/* Lesson row */}
                                                    <div
                                                        draggable
                                                        onDragStart={() => handleDragStart(idx)}
                                                        onDragOver={(e) => handleDragOver(e, idx)}
                                                        onDrop={handleDrop}
                                                        onClick={() => setSelection({ type: 'module', id: m.id })}
                                                        className={`group flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-all ${moduleSelected
                                                            ? 'bg-orange-50 dark:bg-orange-900/20'
                                                            : 'hover:bg-white dark:hover:bg-gray-800'
                                                            } ${dragIndex === idx ? 'opacity-40 scale-95' : ''}`}
                                                    >
                                                        <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />
                                                        <div className="w-5 h-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center text-[9px] font-black text-gray-500 flex-shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <span className={`flex-1 text-xs font-bold truncate ${moduleSelected ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {m.learning_modules.title}
                                                        </span>
                                                        {hasIssue && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteModule(m); }}
                                                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Quiz sub-row attached to this lesson */}
                                                    <div className="ml-7">
                                                        {moduleQuiz ? (
                                                            <button
                                                                onClick={() => setSelection({ type: 'quiz', id: moduleQuiz.id, moduleId: m.learning_modules.id })}
                                                                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all ${quizSelected
                                                                    ? 'bg-orange-50 text-orange-600'
                                                                    : 'text-gray-400 hover:bg-white hover:text-gray-700'}`}
                                                            >
                                                                <HelpCircle className="w-3 h-3 flex-shrink-0" />
                                                                <span className="text-[11px] font-semibold truncate flex-1">{moduleQuiz.title}</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setSelection({ type: 'quiz', id: null, moduleId: m.learning_modules.id })}
                                                                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-gray-300 hover:text-orange-500 hover:bg-white transition-all"
                                                            >
                                                                <Plus className="w-3 h-3 flex-shrink-0" />
                                                                <span className="text-[11px] font-semibold">Add quiz after lesson</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add lesson button at bottom */}
                                        <button
                                            onClick={handleAddModule}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-orange-500 hover:bg-white dark:hover:bg-gray-800 transition-all mt-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add lesson
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ── Final / course-level quiz ── */}
                            <div className="pt-4">
                                <div className="px-3 mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Quiz</span>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Optional — appears at end of course</p>
                                </div>
                                {(() => {
                                    const courseQuiz = quizzes.find(q => q.module_id === null);
                                    const courseQuizSelected = selection.type === 'quiz' && selection.moduleId === null;
                                    return courseQuiz ? (
                                        <button
                                            onClick={() => setSelection({ type: 'quiz', id: courseQuiz.id, moduleId: null })}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${courseQuizSelected
                                                ? 'bg-orange-50 text-orange-600'
                                                : 'hover:bg-white text-gray-700'}`}
                                        >
                                            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="text-xs font-bold truncate flex-1">{courseQuiz.title}</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setSelection({ type: 'quiz', id: null, moduleId: null })}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-orange-500 hover:bg-white transition-all border-2 border-dashed border-gray-200"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add final quiz
                                        </button>
                                    );
                                })()}
                            </div>

                            {/* ── SCORM Package — prominent card ── */}
                            <div className="pt-4 pb-2">
                                <button
                                    onClick={() => setSelection({ type: 'scorm' })}
                                    className={`w-full rounded-2xl p-3.5 text-left transition-all group ${
                                        selection.type === 'scorm'
                                            ? 'bg-orange-500 shadow-md shadow-orange-500/30'
                                            : 'bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-400/20 hover:shadow-md hover:shadow-orange-500/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                            <Package className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-xs font-black text-white uppercase tracking-wide">SCORM Package</span>
                                    </div>
                                    <p className="text-[11px] text-orange-100 font-medium leading-snug pl-9.5">
                                        Upload an e-learning package (.zip) — replaces manual lessons
                                    </p>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden flex flex-col bg-white dark:bg-gray-950">
                        {selection.type === 'settings' && (
                            <CourseSettingsPanel
                                key={`settings-${panelRefreshNonce}`}
                                courseId={courseId}
                                userId={userId}
                                supabase={supabase}
                                initialData={{
                                    description: courseMeta?.description || '',
                                    difficulty_level: courseMeta?.difficulty_level || 'beginner',
                                    category_id: courseMeta?.category_id || '',
                                    estimated_duration_hours: courseMeta?.estimated_duration_hours || 1,
                                    thumbnail_url: courseMeta?.thumbnail_url || '',
                                }}
                                onSaved={handleCourseSettingsSaved}
                                onRevisionSaved={loadRevisions}
                            />
                        )}

                        {selection.type === 'module' && selectedModule && (
                            <ModuleEditorPanel
                                key={`${selection.id}-${panelRefreshNonce}`}
                                courseModuleId={selection.id}
                                courseId={courseId}
                                module={selectedModule.learning_modules}
                                userId={userId}
                                supabase={supabase}
                                onSaved={handleModuleSaved}
                                onRevisionSaved={loadRevisions}
                            />
                        )}

                        {selection.type === 'module' && !selectedModule && (
                            <EmptyPanel message="Module not found. It may have been deleted." />
                        )}

                        {selection.type === 'quiz' && (
                            <div className="flex-1 overflow-y-auto p-8">
                                <QuizBuilder
                                    key={`quiz-${selection.id || 'new'}-${selection.moduleId ?? 'course'}-${panelRefreshNonce}`}
                                    courseId={courseId}
                                    quizId={selection.id || undefined}
                                    moduleId={selection.moduleId ?? undefined}
                                    onSave={(savedQuizId) => {
                                        void loadData();
                                        if (savedQuizId) {
                                            setSelection({ type: 'quiz', id: savedQuizId, moduleId: selection.moduleId ?? null });
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {selection.type === 'scorm' && (
                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="max-w-2xl space-y-6">
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">SCORM Package</h2>
                                        <p className="text-sm text-gray-500 font-medium mt-1">
                                            Upload an Articulate, Captivate, or any SCORM 1.2 package to embed in this course.
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
                                        <ScormUpload
                                            courseId={courseId}
                                            onPackageLinked={(pkg) => {
                                                toast({ title: 'SCORM package linked', description: `${pkg.title} is ready to preview.` });
                                                scheduleMetadataRefresh();
                                            }}
                                        />
                                    </div>
                                    <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800/30 p-5">
                                        <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">How it works</p>
                                        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                                            <li>Export your course as SCORM 1.2 from Articulate or Captivate</li>
                                            <li>Upload the .zip file above — all files are extracted and stored securely</li>
                                            <li>Students launch the content from within this course — progress and scores sync automatically</li>
                                            <li>All interactions are tracked via xAPI statements in the Kiongozi LRS</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <ReadinessRail
                        readiness={readiness}
                        loadingReadiness={validationLoading}
                        revisions={decoratedRevisions}
                        loadingRevisions={revisionsLoading}
                        restoringRevisionId={restoringRevisionId}
                        onPreviewCourse={handlePreviewCourse}
                        onPreviewCurrentItem={selection.type === 'module' ? handlePreviewCurrentItem : null}
                        onSelectIssue={handleSelectIssue}
                        onRestoreRevision={handleRestoreRevision}
                    />
                </div>
        </div>
    );
}

function SidebarButton({
    icon, label, active, onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm font-bold ${active
                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

function EmptyPanel({ message }: { message: string }) {
    return (
        <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
                <BookOpen className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 font-bold text-sm">{message}</p>
            </div>
        </div>
    );
}
