"use client";

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/app/utils/supabase/client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUser } from '@/app/contexts/UserContext';
import { DashboardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import {
    BookOpen,
    Zap,
    Target,
    ArrowRight,
    Flame,
    Star,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ContinueLearningBanner } from '@/components/dashboard/ContinueLearningBanner';
import { BentoPortals } from '@/components/dashboard/BentoPortals';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { LearningTree } from '@/components/dashboard/LearningTree';
import type { LearningPathRecord, SkillProgressRecord } from '@/components/dashboard/LearningTree';
import { NextActionCard } from '@/components/dashboard/NextActionCard';
import { QuestPanel } from '@/components/dashboard/QuestPanel';

// Lazy-load heavy chart & widget components
const LeaderboardWidget = dynamic(() => import('@/components/dashboard/LeaderboardWidget').then(m => ({ default: m.LeaderboardWidget })), {
    loading: () => <div className="bg-white rounded-3xl border border-gray-100 p-5"><Skeleton className="h-48 w-full" /></div>,
});
const XPLineChart = dynamic(() => import('@/components/dashboard/XPLineChart').then(m => ({ default: m.XPLineChart })), {
    loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});
const CategoryBarChart = dynamic(() => import('@/components/dashboard/CategoryBarChart').then(m => ({ default: m.CategoryBarChart })), {
    loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

export default function DashboardPage() {
    const { user, profile } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [badges, setBadges] = useState<any[]>([]);
    const [learningPath, setLearningPath] = useState<LearningPathRecord | null>(null);
    const [skillProgress, setSkillProgress] = useState<SkillProgressRecord[]>([]);
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

            const selectedPath = profile?.focus_path || 'civic';

            // Window for the XP chart: the last 7 calendar days (inclusive).
            const xpWindowStart = new Date();
            xpWindowStart.setDate(xpWindowStart.getDate() - 6);
            xpWindowStart.setHours(0, 0, 0, 0);

            // Fetch the dashboard and private path progress in parallel.
            const [enrollResult, categoriesResult, badgeResult, pathResult, skillProgressResult, rewardClaimsResult] = await Promise.all([
                supabase
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
                    .order('last_accessed_at', { ascending: false }),
                supabase.from('module_categories').select('id, name, color'),
                supabase
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
                    .order('earned_at', { ascending: false }),
                supabase
                    .from('learning_paths')
                    .select(`
                        id, slug, title, description, outcome, accent_color,
                        skill_nodes (
                            id, slug, title, description, node_type, order_index,
                            xp_reward, estimated_minutes, target_href, prerequisite_node_id, course_id
                        )
                    `)
                    .eq('slug', selectedPath)
                    .eq('is_published', true)
                    .maybeSingle(),
                supabase
                    .from('user_skill_progress')
                    .select('node_id, status, progress_percentage')
                    .eq('user_id', user.id),
                supabase
                    .from('reward_claims')
                    .select('xp_awarded, created_at')
                    .eq('user_id', user.id)
                    .gte('created_at', xpWindowStart.toISOString()),
            ]);

            const { data: enrollmentData, error: enrollError } = enrollResult;

            if (enrollError) {
                console.error('Enrollment fetch error details:', enrollError);
                throw enrollError;
            }

            const categoryMap = new Map((categoriesResult.data || []).map(c => [c.id, c]));

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

            // Use parallel-fetched badge data
            if (badgeResult.error) console.error('Badge fetch error:', badgeResult.error);
            setBadges(badgeResult.data || []);
            if (pathResult.error) console.error('Learning path fetch error:', pathResult.error);
            setLearningPath((pathResult.data as LearningPathRecord | null) ?? null);
            if (skillProgressResult.error) console.error('Skill progress fetch error:', skillProgressResult.error);
            setSkillProgress((skillProgressResult.data as SkillProgressRecord[] | null) ?? []);

            // Calculate stats
            const totalCourses = enrollmentData?.length || 0;
            const avgProgress = totalCourses > 0
                ? Math.round(enrollmentData!.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalCourses)
                : 0;

            setStats({ totalCourses, avgProgress });

            // --- Real Data Processing for Charts ---

            // 1. XP History — real per-day XP from the reward_claims ledger.
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const historyMap = new Map(last7Days.map(date => [date, 0]));

            if (rewardClaimsResult.error) console.error('Reward claims fetch error:', rewardClaimsResult.error);
            (rewardClaimsResult.data ?? []).forEach((claim: { xp_awarded: number | null; created_at: string }) => {
                const date = claim.created_at?.split('T')[0];
                if (date && historyMap.has(date)) {
                    historyMap.set(date, (historyMap.get(date) || 0) + (claim.xp_awarded || 0));
                }
            });

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
    }, [user, profile?.focus_path]);

    const [dashboardView, setDashboardView] = useState<'overview' | 'path'>('overview');

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
                        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
                                    Welcome back, <span className="text-orange-500">{profile?.first_name || 'Learner'}</span>
                                </h1>
                                <p className="text-gray-500 text-sm font-medium">
                                    Your learning journey continues here.
                                </p>
                            </div>
                            <Button asChild className="bg-gray-900 hover:bg-black text-white rounded-xl px-5 py-5 font-bold flex items-center gap-2 transition-all text-sm">
                                <Link href="/courses">
                                    Browse Courses <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>

                        <NextActionCard path={learningPath} progress={skillProgress} />
                        <QuestPanel />

                        {/* Interactive View Selector */}
                        <div className="flex bg-gray-200/60 p-1.5 rounded-2xl border-2 border-brand-primary w-fit mb-8 select-none">
                            <button
                                onClick={() => setDashboardView('overview')}
                                className={`px-5 py-2.5 rounded-xl font-bold font-display text-xs transition-all ${
                                    dashboardView === 'overview'
                                        ? 'bg-white border-2 border-brand-primary text-brand-primary shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 border-2 border-transparent'
                                }`}
                            >
                                Dashboard Overview
                            </button>
                            <button
                                onClick={() => setDashboardView('path')}
                                className={`px-5 py-2.5 rounded-xl font-bold font-display text-xs transition-all flex items-center gap-1.5 ${
                                    dashboardView === 'path'
                                        ? 'bg-white border-2 border-brand-primary text-brand-primary shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 border-2 border-transparent'
                                }`}
                            >
                                <Star className="w-4 h-4 fill-current text-brand-orange animate-pulse" /> Learning Tree Path
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {dashboardView === 'overview' ? (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.25 }}
                                >
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

                                    {/* Bento Portals for Quick Discovery */}
                                    <div className="mb-8">
                                        <BentoPortals />
                                    </div>

                                    {/* Learning Insights Section */}
                                    <div className="mb-8">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[250px] lg:h-[400px]">
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
                                                <Button asChild variant="ghost" className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-2 text-xs">
                                                    <Link href="/courses">
                                                        View All <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </Button>
                                            </div>

                                            {loading ? (
                                                <DashboardSkeleton />
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
                                                    <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                                        <Link href="/courses">
                                                            Browse Courses
                                                        </Link>
                                                    </Button>
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
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="path"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <LearningTree path={learningPath} progress={skillProgress} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            {/* Mascot Guided Tour Pop-up */}
            <DashboardTour />
        </ProtectedRoute>
    );
}
