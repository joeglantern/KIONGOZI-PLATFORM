"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    ArrowRight,
    Loader2,
    BookOpen,
    FileText,
    Video,
    Headphones,
    Check,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Plus,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type MediaType = 'text' | 'video' | 'audio';

interface CourseForm {
    title: string;
    category_id: string;
    difficulty_level: string;
}

interface LessonDraft {
    title: string;
    media_type: MediaType;
    addQuiz: boolean;
    quizTitle: string;
}

const MEDIA_OPTIONS: { value: MediaType; label: string; description: string; icon: React.ReactNode }[] = [
    {
        value: 'text',
        label: 'Text / Article',
        description: 'Written lesson with rich content',
        icon: <FileText className="w-5 h-5" />,
    },
    {
        value: 'video',
        label: 'Video',
        description: 'Upload or link a video file',
        icon: <Video className="w-5 h-5" />,
    },
    {
        value: 'audio',
        label: 'Audio / Podcast',
        description: 'Upload an audio recording',
        icon: <Headphones className="w-5 h-5" />,
    },
];

function StepTrail({ completedLabels, current }: { completedLabels: string[]; current: string }) {
    return (
        <div className="flex items-center gap-1.5 mb-8 flex-wrap">
            {completedLabels.map((label, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <Check className="w-3 h-3" /> {label}
                    </span>
                    <span className="text-gray-300 text-xs">›</span>
                </span>
            ))}
            <span className="text-[11px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                {current}
            </span>
        </div>
    );
}

export default function CreateCoursePage() {
    const { user } = useUser();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { toast } = useToast();

    const [step, setStep] = useState<'course-info' | 'lesson'>('course-info');
    const [courseId, setCourseId] = useState<string | null>(null);
    const [lessonCount, setLessonCount] = useState(0);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const lessonTitleRef = useRef<HTMLInputElement>(null);

    const [courseForm, setCourseForm] = useState<CourseForm>({
        title: '',
        category_id: '',
        difficulty_level: 'beginner',
    });

    const [lesson, setLesson] = useState<LessonDraft>({
        title: '',
        media_type: 'text',
        addQuiz: false,
        quizTitle: '',
    });

    useEffect(() => {
        supabase
            .from('module_categories')
            .select('id, name')
            .order('name')
            .then(({ data }: { data: { id: string; name: string }[] | null }) => {
                setCategories(data || []);
                if (data?.[0]) setCourseForm(f => ({ ...f, category_id: data[0].id }));
            });
    }, [supabase]);

    useEffect(() => {
        if (step === 'lesson') {
            setTimeout(() => lessonTitleRef.current?.focus(), 50);
        }
    }, [step, lessonCount]);

    const handleCreateCourse = async () => {
        if (!courseForm.title.trim()) {
            toast({ title: 'Course title is required', variant: 'destructive' });
            return;
        }
        if (!user) return;

        try {
            setSaving(true);
            const { data, error } = await supabase
                .from('courses')
                .insert({
                    title: courseForm.title.trim(),
                    category_id: courseForm.category_id || null,
                    difficulty_level: courseForm.difficulty_level,
                    author_id: user.id,
                    status: 'draft',
                    estimated_duration_hours: 1,
                })
                .select('id')
                .single();

            if (error) throw error;
            setCourseId(data.id);
            setStep('lesson');
        } catch (err: any) {
            toast({ title: 'Could not create course', description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLesson = async (andFinish: boolean) => {
        if (!lesson.title.trim()) {
            toast({ title: 'Lesson title is required', variant: 'destructive' });
            return;
        }
        if (!user || !courseId) return;

        try {
            setSaving(true);

            const { data: mod, error: modErr } = await supabase
                .from('learning_modules')
                .insert({
                    title: lesson.title.trim(),
                    media_type: lesson.media_type,
                    author_id: user.id,
                    status: 'draft',
                    estimated_duration_minutes: 30,
                    difficulty_level: courseForm.difficulty_level,
                })
                .select('id')
                .single();

            if (modErr) throw modErr;

            const { error: linkErr } = await supabase
                .from('course_modules')
                .insert({
                    course_id: courseId,
                    module_id: mod.id,
                    order_index: lessonCount,
                    is_required: true,
                });

            if (linkErr) throw linkErr;

            if (lesson.addQuiz && lesson.quizTitle.trim()) {
                const { error: quizErr } = await supabase
                    .from('quizzes')
                    .insert({
                        course_id: courseId,
                        module_id: mod.id,
                        title: lesson.quizTitle.trim(),
                        passing_score: 70,
                    });

                if (quizErr) throw quizErr;
            }

            if (andFinish) {
                router.push(`/instructor/courses/${courseId}/edit`);
                return;
            }

            setLessonCount(c => c + 1);
            setLesson({ title: '', media_type: 'text', addQuiz: false, quizTitle: '' });
            toast({ title: `Lesson ${lessonCount + 1} saved`, description: 'Add another or finish when ready.' });
        } catch (err: any) {
            toast({ title: 'Could not save lesson', description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleSkipToEditor = () => {
        if (courseId) router.push(`/instructor/courses/${courseId}/edit`);
    };

    const completedTrail = step === 'lesson'
        ? [`Course: ${courseForm.title.slice(0, 24)}${courseForm.title.length > 24 ? '…' : ''}`,
           ...Array.from({ length: lessonCount }, (_, i) => `Lesson ${i + 1}`)]
        : [];

    const currentTrailLabel = step === 'lesson'
        ? lessonCount === 0 ? 'Add Lesson 1' : `Add Lesson ${lessonCount + 1}`
        : 'Course Info';

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-xl mx-auto">
                <Link
                    href="/instructor/courses"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-700 dark:hover:text-white mb-8 transition-colors font-bold uppercase tracking-widest text-xs"
                >
                    <ArrowLeft className="w-4 h-4" />
                    My Courses
                </Link>

                {/* ── Step trail ── */}
                {step === 'lesson' && (
                    <StepTrail completedLabels={completedTrail.slice(0, -lessonCount || undefined)} current={currentTrailLabel} />
                )}

                {/* ════════════════ STEP 1: Course Info ════════════════ */}
                {step === 'course-info' && (
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-10 shadow-sm">
                        <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mb-6">
                            <BookOpen className="w-7 h-7 text-orange-500" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                            Create a new course
                        </h1>
                        <p className="text-gray-500 text-sm mb-10">
                            Start with a name and category. You&apos;ll add lessons in the next step.
                        </p>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    Course Title <span className="text-orange-500">*</span>
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={courseForm.title}
                                    onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleCreateCourse()}
                                    placeholder="e.g. Introduction to Climate Finance"
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-lg font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                                    <select
                                        value={courseForm.category_id}
                                        onChange={e => setCourseForm(f => ({ ...f, category_id: e.target.value }))}
                                        className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none cursor-pointer"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                        {categories.length === 0 && <option value="">Loading…</option>}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Difficulty</label>
                                    <select
                                        value={courseForm.difficulty_level}
                                        onChange={e => setCourseForm(f => ({ ...f, difficulty_level: e.target.value }))}
                                        className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex items-center justify-between">
                            <Link href="/instructor/courses">
                                <Button variant="ghost" className="font-bold text-gray-400 hover:text-gray-600">
                                    Cancel
                                </Button>
                            </Link>
                            <Button
                                onClick={handleCreateCourse}
                                disabled={saving || !courseForm.title.trim()}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold rounded-2xl px-8 h-12 gap-2 shadow-lg shadow-orange-500/20"
                            >
                                {saving
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <><span>Next: Add Lessons</span><ArrowRight className="w-4 h-4" /></>
                                }
                            </Button>
                        </div>
                    </div>
                )}

                {/* ════════════════ STEP 2+: Add Lesson ════════════════ */}
                {step === 'lesson' && (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-sm">
                                    {lessonCount + 1}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {lessonCount === 0 ? 'Add your first lesson' : `Add Lesson ${lessonCount + 1}`}
                                    </h2>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">You can always edit the full content in the editor</p>
                                </div>
                            </div>

                            {/* Lesson title */}
                            <div className="space-y-2 mb-6">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    Lesson Title <span className="text-orange-500">*</span>
                                </label>
                                <input
                                    ref={lessonTitleRef}
                                    type="text"
                                    value={lesson.title}
                                    onChange={e => setLesson(l => ({ ...l, title: e.target.value }))}
                                    placeholder="e.g. What is Carbon Pricing?"
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-base font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                                />
                            </div>

                            {/* Content type */}
                            <div className="space-y-2 mb-6">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Content Type</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {MEDIA_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setLesson(l => ({ ...l, media_type: opt.value }))}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                                                lesson.media_type === opt.value
                                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <span className={lesson.media_type === opt.value ? 'text-orange-500' : 'text-gray-400'}>
                                                {opt.icon}
                                            </span>
                                            <span className="text-xs font-black leading-tight">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Optional quiz */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setLesson(l => ({ ...l, addQuiz: !l.addQuiz }))}
                                    className="w-full flex items-center justify-between text-left group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${lesson.addQuiz ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-400'}`}>
                                            <HelpCircle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-700 dark:text-gray-200">Add a quiz after this lesson</p>
                                            <p className="text-xs text-gray-400">Optional — test comprehension before moving on</p>
                                        </div>
                                    </div>
                                    {lesson.addQuiz
                                        ? <ChevronUp className="w-4 h-4 text-orange-500" />
                                        : <ChevronDown className="w-4 h-4 text-gray-300" />
                                    }
                                </button>

                                {lesson.addQuiz && (
                                    <div className="mt-4 space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Quiz Title</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={lesson.quizTitle}
                                            onChange={e => setLesson(l => ({ ...l, quizTitle: e.target.value }))}
                                            placeholder="e.g. Carbon Pricing Check"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:font-normal placeholder:text-gray-300 text-sm"
                                        />
                                        <p className="text-xs text-gray-400">You&apos;ll add questions in the full editor after finishing.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action row */}
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={handleSkipToEditor}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                            >
                                {lessonCount === 0 ? 'Skip — go straight to editor' : 'Finish — open editor'}
                            </button>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => handleSaveLesson(false)}
                                    disabled={saving || !lesson.title.trim()}
                                    className="font-bold rounded-2xl px-5 h-11 gap-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Save &amp; Add Another
                                </Button>

                                <Button
                                    onClick={() => handleSaveLesson(true)}
                                    disabled={saving || !lesson.title.trim()}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold rounded-2xl px-6 h-11 gap-2 shadow-lg shadow-orange-500/20"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Finish
                                </Button>
                            </div>
                        </div>

                        {lessonCount > 0 && (
                            <p className="text-center text-xs text-gray-400">
                                {lessonCount} lesson{lessonCount === 1 ? '' : 's'} added so far — all saved automatically
                            </p>
                        )}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
