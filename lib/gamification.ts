import { SupabaseClient } from '@supabase/supabase-js';

export const XP_PER_MODULE = 100;
export const XP_PER_LEVEL = 1000;

export interface LevelInfo {
    level: number;
    currentLvlXp: number;
    xpToNextLvl: number;
    progressPercentage: number;
}

/**
 * Calculates level information based on total XP using a square root formula
 * Level = floor(sqrt(totalXp / 50))
 * We ensure Level 1 is the minimum.
 */
export function calculateLevel(totalXp: number): LevelInfo {
    const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalXp) / 50)));

    // XP required to REACH this level: 50 * level^2
    const currentLevelMinXp = 50 * Math.pow(level, 2);
    // XP required to REACH next level: 50 * (level + 1)^2
    const nextLevelMinXp = 50 * Math.pow(level + 1, 2);

    const currentLvlXp = Math.max(0, totalXp - currentLevelMinXp);
    const xpToNextLvl = nextLevelMinXp - currentLevelMinXp;
    const progressPercentage = Math.min(100, Math.round((currentLvlXp / xpToNextLvl) * 100));

    return {
        level,
        currentLvlXp,
        xpToNextLvl,
        progressPercentage
    };
}

/**
 * Checks and awards badges based on user performance
 */
export async function checkAndAwardBadges(supabase: SupabaseClient, userId: string) {
    try {
        // 1. Fetch user's completion stats
        const { data: completedModules } = await supabase
            .from('user_progress')
            .select('module_id')
            .eq('user_id', userId)
            .eq('status', 'completed');

        const completedCount = completedModules?.length || 0;

        // 2. Fetch all available badges
        const { data: allBadges } = await supabase
            .from('badges')
            .select('*');

        if (!allBadges) return [];

        // 3. Fetch user's earned badges
        const { data: earnedBadges } = await supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', userId);

        const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);
        const badgesToAward = [];

        for (const badge of allBadges) {
            if (earnedBadgeIds.has(badge.id)) continue;

            if (badge.requirement_type === 'modules_completed' && completedCount >= badge.requirement_value) {
                badgesToAward.push(badge);
            }
        }

        if (badgesToAward.length === 0) return [];

        const now = new Date().toISOString();
        const { error } = await supabase
            .from('user_badges')
            .insert(badgesToAward.map(badge => ({
                user_id: userId,
                badge_id: badge.id,
                earned_at: now,
            })));

        if (error) {
            console.error('Error awarding badges:', error);
            return [];
        }

        return badgesToAward;
    } catch (error) {
        console.error('Error awarding badges:', error);
        return [];
    }
}

/**
 * Updates user streak information based on activity
 */
export async function updateUserStreak(supabase: SupabaseClient, userId: string) {
    try {
        // 1. Fetch current profile
        // NOTE: Supabase migration uses longest_streak and last_action_date
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('current_streak, longest_streak, last_action_date')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Get yesterday's date string for streak comparison
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // last_action_date is a timestamptz in DB — extract date portion for comparison
        const lastActionDate = profile.last_action_date
            ? new Date(profile.last_action_date).toISOString().split('T')[0]
            : null;

        let newStreak = profile.current_streak || 0;
        let longestStreak = profile.longest_streak || 0;

        if (!lastActionDate) {
            newStreak = 1;
        } else if (lastActionDate === today) {
            // Already updated today, return early
            return { currentStreak: newStreak, longestStreak };
        } else if (lastActionDate === yesterdayStr) {
            // Consecutive day — extend streak
            newStreak += 1;
        } else {
            // Streak broken (gap of 2+ days)
            newStreak = 1;
        }

        if (newStreak > longestStreak) {
            longestStreak = newStreak;
        }

        // 2. Update profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                current_streak: newStreak,
                longest_streak: longestStreak,
                last_action_date: new Date().toISOString(), // store as timestamptz
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        return { currentStreak: newStreak, longestStreak };
    } catch (error: any) {
        console.error('Error updating streak:', error?.message || error);
        return null;
    }
}
