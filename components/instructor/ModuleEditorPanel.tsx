"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import * as tus from 'tus-js-client';
import { useToast } from '@/components/ui/use-toast';
import { logCourseRevision } from '@/lib/course-authoring';
import {
    Loader2, UploadCloud, Video, Music, CheckCircle2, AlertCircle,
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
    Quote, Code, Minus, Link2, ImageIcon, Undo2, Redo2, AlignLeft,
    AlignCenter, AlignRight, ChevronDown,
} from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ModuleData {
    id: string;
    title: string;
    media_type: string;
    estimated_duration_minutes: number;
}

interface Props {
    courseModuleId: string;
    courseId: string;
    module: ModuleData;
    userId: string;
    supabase: any;
    onSaved: (data: { title: string; media_type: string; estimated_duration_minutes: number }) => void;
    onRevisionSaved?: () => void;
}

interface ModuleForm {
    title: string;
    description: string;
    media_type: string;
    media_url: string;
    transcription: string;
    estimated_duration_minutes: number;
    difficulty_level: string;
    learning_objectives: string;
    is_required: boolean;
}

// Tiptap toolbar button
function ToolbarBtn({
    onClick, active, disabled, children, title,
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
}) {
    return (
        <button
            type="button"
            title={title}
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            disabled={disabled}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${active
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />;
}

export default function ModuleEditorPanel({ courseModuleId, courseId, module, userId, supabase, onSaved, onRevisionSaved }: Props) {
    const { toast } = useToast();
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [ready, setReady] = useState(false);

    const titleRef = useRef<HTMLInputElement>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const uploadRef = useRef<tus.Upload | null>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const lastRevisionSignatureRef = useRef('');
    const lastRevisionAtRef = useRef(0);

    const [form, setForm] = useState<ModuleForm>({
        title: module.title,
        description: '',
        media_type: module.media_type || 'text',
        media_url: '',
        transcription: '',
        estimated_duration_minutes: module.estimated_duration_minutes || 30,
        difficulty_level: 'beginner',
        learning_objectives: '',
        is_required: true,
    });

    // We keep content separate so it can be driven by Tiptap
    const contentRef = useRef<string>('');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: { HTMLAttributes: { class: 'bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-sm overflow-x-auto' } },
                blockquote: { HTMLAttributes: { class: 'border-l-4 border-orange-400 pl-4 italic text-gray-600 dark:text-gray-300' } },
            }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Image.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full shadow-md my-4' } }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-orange-500 underline hover:text-orange-600' } }),
            Placeholder.configure({ placeholder: 'Start writing your lesson content… Use the toolbar for headings, lists, code blocks, images, and more.' }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert prose-orange max-w-none focus:outline-none min-h-[480px] px-8 py-6 text-gray-800 dark:text-gray-200',
            },
        },
        onUpdate({ editor }) {
            const html = editor.getHTML();
            contentRef.current = html;
            scheduleContentSave(html);
        },
    });

    // Load full module data on mount
    useEffect(() => {
        Promise.all([
            supabase
                .from('learning_modules')
                .select('title, description, content, media_type, media_url, transcription, estimated_duration_minutes, difficulty_level, learning_objectives')
                .eq('id', module.id)
                .single(),
            supabase
                .from('course_modules')
                .select('is_required')
                .eq('id', courseModuleId)
                .single(),
        ]).then(([{ data: mod }, { data: cm }]: [any, any]) => {
            if (mod) {
                setForm({
                    title: mod.title || '',
                    description: mod.description || '',
                    media_type: mod.media_type || 'text',
                    media_url: mod.media_url || '',
                    transcription: mod.transcription || '',
                    estimated_duration_minutes: mod.estimated_duration_minutes || 30,
                    difficulty_level: mod.difficulty_level || 'beginner',
                    learning_objectives: Array.isArray(mod.learning_objectives)
                        ? mod.learning_objectives.join('\n')
                        : mod.learning_objectives || '',
                    is_required: cm?.is_required ?? true,
                });
                // Seed the Tiptap editor with existing content
                if (editor && mod.content) {
                    editor.commands.setContent(mod.content, { emitUpdate: false });
                    contentRef.current = mod.content;
                }
                lastRevisionSignatureRef.current = JSON.stringify({
                    title: mod.title || '',
                    description: mod.description || '',
                    content: mod.content || '',
                    media_type: mod.media_type || 'text',
                    media_url: mod.media_url || '',
                    transcription: mod.transcription || '',
                    estimated_duration_minutes: mod.estimated_duration_minutes || 30,
                    difficulty_level: mod.difficulty_level || 'beginner',
                    learning_objectives: Array.isArray(mod.learning_objectives)
                        ? mod.learning_objectives.join('\n')
                        : mod.learning_objectives || '',
                    is_required: cm?.is_required ?? true,
                });
            }
            setReady(true);
            if (mod?.title === 'Untitled Module') {
                setTimeout(() => titleRef.current?.select(), 100);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [module.id, courseModuleId, supabase]);

    // Seed editor once it's ready if content arrived before editor mounted
    useEffect(() => {
        if (editor && contentRef.current && !editor.isEmpty) return;
        if (editor && contentRef.current) {
            editor.commands.setContent(contentRef.current, { emitUpdate: false });
        }
    }, [editor]);

    const doSave = useCallback(async (nextForm: ModuleForm, html: string) => {
        setSaveStatus('saving');
        const [{ error: modErr }, { error: cmErr }] = await Promise.all([
            supabase
                .from('learning_modules')
                .update({
                    title: nextForm.title.trim() || 'Untitled Module',
                    description: nextForm.description || null,
                    content: html || null,
                    media_type: nextForm.media_type,
                    media_url: nextForm.media_url || null,
                    transcription: nextForm.transcription || null,
                    estimated_duration_minutes: nextForm.estimated_duration_minutes,
                    difficulty_level: nextForm.difficulty_level,
                    learning_objectives: nextForm.learning_objectives
                        ? nextForm.learning_objectives.split('\n').map((s: string) => s.trim()).filter(Boolean)
                        : null,
                })
                .eq('id', module.id),
            supabase
                .from('course_modules')
                .update({ is_required: nextForm.is_required })
                .eq('id', courseModuleId),
        ]);
        const err = modErr || cmErr;
        if (err) {
            setSaveStatus('error');
            toast({ title: 'Auto-save failed', description: err.message, variant: 'destructive' });
        } else {
            setSaveStatus('saved');
            onSaved({
                title: nextForm.title.trim() || 'Untitled Module',
                media_type: nextForm.media_type,
                estimated_duration_minutes: nextForm.estimated_duration_minutes,
            });

            const snapshot = {
                course_module_id: courseModuleId,
                title: nextForm.title.trim() || 'Untitled Module',
                description: nextForm.description || null,
                content: html || null,
                media_type: nextForm.media_type,
                media_url: nextForm.media_url || null,
                transcription: nextForm.transcription || null,
                estimated_duration_minutes: nextForm.estimated_duration_minutes,
                difficulty_level: nextForm.difficulty_level,
                learning_objectives: nextForm.learning_objectives,
                is_required: nextForm.is_required,
            };
            const signature = JSON.stringify(snapshot);
            const shouldLogRevision =
                signature !== lastRevisionSignatureRef.current &&
                (lastRevisionAtRef.current === 0 || Date.now() - lastRevisionAtRef.current > 60_000);

            if (shouldLogRevision) {
                const revision = await logCourseRevision(supabase, {
                    courseId,
                    entityType: 'module',
                    entityId: module.id,
                    summary: `Updated lesson: ${nextForm.title.trim() || 'Untitled Module'}`,
                    snapshot,
                    createdBy: userId,
                });

                if (revision) {
                    lastRevisionSignatureRef.current = signature;
                    lastRevisionAtRef.current = Date.now();
                    onRevisionSaved?.();
                }
            }
        }
    }, [courseId, courseModuleId, module.id, onRevisionSaved, onSaved, supabase, toast, userId]);

    const scheduleFormSave = useCallback((nextForm: ModuleForm) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setSaveStatus('idle');
        saveTimer.current = setTimeout(() => doSave(nextForm, contentRef.current), 1000);
    }, [doSave]);

    const scheduleContentSave = useCallback((html: string) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setSaveStatus('idle');
        saveTimer.current = setTimeout(() => doSave(form, html), 1000);
    }, [doSave, form]);

    const update = useCallback((patch: Partial<ModuleForm>) => {
        setForm(prev => {
            const next = { ...prev, ...patch };
            scheduleFormSave(next);
            return next;
        });
    }, [scheduleFormSave]);

    // Image insertion via upload
    const handleInsertImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        const ext = file.name.split('.').pop();
        const path = `content-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        await supabase.storage.from('courses').upload(path, file);
        const { data: { publicUrl } } = supabase.storage.from('courses').getPublicUrl(path);
        editor.chain().focus().setImage({ src: publicUrl }).run();
        e.target.value = '';
    }, [editor, supabase]);

    const handleSetLink = useCallback(() => {
        const url = window.prompt('URL');
        if (!url || !editor) return;
        editor.chain().focus().setLink({ href: url }).run();
    }, [editor]);

    const handleMediaUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `course-media/${fileName}`;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast({ title: 'Session expired. Please refresh.', variant: 'destructive' }); return; }
        setUploadingMedia(true);
        setUploadProgress(0);
        const upload = new tus.Upload(file, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: { authorization: `Bearer ${session.access_token}`, 'x-upsert': 'false' },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: { bucketName: 'courses', objectName: filePath, contentType: file.type, cacheControl: '3600' },
            chunkSize: 6 * 1024 * 1024,
            onError(err) {
                toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                setUploadingMedia(false);
            },
            onProgress(uploaded, total) {
                setUploadProgress(Math.round((uploaded / total) * 100));
            },
            onSuccess() {
                const { data: { publicUrl } } = supabase.storage.from('courses').getPublicUrl(filePath);
                update({ media_url: publicUrl, media_type: file.type.startsWith('video/') ? 'video' : 'audio' });
                setUploadingMedia(false);
                setUploadProgress(100);
            },
        });
        uploadRef.current = upload;
        const prev = await upload.findPreviousUploads();
        if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
    }, [supabase, update, toast]);

    const imageInputRef = useRef<HTMLInputElement>(null);

    if (!ready) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Title + save status */}
            <div className="flex-shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-3 flex items-center gap-4">
                <input
                    ref={titleRef}
                    type="text"
                    value={form.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="Module title…"
                    className="flex-1 min-w-0 font-black text-gray-900 dark:text-white text-lg bg-transparent border-none outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded-lg px-2 py-1 transition-colors"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold flex-shrink-0 min-w-[90px] justify-end">
                    {saveStatus === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /><span className="text-orange-500">Saving…</span></>}
                    {saveStatus === 'saved' && <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Saved</span></>}
                    {saveStatus === 'error' && <><AlertCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">Save failed</span></>}
                </div>
            </div>

            {/* Scrollable editor body */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 max-w-4xl space-y-6">

                    {/* Short description */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            Short Description <span className="text-orange-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={(e) => update({ description: e.target.value })}
                            placeholder="One sentence shown in the course outline"
                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                        />
                    </div>

                    {/* Settings row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Content Type</label>
                            <div className="relative">
                                <select
                                    value={form.media_type}
                                    onChange={(e) => update({ media_type: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none cursor-pointer pr-8"
                                >
                                    <option value="text">Text / Article</option>
                                    <option value="video">Video</option>
                                    <option value="audio">Audio / Podcast</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Difficulty</label>
                            <div className="relative">
                                <select
                                    value={form.difficulty_level}
                                    onChange={(e) => update({ difficulty_level: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none cursor-pointer pr-8"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Duration (min)</label>
                            <input
                                type="number"
                                min="1"
                                value={form.estimated_duration_minutes}
                                onChange={(e) => update({ estimated_duration_minutes: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Required?</label>
                            <div
                                onClick={() => update({ is_required: !form.is_required })}
                                className={`flex items-center gap-3 px-4 py-3.5 border rounded-2xl cursor-pointer transition-all select-none ${form.is_required ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${form.is_required ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                    {form.is_required && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Required</span>
                            </div>
                        </div>
                    </div>

                    {/* Learning objectives */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            Learning Objectives
                            <span className="text-gray-300 font-normal normal-case tracking-normal text-xs">(optional — one per line)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={form.learning_objectives}
                            onChange={(e) => update({ learning_objectives: e.target.value })}
                            placeholder={`Understand the basics of X\nApply Y in real scenarios\nExplain how Z works`}
                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all resize-none text-sm"
                        />
                    </div>

                    {/* Media upload (video / audio) */}
                    {form.media_type !== 'text' && (
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                {form.media_type === 'video' ? 'Video File' : 'Audio File'} <span className="text-orange-500">*</span>
                            </label>
                            <div
                                onClick={() => mediaInputRef.current?.click()}
                                className="relative rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-all"
                                style={{ height: '140px' }}
                            >
                                {form.media_url ? (
                                    <div className="text-center px-4">
                                        {form.media_type === 'video' ? <Video className="w-8 h-8 text-orange-500 mx-auto mb-2" /> : <Music className="w-8 h-8 text-orange-500 mx-auto mb-2" />}
                                        <p className="text-xs font-bold text-gray-500 truncate max-w-[220px]">{form.media_url.split('/').pop()}</p>
                                        <p className="text-[10px] text-orange-400 mt-1">Click to replace</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        {uploadingMedia ? <Loader2 className="w-7 h-7 animate-spin text-orange-500 mx-auto mb-2" /> : <UploadCloud className="w-7 h-7 text-gray-300 mx-auto mb-2" />}
                                        <p className="text-xs font-bold text-gray-500">{uploadingMedia ? 'Uploading…' : `Click to upload ${form.media_type}`}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Large files (500 MB+) supported — resumes on interruption</p>
                                    </div>
                                )}
                            </div>
                            {uploadingMedia && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-500 font-bold">
                                        <span>Uploading…</span><span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                </div>
                            )}
                            <input ref={mediaInputRef} type="file" onChange={handleMediaUpload} accept={form.media_type === 'video' ? 'video/*' : 'audio/*'} className="hidden" />
                        </div>
                    )}

                    {/* Rich text editor */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            Lesson Content
                            {form.media_type === 'text' ? <span className="text-orange-500 ml-1">*</span> : <span className="text-gray-300 font-normal normal-case tracking-normal text-xs ml-2">(optional — shown alongside media)</span>}
                        </label>

                        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-gray-900">
                            {/* Toolbar */}
                            {editor && (
                                <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                    {/* History */}
                                    <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
                                        <Undo2 className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
                                        <Redo2 className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <Divider />
                                    {/* Headings */}
                                    {([1, 2, 3] as const).map(level => (
                                        <ToolbarBtn
                                            key={level}
                                            title={`Heading ${level}`}
                                            active={editor.isActive('heading', { level })}
                                            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                                        >
                                            <span className="text-xs font-black w-5 text-center">H{level}</span>
                                        </ToolbarBtn>
                                    ))}
                                    <Divider />
                                    {/* Inline marks */}
                                    <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                                        <Bold className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                                        <Italic className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                                        <UnderlineIcon className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                                        <Strikethrough className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
                                        <Code className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <Divider />
                                    {/* Lists */}
                                    <ToolbarBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                                        <List className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                                        <ListOrdered className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                                        <Quote className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                                        <span className="text-[10px] font-black font-mono">{`</>`}</span>
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                                        <Minus className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <Divider />
                                    {/* Alignment */}
                                    <ToolbarBtn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                                        <AlignLeft className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                                        <AlignCenter className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                                        <AlignRight className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <Divider />
                                    {/* Link & image */}
                                    <ToolbarBtn title="Insert link" active={editor.isActive('link')} onClick={handleSetLink}>
                                        <Link2 className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <ToolbarBtn title="Insert image" onClick={() => imageInputRef.current?.click()}>
                                        <ImageIcon className="w-3.5 h-3.5" />
                                    </ToolbarBtn>
                                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleInsertImage} className="hidden" />
                                </div>
                            )}

                            {/* Editor canvas */}
                            <EditorContent
                                editor={editor}
                                className="min-h-[480px] [&_.ProseMirror]:min-h-[480px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-300 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
                            />
                        </div>
                    </div>

                    {/* Transcript (video / audio) */}
                    {form.media_type !== 'text' && (
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                Transcript
                                <span className="text-gray-300 font-normal normal-case tracking-normal text-xs">(optional — shown below media)</span>
                            </label>
                            <textarea
                                rows={6}
                                value={form.transcription}
                                onChange={(e) => update({ transcription: e.target.value })}
                                placeholder="Paste the full transcript of your video or audio here…"
                                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all resize-none text-sm"
                            />
                        </div>
                    )}

                    <div className="h-16" />
                </div>
            </div>
        </div>
    );
}
