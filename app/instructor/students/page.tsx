"use client";

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { createClient } from '@/app/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Search,
    Filter,
    Mail,
    MoreVertical,
    Users,
    Loader2,
    BookOpen
} from 'lucide-react';

interface StudentData {
    user_id: string;
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
    const supabase = createClient();
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user) fetchStudents();
    }, [user]);

    const fetchStudents = async () => {
        if (!user) return;
        try {
            // 1. Get instructor's courses
            const { data: myCourses } = await supabase
                .from('courses')
                .select('id, title')
                .eq('author_id', user.id);

            if (!myCourses || myCourses.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            const courseIds = myCourses.map(c => c.id);
            const courseMap = Object.fromEntries(myCourses.map(c => [c.id, c.title]));

            // 2. Get enrollments for these courses
            const { data: enrollments } = await supabase
                .from('course_enrollments')
                .select('user_id, course_id, progress_percentage, status, created_at')
                .in('course_id', courseIds);

            if (!enrollments || enrollments.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            // 3. Get student profiles
            const userIds = enrollments.map(e => e.user_id);
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
                    course_title: courseMap[e.course_id] || 'Unknown Course',
                    progress_percentage: e.progress_percentage || 0,
                    status: e.status,
                    enrolled_at: new Date(e.created_at).toLocaleDateString()
                };
            });

            setStudents(studentList);
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.course_title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">My Students</h1>
                        <p className="text-gray-500">Track student progress and engagement.</p>
                    </div>
                    <Button variant="outline" className="border-2 rounded-xl">
                        <Mail className="w-5 h-5 mr-2" />
                        Message All
                    </Button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email or course..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No students found</h3>
                        <p className="text-gray-500 mb-6">Students enrolled in your courses will appear here.</p>
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
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredStudents.map((student, idx) => (
                                        <tr key={`${student.user_id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 uppercase tracking-widest">
                                                        {student.username[0]}
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
                                                    <span className="text-sm font-medium">{student.course_title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="w-full max-w-[140px]">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-bold text-gray-700 dark:text-gray-300">{student.progress_percentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
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
                                                    : student.status === 'in_progress'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {student.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                                </Button>
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
