"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseGridSkeleton } from '@/components/ui/Skeleton';
import { BookOpen, Search, Filter } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Pagination } from '@/components/ui/Pagination';
import { motion, AnimatePresence } from 'framer-motion';

const ITEMS_PER_PAGE = 9;
const CACHE_KEY_COURSES = 'kiongozi_courses_catalog_v2';
const CACHE_KEY_CATEGORIES = 'kiongozi_categories_catalog_v2';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function readCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed?.timestamp || Date.now() - parsed.timestamp >= CACHE_TTL) {
            return null;
        }

        return parsed.data as T;
    } catch (error) {
        console.warn(`Failed to read cache for ${key}:`, error);
        return null;
    }
}

function writeCache<T>(key: string, data: T) {
    try {
        localStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now(),
        }));
    } catch (error) {
        console.warn(`Failed to write cache for ${key}:`, error);
    }
}

export default function CoursesPage() {
    const { user } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const [courses, setCourses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);

    const mergeUserEnrollments = (baseCourses: any[], enrollmentRows: any[]) => {
        const enrollmentMap = new Map(
            (enrollmentRows || []).map((enrollment) => [enrollment.course_id, [enrollment]])
        );

        return baseCourses.map((course) => ({
            ...course,
            course_enrollments: enrollmentMap.get(course.id) || [],
        }));
    };

    const fetchData = async ({ skipCatalogFetch = false }: { skipCatalogFetch?: boolean } = {}) => {
        if (!user) return;

        try {
            let catalogCourses = readCache<any[]>(CACHE_KEY_COURSES) || [];
            let categoryRows = readCache<any[]>(CACHE_KEY_CATEGORIES) || [];

            if (!skipCatalogFetch) {
                const [categoriesResult, coursesResult] = await Promise.all([
                    supabase.from('module_categories').select('id, name, color').order('name'),
                    supabase
                        .from('courses')
                        .select('id, title, description, thumbnail_url, difficulty_level, estimated_duration_hours, category_id, created_at, enrollment_count, module_categories(name, color)')
                        .eq('status', 'published'),
                ]);

                if (categoriesResult.error) throw categoriesResult.error;
                if (coursesResult.error) throw coursesResult.error;

                categoryRows = categoriesResult.data || [];
                catalogCourses = (coursesResult.data || []).map((course) => ({
                    ...course,
                    description: course.description || '',
                    enrollment_count: course.enrollment_count || 0,
                }));

                setCategories(categoryRows);
                writeCache(CACHE_KEY_CATEGORIES, categoryRows);
                writeCache(CACHE_KEY_COURSES, catalogCourses);
            }

            const courseIds = catalogCourses.map((course) => course.id);
            let enrollmentRows: any[] = [];

            if (courseIds.length > 0) {
                const { data: userEnrollments, error: userEnrollmentError } = await supabase
                    .from('course_enrollments')
                    .select('id, course_id, progress_percentage, status')
                    .eq('user_id', user.id)
                    .in('course_id', courseIds);

                if (userEnrollmentError) throw userEnrollmentError;
                enrollmentRows = userEnrollments || [];
            }

            setCourses(mergeUserEnrollments(catalogCourses, enrollmentRows));
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;

        const cachedCourses = readCache<any[]>(CACHE_KEY_COURSES);
        const cachedCategories = readCache<any[]>(CACHE_KEY_CATEGORIES);

        if (cachedCategories) {
            setCategories(cachedCategories);
        }

        if (cachedCourses) {
            setCourses(cachedCourses);
            setLoading(false);
        }

        fetchData({ skipCatalogFetch: !!cachedCourses && !!cachedCategories });
    }, [user]);

    const filteredCourses = useMemo(() => {
        let filtered = [...courses];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (course) =>
                    course.title.toLowerCase().includes(query) ||
                    course.description?.toLowerCase().includes(query)
            );
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter((course) => course.category_id === selectedCategory);
        }

        if (selectedDifficulty !== 'all') {
            filtered = filtered.filter((course) => course.difficulty_level === selectedDifficulty);
        }

        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'popular':
                filtered.sort((a, b) => (b.enrollment_count || 0) - (a.enrollment_count || 0));
                break;
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }

        return filtered;
    }, [courses, searchQuery, selectedCategory, selectedDifficulty, sortBy]);

    const paginatedCourses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCourses, currentPage]);

    const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedDifficulty, sortBy]);

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center shadow-lg">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                                    Browse Courses
                                </h1>
                                <p className="text-gray-500 font-medium italic">Discover and enroll in courses to start your leadership journey.</p>
                            </div>
                        </div>
                    </div>

                    <Breadcrumb items={[{ label: 'Courses' }]} />

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-[2rem] shadow-sm border border-orange-100 p-8 sticky top-6">
                                <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                    Refine Search
                                </h2>

                                <div className="mb-8">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                        Title or Keyword
                                    </label>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Explore..."
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/20 transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                        Category
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/20 transition-all font-bold text-sm appearance-none"
                                    >
                                        <option value="all">All Specialties</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                        Complexity
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setSelectedDifficulty(level)}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${selectedDifficulty === level
                                                    ? 'bg-orange-500 text-white border-transparent shadow-md'
                                                    : 'bg-white text-gray-400 border-gray-100 hover:border-orange-200'
                                                    }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                        Display Order
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/20 transition-all font-bold text-sm appearance-none"
                                    >
                                        <option value="newest">Recent Releases</option>
                                        <option value="popular">Most Enrolled</option>
                                        <option value="title">Alphabetical</option>
                                    </select>
                                </div>

                                {(searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all' || sortBy !== 'newest') && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('all');
                                            setSelectedDifficulty('all');
                                            setSortBy('newest');
                                        }}
                                        className="w-full px-4 py-3 text-xs font-black uppercase tracking-widest text-orange-600 hover:text-white hover:bg-orange-600 rounded-2xl transition-all border-2 border-orange-100 hover:border-transparent"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            {loading && filteredCourses.length === 0 && (
                                <CourseGridSkeleton count={6} />
                            )}

                            {!loading && filteredCourses.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-[2.5rem] p-16 text-center border border-orange-100 shadow-sm"
                                >
                                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search className="w-10 h-10 text-orange-400" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">No matching courses</h3>
                                    <p className="text-gray-500 font-medium max-w-sm mx-auto mb-8">
                                        We couldn&apos;t find any courses matching your current filters. Try broadening your search.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('all');
                                            setSelectedDifficulty('all');
                                        }}
                                        className="px-8 py-3.5 bg-gray-900 text-white font-black rounded-2xl shadow-lg hover:bg-gray-800 transition-all active:scale-95"
                                    >
                                        Explore All Courses
                                    </button>
                                </motion.div>
                            )}

                            {filteredCourses.length > 0 && (
                                <>
                                    <div className="mb-6 flex items-center justify-between px-2">
                                        <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <span>Collection</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            <span className="text-gray-900 font-black">{filteredCourses.length} Learning Paths</span>
                                        </div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Page {currentPage} of {totalPages || 1}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            {paginatedCourses.map((course, idx) => (
                                                <motion.div
                                                    key={course.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                                                >
                                                    <CourseCard course={course} />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
