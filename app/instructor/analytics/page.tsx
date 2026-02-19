"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
    Users,
    BookOpen,
    TrendingUp,
    Award,
    BarChart3,
    Loader2
} from 'lucide-react';

interface CourseStats {
    id: string;
    title: string;
    enrollment_count: number;
    avg_progress: number;
    completed_count: number;
}

export default function InstructorAnalyticsPage() {
    const { user } = useUser();
    const supabase = createBrowserClient();
    const [courses, setCourses] = useState<CourseStats[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchAnalytics();
    }, [user]);

    const fetchAnalytics = async () => {
        if (!user) return;
        try {
            // Get instructor's courses
            const { data: instructorCourses } = await supabase
                .from('courses')
                .select('id, title')
                .eq('author_id', user.id);

            if (!instructorCourses?.length) {
                setLoading(false);
                return;
            }

            const courseIds = instructorCourses.map(c => c.id);

            // Get enrollments for all courses
            const { data: enrollments } = await supabase
                .from('course_enrollments')
                .select('course_id, progress_percentage, status, user_id')
                .in('course_id', courseIds);

            // Calculate stats per course
            const courseStats: CourseStats[] = instructorCourses.map(course => {
                const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || [];
                const avg = courseEnrollments.length > 0
                    ? Math.round(courseEnrollments.reduce((s, e) => s + (e.progress_percentage || 0), 0) / courseEnrollments.length)
                    : 0;
                const completed = courseEnrollments.filter(e => e.status === 'completed').length;
                return {
                    id: course.id,
                    title: course.title,
                    enrollment_count: courseEnrollments.length,
                    avg_progress: avg,
                    completed_count: completed,
                };
            });

            setCourses(courseStats);

            // Unique students
            const uniqueStudents = new Set(enrollments?.map(e => e.user_id) || []);
            setTotalStudents(uniqueStudents.size);
        } catch (err) {
            console.error('Analytics error:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalEnrollments = courses.reduce((s, c) => s + c.enrollment_count, 0);
    const totalCompleted = courses.reduce((s, c) => s + c.completed_count, 0);
    const overallCompletion = totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0;

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                        Analytics Overview
                    </h1>
                    <p className="text-gray-500 font-medium">Track your course performance and student engagement</p>
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
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-14 h-14 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-500">
                                    <Users className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{totalStudents}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Students</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-500">
                                    <TrendingUp className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{totalEnrollments}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Enrollments</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-500">
                                    <Award className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{overallCompletion}%</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completion</p>
                                </div>
                            </div>
                        </div>

                        {/* Course Performance Table */}
                        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-orange-500" />
                                    Course Performance
                                </h2>
                            </div>
                            {courses.length === 0 ? (
                                <div className="p-12 text-center">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="font-bold text-gray-400">No courses yet. Create your first course to see analytics!</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                <th className="text-left text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Course</th>
                                                <th className="text-center text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Enrolled</th>
                                                <th className="text-center text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Completed</th>
                                                <th className="text-center text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Avg Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {courses.map(course => (
                                                <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{course.title}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                                                            <Users className="w-3.5 h-3.5" />
                                                            {course.enrollment_count}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600 dark:text-green-400">
                                                            <Award className="w-3.5 h-3.5" />
                                                            {course.completed_count}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-orange-500 rounded-full transition-all"
                                                                    style={{ width: `${course.avg_progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-500">{course.avg_progress}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
