"use client";

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
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
    const supabase = useMemo(() => createClient(), []);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [scope, setScope] = useState<'all' | 'weekly'>('all');

    const fetchLeaderboard = async () => {
        if (!user) return;
        try {
            setLoading(true);

            // Server-side leaderboard: returns only safe display fields (no emails)
            // and computes ranks in the database.
            const [{ data: topUsers, error: topError }, { data: myRank, error: rankError }] = await Promise.all([
                supabase.rpc('get_leaderboard', { p_scope: scope, p_limit: 10 }),
                supabase.rpc('get_my_leaderboard_rank', { p_scope: scope }),
            ]);

            if (topError) {
                console.error('Leaderboard Top Users Error:', topError);
                throw topError;
            }
            if (rankError) {
                console.error('Leaderboard Rank Error:', rankError);
            }

            const mappedLeaderboard: LeaderboardEntry[] = (topUsers || []).map((d: any) => ({
                user_id: d.user_id,
                display_name: (d.display_name || '').trim() || 'Learner',
                total_xp: d.total_xp || 0,
                level: d.level || 1,
                rank: d.rank,
                is_current_user: d.user_id === user.id,
            }));
            setLeaderboard(mappedLeaderboard);

            // Pin the user's own row only if they're outside the top list.
            const userInTop = mappedLeaderboard.some(u => u.user_id === user.id);
            const mine = Array.isArray(myRank) ? myRank[0] : myRank;
            if (!userInTop && mine) {
                setCurrentUserEntry({
                    user_id: user.id,
                    display_name: 'You',
                    total_xp: mine.total_xp || 0,
                    level: mine.level || 1,
                    rank: mine.rank || 0,
                    is_current_user: true,
                });
            } else {
                setCurrentUserEntry(null);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, scope]);

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
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-full" role="tablist" aria-label="Leaderboard time range">
                    {(['all', 'weekly'] as const).map((s) => (
                        <button
                            key={s}
                            type="button"
                            role="tab"
                            aria-selected={scope === s}
                            onClick={() => setScope(s)}
                            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-colors ${
                                scope === s ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {s === 'all' ? 'All time' : 'This week'}
                        </button>
                    ))}
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
