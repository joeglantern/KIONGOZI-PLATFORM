"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
    Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useEffect } from 'react';

export default function CreateCoursePage() {
    const { user } = useUser();
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty_level: 'beginner',
        category_id: '',
        duration_minutes: 60,
        thumbnail_url: '',
    });

    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [fetchingCats, setFetchingCats] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setFetchingCats(true);
            const { data, error } = await supabase
                .from('module_categories')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
            if (data && data.length > 0) {
                setFormData(prev => ({ ...prev, category_id: data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setFetchingCats(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Show local preview
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `course-thumbnails/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('courses')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('courses')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading image. Make sure the "courses" bucket exists in Supabase Storage.');
        } finally {
            setUploading(false);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('courses')
                .insert([
                    {
                        title: formData.title,
                        description: formData.description,
                        difficulty_level: formData.difficulty_level,
                        category_id: formData.category_id,
                        duration_minutes: formData.duration_minutes,
                        thumbnail_url: formData.thumbnail_url,
                        author_id: user.id,
                        published: false
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            router.push(`/instructor/courses/${data.id}/edit`);
        } catch (error) {
            console.error('Error creating course:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-4xl mx-auto pb-20">
                <Link href="/instructor/courses" className="inline-flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Courses
                </Link>

                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="p-8 md:p-12 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Create New Course</h1>
                                <p className="text-gray-500 dark:text-gray-400">Design an engaging learning experience for your students.</p>
                            </div>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || uploading}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl px-8 py-7 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        Save Course
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 space-y-10">
                        {/* Thumbnail Upload */}
                        <div className="space-y-4">
                            <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Course Thumbnail</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative aspect-video md:aspect-[21/9] rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden"
                            >
                                {previewUrl ? (
                                    <>
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white/20 backdrop-blur-md p-4 rounded-full">
                                                <UploadCloud className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            {uploading ? <Loader2 className="w-8 h-8 text-orange-500 animate-spin" /> : <Plus className="w-8 h-8 text-gray-400 group-hover:text-orange-500" />}
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Click to upload thumbnail</p>
                                        <p className="text-xs text-gray-500 mt-1">PNG, JPG or WebP (Max 5MB)</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-4">
                            <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Course Title</label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter a catchy title..."
                                className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl text-xl font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                            />
                        </div>

                        {/* Description with MD Editor */}
                        <div className="space-y-4">
                            <label className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Description</label>

                            <div className="md-editor-container border border-gray-200 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-inner">
                                <MdEditor
                                    modelValue={formData.description}
                                    onChange={(val) => setFormData({ ...formData, description: val })}
                                    theme={theme === 'dark' ? 'dark' : 'light'}
                                    language="en-US"
                                    toolbars={[
                                        'bold',
                                        'italic',
                                        'strikeThrough',
                                        'title',
                                        'sub',
                                        'sup',
                                        'quote',
                                        'unorderedList',
                                        'orderedList',
                                        '-',
                                        'codeRow',
                                        'code',
                                        'link',
                                        'image',
                                        'table',
                                        'mermaid',
                                        'katex',
                                        '-',
                                        'revoke',
                                        'next',
                                        'save',
                                        '=',
                                        'pageFullscreen',
                                        'fullscreen',
                                        'preview',
                                        'htmlPreview',
                                        'catalog',
                                        'github'
                                    ]}
                                    onUploadImg={handleUploadImg}
                                    style={{ height: '500px' }}
                                    placeholder="Describe your course... Use the toolbar for easy formatting!"
                                    className="!border-none"
                                />
                            </div>

                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                Markdown supported (GFM)
                            </p>
                        </div>

                        {/* Settings Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Difficulty</label>
                                <select
                                    value={formData.difficulty_level}
                                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category</label>
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
                                    disabled={fetchingCats}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                    {categories.length === 0 && <option value="">No categories found</option>}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Est. Duration (Min)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

// Sparkles icon for the footer note
function Sparkles({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
        </svg>
    )
}
