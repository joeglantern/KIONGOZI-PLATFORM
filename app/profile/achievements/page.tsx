"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { BadgeCard } from '@/components/achievements/BadgeCard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Award, Loader2, Sparkles, Trophy } from 'lucide-react';
import { calculateLevel } from '@/lib/gamification';
import { motion } from 'framer-motion';

export default function AchievementsPage() {
    const { user, profile } = useUser();
    const supabase = createClient();

    const [allBadges, setAllBadges] = useState<any[]>([]);
    const [userBadges, setUserBadges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Fetch all available badges
            const { data: badgesData, error: badgesError } = await supabase
                .from('badges')
                .select('*')
                .order('requirement_value', { ascending: true });

            if (badgesError) throw badgesError;
            setAllBadges(badgesData || []);

            // Fetch badges earned by the user
            const { data: userBadgesData, error: userBadgesError } = await supabase
                .from('user_badges')
                .select('badge_id, earned_at')
                .eq('user_id', user.id);

            if (userBadgesError) throw userBadgesError;
            setUserBadges(userBadgesData || []);

        } catch (error) {
            console.error('Error fetching achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
    const lvlInfo = calculateLevel(profile?.total_xp || 0);

    return (
        <ProtectedRoute allowedRoles={['user', 'instructor', 'admin']}>
            <div className="flex min-h-screen bg-gray-50/50">
                {/* Desktop Sidebar */}
                <div className="hidden lg:block">
                    <DashboardSidebar />
                </div>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <Trophy className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Rewards Gallery</span>
                                </div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Achievements</h1>
                                <p className="text-gray-500 mt-1 font-medium italic">Collect badges as you master new skills and lead the way.</p>
                            </div>

                            {/* Level Progress Summary */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-6">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                                        <span className="text-white text-2xl font-black">Lvl {lvlInfo.level}</span>
                                    </div>
                                    <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900 leading-none mb-1">Level Progression</span>
                                    <div className="w-32 bg-gray-100 rounded-full h-2 mb-1.5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${lvlInfo.progressPercentage}%` }}
                                            className="bg-orange-500 h-2 rounded-full"
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {lvlInfo.currentLvlXp} / {lvlInfo.xpToNextLvl} XP to next level
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Breadcrumb items={[
                            { label: 'Profile', href: '/profile' },
                            { label: 'Achievements' }
                        ]} />

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading your trophy room...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {allBadges.map((badge) => {
                                    const userEarned = userBadges.find(ub => ub.badge_id === badge.id);
                                    return (
                                        <BadgeCard
                                            key={badge.id}
                                            badge={badge}
                                            isEarned={!!userEarned}
                                            earnedAt={userEarned?.earned_at}
                                            requirementText={
                                                badge.requirement_type === 'modules_completed'
                                                    ? `Complete ${badge.requirement_value} Modules`
                                                    : badge.requirement_type
                                            }
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Summary Footer */}
                        {!loading && (
                            <div className="mt-12 p-8 bg-gray-900 rounded-[2.5rem] text-center text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-orange-500/20" />
                                <div className="relative z-10">
                                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-4">
                                        <Award className="w-4 h-4 text-orange-400" />
                                        <span className="text-xs font-black uppercase tracking-widest">
                                            Statistics
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black mb-2 tracking-tight">
                                        You've earned {userBadges.length} out of {allBadges.length} badges!
                                    </h2>
                                    <p className="text-gray-400 font-medium italic">
                                        Keep learning and participating to unlock exclusive rewards and climb the leaderboard.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
