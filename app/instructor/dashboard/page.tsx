"use client";

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabaseClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Users,
    BookOpen,
    BarChart3,
    MessageSquare,
    TrendingUp,
    Star,
    Loader2,
    Eye,
    ArrowRight,
} from 'lucide-react';

interface CourseData {
    id: string;
    title: string;
    difficulty_level: string;
    created_at: string;
    enrollment_count: number;
    avg_progress: number;
    completed_count: number;
}

export default function InstructorDashboardPage() {
    const { user, profile } = useUser();
    const supabase = createClient();
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;
        try {
            // 1. Fetch instructor's courses
            const { data: myCourses, error: coursesError } = await supabase
                .from('courses')
                .select('id, title, difficulty_level, created_at')
                .eq('author_id', user.id)
                .order('created_at', { ascending: false });

            if (coursesError) {
                console.error('Error fetching courses:', coursesError);
                setLoading(false);
                return;
            }

            if (!myCourses || myCourses.length === 0) {
                setCourses([]);
                setLoading(false);
                return;
            }

            const courseIds = myCourses.map(c => c.id);

            // 2. Fetch enrollments for all courses
            const { data: enrollments } = await supabase
                .from('course_enrollments')
                .select('course_id, progress_percentage, status, user_id')
                .in('course_id', courseIds);

            // 3. Fetch average rating from reviews
            const { data: reviews } = await supabase
                .from('course_reviews')
                .select('rating, course_id')
                .in('course_id', courseIds);

            // Calculate per-course stats
            const courseStats: CourseData[] = myCourses.map(course => {
                const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || [];
                const avg = courseEnrollments.length > 0
                    ? Math.round(courseEnrollments.reduce((s, e) => s + (e.progress_percentage || 0), 0) / courseEnrollments.length)
                    : 0;
                const completed = courseEnrollments.filter(e => e.status === 'completed').length;
                return {
                    ...course,
                    enrollment_count: courseEnrollments.length,
                    avg_progress: avg,
                    completed_count: completed,
                };
            });

            setCourses(courseStats);

            // Unique students across all courses
            const uniqueStudents = new Set(enrollments?.map(e => e.user_id) || []);
            setTotalStudents(uniqueStudents.size);

            // Overall average rating
            if (reviews && reviews.length > 0) {
                const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                setAvgRating(Math.round(avg * 10) / 10);
            }
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalEnrollments = courses.reduce((s, c) => s + c.enrollment_count, 0);
    const overallCompletion = totalEnrollments > 0
        ? Math.round(courses.reduce((s, c) => s + (c.completed_count), 0) / totalEnrollments * 100)
        : 0;

    const difficultyColors: Record<string, string> = {
        beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        advanced: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-7xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                            Instructor Hub 👨‍🏫
                        </h1>
                        <p className="text-gray-500 font-medium">
                            Welcome back, <span className="text-orange-500">{profile?.first_name || 'Instructor'}</span>. Manage courses and track student progress.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-500">
                                    <BookOpen className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{courses.length}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">My Courses</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-14 h-14 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-500">
                                    <Users className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{totalStudents}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Students</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-500">
                                    <TrendingUp className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{overallCompletion}%</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completion</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-500">
                                    <Star className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{avgRating || '—'}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Rating</p>
                                </div>
                            </div>
                        </div>

                        {/* My Courses Summary */}
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-orange-500" />
                                    Recent Courses
                                </h2>
                                <Link href="/instructor/courses">
                                    <Button variant="ghost" className="text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-50 dark:hover:bg-orange-900/20">
                                        View All <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </Link>
                            </div>

                            {courses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center text-orange-500 mb-6">
                                        <BookOpen className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No courses yet</h3>
                                    <p className="text-gray-500 font-medium max-w-sm mb-6">
                                        You haven't created any courses. Head to 'My Courses' to create one!
                                    </p>
                                    <Link href="/instructor/courses">
                                        <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-6 py-4">
                                            Create Course
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {courses.slice(0, 5).map(course => (
                                        <Link key={course.id} href={`/courses/${course.id}`}>
                                            <div className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer flex items-center gap-5">
                                                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0">
                                                    {course.title[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{course.title}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${difficultyColors[course.difficulty_level] || 'bg-gray-100 text-gray-600'}`}>
                                                            {course.difficulty_level}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-medium">
                                                            {course.enrollment_count} student{course.enrollment_count !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-sm font-black text-gray-900 dark:text-white">{course.avg_progress}%</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avg Progress</p>
                                                    </div>
                                                    <div className="w-16 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden hidden sm:block">
                                                        <div
                                                            className="h-full bg-orange-500 rounded-full transition-all"
                                                            style={{ width: `${course.avg_progress}%` }}
                                                        />
                                                    </div>
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
