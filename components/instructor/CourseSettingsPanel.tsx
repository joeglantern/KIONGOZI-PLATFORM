"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import Image from 'next/image';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { logCourseRevision } from '@/lib/course-authoring';
import { Loader2, UploadCloud, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CourseForm {
    description: string;
    difficulty_level: string;
    category_id: string;
    estimated_duration_hours: number;
    thumbnail_url: string;
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
    });

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastRevisionSignatureRef = useRef('');
    const lastRevisionAtRef = useRef(0);

    useEffect(() => {
        Promise.all([
            supabase
                .from('courses')
                .select('description, difficulty_level, category_id, estimated_duration_hours, thumbnail_url')
                .eq('id', courseId)
                .single(),
            supabase.from('module_categories').select('id, name').order('name'),
        ]).then(([{ data: course }, { data: cats }]: [any, any]) => {
            if (course) {
                const nextForm = {
                    description: course.description || '',
                    difficulty_level: course.difficulty_level || 'beginner',
                    category_id: course.category_id || '',
                    estimated_duration_hours: course.estimated_duration_hours || 1,
                    thumbnail_url: course.thumbnail_url || '',
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
        saveTimer.current = setTimeout(async () => {
            setStatus('saving');
            const { error } = await supabase
                .from('courses')
                .update({
                    description: next.description || null,
                    difficulty_level: next.difficulty_level,
                    category_id: next.category_id || null,
                    estimated_duration_hours: next.estimated_duration_hours,
                    thumbnail_url: next.thumbnail_url || null,
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
        }, 1000);
    }, [courseId, onRevisionSaved, onSaved, supabase, toast, userId]);

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
                await supabase.storage.from('courses').upload(path, file);
                const { data: { publicUrl } } = supabase.storage.from('courses').getPublicUrl(path);
                return publicUrl;
            })
        );
        callback(urls);
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
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
            <div className="flex-shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-8 py-4 flex items-center justify-between">
                <div>
                    <h2 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest">Course Settings</h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Thumbnail, description, metadata</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold min-w-[80px] justify-end">
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
                <div className="p-8 max-w-3xl space-y-10">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Course Thumbnail</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-full max-w-sm rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:border-orange-400 transition-all group bg-gray-50 dark:bg-gray-800"
                            style={{ aspectRatio: '16/9' }}
                        >
                            {form.thumbnail_url ? (
                                <>
                                    <Image src={form.thumbnail_url} alt="Thumbnail" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <UploadCloud className="w-8 h-8 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                    {uploading
                                        ? <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                        : <UploadCloud className="w-8 h-8 text-gray-300" />
                                    }
                                    <p className="text-xs font-bold text-gray-400">
                                        {uploading ? 'Uploading…' : 'Click to upload thumbnail'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            className="hidden"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                            <select
                                value={form.category_id}
                                onChange={(e) => update({ category_id: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none cursor-pointer"
                            >
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                {categories.length === 0 && <option value="">Loading…</option>}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Difficulty</label>
                            <select
                                value={form.difficulty_level}
                                onChange={(e) => update({ difficulty_level: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none cursor-pointer"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Duration (hrs)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={form.estimated_duration_hours}
                                onChange={(e) => update({ estimated_duration_hours: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none"
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
