"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Loader2,
    Save,
    UploadCloud,
    Plus,
    BookOpen,
    Trash2,
    Edit3,
    Video,
    Music,
    FileText,
    ChevronDown,
    ChevronUp,
    Play,
    MessageCircle
} from 'lucide-react';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { useTheme } from '@/app/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import QuizBuilder from '@/components/quiz/QuizBuilder';
import { HelpCircle } from 'lucide-react';

export default function EditCoursePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const supabase = createClient();
    const { theme } = useTheme();
    const courseId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [courses, setCourse] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'details' | 'modules' | 'quizzes'>('details');
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
    const [isQuizBuilderOpen, setIsQuizBuilderOpen] = useState(false);

    // Course Form
    const [courseForm, setCourseForm] = useState({
        title: '',
        description: '',
        difficulty_level: 'beginner',
        category_id: '',
        estimated_duration_hours: 1,
        thumbnail_url: '',
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [fetchingCats, setFetchingCats] = useState(true);

    // Module Editor State
    const [editingModule, setEditingModule] = useState<any>(null);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const uploadRef = useRef<tus.Upload | null>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user && courseId) {
            fetchData();
            fetchCategories();
        }
    }, [user, courseId]);

    const fetchCategories = async () => {
        try {
            setFetchingCats(true);
            const { data, error } = await supabase
                .from('module_categories')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setFetchingCats(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch course
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single();

            if (courseError) throw courseError;
            setCourse(courseData);
            setCourseForm({
                title: courseData.title,
                description: courseData.description,
                difficulty_level: courseData.difficulty_level,
                category_id: courseData.category_id || '',
                estimated_duration_hours: courseData.estimated_duration_hours || 1,
                thumbnail_url: courseData.thumbnail_url || '',
            });

            // Fetch modules
            const { data: modulesData, error: modulesError } = await supabase
                .from('course_modules')
                .select(`
                    id,
                    order_index,
                    is_required,
                    learning_modules(*)
                `)
                .eq('course_id', courseId)
                .order('order_index');

            if (modulesError) throw modulesError;
            setModules(modulesData || []);

            // Fetch quizzes
            const { data: quizzesData } = await supabase
                .from('quizzes')
                .select('id, title, passing_score, module_id')
                .eq('course_id', courseId);
            setQuizzes(quizzesData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCourse = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('courses')
                .update(courseForm)
                .eq('id', courseId);

            if (error) throw error;
            alert('Course updated successfully!');
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Failed to save course');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenModuleEditor = (moduleData: any = null) => {
        if (moduleData) {
            setEditingModule({
                id: moduleData.learning_modules.id,
                course_module_id: moduleData.id,
                title: moduleData.learning_modules.title,
                description: moduleData.learning_modules.description || '',
                content: moduleData.learning_modules.content || '',
                media_type: moduleData.learning_modules.media_type || 'text',
                media_url: moduleData.learning_modules.media_url || '',
                transcription: moduleData.learning_modules.transcription || '',
                estimated_duration_minutes: moduleData.learning_modules.estimated_duration_minutes || 30,
                difficulty_level: moduleData.learning_modules.difficulty_level || 'beginner',
                learning_objectives: Array.isArray(moduleData.learning_modules.learning_objectives)
                    ? moduleData.learning_modules.learning_objectives.join('\n')
                    : moduleData.learning_modules.learning_objectives || '',
                is_required: moduleData.is_required ?? true,
            });
        } else {
            setEditingModule({
                title: '',
                description: '',
                content: '',
                media_type: 'text',
                media_url: '',
                transcription: '',
                estimated_duration_minutes: 30,
                difficulty_level: 'beginner',
                learning_objectives: '',
                is_required: true,
            });
        }
        setIsModuleModalOpen(true);
    };

    const handleSaveModule = async () => {
        if (!editingModule.title) return alert('Module title is required');

        try {
            setSaving(true);
            let moduleId = editingModule.id;

            const modulePayload = {
                title: editingModule.title.trim(),
                description: editingModule.description || null,
                content: editingModule.content || null,
                media_type: editingModule.media_type,
                media_url: editingModule.media_url || null,
                transcription: editingModule.transcription || null,
                estimated_duration_minutes: editingModule.estimated_duration_minutes,
                difficulty_level: editingModule.difficulty_level,
                learning_objectives: editingModule.learning_objectives
                    ? editingModule.learning_objectives.split('\n').map((s: string) => s.trim()).filter(Boolean)
                    : null,
            };

            if (moduleId) {
                // Update existing learning_module
                const { error } = await supabase
                    .from('learning_modules')
                    .update(modulePayload)
                    .eq('id', moduleId);
                if (error) throw error;

                // Update is_required on the join table
                const { error: linkError } = await supabase
                    .from('course_modules')
                    .update({ is_required: editingModule.is_required })
                    .eq('id', editingModule.course_module_id);
                if (linkError) throw linkError;
            } else {
                // Create new learning_module
                if (!user) throw new Error("User not authenticated");

                const { data: insertedRows, error: modError } = await supabase
                    .from('learning_modules')
                    .insert({ ...modulePayload, author_id: user.id })
                    .select('id');

                if (modError) throw modError;
                moduleId = insertedRows?.[0]?.id;
                if (!moduleId) throw new Error('Insert succeeded but no ID returned');

                // Link to course
                const { error: linkError } = await supabase
                    .from('course_modules')
                    .insert({
                        course_id: courseId,
                        module_id: moduleId,
                        order_index: modules.length,
                        is_required: editingModule.is_required,
                    });
                if (linkError) throw linkError;
            }

            setIsModuleModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving module (full):', JSON.stringify(error, null, 2));
            const msg = error?.message || error?.details || error?.hint || JSON.stringify(error);
            alert(`Failed to save module: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteModule = async (m: any) => {
        if (!confirm(`Delete "${m.learning_modules.title}"? This cannot be undone.`)) return;
        try {
            // Remove from course first
            const { error: linkError } = await supabase
                .from('course_modules')
                .delete()
                .eq('id', m.id);
            if (linkError) throw linkError;

            // Delete the module itself
            const { error: modError } = await supabase
                .from('learning_modules')
                .delete()
                .eq('id', m.learning_modules.id);
            if (modError) throw modError;

            fetchData();
        } catch (error: any) {
            console.error('Error deleting module:', error);
            alert(`Failed to delete module: ${error.message}`);
        }
    };

    const handleMediaUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `course-media/${fileName}`;

        // Get the current session token for TUS auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert('Session expired. Please refresh.'); return; }

        setUploadingMedia(true);
        setUploadProgress(0);

        const upload = new tus.Upload(file, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
                authorization: `Bearer ${session.access_token}`,
                'x-upsert': 'false',
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
                bucketName: 'courses',
                objectName: filePath,
                contentType: file.type,
                cacheControl: '3600',
            },
            chunkSize: 6 * 1024 * 1024, // 6MB chunks
            onError(error) {
                console.error('Media upload failed:', error);
                alert(`Upload failed: ${error.message}`);
                setUploadingMedia(false);
                setUploadProgress(0);
            },
            onProgress(bytesUploaded, bytesTotal) {
                const pct = Math.round((bytesUploaded / bytesTotal) * 100);
                setUploadProgress(pct);
            },
            onSuccess() {
                const { data: { publicUrl } } = supabase.storage
                    .from('courses')
                    .getPublicUrl(filePath);

                setEditingModule((prev: any) => ({
                    ...prev,
                    media_url: publicUrl,
                    media_type: file.type.startsWith('video/') ? 'video' : 'audio',
                }));
                setUploadingMedia(false);
                setUploadProgress(100);
            },
        });

        uploadRef.current = upload;

        // Resume previous upload if fingerprint matches
        const prevUploads = await upload.findPreviousUploads();
        if (prevUploads.length > 0) upload.resumeFromPreviousUpload(prevUploads[0]);

        upload.start();
    }, [user, supabase]);

    const handleUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
        if (!user) return;

        const urls = await Promise.all(
            files.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `content-media/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('courses')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('courses')
                    .getPublicUrl(filePath);

                return publicUrl;
            })
        );

        callback(urls);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-6xl mx-auto pb-20">
                <Link href="/instructor/courses" className="inline-flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 transition-colors font-bold uppercase tracking-widest text-xs">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to My Courses
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Edit Course</h1>
                        <p className="text-gray-500 font-medium">{courseForm.title}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="rounded-xl border-2 border-gray-200 font-bold"
                            onClick={() => window.open(`/courses/${courseId}`, '_blank')}
                        >
                            Preview Course
                        </Button>
                        <Button
                            onClick={handleSaveCourse}
                            disabled={saving}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-8 shadow-lg shadow-orange-500/20"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save All Changes
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl mb-8 w-fit">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'details' ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Course Details
                    </button>
                    <button
                        onClick={() => setActiveTab('modules')}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'modules' ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Modules ({modules.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('quizzes')}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'quizzes' ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Quizzes ({quizzes.length})
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'details' ? (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 md:p-12 shadow-sm"
                        >
                            <div className="space-y-10">
                                {/* Title */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Course Title</label>
                                    <input
                                        type="text"
                                        value={courseForm.title}
                                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                                        className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xl font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global Description</label>
                                    <div className="md-editor-container border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                        <MdEditor
                                            modelValue={courseForm.description}
                                            onChange={(val) => setCourseForm({ ...courseForm, description: val })}
                                            theme={theme === 'dark' ? 'dark' : 'light'}
                                            language="en-US"
                                            toolbars={[
                                                'bold', 'italic', 'strikeThrough', 'title', 'sub', 'sup', 'quote',
                                                'unorderedList', 'orderedList', '-', 'codeRow', 'code', 'link',
                                                'image', 'table', 'mermaid', 'katex', '-', 'revoke', 'next',
                                                'save', '=', 'pageFullscreen', 'fullscreen', 'preview',
                                                'htmlPreview', 'catalog', 'github'
                                            ]}
                                            onUploadImg={handleUploadImg}
                                            style={{ height: '400px' }}
                                            className="!border-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Difficulty</label>
                                        <select
                                            value={courseForm.difficulty_level}
                                            onChange={(e) => setCourseForm({ ...courseForm, difficulty_level: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none"
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                                        <select
                                            value={courseForm.category_id}
                                            onChange={(e) => setCourseForm({ ...courseForm, category_id: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none cursor-pointer"
                                            disabled={fetchingCats}
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                            {categories.length === 0 && <option value="">No categories found</option>}
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Duration (Hours)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={courseForm.estimated_duration_hours}
                                            onChange={(e) => setCourseForm({ ...courseForm, estimated_duration_hours: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : activeTab === 'modules' ? (
                        <motion.div
                            key="modules"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Course Modules</h2>
                                <Button
                                    onClick={() => handleOpenModuleEditor()}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add New Module
                                </Button>
                            </div>

                            <div className="grid gap-4">
                                {modules.length === 0 ? (
                                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 font-bold">No modules yet.</p>
                                        <p className="text-gray-400 text-sm mt-1">Click "Add New Module" to create your first lesson.</p>
                                    </div>
                                ) : (
                                    modules.map((m, idx) => (
                                        <div key={m.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:shadow-md transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950 rounded-xl flex items-center justify-center text-orange-600 font-black text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{m.learning_modules.title}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest border border-gray-100 dark:border-gray-800 px-2 py-0.5 rounded">
                                                            {m.learning_modules.media_type || 'text'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400">
                                                            {m.learning_modules.estimated_duration_minutes} min
                                                        </span>
                                                        {m.is_required && (
                                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Required</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModuleEditor(m)}
                                                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-orange-500 transition-colors"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteModule(m)}
                                                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    ) : activeTab === 'quizzes' ? (
                        <motion.div
                            key="quizzes"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">Course Quizzes</h2>
                                    <p className="text-sm text-gray-500 font-medium">Manage assessments for your modules</p>
                                </div>
                                {!isQuizBuilderOpen && (
                                    <Button
                                        onClick={() => {
                                            setEditingQuizId(null);
                                            setIsQuizBuilderOpen(true);
                                        }}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create New Quiz
                                    </Button>
                                )}
                            </div>

                            {isQuizBuilderOpen ? (
                                <div className="space-y-6">
                                    <div className="flex justify-end">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsQuizBuilderOpen(false)}
                                            className="text-gray-400 hover:text-gray-900 font-bold"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back to Quiz List
                                        </Button>
                                    </div>
                                    <QuizBuilder
                                        courseId={courseId}
                                        quizId={editingQuizId || undefined}
                                        onSave={() => {
                                            setIsQuizBuilderOpen(false);
                                            fetchData();
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {quizzes.length === 0 ? (
                                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                                            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 font-bold">No quizzes created for this course yet.</p>
                                        </div>
                                    ) : (
                                        quizzes.map((q) => (
                                            <div key={q.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:shadow-md transition-all">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950 rounded-2xl flex items-center justify-center text-orange-600">
                                                        <HelpCircle className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white">{q.title}</h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded">
                                                                {q.learning_modules?.title || 'Course Global Quiz'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-400">
                                                                Pass Score: {q.passing_score}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingQuizId(q.id);
                                                            setIsQuizBuilderOpen(true);
                                                        }}
                                                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-orange-500 transition-colors"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                {/* Module Editor Modal */}
                {isModuleModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Module Editor</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Configure your lesson content</p>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsModuleModalOpen(false)}
                                        className="rounded-xl font-bold"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveModule}
                                        disabled={saving}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-8"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Module
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">

                                {/* Row 1: Title + Description (required) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            Module Title <span className="text-orange-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editingModule.title}
                                            onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                                            placeholder="e.g. Introduction to Climate Finance"
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            Short Description <span className="text-orange-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editingModule.description}
                                            onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                                            placeholder="One sentence shown in the course outline"
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Settings — difficulty, duration, required toggle */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            Difficulty <span className="text-orange-500">*</span>
                                        </label>
                                        <select
                                            value={editingModule.difficulty_level}
                                            onChange={(e) => setEditingModule({ ...editingModule, difficulty_level: e.target.value })}
                                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none"
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            Duration (Min) <span className="text-orange-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editingModule.estimated_duration_minutes}
                                            onChange={(e) => setEditingModule({ ...editingModule, estimated_duration_minutes: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Content Type <span className="text-orange-500">*</span></label>
                                        <select
                                            value={editingModule.media_type}
                                            onChange={(e) => setEditingModule({ ...editingModule, media_type: e.target.value })}
                                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none appearance-none"
                                        >
                                            <option value="text">Text / Article</option>
                                            <option value="video">Video</option>
                                            <option value="audio">Audio / Podcast</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Required?</label>
                                        <div className="flex items-center gap-3 px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                                            <input
                                                type="checkbox"
                                                id="is_required"
                                                checked={editingModule.is_required}
                                                onChange={(e) => setEditingModule({ ...editingModule, is_required: e.target.checked })}
                                                className="w-4 h-4 accent-orange-500"
                                            />
                                            <label htmlFor="is_required" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                                                Required to complete course
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3: Learning Objectives (optional but recommended) */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Learning Objectives
                                        <span className="text-gray-300 font-normal normal-case tracking-normal text-xs">(optional — recommended)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={editingModule.learning_objectives}
                                        onChange={(e) => setEditingModule({ ...editingModule, learning_objectives: e.target.value })}
                                        placeholder="One objective per line, e.g.:&#10;Understand the basics of X&#10;Apply Y in real scenarios&#10;Explain how Z works"
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                    />
                                </div>

                                {/* Row 4: Media upload (only for video/audio) */}
                                {editingModule.media_type !== 'text' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            {editingModule.media_type === 'video' ? 'Video File' : 'Audio File'} <span className="text-orange-500">*</span>
                                        </label>
                                        <div
                                            onClick={() => mediaInputRef.current?.click()}
                                            className="aspect-video max-h-48 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all group overflow-hidden relative"
                                        >
                                            {editingModule.media_url ? (
                                                <div className="w-full h-full flex items-center justify-center p-6 bg-black/5">
                                                    <div className="text-center">
                                                        {editingModule.media_type === 'video' ? <Video className="w-10 h-10 text-orange-500 mx-auto mb-2" /> : <Music className="w-10 h-10 text-orange-500 mx-auto mb-2" />}
                                                        <p className="text-xs font-bold text-gray-500 truncate max-w-[240px]">{editingModule.media_url.split('/').pop()}</p>
                                                        <p className="text-[10px] text-orange-400 mt-1">Click to replace</p>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <UploadCloud className="w-8 h-8 text-white" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center mx-auto mb-3">
                                                        {uploadingMedia ? <Loader2 className="w-6 h-6 animate-spin text-orange-500" /> : <UploadCloud className="w-6 h-6 text-gray-300" />}
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">Click to upload {editingModule.media_type}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Large files (500MB+) supported — resumes on interruption</p>
                                                </div>
                                            )}
                                        </div>
                                        {uploadingMedia && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-gray-500 font-bold">
                                                    <span>Uploading...</span><span>{uploadProgress}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                </div>
                                            </div>
                                        )}
                                        <input type="file" ref={mediaInputRef} onChange={handleMediaUpload} className="hidden"
                                            accept={editingModule.media_type === 'video' ? 'video/*' : 'audio/*'} />
                                    </div>
                                )}

                                {/* Row 5: Main lesson content (markdown) */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Lesson Content
                                        {editingModule.media_type === 'text'
                                            ? <span className="text-orange-500">*</span>
                                            : <span className="text-gray-300 font-normal normal-case tracking-normal text-xs">(optional — shown alongside media)</span>
                                        }
                                    </label>
                                    <div className="min-h-[360px] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-inner">
                                        <MdEditor
                                            modelValue={editingModule.content}
                                            onChange={(val) => setEditingModule({ ...editingModule, content: val })}
                                            onUploadImg={handleUploadImg}
                                            theme={theme === 'dark' ? 'dark' : 'light'}
                                            language="en-US"
                                            toolbars={['bold', 'italic', 'strikeThrough', 'title', 'quote', 'unorderedList', 'orderedList', 'code', 'link', 'image', 'table', 'preview']}
                                            style={{ height: '360px' }}
                                            placeholder="Write your lesson content here..."
                                        />
                                    </div>
                                </div>

                                {/* Row 6: Transcription (optional, for video/audio) */}
                                {editingModule.media_type !== 'text' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            Transcript
                                            <span className="text-gray-300 font-normal normal-case tracking-normal text-xs">(optional — shown below media player)</span>
                                        </label>
                                        <textarea
                                            rows={5}
                                            value={editingModule.transcription}
                                            onChange={(e) => setEditingModule({ ...editingModule, transcription: e.target.value })}
                                            placeholder="Paste the full transcript of your video or audio here..."
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        />
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
