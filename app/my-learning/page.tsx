"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { useQuery } from '@tanstack/react-query';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Pagination } from '@/components/ui/Pagination';
import {
    GraduationCap,
    Search,
    BookOpen,
    Clock,
    CheckCircle2,
    ArrowRight,
    Calendar,
    Star,
    Package
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const ITEMS_PER_PAGE = 6;

export default function MyLearningPage() {
    const { user } = useUser();
    // Stable client — never re-created on re-render
    const supabase = useMemo(() => createClient(), []);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const { data: enrolledCourses = [], isLoading: loading } = useQuery({
        queryKey: ['my-enrolled-courses', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('course_enrollments')
                .select(`
                    id, course_id, user_id, status, progress_percentage, updated_at,
                    courses (
                        id, title, description, thumbnail_url, difficulty_level,
                        estimated_duration_hours, category_id
                    )
                `)
                .eq('user_id', user!.id)
                .order('updated_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    // Fetch SCORM packages + registrations in parallel (not chained)
    const courseIds = enrolledCourses.map((e: any) => e.course_id);
    const { data: scormPackages = [] } = useQuery({
        queryKey: ['my-scorm-packages', user?.id, courseIds.join(',')],
        queryFn: async () => {
            if (!courseIds.length) return [];

            const [packagesResult, registrationsResult] = await Promise.all([
                supabase
                    .from('scorm_packages')
                    .select('id, course_id, title')
                    .in('course_id', courseIds)
                    .eq('status', 'active'),
                // Pre-fetch all SCORM registrations for this user in one shot
                supabase
                    .from('scorm_registrations')
                    .select('package_id, lesson_status')
                    .eq('user_id', user!.id),
            ]);

            const packages = packagesResult.data || [];
            const registrations = registrationsResult.data || [];

            if (!packages.length) return [];

            const regMap = new Map(registrations.map((r: any) => [r.package_id, r]));

            return packages.map((pkg: any) => ({
                ...pkg,
                registration: regMap.get(pkg.id) || null,
            }));
        },
        enabled: !!user && enrolledCourses.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const filteredCourses = enrolledCourses.filter((enrollment: any) =>
        enrollment.courses?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCourseScorm = (courseId: string) =>
        scormPackages.filter((p: any) => p.course_id === courseId);

    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="flex min-h-screen bg-gray-50/50">
                <div className="hidden lg:block">
                    <DashboardSidebar />
                </div>

                <div className="flex-1 flex flex-col min-h-screen border-l border-gray-100/50">
                    <main className="flex-1 p-4 lg:p-12">
                        <div className="max-w-6xl mx-auto">
                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                                <div>
                                    <div className="flex items-center space-x-2 mb-3">
                                        <div className="p-2.5 bg-blue-100/50 rounded-xl">
                                            <GraduationCap className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">My Education</span>
                                    </div>
                                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">My Learning</h1>
                                    <p className="text-gray-500 mt-2 font-medium italic">Track your progress and continue your leadership journey.</p>
                                </div>

                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-orange-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Filter your courses..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-11 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/20 transition-all w-full md:w-72 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <Breadcrumb items={[{ label: 'My Learning' }]} />

                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                                            <div className="p-8 space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="h-5 w-20 bg-gray-200 animate-pulse rounded-full" />
                                                    <div className="h-5 w-16 bg-gray-200 animate-pulse rounded-full" />
                                                </div>
                                                <div className="h-7 w-3/4 bg-gray-200 animate-pulse rounded-lg" />
                                                <div className="flex gap-4">
                                                    <div className="h-4 w-20 bg-gray-100 animate-pulse rounded-lg" />
                                                    <div className="h-4 w-20 bg-gray-100 animate-pulse rounded-lg" />
                                                </div>
                                                <div className="space-y-2 pt-2">
                                                    <div className="flex justify-between">
                                                        <div className="h-3 w-24 bg-gray-100 animate-pulse rounded" />
                                                        <div className="h-3 w-10 bg-gray-100 animate-pulse rounded" />
                                                    </div>
                                                    <div className="w-full h-3.5 bg-gray-100 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                                                <div className="h-12 w-12 bg-gray-200 animate-pulse rounded-2xl" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="bg-white rounded-[2.5rem] p-16 text-center border border-gray-100 shadow-sm overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500" />
                                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <BookOpen className="w-10 h-10 text-orange-400" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-2">No courses here yet!</h2>
                                    <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium leading-relaxed">
                                        You haven't enrolled in any courses yet. Explore our catalog to start your learning adventure.
                                    </p>
                                    <Link href="/courses">
                                        <button className="px-10 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 mx-auto">
                                            <span>Browse Catalog</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <AnimatePresence mode="popLayout">
                                            {paginatedCourses.map((enrollment, idx) => (
                                                <motion.div
                                                    key={enrollment.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                                                    className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-orange-500/5 transition-all flex flex-col"
                                                >
                                                    {(() => {
                                                        return (
                                                            <>
                                                                <div className="p-8 flex-1">
                                                                    <div className="flex items-center justify-between mb-8">
                                                                        <div className="flex items-center space-x-2">
                                                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2.5 py-1 bg-gray-50 rounded-full border border-gray-100">
                                                                                {enrollment.status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-1.5 text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100/50">
                                                                            <Star className="w-3 h-3 fill-orange-500" />
                                                                            <span className="text-[10px] font-black uppercase tracking-tighter">Lvl {enrollment.courses.difficulty_level || 'Elite'}</span>
                                                                        </div>
                                                                    </div>

                                                                    <h3 className="text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors mb-4 leading-tight">
                                                                        {enrollment.courses.title}
                                                                    </h3>

                                                                    <div className="flex items-center space-x-5 mb-10 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                                                        <div className="flex items-center space-x-2">
                                                                            <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-orange-50 transition-colors">
                                                                                <Clock className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-500" />
                                                                            </div>
                                                                            <span>{enrollment.courses.estimated_duration_hours || '—'}h Total</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-orange-50 transition-colors">
                                                                                <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-500" />
                                                                            </div>
                                                                            <span>Active Path</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Mastery Level</span>
                                                                            <span className="text-xs font-black text-orange-600">{enrollment.progress_percentage || 0}%</span>
                                                                        </div>
                                                                        <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50 p-0.5">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${enrollment.progress_percentage || 0}%` }}
                                                                                className="h-full bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* SCORM packages for this course */}
                                                                    {(() => {
                                                                        const pkgs = getCourseScorm(enrollment.course_id);
                                                                        if (!pkgs.length) return null;
                                                                        return (
                                                                            <div className="pt-2 space-y-2">
                                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interactive Content</span>
                                                                                {pkgs.map((pkg: any) => {
                                                                                    const status = pkg.registration?.lesson_status;
                                                                                    const isDone = status === 'completed' || status === 'passed';
                                                                                    return (
                                                                                        <Link key={pkg.id} href={`/lms/scorm/${pkg.id}`}>
                                                                                            <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Package className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                                                                                    <span className="text-xs font-bold text-gray-700 truncate max-w-[160px]">{pkg.title}</span>
                                                                                                </div>
                                                                                                <span className={`text-[10px] font-black uppercase tracking-wide flex-shrink-0 ${isDone ? 'text-green-600' : status === 'incomplete' ? 'text-blue-500' : 'text-gray-400'}`}>
                                                                                                    {isDone ? 'Done' : status === 'incomplete' ? 'In Progress' : 'Launch'}
                                                                                                </span>
                                                                                            </div>
                                                                                        </Link>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                <div className="px-8 py-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between group-hover:bg-orange-50 transition-colors">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className={`p-2 rounded-xl border transition-all ${enrollment.progress_percentage === 100
                                                                            ? 'bg-green-50 border-green-100 text-green-600'
                                                                            : 'bg-white border-gray-100 text-gray-300 group-hover:text-orange-500 group-hover:border-orange-100'
                                                                            }`}>
                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                        </div>
                                                                        <span className="text-xs font-black uppercase tracking-tight text-gray-500 group-hover:text-orange-700 transition-colors">
                                                                            {enrollment.progress_percentage === 100 ? 'Course Complete' : 'Continue Journey'}
                                                                        </span>
                                                                    </div>
                                                                    <Link href={`/courses/${enrollment.course_id}`}>
                                                                        <button className="p-3.5 bg-white text-gray-900 rounded-2xl shadow-sm border border-gray-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-orange-600/20 transition-all active:scale-95">
                                                                            <ArrowRight className="w-5 h-5" />
                                                                        </button>
                                                                    </Link>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
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

                            {/* Catalog CTA */}
                            {!loading && enrolledCourses.length > 0 && (
                                <div className="mt-16 bg-blue-900 p-10 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group shadow-xl">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-40 -mt-40 transition-transform duration-700 group-hover:scale-125 group-hover:bg-white/10" />
                                    <div className="relative z-10 max-w-lg">
                                        <h3 className="text-2xl font-black mb-2 tracking-tight">Expand your horizon?</h3>
                                        <p className="text-blue-100 text-sm font-medium italic leading-relaxed">Our curated catalog is constantly expanding with fresh leadership insights and technical mastery paths.</p>
                                    </div>
                                    <Link href="/courses" className="relative z-10">
                                        <button className="px-10 py-4 bg-white text-blue-900 font-black rounded-2xl shadow-xl hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                                            Discover New Paths
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
