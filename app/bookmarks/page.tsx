"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import {
    Bookmark,
    BookOpen,
    MessageSquare,
    Loader2,
    Search,
    Trash2,
    ExternalLink,
    Inbox,
    Zap
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedItem {
    id: string;
    item_id: string;
    item_type: 'course' | 'module' | 'chat';
    metadata: {
        title: string;
        link: string;
        icon?: string;
    };
    created_at: string;
}

export default function BookmarksPage() {
    const supabase = createBrowserClient();
    const { user } = useUser();
    const [bookmarks, setBookmarks] = useState<SavedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'course' | 'module' | 'chat'>('all');

    useEffect(() => {
        if (user) {
            fetchBookmarks();
        }
    }, [user]);

    const fetchBookmarks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_bookmarks')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookmarks(data || []);
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (id: string) => {
        try {
            const { error } = await supabase
                .from('user_bookmarks')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBookmarks(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error removing bookmark:', error);
        }
    };

    const filteredBookmarks = bookmarks.filter(b => {
        // Defensive check: ensure metadata exists
        if (!b.metadata) return false;

        const matchesSearch = (b.metadata.title || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'all' || b.item_type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
                            Bookmarks <Bookmark className="w-8 h-8 text-orange-500 fill-current" />
                        </h1>
                        <Breadcrumb
                            items={[
                                { label: 'Dashboard', href: '/dashboard' },
                                { label: 'Bookmarks' }
                            ]}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-2xl w-full md:w-auto">
                            {(['all', 'course', 'module', 'chat'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === filter
                                        ? 'bg-white text-orange-600 shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search bookmarks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 border-transparent rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="py-20 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        </div>
                    ) : filteredBookmarks.length === 0 ? (
                        <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                            <div className="w-24 h-24 bg-orange-50 rounded-[2rem] flex items-center justify-center text-orange-200 mx-auto mb-6">
                                <Inbox className="w-12 h-12" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">No bookmarks found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto font-medium">
                                {searchQuery
                                    ? "We couldn't find any bookmarks matching your search."
                                    : "Start saving courses, modules, and discussions to see them here!"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredBookmarks.map((bookmark) => (
                                    <motion.div
                                        key={bookmark.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 group hover:shadow-md transition-all flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${bookmark.item_type === 'course' ? 'bg-blue-50 text-blue-500' :
                                                    bookmark.item_type === 'module' ? 'bg-orange-50 text-orange-500' :
                                                        'bg-purple-50 text-purple-500'
                                                    }`}>
                                                    {bookmark.item_type === 'course' ? <BookOpen className="w-6 h-6" /> :
                                                        bookmark.item_type === 'module' ? <Zap className="w-6 h-6 fill-current" /> :
                                                            <MessageSquare className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                                        {bookmark.item_type}
                                                    </span>
                                                    <h4 className="font-black text-gray-900 leading-tight group-hover:text-orange-500 transition-colors line-clamp-2">
                                                        {bookmark.metadata.title}
                                                    </h4>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeBookmark(bookmark.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Remove bookmark"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="mt-auto pt-6 flex items-center justify-between border-t border-gray-50">
                                            <span className="text-[10px] font-bold text-gray-400">
                                                Added {new Date(bookmark.created_at).toLocaleDateString()}
                                            </span>
                                            <Link href={bookmark.metadata?.link || '#'}>
                                                <Button variant="ghost" className="text-orange-600 hover:bg-orange-50 font-black text-xs h-9 gap-2">
                                                    Open <ExternalLink className="w-3 h-3" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
