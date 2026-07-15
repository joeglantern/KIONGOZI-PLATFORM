export const XP_PER_MODULE = 100;

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
