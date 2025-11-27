// Unlock definitions - defines all unlockable content

// Character unlocks
export const CHARACTER_UNLOCKS = {
    survivor: {
        name: 'The Survivor',
        description: 'Balanced stats, +10% XP gain',
        cost: 0,
        unlockedByDefault: true,
        char: '@',
        color: [100, 150, 255],
        stats: {
            health: 100,
            speed: 150,
            damage: 10
        },
        weapon: 'pistol',
        ability: 'xpBoost' // +10% XP gain
    },
    scout: {
        name: 'The Scout',
        description: 'Fast and agile, +20% speed, +10% dodge',
        cost: 0, // Unlocked by completing Floor 2
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 2 },
        char: '▶',
        color: [255, 255, 100],
        stats: {
            health: 75,
            speed: 200,
            damage: 8
        },
        weapon: 'smg',
        ability: 'speedBoost' // +20% speed, +10% dodge chance
    },
    tank: {
        name: 'The Tank',
        description: 'High health and defense, +25% health, +15% damage reduction',
        cost: 0, // Unlocked by completing Floor 3
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 3 },
        char: '█',
        color: [150, 150, 150],
        stats: {
            health: 150,
            speed: 100,
            damage: 12
        },
        weapon: 'shotgun',
        ability: 'tankStats' // +25% health, +15% damage reduction
    },
    sniper: {
        name: 'The Sniper',
        description: 'High damage, precision-focused, +50% crit chance',
        cost: 0, // Unlocked by completing Floor 3
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 3 },
        char: '▲',
        color: [100, 255, 255],
        stats: {
            health: 80,
            speed: 120,
            damage: 20
        },
        weapon: 'sniper',
        ability: 'critBoost' // +50% crit chance, +25% crit damage (requires crit system)
    },
    pyro: {
        name: 'The Pyro',
        description: 'Fire specialist, +25% fire damage over time',
        cost: 0, // Unlocked by completing Floor 2
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 2 },
        char: '★',
        color: [255, 150, 50],
        stats: {
            health: 90,
            speed: 150,
            damage: 12
        },
        weapon: 'flamethrower',
        ability: 'fireDot' // +25% fire DoT (requires DoT system)
    }
    // Note: Additional characters could get:
    // - orbital (defensive/support character)
    // - explosive (area damage specialist)
    // - chainLightning (multi-target specialist)
};

// Weapon unlocks
export const WEAPON_UNLOCKS = {
    default: {
        name: 'Default Weapon',
        description: 'Single bullet weapon',
        cost: 0,
        unlockedByDefault: true
    },
    // Future weapons can be added here
    // spread: {
    //     name: 'Spread Shot',
    //     description: 'Fires 3 projectiles in a spread',
    //     cost: 200
    // },
    // rapid: {
    //     name: 'Rapid Fire',
    //     description: 'Higher fire rate',
    //     cost: 250
    // }
};

// Permanent upgrade unlocks
export const PERMANENT_UPGRADE_UNLOCKS = {
    startingHealth: {
        name: 'Starting Health +10',
        description: 'Start the show with +10 max health',
        cost: 50,
        maxLevel: 5 // Can be purchased multiple times
    },
    startingDamage: {
        name: 'Starting Damage +1',
        description: 'Start the show with +1 damage',
        cost: 75,
        maxLevel: 5
    },
    startingSpeed: {
        name: 'Starting Speed +10',
        description: 'Start the show with +10 speed',
        cost: 60,
        maxLevel: 5
    },
    propDurability: {
        name: 'Prop Durability',
        description: 'Props last +2 seconds per level',
        cost: 80,
        maxLevel: 5 // Max +10 seconds (2 seconds per level)
    },
    propDropChance: {
        name: 'Prop Drop Chance',
        description: '+5% prop drop chance per level',
        cost: 100,
        maxLevel: 5 // Max +25% (5% per level)
    }
};

// Get all unlocks for a category
export function getUnlocksForCategory(category) {
    switch (category) {
        case 'characters':
            return CHARACTER_UNLOCKS;
        case 'weapons':
            return WEAPON_UNLOCKS;
        case 'permanentUpgrades':
            return PERMANENT_UPGRADE_UNLOCKS;
        default:
            return {};
    }
}

// Get unlock info
export function getUnlockInfo(category, key) {
    const unlocks = getUnlocksForCategory(category);
    return unlocks[key] || null;
}

