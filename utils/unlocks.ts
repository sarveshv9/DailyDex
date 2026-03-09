
// Base requirement scaling (500 XP per level)
export const XP_PER_LEVEL = 500;

export const calculateLevel = (xp: number): number => {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
};

// Map each ThemeName strictly to the level it unlocks at
// If a theme is not on this list, it is assumed default Level 1
export const THEME_UNLOCK_REQUIREMENTS: Partial<Record<string, number>> = {
    // Level 1: Basics
    default: 1,
    dark: 1,

    // Level 2: Kanto Starters (500 XP)
    pikachu: 2,
    bulbasaur: 2,
    squirtle: 2,

    // Level 3: Early Routes (1,000 XP)
    jigglypuff: 3,
    meowth: 3,
    psyduck: 3,

    // Level 4: Classics (1,500 XP)
    slowpoke: 4,
    gengar: 4,
    snorlax: 4,

    // Level 5: Rare & Legendaries (2,000 XP)
    charizard: 5,
    dragonite: 5,
    mew: 5,
};

/**
 * Checks if a specific theme is usable by the user based on their current XP
 */
export const isThemeUnlocked = (themeKey: string, currentXp: number): boolean => {
    const userLevel = calculateLevel(currentXp);
    // Extract base theme if they passed a "light-" string
    const baseThemeKey = themeKey.startsWith("light-") ? themeKey.replace("light-", "") : themeKey;

    const requiredLevel = THEME_UNLOCK_REQUIREMENTS[baseThemeKey] || 1;
    return userLevel >= requiredLevel;
};
