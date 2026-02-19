"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import {
    StickyNote,
    BookOpen,
    Loader2,
    Search,
    ExternalLink,
    Filter,
    Calendar,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

interface NoteEntry {
    id: string;
    notes: string;
    updated_at: string;
    course_id: string;
    module_id: string;
    learning_modules: {
        title: string;
    };
    courses?: {
        title: string;
    } | { title: string }[]; // Handle potential array from join
}

interface GroupedNotes {
    courseId: string;
    courseTitle: string;
    notes: NoteEntry[];
}

export default function NotesPage() {
    const supabase = createClient();
    const { user } = useUser();
    const [notes, setNotes] = useState<NoteEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user) {
            fetchNotes();
        }
    }, [user]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_progress')
                .select(`
                    id,
                    notes,
                    updated_at,
                    course_id,
                    module_id,
                    learning_modules (title),
                    courses (title)
                `)
                .eq('user_id', user!.id)
                .not('notes', 'is', null)
                .neq('notes', '')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setNotes(data as any[] || []);

            // Auto-expand all courses initially
            if (data) {
                const uniqueCourses = new Set(data.map(n => n.course_id || 'unknown'));
                setExpandedCourses(uniqueCourses);
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCourseExpansion = (courseId: string) => {
        const next = new Set(expandedCourses);
        if (next.has(courseId)) {
            next.delete(courseId);
        } else {
            next.add(courseId);
        }
        setExpandedCourses(next);
    };

    const getCourseTitle = (note: NoteEntry) => {
        if (!note.courses) return 'Unknown Course';
        if (Array.isArray(note.courses)) {
            return note.courses[0]?.title || 'Unknown Course';
        }
        return note.courses.title;
    };

    const filteredNotes = notes.filter(n =>
        n.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.learning_modules.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCourseTitle(n).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedNotes: GroupedNotes[] = [];
    filteredNotes.forEach(note => {
        const courseId = note.course_id || 'unknown';
        const courseTitle = getCourseTitle(note);
        let group = groupedNotes.find(g => g.courseId === courseId);
        if (!group) {
            group = { courseId, courseTitle, notes: [] };
            groupedNotes.push(group);
        }
        group.notes.push(note);
    });

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-[#F8FAFC] flex">
                <DashboardSidebar />
                <main className="flex-1 min-w-0 h-screen overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                        {/* Header */}
                        <div className="mb-10">
                            <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                                My Learning Notes <StickyNote className="w-8 h-8 text-orange-500 fill-current" />
                            </h1>
                            <Breadcrumb
                                items={[
                                    { label: 'Dashboard', href: '/dashboard' },
                                    { label: 'Notes' }
                                ]}
                            />
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search through your notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-50 border-transparent rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button variant="outline" onClick={fetchNotes} className="rounded-xl border-gray-200 font-bold px-6">
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        {/* Notes List */}
                        {loading ? (
                            <div className="py-20 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                            </div>
                        ) : groupedNotes.length === 0 ? (
                            <div className="bg-white rounded-[3rem] p-20 text-center border shadow-sm border-gray-100">
                                <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-300 mx-auto mb-6">
                                    <StickyNote className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">No notes found</h3>
                                <p className="text-gray-500 max-w-sm mx-auto font-medium">
                                    {searchQuery
                                        ? "No notes matched your search query."
                                        : "You haven't taken any notes yet. Start learning and jot down your insights in the module viewer!"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {groupedNotes.map((group) => (
                                    <div key={group.courseId} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                        <button
                                            onClick={() => toggleCourseExpansion(group.courseId)}
                                            className="w-full px-8 py-6 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors border-b border-gray-50"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-black text-gray-900 leading-tight">{group.courseTitle}</h3>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        {group.notes.length} {group.notes.length === 1 ? 'Note' : 'Notes'}
                                                    </span>
                                                </div>
                                            </div>
                                            {expandedCourses.has(group.courseId) ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {expandedCourses.has(group.courseId) && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-8 space-y-6">
                                                        {group.notes.map((note) => (
                                                            <div key={note.id} className="group relative">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <h4 className="text-sm font-black text-orange-600 flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                                        {note.learning_modules.title}
                                                                    </h4>
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                                            <Calendar className="w-3 h-3" />
                                                                            {new Date(note.updated_at).toLocaleDateString()}
                                                                        </span>
                                                                        <Link href={`/courses/${note.course_id}/modules/${note.module_id}`}>
                                                                            <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 flex items-center gap-1 h-6 px-2 rounded-lg hover:bg-orange-50 transition-all">
                                                                                View Lesson <ExternalLink className="w-3 h-3" />
                                                                            </button>
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-gray-50 rounded-2xl p-6 text-gray-700 text-sm font-medium leading-relaxed whitespace-pre-wrap border border-transparent group-hover:border-orange-100 group-hover:bg-white transition-all shadow-sm group-hover:shadow-md">
                                                                    {note.notes}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
