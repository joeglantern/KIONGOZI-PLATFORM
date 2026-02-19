"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { CourseCard } from '@/components/courses/CourseCard';
import { BookOpen, Loader2, Search, Filter, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Pagination } from '@/components/ui/Pagination';
import { motion, AnimatePresence } from 'framer-motion';

const ITEMS_PER_PAGE = 9;
const CACHE_KEY_COURSES = 'kiongozi_courses_cache';
const CACHE_KEY_CATEGORIES = 'kiongozi_categories_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function CoursesPage() {
    const { user } = useUser();
    const supabase = createClient();

    const [courses, setCourses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);

    // Initial load from cache
    useEffect(() => {
        const cachedCourses = localStorage.getItem(CACHE_KEY_COURSES);
        const cachedCategories = localStorage.getItem(CACHE_KEY_CATEGORIES);

        let hasFoundValidCache = false;

        if (cachedCourses) {
            const { data, timestamp } = JSON.parse(cachedCourses);
            if (Date.now() - timestamp < CACHE_TTL) {
                setCourses(data);
                hasFoundValidCache = true;
            }
        }

        if (cachedCategories) {
            const { data, timestamp } = JSON.parse(cachedCategories);
            if (Date.now() - timestamp < CACHE_TTL) {
                setCategories(data);
            }
        }

        if (hasFoundValidCache) {
            setLoading(false);
        }

        fetchData();
    }, [user]);

    const fetchData = async () => {
        if (!user) return;

        try {
            // Fetch categories
            const { data: categoriesData } = await supabase
                .from('module_categories')
                .select('id, name, color')
                .order('name');

            setCategories(categoriesData || []);

            // Fetch all courses
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select(`
                    *,
                    module_categories(name, color)
                `)
                .eq('status', 'published');

            if (coursesError) throw coursesError;

            // Fetch user's enrollments
            const { data: enrollmentsData } = await supabase
                .from('course_enrollments')
                .select('id, course_id, progress_percentage, status')
                .eq('user_id', user.id);

            const enrollmentMap = new Map(
                (enrollmentsData || []).map(e => [e.course_id, [e]])
            );

            // Combine courses with enrollment data and counts
            const coursesWithCounts = await Promise.all(
                (coursesData || []).map(async (course) => {
                    const userEnrollment = enrollmentMap.get(course.id) || [];
                    const { count } = await supabase
                        .from('course_enrollments')
                        .select('*', { count: 'exact', head: true })
                        .eq('course_id', course.id);

                    return {
                        ...course,
                        course_enrollments: userEnrollment,
                        enrollment_count: count || 0,
                    };
                })
            );

            setCourses(coursesWithCounts);

            // Update cache
            localStorage.setItem(CACHE_KEY_COURSES, JSON.stringify({
                data: coursesWithCounts,
                timestamp: Date.now()
            }));

            localStorage.setItem(CACHE_KEY_CATEGORIES, JSON.stringify({
                data: categoriesData || [],
                timestamp: Date.now()
            }));

        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort courses
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

    // Paginated items
    const paginatedCourses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCourses, currentPage]);

    const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedDifficulty, sortBy]);

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
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
                        {/* Sidebar Filters */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-[2rem] shadow-sm border border-orange-100 p-8 sticky top-6">
                                <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                    Refine Search
                                </h2>

                                {/* Search */}
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

                                {/* Category Filter */}
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

                                {/* Difficulty Filter */}
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

                                {/* Sort */}
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

                                {/* Clear Filters */}
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

                        {/* Main Content */}
                        <div className="lg:col-span-3">
                            {/* Loading State */}
                            {loading && filteredCourses.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-orange-50 shadow-sm">
                                    <Loader2 className="w-12 h-12 animate-spin text-orange-500 mb-4" />
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Scanning Catalog...</span>
                                </div>
                            )}

                            {/* Empty State */}
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
                                        We couldn't find any courses matching your current filters. Try broadening your search.
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

                            {/* Course Grid */}
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
