"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
    Users,
    BookOpen,
    TrendingUp,
    Award,
    BarChart3,
    Package
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface CourseStats {
    id: string;
    title: string;
    enrollment_count: number;
    avg_progress: number;
    completed_count: number;
}

interface ScormStat {
    id: string;
    title: string;
    course_title: string;
    launches: number;
    completions: number;
    avg_score: number | null;
}

export default function InstructorAnalyticsPage() {
    const { user } = useUser();
    const supabase = useMemo(() => createClient(), []);
    const [courses, setCourses] = useState<CourseStats[]>([]);
    const [scormStats, setScormStats] = useState<ScormStat[]>([]);
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

            // Get enrollments and SCORM packages in parallel
            const [{ data: enrollments }, { data: scormPackages }] = await Promise.all([
                supabase
                    .from('course_enrollments')
                    .select('course_id, progress_percentage, status, user_id')
                    .in('course_id', courseIds),
                supabase
                    .from('scorm_packages')
                    .select('id, title, course_id')
                    .in('course_id', courseIds)
                    .eq('status', 'active'),
            ]);

            // Group enrollments by course_id for O(1) access
            const enrollmentsByCourse = new Map<string, typeof enrollments>();
            for (const e of enrollments ?? []) {
                const list = enrollmentsByCourse.get(e.course_id) ?? [];
                list.push(e);
                enrollmentsByCourse.set(e.course_id, list);
            }

            const courseStats: CourseStats[] = instructorCourses.map(course => {
                const courseEnrollments = enrollmentsByCourse.get(course.id) ?? [];
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

            const uniqueStudents = new Set(enrollments?.map(e => e.user_id) ?? []);
            setTotalStudents(uniqueStudents.size);

            if (scormPackages?.length) {
                const pkgIds = scormPackages.map(p => p.id);
                const { data: registrations } = await supabase
                    .from('scorm_registrations')
                    .select('package_id, lesson_status, score_raw')
                    .in('package_id', pkgIds);

                // Group registrations by package_id for O(1) access
                const regsByPackage = new Map<string, NonNullable<typeof registrations>>();
                for (const r of registrations ?? []) {
                    const list = regsByPackage.get(r.package_id) ?? [];
                    list.push(r);
                    regsByPackage.set(r.package_id, list);
                }

                const courseMap = new Map(instructorCourses.map(c => [c.id, c.title]));
                const stats: ScormStat[] = scormPackages.map(pkg => {
                    const regs = regsByPackage.get(pkg.id) ?? [];
                    const completed = regs.filter(r =>
                        r.lesson_status === 'completed' || r.lesson_status === 'passed'
                    ).length;
                    const scores = regs
                        .map(r => r.score_raw)
                        .filter((s): s is number => s !== null && s !== undefined);
                    const avg = scores.length
                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        : null;
                    return {
                        id: pkg.id,
                        title: pkg.title,
                        course_title: courseMap.get(pkg.course_id) ?? '—',
                        launches: regs.length,
                        completions: completed,
                        avg_score: avg,
                    };
                });
                setScormStats(stats);
            }
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
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4">
                                    <Skeleton className="h-14 w-14 rounded-2xl flex-shrink-0" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-16" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <Skeleton className="h-6 w-44" />
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="px-6 py-4 grid grid-cols-4 gap-6">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-12 mx-auto" />
                                        <Skeleton className="h-4 w-12 mx-auto" />
                                        <Skeleton className="h-2 w-20 rounded-full mx-auto" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
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
                        {/* SCORM Analytics */}
                        {scormStats.length > 0 && (
                            <div className="mt-8 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <Package className="w-5 h-5 text-purple-500" />
                                        SCORM Package Analytics
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                <th className="text-left text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Package</th>
                                                <th className="text-left text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Course</th>
                                                <th className="text-center text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Launches</th>
                                                <th className="text-center text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Completions</th>
                                                <th className="text-center text-xs font-black text-gray-400 uppercase tracking-wider px-6 py-4">Avg Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {scormStats.map(stat => (
                                                <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{stat.title}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-500">{stat.course_title}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400">
                                                            <Users className="w-3.5 h-3.5" />
                                                            {stat.launches}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600 dark:text-green-400">
                                                            <Award className="w-3.5 h-3.5" />
                                                            {stat.completions}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {stat.avg_score !== null ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-purple-500 rounded-full transition-all"
                                                                        style={{ width: `${stat.avg_score}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-500">{stat.avg_score}%</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
