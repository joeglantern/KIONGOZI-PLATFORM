"use client";

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createBrowserClient } from '@/app/utils/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Search,
    Filter,
    Plus,
    MoreVertical,
    BookOpen,
    Users,
    Clock,
    Star,
    Loader2,
    Edit3
} from 'lucide-react';

interface CourseData {
    id: string;
    title: string;
    description: string;
    difficulty_level: string;
    created_at: string;
    enrollment_count: number;
    avg_rating: number;
    duration_minutes: number;
}

export default function InstructorCoursesPage() {
    const { user } = useUser();
    const supabase = createBrowserClient();
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user) fetchCourses();
    }, [user]);

    const fetchCourses = async () => {
        if (!user) return;
        try {
            const { data: myCourses, error } = await supabase
                .from('courses')
                .select('*')
                .eq('author_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (myCourses) {
                // Fetch enrollments and reviews for stats
                const courseIds = myCourses.map(c => c.id);

                const { data: enrollments } = await supabase
                    .from('course_enrollments')
                    .select('course_id')
                    .in('course_id', courseIds);

                const { data: reviews } = await supabase
                    .from('course_reviews')
                    .select('course_id, rating')
                    .in('course_id', courseIds);

                const coursesWithStats = myCourses.map(course => {
                    const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || [];
                    const courseReviews = reviews?.filter(r => r.course_id === course.id) || [];
                    const avgRating = courseReviews.length > 0
                        ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length
                        : 0;

                    return {
                        ...course,
                        enrollment_count: courseEnrollments.length,
                        avg_rating: Math.round(avgRating * 10) / 10,
                    };
                });

                setCourses(coursesWithStats);
            }
        } catch (err) {
            console.error('Error fetching courses:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const difficultyColors: Record<string, string> = {
        beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        advanced: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">My Courses</h1>
                        <p className="text-gray-500">Manage and edit your course content</p>
                    </div>
                    <Link href="/instructor/courses/new">
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20">
                            <Plus className="w-5 h-5 mr-2" />
                            Create New Course
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <Button variant="outline" className="border-gray-200 dark:border-gray-700">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-orange-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
                        <p className="text-gray-500 mb-6">Get started by creating your first course</p>
                        <Link href="/instructor/courses/new">
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                                Create Course
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCourses.map((course) => (
                            <div key={course.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 md:p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                                <div className="w-full md:w-48 h-32 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                                    {/* Placeholder for course image */}
                                    <BookOpen className="w-10 h-10 text-gray-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 ${difficultyColors[course.difficulty_level]}`}>
                                                {course.difficulty_level}
                                            </span>
                                            <Link href={`/courses/${course.id}`} className="block">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white hover:text-orange-500 transition-colors truncate">
                                                    {course.title}
                                                </h3>
                                            </Link>
                                        </div>
                                        <Link href={`/instructor/courses/${course.id}/edit`}>
                                            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-orange-100 transition-all">
                                                <Edit3 className="w-3.5 h-3.5" />
                                                <span>Edit</span>
                                            </Button>
                                        </Link>
                                    </div>

                                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                                        {course.description || 'No description provided.'}
                                    </p>

                                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>{course.enrollment_count} students</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            <span>{course.avg_rating || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>{Math.round((course.duration_minutes || 0) / 60)}h {(course.duration_minutes || 0) % 60}m</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
