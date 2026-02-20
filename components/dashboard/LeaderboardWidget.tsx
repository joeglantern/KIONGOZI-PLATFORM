"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabaseClient';
import { useUser } from '@/app/contexts/UserContext';
import { Trophy, Medal, Crown, Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
    user_id: string;
    display_name: string;
    total_xp: number;
    level: number;
    rank: number;
    is_current_user: boolean;
}

export function LeaderboardWidget() {
    const { user } = useUser();
    const supabase = createClient();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = async () => {
        if (!user) return;
        try {
            setLoading(true);

            // 1. Fetch Top 10 (buffer for scrolling)
            const { data: topUsers, error: topError } = await supabase
                .from('profiles')
                .select('id, email, username, total_xp, level')
                .order('total_xp', { ascending: false })
                .limit(10);

            if (topError) {
                console.error('Leaderboard Top Users Error:', topError);
                throw topError;
            }

            // 2. Fetch User's XP first to avoid nested await failure
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('total_xp')
                .eq('id', user.id)
                .single();

            if (userError) {
                console.error('Leaderboard User XP Error:', userError);
                // Don't throw here, just assume 0 XP if failed, to show leaderboard at least
            }

            const userXp = userData?.total_xp || 0;

            // 3. Count how many users have strictly more XP than current user
            const { count: rankCount, error: rankError } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .gt('total_xp', userXp);

            if (rankError) {
                console.error('Leaderboard Rank Count Error:', rankError);
                throw rankError;
            }

            const userRank = (rankCount || 0) + 1;

            if (topUsers) {
                const mappedLeaderboard = topUsers.map((d: any, i: number) => ({
                    user_id: d.id,
                    display_name: (d.username || '').trim() || (d.email || '').split('@')[0] || 'Learner',
                    total_xp: d.total_xp || 0,
                    level: d.level || 1,
                    rank: i + 1,
                    is_current_user: d.id === user.id
                }));
                setLeaderboard(mappedLeaderboard);

                // Determine if user is in the top list
                const userInTop = mappedLeaderboard.find(u => u.user_id === user.id);
                if (!userInTop) {
                    // Fetch user details for the pinned bottom row
                    const { data: fullUserData } = await supabase
                        .from('profiles')
                        .select('id, email, username, total_xp, level')
                        .eq('id', user.id)
                        .single();

                    if (fullUserData) {
                        setCurrentUserEntry({
                            user_id: fullUserData.id,
                            display_name: (fullUserData.username || '').trim() || (fullUserData.email || '').split('@')[0] || 'Learner',
                            total_xp: fullUserData.total_xp || 0,
                            level: fullUserData.level || 1,
                            rank: userRank,
                            is_current_user: true
                        });
                    }
                } else {
                    setCurrentUserEntry(null); // User is already in the list
                }
            }
        } catch (err: any) {
            console.error('Leaderboard fetch error object:', JSON.stringify(err, null, 2));
            console.error('Leaderboard fetch error message:', err?.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [user]);

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Updating Ranks...</p>
            </div>
        );
    }

    // Limit view to 5 items logic: 
    // We show a scrollable area, but the request was "max at 5, scrollable thereafter".
    // We will set a max-height that roughly fits 5 items.

    return (
        <div className="bg-white rounded-3xl shadow-none border border-gray-200 overflow-hidden flex flex-col h-full max-h-[500px]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-xl">
                        <Trophy className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Leaderboard</h2>
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-full">
                    Top Learners
                </div>
            </div>

            {/* Scrollable List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {leaderboard.map((entry, index) => (
                    <LeaderboardRow key={entry.user_id} entry={entry} index={index} />
                ))}
            </div>

            {/* Pinned User Entry (if not in top list) */}
            {currentUserEntry && (
                <div className="p-2 border-t border-gray-100 bg-orange-50/50">
                    <div className="px-2 py-1 text-[10px] font-bold text-orange-400 uppercase tracking-widest text-center mb-1">
                        Your Position
                    </div>
                    <LeaderboardRow entry={currentUserEntry} index={-1} isPinned={true} />
                </div>
            )}
        </div>
    );
}

function LeaderboardRow({ entry, index, isPinned = false }: { entry: LeaderboardEntry; index: number; isPinned?: boolean }) {
    const isTop3 = entry.rank <= 3;
    const RankIcon = entry.rank === 1 ? Crown : entry.rank === 2 ? Medal : entry.rank === 3 ? Medal : null;

    // Rank Colors
    const rankColor =
        entry.rank === 1 ? 'text-amber-500' :
            entry.rank === 2 ? 'text-slate-400' :
                entry.rank === 3 ? 'text-amber-700' : 'text-gray-400';

    const bgClass = entry.is_current_user
        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
        : 'hover:bg-gray-50 text-gray-900';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center p-3 rounded-2xl transition-all duration-200 ${bgClass}`}
        >
            {/* Rank */}
            <div className={`w-8 flex justify-center flex-shrink-0 ${entry.is_current_user ? 'text-white' : rankColor}`}>
                {RankIcon ? (
                    <RankIcon className="w-5 h-5" />
                ) : (
                    <span className="text-sm font-black">#{entry.rank}</span>
                )}
            </div>

            {/* Avatar / Name */}
            <div className="flex-1 min-w-0 mx-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${entry.is_current_user ? 'bg-orange-400' : 'bg-gray-100'}`}>
                    <User className={`w-4 h-4 ${entry.is_current_user ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="truncate">
                    <div className={`text-sm font-bold truncate ${entry.is_current_user ? 'text-white' : 'text-gray-900'}`}>
                        {entry.display_name}
                    </div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${entry.is_current_user ? 'text-orange-100' : 'text-gray-400'}`}>
                        Lvl {entry.level}
                    </div>
                </div>
            </div>

            {/* XP */}
            <div className="text-right flex-shrink-0">
                <div className={`text-sm font-black ${entry.is_current_user ? 'text-white' : 'text-orange-600'}`}>
                    {entry.total_xp.toLocaleString()}
                </div>
                <div className={`text-[9px] font-bold uppercase ${entry.is_current_user ? 'text-orange-100' : 'text-gray-300'}`}>
                    XP
                </div>
            </div>
        </motion.div>
    )
}
