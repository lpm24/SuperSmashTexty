// Achievement definitions - expanded achievement system with difficulty tiers and shop unlocks

export const ACHIEVEMENTS = {
    // =============================================================================
    // PROGRESSION ACHIEVEMENTS (normal difficulty)
    // =============================================================================
    floor2: {
        id: 'floor2',
        name: 'Floor 2 Reached',
        description: 'Reach Floor 2',
        category: 'progression',
        icon: '2',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'bestFloor', value: 2 },
        hint: 'Progress further into the facility'
    },
    floor3: {
        id: 'floor3',
        name: 'Floor 3 Reached',
        description: 'Reach Floor 3',
        category: 'progression',
        icon: '3',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'bestFloor', value: 3 },
        hint: 'Keep pushing deeper'
    },
    floor5: {
        id: 'floor5',
        name: 'Floor 5 Reached',
        description: 'Reach Floor 5',
        category: 'progression',
        icon: '5',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'bestFloor', value: 5 },
        hint: 'The halfway point awaits'
    },
    floor10: {
        id: 'floor10',
        name: 'Floor 10 Reached',
        description: 'Reach Floor 10',
        category: 'progression',
        icon: '*',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'bestFloor', value: 10 },
        hint: 'Double digits!'
    },
    firstSynergy: {
        id: 'firstSynergy',
        name: 'Combo Starter',
        description: 'Activate your first synergy',
        category: 'progression',
        icon: '+',
        unlocked: false,
        difficulty: 'normal',
        hint: 'Collect upgrades that work together'
    },
    allCharacters: {
        id: 'allCharacters',
        name: 'Full Roster',
        description: 'Unlock all characters',
        category: 'progression',
        icon: '@',
        unlocked: false,
        difficulty: 'normal',
        hint: 'Progress through floors to unlock characters'
    },
    maxUpgrade: {
        id: 'maxUpgrade',
        name: 'Maxed Out',
        description: 'Max out a permanent upgrade',
        category: 'progression',
        icon: '^',
        unlocked: false,
        difficulty: 'normal',
        hint: 'Purchase the same upgrade multiple times'
    },

    // =============================================================================
    // COMBAT ACHIEVEMENTS (normal difficulty)
    // =============================================================================
    firstKill: {
        id: 'firstKill',
        name: 'First Blood',
        description: 'Kill your first enemy',
        category: 'combat',
        icon: 'x',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalEnemiesKilled', value: 1 },
        hint: 'Defeat any enemy'
    },
    kill100: {
        id: 'kill100',
        name: 'Enemy Slayer',
        description: 'Kill 100 enemies total',
        category: 'combat',
        icon: 'X',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalEnemiesKilled', value: 100 },
        hint: 'Keep fighting!'
    },
    kill500: {
        id: 'kill500',
        name: 'Massacre',
        description: 'Kill 500 enemies total',
        category: 'combat',
        icon: '#',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalEnemiesKilled', value: 500 },
        hint: 'The carnage continues'
    },
    kill1000: {
        id: 'kill1000',
        name: 'Genocide',
        description: 'Kill 1000 enemies total',
        category: 'combat',
        icon: '%',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalEnemiesKilled', value: 1000 },
        hint: 'A true warrior emerges'
    },

    // =============================================================================
    // BOSS ACHIEVEMENTS
    // =============================================================================
    firstBoss: {
        id: 'firstBoss',
        name: 'Boss Hunter',
        description: 'Defeat your first boss',
        category: 'boss',
        icon: 'B',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalBossesKilled', value: 1 },
        hint: 'Clear Floor 1 to face a boss'
    },
    boss5: {
        id: 'boss5',
        name: 'Boss Slayer',
        description: 'Defeat 5 bosses total',
        category: 'boss',
        icon: 'W',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalBossesKilled', value: 5 },
        hint: 'Keep defeating floor bosses'
    },
    boss10: {
        id: 'boss10',
        name: 'Boss Veteran',
        description: 'Defeat 10 bosses total',
        category: 'boss',
        icon: 'V',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalBossesKilled', value: 10 },
        hint: 'Experience makes perfect'
    },
    boss25: {
        id: 'boss25',
        name: 'Boss Crusher',
        description: 'Defeat 25 bosses total',
        category: 'boss',
        icon: 'C',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'totalBossesKilled', value: 25 },
        unlocks: ['railgun'],
        hint: 'Become a boss-hunting expert'
    },
    boss50: {
        id: 'boss50',
        name: 'Boss Destroyer',
        description: 'Defeat 50 bosses total',
        category: 'boss',
        icon: 'D',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'totalBossesKilled', value: 50 },
        hint: 'The ultimate boss hunter'
    },

    // =============================================================================
    // RUN ACHIEVEMENTS
    // =============================================================================
    firstRun: {
        id: 'firstRun',
        name: 'First Run',
        description: 'Complete your first run',
        category: 'run',
        icon: 'R',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalRuns', value: 1 },
        hint: 'Play until you die (or win!)'
    },
    run10: {
        id: 'run10',
        name: 'Veteran',
        description: 'Complete 10 runs',
        category: 'run',
        icon: 'v',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalRuns', value: 10 },
        hint: 'Practice makes progress'
    },
    run50: {
        id: 'run50',
        name: 'Dedicated',
        description: 'Complete 50 runs',
        category: 'run',
        icon: 'd',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalRuns', value: 50 },
        hint: 'A true fan of the show'
    },
    run100: {
        id: 'run100',
        name: 'Century',
        description: 'Complete 100 runs',
        category: 'run',
        icon: '!',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'totalRuns', value: 100 },
        hint: 'The ultimate dedication'
    },

    // =============================================================================
    // UPGRADE ACHIEVEMENTS
    // =============================================================================
    level10: {
        id: 'level10',
        name: 'Level 10',
        description: 'Reach level 10 in a single run',
        category: 'upgrade',
        icon: 'L',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'bestLevel', value: 10 },
        hint: 'Collect XP and level up'
    },
    level20: {
        id: 'level20',
        name: 'Level 20',
        description: 'Reach level 20 in a single run',
        category: 'upgrade',
        icon: 'l',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'bestLevel', value: 20 },
        hint: 'Keep grinding for XP'
    },
    level30: {
        id: 'level30',
        name: 'Powerhouse',
        description: 'Reach level 30 in a single run',
        category: 'upgrade',
        icon: 'P',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'bestLevel', value: 30 },
        hint: 'Build becomes unstoppable'
    },
    level50: {
        id: 'level50',
        name: 'Unstoppable',
        description: 'Reach level 50 in a single run',
        category: 'upgrade',
        icon: 'U',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'bestLevel', value: 50 },
        hint: 'Ultimate power achieved'
    },

    // =============================================================================
    // CURRENCY ACHIEVEMENTS
    // =============================================================================
    earn100: {
        id: 'earn100',
        name: 'Rich',
        description: 'Earn 100 credits total',
        category: 'currency',
        icon: '$',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalCurrencyEarned', value: 100 },
        hint: 'Play runs to earn credits'
    },
    earn500: {
        id: 'earn500',
        name: 'Wealthy',
        description: 'Earn 500 credits total',
        category: 'currency',
        icon: 'S',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalCurrencyEarned', value: 500 },
        hint: 'Keep earning and saving'
    },
    earn1000: {
        id: 'earn1000',
        name: 'Millionaire',
        description: 'Earn 1000 credits total',
        category: 'currency',
        icon: 'M',
        unlocked: false,
        difficulty: 'normal',
        threshold: { stat: 'totalCurrencyEarned', value: 1000 },
        hint: 'A fortune awaits'
    },
    earn5000: {
        id: 'earn5000',
        name: 'Fortune',
        description: 'Earn 5000 credits total',
        category: 'currency',
        icon: 'F',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'totalCurrencyEarned', value: 5000 },
        hint: 'Building an empire'
    },
    earn10000: {
        id: 'earn10000',
        name: 'Tycoon',
        description: 'Earn 10000 credits total',
        category: 'currency',
        icon: 'T',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'totalCurrencyEarned', value: 10000 },
        hint: 'The ultimate collector'
    },

    // =============================================================================
    // CHALLENGE ACHIEVEMENTS (special conditions)
    // =============================================================================
    perfectFloor: {
        id: 'perfectFloor',
        name: 'Untouchable',
        description: 'Clear a floor without taking damage',
        category: 'challenge',
        icon: 'O',
        unlocked: false,
        difficulty: 'challenge',
        hint: 'Dodge everything on an entire floor'
    },
    speedRunner: {
        id: 'speedRunner',
        name: 'Speed Demon',
        description: 'Clear Floor 3 in under 5 minutes',
        category: 'challenge',
        icon: '>',
        unlocked: false,
        difficulty: 'challenge',
        hint: 'Rush through the first 3 floors'
    },
    bossRush: {
        id: 'bossRush',
        name: 'Boss Rush',
        description: 'Defeat 3 bosses in one run',
        category: 'challenge',
        icon: '&',
        unlocked: false,
        difficulty: 'challenge',
        hint: 'Reach and defeat multiple floor bosses'
    },
    noHitBoss: {
        id: 'noHitBoss',
        name: 'Flawless',
        description: 'Defeat a boss without taking damage',
        category: 'challenge',
        icon: '=',
        unlocked: false,
        difficulty: 'challenge',
        hint: 'Perfect boss fight execution'
    },
    glassCannonWin: {
        id: 'glassCannonWin',
        name: 'High Risk',
        description: 'Defeat a boss while below 25% HP',
        category: 'challenge',
        icon: '?',
        unlocked: false,
        difficulty: 'challenge',
        hint: 'Living dangerously pays off'
    },

    // =============================================================================
    // BENCHMARK ACHIEVEMENTS (high targets)
    // =============================================================================
    kill5000: {
        id: 'kill5000',
        name: 'Exterminator',
        description: 'Kill 5,000 enemies total',
        category: 'benchmark',
        icon: 'E',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'totalEnemiesKilled', value: 5000 },
        hint: 'A lifetime of combat'
    },
    kill10000: {
        id: 'kill10000',
        name: 'Annihilator',
        description: 'Kill 10,000 enemies total',
        category: 'benchmark',
        icon: 'A',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'totalEnemiesKilled', value: 10000 },
        hint: 'The ultimate destroyer'
    },
    floor15: {
        id: 'floor15',
        name: 'Deep Delver',
        description: 'Reach Floor 15',
        category: 'benchmark',
        icon: 'G',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'bestFloor', value: 15 },
        hint: 'Go deeper than ever before'
    },
    floor20: {
        id: 'floor20',
        name: 'Abyssal',
        description: 'Reach Floor 20',
        category: 'benchmark',
        icon: 'Z',
        unlocked: false,
        difficulty: 'benchmark',
        threshold: { stat: 'bestFloor', value: 20 },
        hint: 'The final frontier'
    }
};

// Achievement difficulty colors for UI
export const ACHIEVEMENT_COLORS = {
    normal: [200, 200, 200],      // Gray - standard achievements
    challenge: [255, 200, 100],   // Gold - challenge achievements
    benchmark: [200, 150, 255]    // Purple - benchmark achievements
};

// Get achievements by category
export function getAchievementsByCategory(category) {
    return Object.values(ACHIEVEMENTS).filter(ach => ach.category === category);
}

// Get achievements by difficulty
export function getAchievementsByDifficulty(difficulty) {
    return Object.values(ACHIEVEMENTS).filter(ach => ach.difficulty === difficulty);
}

// Get all achievement categories
export function getAchievementCategories() {
    const categories = new Set();
    Object.values(ACHIEVEMENTS).forEach(ach => categories.add(ach.category));
    return Array.from(categories);
}

// Get achievement by ID
export function getAchievementById(id) {
    return ACHIEVEMENTS[id] || null;
}

// Get all achievements that unlock shop items
export function getAchievementsWithUnlocks() {
    return Object.values(ACHIEVEMENTS).filter(ach => ach.unlocks && ach.unlocks.length > 0);
}

// Calculate achievement progress (for achievements with thresholds)
export function getAchievementProgress(achievementId, stats) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement || !achievement.threshold) {
        return null;
    }

    const currentValue = stats[achievement.threshold.stat] || 0;
    const targetValue = achievement.threshold.value;
    const progress = Math.min(currentValue / targetValue, 1);

    return {
        current: currentValue,
        target: targetValue,
        progress: progress,
        percentage: Math.round(progress * 100)
    };
}
