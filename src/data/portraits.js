// Portrait definitions and unlock conditions
// Portraits are cosmetic profile images unlocked through gameplay

/**
 * Portrait categories for organization
 */
export const PORTRAIT_CATEGORIES = {
    LEVEL: 'level',      // Unlocked by reaching player levels
    CHARACTER: 'character', // Unlocked by unlocking characters
    ACHIEVEMENT: 'achievement', // Unlocked by achievements
    SPECIAL: 'special'   // Unlocked by special conditions
};

/**
 * Portrait definitions
 * Each portrait has:
 * - id: Unique identifier
 * - name: Display name
 * - icon: ASCII character or emoji to display
 * - category: Category for organization
 * - unlockCondition: How to unlock this portrait
 * - description: Flavor text
 */
export const PORTRAITS = {
    // ============ DEFAULT ============
    default: {
        id: 'default',
        name: 'Rookie',
        icon: '@',
        color: [200, 200, 200],
        category: PORTRAIT_CATEGORIES.LEVEL,
        unlockCondition: { type: 'default' },
        description: 'Everyone starts somewhere.'
    },

    // ============ LEVEL-BASED ============
    veteran: {
        id: 'veteran',
        name: 'Veteran',
        icon: '★',
        color: [100, 200, 255],
        category: PORTRAIT_CATEGORIES.LEVEL,
        unlockCondition: { type: 'level', value: 10 },
        description: 'A seasoned competitor with many battles under their belt.'
    },
    elite: {
        id: 'elite',
        name: 'Elite',
        icon: '◆',
        color: [255, 200, 100],
        category: PORTRAIT_CATEGORIES.LEVEL,
        unlockCondition: { type: 'level', value: 25 },
        description: 'Among the top performers in the arena.'
    },
    legend: {
        id: 'legend',
        name: 'Legend',
        icon: '♦',
        color: [255, 100, 255],
        category: PORTRAIT_CATEGORIES.LEVEL,
        unlockCondition: { type: 'level', value: 50 },
        description: 'A living legend whose name echoes through the halls.'
    },

    // ============ CHARACTER-BASED ============
    survivor: {
        id: 'survivor',
        name: 'Survivor',
        icon: 'S',
        color: [100, 200, 100],
        category: PORTRAIT_CATEGORIES.CHARACTER,
        unlockCondition: { type: 'character', value: 'survivor' },
        description: 'The default hero. Never gives up.'
    },
    berserker: {
        id: 'berserker',
        name: 'Berserker',
        icon: 'B',
        color: [255, 100, 100],
        category: PORTRAIT_CATEGORIES.CHARACTER,
        unlockCondition: { type: 'character', value: 'berserker' },
        description: 'Rage incarnate. Pain is just fuel.'
    },
    ranger: {
        id: 'ranger',
        name: 'Ranger',
        icon: 'R',
        color: [100, 255, 150],
        category: PORTRAIT_CATEGORIES.CHARACTER,
        unlockCondition: { type: 'character', value: 'ranger' },
        description: 'Swift and precise. Death from a distance.'
    },
    mage: {
        id: 'mage',
        name: 'Mage',
        icon: 'M',
        color: [200, 100, 255],
        category: PORTRAIT_CATEGORIES.CHARACTER,
        unlockCondition: { type: 'character', value: 'mage' },
        description: 'Master of the arcane arts.'
    },
    tank: {
        id: 'tank',
        name: 'Tank',
        icon: 'T',
        color: [150, 150, 200],
        category: PORTRAIT_CATEGORIES.CHARACTER,
        unlockCondition: { type: 'character', value: 'tank' },
        description: 'An immovable wall. Nothing gets through.'
    },
    assassin: {
        id: 'assassin',
        name: 'Assassin',
        icon: 'A',
        color: [150, 100, 150],
        category: PORTRAIT_CATEGORIES.CHARACTER,
        unlockCondition: { type: 'character', value: 'assassin' },
        description: 'Silent. Deadly. Gone before you know it.'
    },

    // ============ ACHIEVEMENT-BASED ============
    boss_slayer: {
        id: 'boss_slayer',
        name: 'Boss Slayer',
        icon: '♛',
        color: [255, 180, 50],
        category: PORTRAIT_CATEGORIES.ACHIEVEMENT,
        unlockCondition: { type: 'stat', stat: 'totalBossesKilled', value: 100 },
        description: 'Has ended the reign of 100 bosses.'
    },
    speedrunner: {
        id: 'speedrunner',
        name: 'Speedrunner',
        icon: '⚡',
        color: [255, 255, 100],
        category: PORTRAIT_CATEGORIES.ACHIEVEMENT,
        unlockCondition: { type: 'stat', stat: 'fastestRunTime', value: 600, comparison: 'lessThan' },
        description: 'Completed a run in under 10 minutes.'
    },
    perfectionist: {
        id: 'perfectionist',
        name: 'Perfectionist',
        icon: '●',
        color: [255, 255, 255],
        category: PORTRAIT_CATEGORIES.ACHIEVEMENT,
        unlockCondition: { type: 'achievement', value: 'flawless_run' },
        description: 'Completed a run without taking damage.'
    },
    grinder: {
        id: 'grinder',
        name: 'Grinder',
        icon: '⚙',
        color: [200, 150, 100],
        category: PORTRAIT_CATEGORIES.ACHIEVEMENT,
        unlockCondition: { type: 'stat', stat: 'totalRuns', value: 100 },
        description: 'Has completed 100 runs. Dedication personified.'
    },
    collector: {
        id: 'collector',
        name: 'Collector',
        icon: '$',
        color: [255, 215, 0],
        category: PORTRAIT_CATEGORIES.ACHIEVEMENT,
        unlockCondition: { type: 'stat', stat: 'totalCurrencyEarned', value: 10000 },
        description: 'Has earned 10,000 credits total.'
    },
    exterminator: {
        id: 'exterminator',
        name: 'Exterminator',
        icon: '☠',
        color: [200, 50, 50],
        category: PORTRAIT_CATEGORIES.ACHIEVEMENT,
        unlockCondition: { type: 'stat', stat: 'totalEnemiesKilled', value: 10000 },
        description: 'Has eliminated 10,000 enemies.'
    }
};

/**
 * Get portrait by ID
 * @param {string} id - Portrait ID
 * @returns {Object|null} Portrait data or null
 */
export function getPortraitById(id) {
    return PORTRAITS[id] || null;
}

/**
 * Get all portraits
 * @returns {Array} Array of all portrait objects
 */
export function getAllPortraits() {
    return Object.values(PORTRAITS);
}

/**
 * Get portraits by category
 * @param {string} category - Category to filter by
 * @returns {Array} Array of portrait objects in that category
 */
export function getPortraitsByCategory(category) {
    return Object.values(PORTRAITS).filter(p => p.category === category);
}

/**
 * Check if a portrait's unlock condition is met
 * @param {string} portraitId - Portrait ID
 * @param {Object} saveData - Player save data
 * @returns {boolean} True if unlocked
 */
export function checkPortraitUnlockCondition(portraitId, saveData) {
    const portrait = PORTRAITS[portraitId];
    if (!portrait) return false;

    const condition = portrait.unlockCondition;

    switch (condition.type) {
        case 'default':
            return true;

        case 'level':
            // Calculate level from XP
            const level = Math.floor(Math.sqrt((saveData.totalXP || 0) / 100)) + 1;
            return level >= condition.value;

        case 'character':
            return saveData.unlocks?.characters?.includes(condition.value) || false;

        case 'achievement':
            return saveData.achievements?.includes(condition.value) || false;

        case 'stat':
            const statValue = saveData.stats?.[condition.stat] || 0;
            if (condition.comparison === 'lessThan') {
                // For speedrunner: needs to have a valid time AND be under the threshold
                return statValue > 0 && statValue < condition.value;
            }
            return statValue >= condition.value;

        default:
            return false;
    }
}

/**
 * Get unlock progress for a portrait
 * @param {string} portraitId - Portrait ID
 * @param {Object} saveData - Player save data
 * @returns {Object} Progress info with current, required, and percentage
 */
export function getPortraitUnlockProgress(portraitId, saveData) {
    const portrait = PORTRAITS[portraitId];
    if (!portrait) return { current: 0, required: 1, percentage: 0 };

    const condition = portrait.unlockCondition;

    switch (condition.type) {
        case 'default':
            return { current: 1, required: 1, percentage: 1 };

        case 'level':
            const level = Math.floor(Math.sqrt((saveData.totalXP || 0) / 100)) + 1;
            return {
                current: level,
                required: condition.value,
                percentage: Math.min(1, level / condition.value)
            };

        case 'character':
            const hasChar = saveData.unlocks?.characters?.includes(condition.value) || false;
            return {
                current: hasChar ? 1 : 0,
                required: 1,
                percentage: hasChar ? 1 : 0
            };

        case 'achievement':
            const hasAch = saveData.achievements?.includes(condition.value) || false;
            return {
                current: hasAch ? 1 : 0,
                required: 1,
                percentage: hasAch ? 1 : 0
            };

        case 'stat':
            const statValue = saveData.stats?.[condition.stat] || 0;
            if (condition.comparison === 'lessThan') {
                // Can't really show progress for "less than" conditions
                return {
                    current: statValue || 'N/A',
                    required: `< ${condition.value}`,
                    percentage: statValue > 0 && statValue < condition.value ? 1 : 0
                };
            }
            return {
                current: statValue,
                required: condition.value,
                percentage: Math.min(1, statValue / condition.value)
            };

        default:
            return { current: 0, required: 1, percentage: 0 };
    }
}

/**
 * Get description of unlock condition
 * @param {string} portraitId - Portrait ID
 * @returns {string} Human-readable unlock condition
 */
export function getPortraitUnlockDescription(portraitId) {
    const portrait = PORTRAITS[portraitId];
    if (!portrait) return 'Unknown';

    const condition = portrait.unlockCondition;

    switch (condition.type) {
        case 'default':
            return 'Unlocked by default';
        case 'level':
            return `Reach Level ${condition.value}`;
        case 'character':
            return `Unlock the ${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)} character`;
        case 'achievement':
            return `Complete the "${condition.value}" achievement`;
        case 'stat':
            const statNames = {
                totalBossesKilled: 'bosses killed',
                totalRuns: 'runs completed',
                totalCurrencyEarned: 'credits earned',
                totalEnemiesKilled: 'enemies killed',
                fastestRunTime: 'second run'
            };
            const statName = statNames[condition.stat] || condition.stat;
            if (condition.comparison === 'lessThan') {
                return `Complete a run in under ${Math.floor(condition.value / 60)} minutes`;
            }
            return `${condition.value.toLocaleString()} ${statName}`;
        default:
            return 'Unknown condition';
    }
}
