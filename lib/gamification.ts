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
        const newBadges = [];

        // 4. Logic for awarding based on requirements
        for (const badge of allBadges) {
            if (earnedBadgeIds.has(badge.id)) continue;

            let shouldAward = false;

            if (badge.requirement_type === 'modules_completed') {
                if (completedCount >= badge.requirement_value) {
                    shouldAward = true;
                }
            }
            // Add other requirement types here (e.g., courses_completed, streaks)

            if (shouldAward) {
                const { error } = await supabase
                    .from('user_badges')
                    .insert({
                        user_id: userId,
                        badge_id: badge.id,
                        earned_at: new Date().toISOString()
                    });

                if (!error) {
                    newBadges.push(badge);
                }
            }
        }

        return newBadges;
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
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('current_streak, max_streak, last_activity_date')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];

        const lastActivity = profile.last_activity_date;
        let newStreak = profile.current_streak || 0;
        let maxStreak = profile.max_streak || 0;

        if (!lastActivity) {
            newStreak = 1;
        } else {
            const lastDate = new Date(lastActivity);
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (lastActivity === today) {
                // Already updated today
                return { currentStreak: newStreak, maxStreak };
            } else if (diffDays === 1) {
                // Consecutive day
                newStreak += 1;
            } else {
                // Streak broken
                newStreak = 1;
            }
        }

        if (newStreak > maxStreak) {
            maxStreak = newStreak;
        }

        // 2. Update profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                current_streak: newStreak,
                max_streak: maxStreak,
                last_activity_date: today
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        return { currentStreak: newStreak, maxStreak };
    } catch (error) {
        console.error('Error updating streak:', error);
        return null;
    }
}
