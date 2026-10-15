"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import Image from 'next/image';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { logCourseRevision } from '@/lib/course-authoring';
import { Loader2, UploadCloud, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import CourseMediaPanel from './CourseMediaPanel';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CourseForm {
    description: string;
    difficulty_level: string;
    category_id: string;
    estimated_duration_hours: number;
    thumbnail_url: string;
    slides_url: string;
    slides_type: 'pdf' | 'pptx' | '';
    video_url: string;
}

interface Props {
    courseId: string;
    userId: string;
    supabase: any;
    initialData?: Partial<CourseForm>;
    onSaved?: (data: CourseForm) => void;
    onRevisionSaved?: () => void;
}

export default function CourseSettingsPanel({
    courseId,
    userId,
    supabase,
    initialData,
    onSaved,
    onRevisionSaved,
}: Props) {
    const { theme } = useTheme();
    const { toast } = useToast();
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [ready, setReady] = useState(false);
    const [form, setForm] = useState<CourseForm>({
        description: initialData?.description || '',
        difficulty_level: initialData?.difficulty_level || 'beginner',
        category_id: initialData?.category_id || '',
        estimated_duration_hours: initialData?.estimated_duration_hours || 1,
        thumbnail_url: initialData?.thumbnail_url || '',
        slides_url: initialData?.slides_url || '',
        slides_type: (initialData?.slides_type as 'pdf' | 'pptx' | '') || '',
        video_url: initialData?.video_url || '',
    });

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastRevisionSignatureRef = useRef('');
    const lastRevisionAtRef = useRef(0);

    useEffect(() => {
        Promise.all([
            supabase
                .from('courses')
                .select('description, difficulty_level, category_id, estimated_duration_hours, thumbnail_url, slides_url, slides_type, video_url')
                .eq('id', courseId)
                .single(),
            supabase.from('module_categories').select('id, name').order('name'),
        ]).then(([{ data: course }, { data: cats }]: [any, any]) => {
            if (course) {
                const nextForm: CourseForm = {
                    description: course.description || '',
                    difficulty_level: course.difficulty_level || 'beginner',
                    category_id: course.category_id || '',
                    estimated_duration_hours: course.estimated_duration_hours || 1,
                    thumbnail_url: course.thumbnail_url || '',
                    slides_url: course.slides_url || '',
                    slides_type: (course.slides_type as 'pdf' | 'pptx' | '') || '',
                    video_url: course.video_url || '',
                };

                setForm(nextForm);
                lastRevisionSignatureRef.current = JSON.stringify(nextForm);
            }
            setCategories(cats || []);
            setReady(true);
        });
    }, [courseId, supabase]);

    const scheduleAutosave = useCallback((next: CourseForm) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setStatus('idle');
        const save = async () => {
            pendingSaveRef.current = null;
            setStatus('saving');
            const { error } = await supabase
                .from('courses')
                .update({
                    description: next.description || null,
                    difficulty_level: next.difficulty_level,
                    category_id: next.category_id || null,
                    estimated_duration_hours: next.estimated_duration_hours,
                    thumbnail_url: next.thumbnail_url || null,
                    slides_url: next.slides_url || null,
                    slides_type: next.slides_type || null,
                    video_url: next.video_url || null,
                })
                .eq('id', courseId);

            if (error) {
                setStatus('error');
                toast({ title: 'Auto-save failed', description: error.message, variant: 'destructive' });
                return;
            }

            setStatus('saved');
            onSaved?.(next);

            const signature = JSON.stringify(next);
            const shouldLogRevision =
                signature !== lastRevisionSignatureRef.current &&
                (lastRevisionAtRef.current === 0 || Date.now() - lastRevisionAtRef.current > 60_000);

            if (shouldLogRevision) {
                const revision = await logCourseRevision(supabase, {
                    courseId,
                    entityType: 'course',
                    summary: 'Updated course settings',
                    snapshot: next,
                    createdBy: userId,
                });

                if (revision) {
                    lastRevisionSignatureRef.current = signature;
                    lastRevisionAtRef.current = Date.now();
                    onRevisionSaved?.();
                }
            }
        };
        pendingSaveRef.current = save;
        saveTimer.current = setTimeout(() => { void save(); }, 1000);
    }, [courseId, onRevisionSaved, onSaved, supabase, toast, userId]);

    // Flush a pending autosave if the instructor switches panels within the
    // debounce window, instead of silently dropping the edit.
    useEffect(() => () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending) void pending();
    }, []);

    const update = useCallback((patch: Partial<CourseForm>) => {
        setForm(prev => {
            const next = { ...prev, ...patch };
            scheduleAutosave(next);
            return next;
        });
    }, [scheduleAutosave]);

    const handleUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
        const urls = await Promise.all(
            files.map(async (file) => {
                const ext = file.name.split('.').pop();
                const path = `content-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const { error } = await supabase.storage.from('courses').upload(path, file);
                if (error) {
                    toast({ title: `Could not upload ${file.name}`, description: error.message, variant: 'destructive' });
                    return null;
                }
                const { data: { publicUrl } } = supabase.storage.from('courses').getPublicUrl(path);
                return publicUrl as string;
            })
        );
        callback(urls.filter((url): url is string => Boolean(url)));
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Please choose an image file', variant: 'destructive' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'Image is too large', description: 'Use an image under 5 MB.', variant: 'destructive' });
            return;
        }
        try {
            setUploading(true);
            const ext = file.name.split('.').pop();
            const path = `thumbnails/${courseId}-${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('courses').upload(path, file, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('courses').getPublicUrl(path);
            update({ thumbnail_url: publicUrl });
        } catch (err: any) {
            toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 sm:px-8 py-4 flex items-center justify-between">
                <div>
                    <h2 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest">Course Settings</h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Thumbnail, description, metadata</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold min-w-[80px] justify-end" role="status" aria-live="polite">
                    {status === 'saving' && (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /><span className="text-orange-500">Saving…</span></>
                    )}
                    {status === 'saved' && (
                        <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Saved</span></>
                    )}
                    {status === 'error' && (
                        <><AlertCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">Save failed</span></>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-8 max-w-3xl space-y-10">
                    <div className="space-y-3">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Course thumbnail</p>
                        <p className="text-xs text-gray-400 -mt-1">Shown on course cards. 16:9, under 5 MB. Courses without one use their category cover.</p>
                        <button
                            type="button"
                            onClick={() => !uploading && fileInputRef.current?.click()}
                            aria-label={form.thumbnail_url ? 'Replace course thumbnail' : 'Upload course thumbnail'}
                            className="relative block w-full max-w-sm rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:border-orange-400 transition-all group bg-gray-50 dark:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                            style={{ aspectRatio: '16/9' }}
                        >
                            {form.thumbnail_url ? (
                                <>
                                    <Image src={form.thumbnail_url} alt="Current course thumbnail" fill className="object-cover" unoptimized />
                                    <span className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
                                        {uploading
                                            ? <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            : <UploadCloud className="w-8 h-8 text-white" />}
                                    </span>
                                </>
                            ) : (
                                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                    {uploading
                                        ? <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                        : <UploadCloud className="w-8 h-8 text-gray-300" />
                                    }
                                    <span className="text-xs font-bold text-gray-400">
                                        {uploading ? 'Uploading…' : 'Click to upload thumbnail'}
                                    </span>
                                </span>
                            )}
                        </button>
                        {form.thumbnail_url && !uploading && (
                            <button
                                type="button"
                                onClick={() => update({ thumbnail_url: '' })}
                                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                            >
                                Remove thumbnail
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            className="hidden"
                        />
                    </div>

                    <CourseMediaPanel
                        courseId={courseId}
                        supabase={supabase}
                        slidesUrl={form.slides_url}
                        slidesType={form.slides_type}
                        videoUrl={form.video_url}
                        onSlidesChange={(url, type) => update({ slides_url: url, slides_type: type })}
                        onVideoChange={(url) => update({ video_url: url })}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="course-settings-category" className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                            <select
                                id="course-settings-category"
                                value={form.category_id}
                                onChange={(e) => update({ category_id: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-orange-500"
                            >
                                {/* Without an explicit empty option the browser shows the first
                                    category even though none is saved, hiding a publish blocker. */}
                                <option value="">{ready ? 'Select a category' : 'Loading…'}</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="course-settings-difficulty" className="text-xs font-black text-gray-400 uppercase tracking-widest">Difficulty</label>
                            <select
                                id="course-settings-difficulty"
                                value={form.difficulty_level}
                                onChange={(e) => update({ difficulty_level: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="course-settings-duration" className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Duration (hrs)
                            </label>
                            <input
                                id="course-settings-duration"
                                type="number"
                                min="0.5"
                                max="500"
                                step="0.5"
                                inputMode="decimal"
                                value={form.estimated_duration_hours}
                                onChange={(e) => {
                                    const hours = parseFloat(e.target.value);
                                    update({ estimated_duration_hours: Number.isFinite(hours) ? Math.min(500, Math.max(0.5, hours)) : 0.5 });
                                }}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Course Description</label>
                            <p className="text-xs text-gray-400 mt-1">Shown on the course landing page. Supports Markdown, images, code blocks, and tables.</p>
                        </div>
                        {ready ? (
                            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                <MdEditor
                                    modelValue={form.description}
                                    onChange={(val) => update({ description: val })}
                                    theme={theme === 'dark' ? 'dark' : 'light'}
                                    language="en-US"
                                    toolbars={[
                                        'bold', 'italic', 'strikeThrough', 'title', 'quote',
                                        'unorderedList', 'orderedList', '-',
                                        'code', 'link', 'image', 'table', '-',
                                        'revoke', 'next', '=',
                                        'preview', 'fullscreen',
                                    ]}
                                    onUploadImg={handleUploadImg}
                                    style={{ height: '460px' }}
                                    className="!border-none"
                                    placeholder="Write a compelling description for your course…"
                                />
                            </div>
                        ) : (
                            <div className="h-[460px] bg-gray-50 dark:bg-gray-800 rounded-2xl animate-pulse" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
