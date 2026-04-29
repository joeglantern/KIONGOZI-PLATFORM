"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { MarkdownRenderer } from '@/components/learning/MarkdownRenderer';
import { ModuleSidebar } from '@/components/learning/ModuleSidebar';
import {
    Loader2,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    Menu,
    X,
    Sparkles,
    Award,
    Clock,
    Zap,
    Play,
    StickyNote,
    Save,
    FileVideo,
    Music,
    MessageCircle,
    Volume2,
    Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import Link from 'next/link';
import { XP_PER_MODULE } from '@/lib/gamification';
import { xapi } from '@/lib/xapi';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { XPCelebration } from '@/components/gamification/XPCelebration';
import { fireModuleConfetti, fireCourseConfetti } from '@/lib/confetti';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { AccessibilityMenu } from '@/components/learning/AccessibilityMenu';

interface ProgressRow {
    module_id: string;
    status: string;
    notes: string | null;
}

interface ModuleViewerClientProps {
    userId: string;
    userEmail: string;
    profile: { role: string } | null;
    course: { id: string; title: string; author_id: string };
    moduleData: {
        id: string;
        title: string;
        description: string | null;
        content: string | null;
        media_type: string | null;
        media_url: string | null;
        transcription: string | null;
        estimated_duration_minutes: number | null;
        difficulty_level: string | null;
    };
    allModules: Array<{
        order_index: number;
        module_id: string;
        learning_modules: {
            id: string;
            title: string;
            description: string | null;
            estimated_duration_minutes: number | null;
            media_type: string | null;
        };
    }>;
    initialProgress: ProgressRow[];
    quiz: { id: string; title: string; passing_score: number } | null;
    isPrivileged: boolean;
    isPreviewMode: boolean;
    courseId: string;
    moduleId: string;
}

export default function ModuleViewerClient({
    userId,
    userEmail,
    profile,
    course,
    moduleData,
    allModules,
    initialProgress,
    quiz,
    isPrivileged,
    isPreviewMode,
    courseId,
    moduleId,
}: ModuleViewerClientProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { refreshProfile } = useUser();

    const [progress, setProgress] = useState<ProgressRow[]>(initialProgress);
    const [completing, setCompleting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [newBadges, setNewBadges] = useState<any[]>([]);
    const [pendingBadges, setPendingBadges] = useState<any[]>([]);
    const [earnedXp, setEarnedXp] = useState(0);
    const [notes, setNotes] = useState(
        initialProgress.find(p => p.module_id === moduleId)?.notes ?? ''
    );
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // Open sidebar by default on large screens
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setSidebarOpen(true);
        }
    }, []);

    const { speak, stop, isSpeaking, supported } = useTextToSpeech();

    const isCompleted = progress.find(p => p.module_id === moduleId)?.status === 'completed';

    // Enrich allModules with progress for sidebar
    const allModulesWithProgress = useMemo(() => {
        const progressMap = new Map(progress.map(p => [p.module_id, p]));
        return allModules.map(m => ({
            ...m,
            learning_modules: {
                ...m.learning_modules,
                order_index: m.order_index,
                user_progress: progressMap.has(m.learning_modules.id)
                    ? [progressMap.get(m.learning_modules.id)!]
                    : [],
            },
        }));
    }, [allModules, progress]);

    const currentIndex = allModules.findIndex(m => m.learning_modules.id === moduleId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allModules.length - 1;

    const navigateToModule = useCallback((direction: 'prev' | 'next') => {
        if (currentIndex === -1) return;
        const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= allModules.length) return;
        const targetId = allModules[targetIndex].learning_modules.id;
        router.push(`/courses/${courseId}/modules/${targetId}${isPreviewMode ? '?preview=1' : ''}`);
    }, [allModules, courseId, currentIndex, isPreviewMode, router]);

    const updateCourseProgress = useCallback(async (): Promise<boolean> => {
        try {
            const { data: courseModules } = await supabase
                .from('course_modules')
                .select('module_id')
                .eq('course_id', courseId);
            if (!courseModules) return false;

            const { data: completedModules } = await supabase
                .from('user_progress')
                .select('module_id')
                .eq('user_id', userId)
                .eq('status', 'completed')
                .in('module_id', courseModules.map(m => m.module_id));

            const total = courseModules.length;
            const completed = completedModules?.length ?? 0;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            await supabase
                .from('course_enrollments')
                .update({
                    progress_percentage: pct,
                    last_accessed_at: new Date().toISOString(),
                    ...(pct === 100 ? { status: 'completed' } : {}),
                })
                .eq('user_id', userId)
                .eq('course_id', courseId);

            if (pct === 100 && userEmail && course) {
                xapi.courseCompleted(userId, userEmail, courseId, course.title);
            }
            return pct === 100;
        } catch {
            return false;
        }
    }, [course, courseId, supabase, userId, userEmail]);

    const handleMarkComplete = useCallback(async () => {
        if (!moduleData || isCompleted || isPreviewMode || completing) return;
        try {
            setCompleting(true);
            setNewBadges([]);
            setEarnedXp(0);

            const { error: upsertError } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: userId,
                    module_id: moduleId,
                    course_id: courseId,
                    status: 'completed',
                    progress_percentage: 100,
                    completed_at: new Date().toISOString(),
                    xp_earned: XP_PER_MODULE,
                }, { onConflict: 'user_id, module_id' });

            if (upsertError) throw upsertError;

            if (userEmail) {
                xapi.moduleCompleted(userId, userEmail, moduleId, moduleData.title, courseId);
            }

            const { error: gamificationError } = await supabase.rpc('award_lms_action', {
                user_uuid: userId,
                xp_amount: XP_PER_MODULE,
            });
            if (gamificationError) console.error('Gamification RPC error:', gamificationError);

            // Update local progress state — no re-fetch needed
            setProgress(prev => [
                ...prev.filter(p => p.module_id !== moduleId),
                { module_id: moduleId, status: 'completed', notes: notes ?? null },
            ]);

            await refreshProfile();
            setEarnedXp(XP_PER_MODULE);
            setShowCelebration(true);
            fireModuleConfetti();

            const courseCompleted = await updateCourseProgress();
            if (courseCompleted) setTimeout(() => fireCourseConfetti(), 500);
        } catch (error: any) {
            console.error('Error marking complete:', error);
        } finally {
            setCompleting(false);
        }
    }, [completing, courseId, isCompleted, isPreviewMode, moduleData, moduleId, notes, refreshProfile, supabase, updateCourseProgress, userId, userEmail]);

    // Auto-save notes
    const initialNotesRef = useRef<string | null>(null);
    useEffect(() => {
        initialNotesRef.current = notes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleId]);

    useEffect(() => {
        if (isPreviewMode) return;
        if (initialNotesRef.current === null || notes === initialNotesRef.current) return;
        const timer = setTimeout(async () => {
            try {
                setIsSavingNotes(true);
                await supabase
                    .from('user_progress')
                    .upsert({
                        user_id: userId,
                        module_id: moduleId,
                        course_id: courseId,
                        notes,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id, module_id' });
            } catch (error) {
                console.error('Error saving notes:', error);
            } finally {
                setIsSavingNotes(false);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [notes, userId, moduleId, courseId, isPreviewMode, supabase]);

    useKeyboardNav({
        onPrev: () => navigateToModule('prev'),
        onNext: () => navigateToModule('next'),
        onComplete: handleMarkComplete,
        hasPrev,
        hasNext,
        canComplete: !isPreviewMode && !isCompleted && !completing,
    });

    return (
        <>
            <XPCelebration
                xp={earnedXp}
                show={showCelebration}
                onComplete={() => {
                    setShowCelebration(false);
                    if (pendingBadges.length > 0) {
                        setNewBadges(pendingBadges);
                        setPendingBadges([]);
                    }
                }}
            />
            <div className="min-h-screen bg-gray-50 flex overflow-hidden relative">
                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-40 lg:relative flex-shrink-0 transition-all duration-300 ease-in-out bg-white overflow-hidden ${
                        sidebarOpen ? 'w-80 translate-x-0 shadow-2xl lg:shadow-none' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'
                    }`}
                >
                    <div className="w-80 h-full overflow-hidden flex flex-col">
                        <ModuleSidebar
                            modules={allModulesWithProgress}
                            currentModuleId={moduleId}
                            courseId={courseId}
                            courseTitle={course.title}
                        />
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden absolute top-4 right-4 p-2 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="hidden lg:flex absolute top-4 right-4 p-2 bg-white/50 hover:bg-orange-50 rounded-lg text-gray-500 hover:text-orange-600 transition-colors"
                            title="Collapse Sidebar"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </div>
                </aside>

                {/* Content pane */}
                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                    {/* Badge notifications */}
                    <AnimatePresence>
                        {newBadges.map((badge) => (
                            <motion.div
                                key={badge.id}
                                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
                            >
                                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden relative">
                                    <div className="absolute inset-x-0 top-0 h-2 bg-orange-500" />
                                    <div className="w-24 h-24 mx-auto mb-6 bg-orange-50 rounded-full flex items-center justify-center text-5xl shadow-inner border-4 border-orange-100">
                                        {badge.icon}
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">New Badge Earned!</h3>
                                    <p className="text-orange-600 font-bold mb-4 uppercase tracking-widest text-sm">{badge.name}</p>
                                    <p className="text-gray-500 mb-8">{badge.description}</p>
                                    <Button
                                        onClick={() => setNewBadges(prev => prev.filter(b => b.id !== badge.id))}
                                        className="w-full bg-gray-900 hover:bg-black text-white py-6 rounded-2xl font-bold transition-all"
                                    >
                                        Awesome!
                                    </Button>
                                    <div className="mt-4 flex justify-center">
                                        <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Top bar */}
                    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 py-3 sm:px-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                {!sidebarOpen && (
                                    <button
                                        onClick={() => setSidebarOpen(true)}
                                        className="p-2 hover:bg-orange-50 rounded-xl text-gray-500 hover:text-orange-600 transition-colors border border-transparent hover:border-orange-100"
                                    >
                                        <Menu className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="min-w-0">
                                    <h2 className="text-lg font-black text-gray-900 truncate leading-tight mb-1">{moduleData.title}</h2>
                                    <Breadcrumb
                                        items={[
                                            { label: 'Courses', href: '/courses' },
                                            { label: course.title, href: `/courses/${courseId}${isPreviewMode ? '?preview=1' : ''}` },
                                            { label: `Lesson ${currentIndex + 1}` },
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {supported && moduleData.content && (
                                    <button
                                        onClick={() => isSpeaking
                                            ? stop()
                                            : speak(`${moduleData.title}. ${moduleData.content?.replace(/<[^>]+>/g, ' ')?.replace(/[#*`_~]/g, '')?.replace(/\s+/g, ' ')}`)
                                        }
                                        className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-medium ${
                                            isSpeaking
                                                ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse'
                                                : 'bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100'
                                        }`}
                                        title={isSpeaking ? 'Stop Reading' : 'Listen to Lesson'}
                                    >
                                        {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                                        <span className="hidden sm:inline">{isSpeaking ? 'Stop Reading' : 'Listen'}</span>
                                    </button>
                                )}
                                <AccessibilityMenu />
                                {!isPreviewMode && (
                                    <BookmarkButton
                                        itemId={moduleId}
                                        itemType="module"
                                        metadata={{
                                            title: moduleData.title,
                                            link: `/courses/${courseId}/modules/${moduleId}`,
                                            icon: 'lesson',
                                        }}
                                    />
                                )}
                                <button
                                    onClick={handleMarkComplete}
                                    disabled={isPreviewMode || isCompleted || completing}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        isCompleted
                                            ? 'bg-green-50 text-green-600 border border-green-100 cursor-default'
                                            : isPreviewMode
                                                ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-default'
                                                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md'
                                    }`}
                                >
                                    {completing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isPreviewMode ? (
                                        <span>Preview Mode</span>
                                    ) : isCompleted ? (
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Completed</span>
                                        </div>
                                    ) : (
                                        <span>Mark Complete</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Scrollable content */}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden">
                        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-8 sm:py-12">
                            {isPreviewMode && (
                                <div className="mb-8 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-1">Preview Mode</p>
                                    <p className="text-sm text-orange-800">
                                        Learner progress, notes, bookmarks, and quiz attempts are disabled while you preview this lesson.
                                    </p>
                                </div>
                            )}

                            {/* Media */}
                            {moduleData.media_type === 'video' && moduleData.media_url && (
                                <div className="mb-10 rounded-2xl overflow-hidden aspect-video bg-black relative shadow-2xl border border-gray-800">
                                    <video src={moduleData.media_url} controls className="w-full h-full object-contain" />
                                </div>
                            )}
                            {moduleData.media_type === 'audio' && moduleData.media_url && (
                                <div className="mb-10 p-8 rounded-3xl bg-orange-500 shadow-xl border border-orange-400">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-inner">
                                            <Music className="w-10 h-10 animate-pulse" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-black text-white mb-2">{moduleData.title}</h3>
                                            <p className="text-orange-100 text-sm font-medium">Listening Session</p>
                                        </div>
                                        <audio src={moduleData.media_url} controls className="w-full max-w-md filter invert brightness-200" />
                                    </div>
                                </div>
                            )}
                            {moduleData.media_type === 'text' && (
                                <div className="mb-10 rounded-2xl overflow-hidden aspect-video bg-gray-100 relative border border-gray-200 shadow-sm">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-orange-500">
                                            <BookOpen className="w-8 h-8" />
                                        </div>
                                        <h3 className="mt-4 text-xl font-bold text-gray-900">{moduleData.title}</h3>
                                        <p className="mt-1 text-sm text-gray-500 font-medium max-w-sm">
                                            {moduleData.description ?? 'In this lesson, we explore the core concepts and practical applications.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 mb-8">
                                <MarkdownRenderer
                                    content={moduleData.content ?? '# No Content Available\n\nThere is no content added to this module yet.'}
                                />
                            </div>

                            {/* Transcription */}
                            {moduleData.transcription && (
                                <div className="mb-12 bg-gray-50 rounded-3xl p-8 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900">Transcription</h3>
                                    </div>
                                    <div className="prose prose-slate max-w-none">
                                        <MarkdownRenderer content={moduleData.transcription} />
                                    </div>
                                </div>
                            )}

                            {/* Completion reward */}
                            {isCompleted && (
                                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left mb-12">
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-orange-900">Lesson Mastery Unlocked!</h4>
                                        <p className="text-sm text-orange-800/70">You've successfully completed this lesson. Keep going to earn your course certificate.</p>
                                    </div>
                                    <Button
                                        onClick={() => navigateToModule('next')}
                                        disabled={!hasNext}
                                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold"
                                    >
                                        Next Lesson
                                    </Button>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-12">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                            <StickyNote className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">Personal Notes</h3>
                                    </div>
                                    {isSavingNotes ? (
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span className="uppercase tracking-widest">Saving...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs font-bold text-green-500">
                                            <Save className="w-3 h-3" />
                                            <span className="uppercase tracking-widest">Saved</span>
                                        </div>
                                    )}
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={isPreviewMode}
                                    placeholder={
                                        isPreviewMode
                                            ? 'Preview mode does not save personal notes.'
                                            : 'Type your notes here... Your insights, questions, or key takeaways. They are saved automatically for your future reference.'
                                    }
                                    className="w-full h-48 p-6 rounded-2xl bg-gray-50 border-gray-100 focus:border-orange-500 focus:ring-orange-500 transition-all resize-none font-medium placeholder:text-gray-300 disabled:opacity-60"
                                />
                            </div>

                            {/* Quiz CTA */}
                            {quiz && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="bg-gray-900 rounded-[2.5rem] p-10 md:p-12 text-center shadow-2xl relative overflow-hidden mb-12"
                                >
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] -mr-32 -mt-32" />
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 blur-[100px] -ml-32 -mb-32" />
                                    <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-500/20 rotate-3">
                                        <Award className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Ready for a challenge?</h3>
                                    <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
                                        Test your understanding of <span className="text-white font-bold">{moduleData.title}</span> and earn extra XP!
                                    </p>
                                    {isPreviewMode ? (
                                        <div className="inline-flex items-center justify-center rounded-2xl border border-orange-400/30 bg-white/5 px-8 py-5 text-sm font-bold uppercase tracking-widest text-orange-200">
                                            Quiz attempts are disabled in preview
                                        </div>
                                    ) : (
                                        <Link href={`/courses/${courseId}/quiz/${quiz.id}`}>
                                            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-8 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all group">
                                                Start Quiz
                                                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </Link>
                                    )}
                                    <div className="flex items-center justify-center gap-6 mt-10 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>Dynamic Questions</span>
                                        </div>
                                        <div className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            <span>50 XP Reward</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </main>

                    {/* Navigation footer */}
                    <footer className="bg-white border-t border-gray-100 p-4 shrink-0">
                        <div className="max-w-4xl mx-auto flex items-center justify-between">
                            <button
                                onClick={() => navigateToModule('prev')}
                                disabled={!hasPrev}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span>Previous</span>
                            </button>
                            <div className="hidden sm:block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {currentIndex + 1} / {allModules.length}
                            </div>
                            <button
                                onClick={() => navigateToModule('next')}
                                disabled={!hasNext}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white transition-all font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
