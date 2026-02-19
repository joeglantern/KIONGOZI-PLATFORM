"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import {
    BookOpen,
    Trophy,
    Zap,
    TrendingUp,
    Clock,
    Target,
    ArrowRight,
    Loader2,
    Award,
    Medal,
    Star,
    Flame
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { calculateLevel } from '@/lib/gamification';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { LeaderboardWidget } from '@/components/dashboard/LeaderboardWidget';
import { XPLineChart } from '@/components/dashboard/XPLineChart';
import { CategoryBarChart } from '@/components/dashboard/CategoryBarChart';
import { ContinueLearningBanner } from '@/components/dashboard/ContinueLearningBanner';

export default function DashboardPage() {
    const { user, profile } = useUser();
    const supabase = createClient();

    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [badges, setBadges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCourses: 0,
        avgProgress: 0,
    });
    const [chartDataState, setChartDataState] = useState<{
        xpHistory: { date: string; xp: number }[];
        categoryProgress: { category: string; progress: number }[];
    }>({ xpHistory: [], categoryProgress: [] });

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Fetch Enrollments with explicit join syntax
            const { data: enrollmentData, error: enrollError } = await supabase
                .from('course_enrollments')
                .select(`
                    id,
                    progress_percentage,
                    last_accessed_at,
                    status,
                    courses (
                        id,
                        title,
                        description,
                        difficulty_level,
                        category_id
                    ),
                    updated_at
                `)
                .eq('user_id', user.id)
                .order('last_accessed_at', { ascending: false });

            if (enrollError) {
                console.error('Enrollment fetch error details:', enrollError);
                throw enrollError;
            }

            // Fetch categories separately
            const { data: categories } = await supabase.from('module_categories').select('id, name, color');
            const categoryMap = new Map((categories || []).map(c => [c.id, c]));

            const processedEnrollments = (enrollmentData || [])
                .map(en => {
                    const courseData: any = Array.isArray(en.courses) ? en.courses[0] : en.courses;
                    if (!courseData) return null;

                    return {
                        ...en,
                        courses: {
                            ...courseData,
                            module_categories: courseData?.category_id ? categoryMap.get(courseData.category_id) : null
                        }
                    };
                })
                .filter(en => en !== null);

            setEnrollments(processedEnrollments);

            // Fetch Badges
            const { data: badgeData, error: badgeError } = await supabase
                .from('user_badges')
                .select(`
                    earned_at,
                    badges (
                        id,
                        name,
                        icon,
                        description
                    )
                `)
                .eq('user_id', user.id)
                .order('earned_at', { ascending: false });

            if (badgeError) console.error('Badge fetch error:', badgeError);
            setBadges(badgeData || []);

            // Calculate stats
            const totalCourses = enrollmentData?.length || 0;
            const avgProgress = totalCourses > 0
                ? Math.round(enrollmentData!.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalCourses)
                : 0;

            setStats({ totalCourses, avgProgress });

            // --- Real Data Processing for Charts ---

            // 1. XP History (Simulated from enrollment updates for now as no XP history table)
            // Group enrollments by updated_at date
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            // This is an estimation since we don't have granular XP history logs yet
            // We'll just show some baseline + recent activity if any
            const historyMap = new Map(last7Days.map(date => [date, 0])); // Base 0

            if (enrollmentData) {
                enrollmentData.forEach(en => {
                    const date = (en.updated_at || en.last_accessed_at)?.split('T')[0];
                    if (date && historyMap.has(date)) {
                        // Add some "weight" for activity
                        const current = historyMap.get(date) || 0;
                        historyMap.set(date, current + (en.progress_percentage > 0 ? 50 : 10));
                    }
                });
            }

            const xpHistory = last7Days.map(date => ({
                date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                xp: historyMap.get(date) || 0
            }));


            // 2. Category Progress
            const catProgressMap = new Map<string, { total: number, count: number }>();

            processedEnrollments.forEach((en: any) => {
                const catName = en.courses.module_categories?.name || 'Uncategorized';
                const current = catProgressMap.get(catName) || { total: 0, count: 0 };
                catProgressMap.set(catName, {
                    total: current.total + (en.progress_percentage || 0),
                    count: current.count + 1
                });
            });

            const categoryProgress = Array.from(catProgressMap.entries()).map(([category, { total, count }]) => ({
                category,
                progress: Math.round(total / count)
            }));

            setChartDataState({ xpHistory, categoryProgress });

        } catch (error: any) {
            console.error('CRITICAL: Dashboard Data Fetch Failed');
            console.error('Error Object:', JSON.stringify(error, null, 2));
            console.error('Error Message:', error.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="flex min-h-screen bg-gray-50">
                {/* Desktop Sidebar - Fixed */}
                <div className="hidden lg:block">
                    <DashboardSidebar />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-h-screen">
                    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                        {/* Welcome Header */}
                        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
                                    Welcome back, <span className="text-orange-500">{profile?.first_name || 'Learner'}</span>
                                </h1>
                                <p className="text-gray-500 text-sm font-medium">
                                    Your learning journey continues here.
                                </p>
                            </div>
                            <Link href="/courses">
                                <Button className="bg-gray-900 hover:bg-black text-white rounded-xl px-5 py-5 font-bold flex items-center gap-2 transition-all text-sm">
                                    Browse Courses <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>

                        {/* Continue Learning Banner */}
                        <div className="mb-8">
                            <ContinueLearningBanner />
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {/* Courses */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-gray-900">{stats.totalCourses}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses</div>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-gray-900">{stats.avgProgress}%</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Progress</div>
                                </div>
                            </div>

                            {/* XP */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                                    <Zap className="w-5 h-5 fill-current" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-gray-900">{profile?.total_xp || 0}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total XP</div>
                                </div>
                            </div>

                            {/* Streak */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                                    <Flame className="w-5 h-5 fill-current" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-gray-900">{profile?.current_streak || 0}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Day Streak</div>
                                </div>
                            </div>
                        </div>

                        {/* Learning Insights Section */}
                        <div className="mb-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                                <div className="h-full">
                                    <XPLineChart data={chartDataState.xpHistory} />
                                </div>
                                <div className="h-full">
                                    <CategoryBarChart data={chartDataState.categoryProgress} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left: My Courses */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Active Courses</h2>
                                    <Link href="/courses">
                                        <Button variant="ghost" className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-2 text-xs">
                                            View All <ArrowRight className="w-3 h-3" />
                                        </Button>
                                    </Link>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                    </div>
                                ) : enrollments.length > 0 ? (
                                    <div className="space-y-4">
                                        {enrollments.map((enrollment) => {
                                            const course = enrollment.courses;
                                            const progress = enrollment.progress_percentage || 0;

                                            return (
                                                <Link key={enrollment.id} href={`/courses/${course.id}`}>
                                                    <motion.div
                                                        whileHover={{ x: 4 }}
                                                        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
                                                    >
                                                        {/* Compact Course Icon */}
                                                        <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                                                            <BookOpen className="w-6 h-6" />
                                                        </div>

                                                        {/* Course Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {course.module_categories && (
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                                        {course.module_categories.name}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                    {course.difficulty_level}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                                                                {course.title}
                                                            </h3>
                                                        </div>

                                                        {/* Progress Area */}
                                                        <div className="hidden md:flex flex-col items-end w-32 shrink-0">
                                                            <span className="text-[10px] font-bold text-gray-900 mb-1">{progress}% Complete</span>
                                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${progress}%` }}
                                                                    className="bg-orange-500 h-full rounded-full"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Action */}
                                                        <div className="shrink-0 ml-2">
                                                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
                                                        </div>
                                                    </motion.div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-300">
                                            <BookOpen className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Start Learning</h3>
                                        <p className="text-gray-500 mb-6 text-sm">Enroll in your first course to see progress here.</p>
                                        <Link href="/courses">
                                            <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                                Browse Courses
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Leaderboard & Badges */}
                            <div className="space-y-6">
                                <LeaderboardWidget />

                                {/* Compact Badges */}
                                <div className="bg-white rounded-3xl border border-gray-100 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Recent Badges</h2>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {badges.length > 0 ? (
                                            badges.slice(0, 4).map((userBadge: any) => (
                                                <div key={userBadge.badges.id} className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-xl aspect-square hover:bg-orange-50 transition-colors group">
                                                    <div className="text-xl mb-1 group-hover:scale-110 transition-transform">
                                                        {userBadge.badges.icon}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-4 text-center py-4 text-xs text-gray-400 font-medium">
                                                Complete courses to earn badges!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
