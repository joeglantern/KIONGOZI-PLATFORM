"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createBrowserClient } from '@/app/utils/supabase/client';
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
    const supabase = createBrowserClient();
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
        duration_minutes: 60,
        thumbnail_url: '',
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [fetchingCats, setFetchingCats] = useState(true);

    // Module Editor State
    const [editingModule, setEditingModule] = useState<any>(null);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
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
                duration_minutes: courseData.duration_minutes || 60,
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
                .select(`
                    id, 
                    title, 
                    passing_score, 
                    module_id,
                    learning_modules (title)
                `)
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
                title: moduleData.learning_modules.title,
                description: moduleData.learning_modules.description || '',
                content: moduleData.learning_modules.content || '',
                content_type: moduleData.learning_modules.content_type || 'text',
                media_url: moduleData.learning_modules.media_url || '',
                transcription: moduleData.learning_modules.transcription || '',
                estimated_duration_minutes: moduleData.learning_modules.estimated_duration_minutes || 30,
            });
        } else {
            setEditingModule({
                title: '',
                description: '',
                content: '',
                content_type: 'text',
                media_url: '',
                transcription: '',
                estimated_duration_minutes: 30,
            });
        }
        setIsModuleModalOpen(true);
    };

    const handleSaveModule = async () => {
        if (!editingModule.title) return alert('Module title is required');

        try {
            setSaving(true);
            let moduleId = editingModule.id;

            if (moduleId) {
                // Update existing learning_module
                const { error } = await supabase
                    .from('learning_modules')
                    .update({
                        title: editingModule.title,
                        description: editingModule.description,
                        content: editingModule.content,
                        content_type: editingModule.content_type,
                        media_url: editingModule.media_url,
                        transcription: editingModule.transcription,
                        estimated_duration_minutes: editingModule.estimated_duration_minutes,
                    })
                    .eq('id', moduleId);
                if (error) throw error;
            } else {
                // Create new learning_module
                if (!user) throw new Error("User not authenticated");
                const { data: newModule, error: modError } = await supabase
                    .from('learning_modules')
                    .insert({
                        title: editingModule.title,
                        description: editingModule.description,
                        content: editingModule.content,
                        content_type: editingModule.content_type,
                        media_url: editingModule.media_url,
                        transcription: editingModule.transcription,
                        estimated_duration_minutes: editingModule.estimated_duration_minutes,
                        author_id: user.id
                    })
                    .select()
                    .single();

                if (modError) throw modError;
                moduleId = newModule.id;

                // Link to course
                if (!user) throw new Error("User not authenticated");
                const { error: linkError } = await supabase
                    .from('course_modules')
                    .insert({
                        course_id: courseId,
                        module_id: moduleId,
                        order_index: modules.length,
                        is_required: true
                    });
                if (linkError) throw linkError;
            }

            setIsModuleModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error saving module:', error);
            alert('Failed to save module');
        } finally {
            setSaving(false);
        }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Up to 1GB check (Supabase bucket might still limit this)
        if (file.size > 1024 * 1024 * 1024) {
            alert('File size exceeds 1GB limit.');
            return;
        }

        try {
            setUploadingMedia(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `course-media/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('courses')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('courses')
                .getPublicUrl(filePath);

            setEditingModule((prev: any) => ({
                ...prev,
                media_url: publicUrl,
                content_type: file.type.startsWith('video/') ? 'video' : 'audio'
            }));
        } catch (error) {
            console.error('Error uploading media:', error);
            alert('Error uploading media file. Check storage bucket permissions.');
        } finally {
            setUploadingMedia(false);
        }
    };

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
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Duration (Min)</label>
                                        <input
                                            type="number"
                                            value={courseForm.duration_minutes}
                                            onChange={(e) => setCourseForm({ ...courseForm, duration_minutes: parseInt(e.target.value) })}
                                            className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none"
                                        />
                                    </div>
                                </div>
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
                    ) : (
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
                                        <p className="text-gray-500 font-bold">No modules added to this course yet.</p>
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
                                                            {m.learning_modules.content_type || 'text'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400">
                                                            {m.learning_modules.estimated_duration_minutes} min
                                                        </span>
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
                                                <button className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
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

                            <div className="flex-1 overflow-y-auto p-8 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Left Column: Title & Media */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Module Title</label>
                                            <input
                                                type="text"
                                                value={editingModule.title}
                                                onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                                                placeholder="Lesson Name..."
                                                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Content Type</label>
                                            <div className="flex gap-2">
                                                {['text', 'video', 'audio'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setEditingModule({ ...editingModule, content_type: type })}
                                                        className={`flex-1 py-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${editingModule.content_type === type ? 'bg-orange-50 text-orange-600 border-orange-500' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-800'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {editingModule.content_type !== 'text' && (
                                            <div className="space-y-4">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                    Media Upload (Up to 1GB)
                                                </label>
                                                <div
                                                    onClick={() => mediaInputRef.current?.click()}
                                                    className="aspect-video rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all group overflow-hidden relative"
                                                >
                                                    {editingModule.media_url ? (
                                                        <div className="w-full h-full flex items-center justify-center p-8 bg-black/5">
                                                            <div className="text-center">
                                                                {editingModule.content_type === 'video' ? <Video className="w-12 h-12 text-orange-500 mx-auto mb-2" /> : <Music className="w-12 h-12 text-orange-500 mx-auto mb-2" />}
                                                                <p className="text-xs font-bold text-gray-500 truncate max-w-[200px]">{editingModule.media_url.split('/').pop()}</p>
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <UploadCloud className="w-8 h-8 text-white" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-6">
                                                            <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center mx-auto mb-4">
                                                                {uploadingMedia ? <Loader2 className="w-6 h-6 animate-spin text-orange-500" /> : <UploadCloud className="w-6 h-6 text-gray-300" />}
                                                            </div>
                                                            <p className="text-xs font-bold text-gray-900 dark:text-white">Click to Upload {editingModule.content_type}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    ref={mediaInputRef}
                                                    onChange={handleMediaUpload}
                                                    className="hidden"
                                                    accept={editingModule.content_type === 'video' ? 'video/*' : 'audio/*'}
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Transcription (Rich Text)</label>
                                            <textarea
                                                rows={5}
                                                value={editingModule.transcription}
                                                onChange={(e) => setEditingModule({ ...editingModule, transcription: e.target.value })}
                                                placeholder="Paste your video/audio transcript here..."
                                                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                            />
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                                <MessageCircle className="w-3 h-3" />
                                                Visible to students below the media player
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right Column: Markdown Content */}
                                    <div className="space-y-8 flex flex-col h-full">
                                        <div className="space-y-4 flex-1 flex flex-col">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Lesson Content (Markdown)</label>
                                            <div className="flex-1 min-h-[400px] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-inner">
                                                <MdEditor
                                                    modelValue={editingModule.content}
                                                    onChange={(val) => setEditingModule({ ...editingModule, content: val })}
                                                    onUploadImg={handleUploadImg}
                                                    theme={theme === 'dark' ? 'dark' : 'light'}
                                                    language="en-US"
                                                    toolbars={['bold', 'italic', 'strikeThrough', 'title', 'quote', 'unorderedList', 'orderedList', 'code', 'link', 'image', 'table', 'preview']}
                                                    style={{ height: '100%' }}
                                                    placeholder="Write your lesson content here..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Est. Duration (Min)</label>
                                            <input
                                                type="number"
                                                value={editingModule.estimated_duration_minutes}
                                                onChange={(e) => setEditingModule({ ...editingModule, estimated_duration_minutes: parseInt(e.target.value) })}
                                                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
