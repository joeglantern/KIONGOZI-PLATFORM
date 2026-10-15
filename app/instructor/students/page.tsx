"use client";

import { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabase/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Search,
    Mail,
    MessageSquare,
    Users,
    BookOpen
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface StudentData {
    user_id: string;
    course_id: string;
    username: string;
    email: string;
    course_title: string;
    progress_percentage: number;
    status: string;
    enrolled_at: string;
    avatar_url?: string;
}

export default function InstructorStudentsPage() {
    const { user } = useUser();
    const supabase = useMemo(() => createClient(), []);
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');
    const [courseOptions, setCourseOptions] = useState<{ id: string; title: string }[]>([]);

    useEffect(() => {
        if (user) fetchStudents();
    }, [user]);

    const fetchStudents = async () => {
        if (!user) return;
        setLoading(true);
        setLoadError(null);
        try {
            // 1. Get instructor's courses (soft-deleted courses are excluded)
            const { data: myCourses, error: coursesError } = await supabase
                .from('courses')
                .select('id, title')
                .eq('author_id', user.id)
                .is('deleted_at', null)
                .order('title');
            if (coursesError) throw coursesError;
            setCourseOptions(myCourses ?? []);

            if (!myCourses || myCourses.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            const courseIds = myCourses.map(c => c.id);
            const courseMap = Object.fromEntries(myCourses.map(c => [c.id, c.title]));

            // 2. Get enrollments for these courses
            const { data: enrollments, error: enrollError } = await supabase
                .from('course_enrollments')
                .select('user_id, course_id, progress_percentage, status, created_at')
                .in('course_id', courseIds)
                .order('created_at', { ascending: false });
            if (enrollError) throw enrollError;

            if (!enrollments || enrollments.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            // 3. Get student profiles
            const userIds = Array.from(new Set(enrollments.map(e => e.user_id)));
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, email, avatar_url')
                .in('id', userIds);

            const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || []);

            // 4. Combine data
            const studentList: StudentData[] = enrollments.map(e => {
                const profile = profileMap[e.user_id];
                return {
                    user_id: e.user_id,
                    username: profile?.username || 'unknown_user',
                    email: profile?.email || '',
                    avatar_url: profile?.avatar_url,
                    course_id: e.course_id,
                    course_title: courseMap[e.course_id] || 'Unknown Course',
                    progress_percentage: Math.min(100, Math.max(0, Math.round(e.progress_percentage || 0))),
                    status: e.status || 'active',
                    enrolled_at: new Date(e.created_at).toLocaleDateString()
                };
            });

            setStudents(studentList);
        } catch (err) {
            console.error('Error fetching students:', err);
            setLoadError('We could not load your students. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredStudents = students.filter(s => {
        if (courseFilter !== 'all' && s.course_id !== courseFilter) return false;
        if (!normalizedQuery) return true;
        return (
            s.username.toLowerCase().includes(normalizedQuery) ||
            s.email.toLowerCase().includes(normalizedQuery) ||
            s.course_title.toLowerCase().includes(normalizedQuery)
        );
    });
    const hasFilters = Boolean(normalizedQuery) || courseFilter !== 'all';

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">My students</h1>
                        <p className="text-gray-500 dark:text-gray-400">Track student progress and engagement.</p>
                    </div>
                    <Button asChild variant="outline" className="border-2 rounded-xl self-start md:self-auto">
                        <Link href="/instructor/messages">
                            <MessageSquare className="w-5 h-5 mr-2" />
                            Open messages
                        </Link>
                    </Button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <label htmlFor="student-search" className="sr-only">Search students</label>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            id="student-search"
                            type="search"
                            placeholder="Search by name, email or course…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="student-course-filter" className="sr-only">Filter by course</label>
                        <select
                            id="student-course-filter"
                            value={courseFilter}
                            onChange={(e) => setCourseFilter(e.target.value)}
                            className="w-full md:w-64 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                            <option value="all">All courses</option>
                            {courseOptions.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        {['Student', 'Course', 'Progress', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-4 text-left">
                                                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {[...Array(6)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                                                    <div className="space-y-1.5">
                                                        <Skeleton className="h-4 w-28" />
                                                        <Skeleton className="h-3 w-36" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-2 w-24 rounded-full" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                            <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : loadError ? (
                    <div role="alert" className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-red-200 dark:border-red-900/40">
                        <p className="text-gray-900 dark:text-white font-bold mb-1">Something went wrong</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{loadError}</p>
                        <Button variant="outline" onClick={fetchStudents} className="rounded-xl">Try again</Button>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                        {hasFilters ? (
                            <>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No students match</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">Try a different search or course.</p>
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(''); setCourseFilter('all'); }}
                                    className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                                >
                                    Clear filters
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No students yet</h2>
                                <p className="text-gray-500 dark:text-gray-400">Students enrolled in your published courses will appear here.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Course</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredStudents.map((student, idx) => (
                                        <tr key={`${student.user_id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 uppercase" aria-hidden="true">
                                                        {student.username[0] || '?'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">@{student.username}</div>
                                                        <div className="text-sm text-gray-500">{student.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-gray-900 dark:text-white">
                                                    <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                                                    <div>
                                                        <span className="text-sm font-medium block">{student.course_title}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Enrolled {student.enrolled_at}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="w-full max-w-[140px]">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-bold text-gray-700 dark:text-gray-300">{student.progress_percentage}%</span>
                                                    </div>
                                                    <div
                                                        className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
                                                        role="progressbar"
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={student.progress_percentage}
                                                        aria-label={`Progress in ${student.course_title}`}
                                                    >
                                                        <div
                                                            className="bg-orange-500 h-2 rounded-full"
                                                            style={{ width: `${student.progress_percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wider ${student.status === 'completed'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : student.status === 'active' || student.status === 'in_progress'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {student.status === 'active' ? 'in progress' : student.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {student.email ? (
                                                    <Button asChild variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                                                        <a href={`mailto:${student.email}`} aria-label={`Email ${student.username}`}>
                                                            <Mail className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No email</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
