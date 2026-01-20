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
    },
    // === NEW CHARACTERS (achievement-locked) ===
    bomber: {
        name: 'The Bomber',
        description: 'Explosive specialist, +50% blast radius, projectiles explode on hit',
        cost: 0,
        unlockedByDefault: false,
        unlockRequirement: { type: 'achievement', value: 'boss10' },
        char: '●',
        color: [255, 100, 100],
        stats: {
            health: 85,
            speed: 130,
            damage: 15
        },
        weapon: 'launcher',
        ability: 'explosiveShots' // Projectiles explode, +50% blast radius
    },
    engineer: {
        name: 'The Engineer',
        description: 'Support class, +2 orbital drones that auto-attack nearby enemies',
        cost: 0,
        unlockedByDefault: false,
        unlockRequirement: { type: 'achievement', value: 'level20' },
        char: '◆',
        color: [100, 200, 255],
        stats: {
            health: 80,
            speed: 140,
            damage: 8
        },
        weapon: 'pistol',
        ability: 'orbitalDrones' // Start with 2 orbital drones
    },
    vampire: {
        name: 'The Vampire',
        description: 'Lifesteal specialist, +15% lifesteal, -20% max health',
        cost: 0,
        unlockedByDefault: false,
        unlockRequirement: { type: 'achievement', value: 'kill1000' },
        char: '♦',
        color: [180, 50, 180],
        stats: {
            health: 70,
            speed: 160,
            damage: 14
        },
        weapon: 'smg',
        ability: 'vampiric' // +15% lifesteal, -20% max health
    },
    berserker: {
        name: 'The Berserker',
        description: 'Rage mode, +100% damage below 30% HP, takes +25% more damage',
        cost: 0,
        unlockedByDefault: false,
        unlockRequirement: { type: 'achievement', value: 'glassCannonWin' },
        char: '▼',
        color: [255, 50, 50],
        stats: {
            health: 120,
            speed: 140,
            damage: 18
        },
        weapon: 'shotgun',
        ability: 'rage' // +100% damage below 30% HP, +25% damage taken
    },
    ghost: {
        name: 'The Ghost',
        description: 'Evasion master, +25% dodge chance, +15% crit, lower health',
        cost: 0,
        unlockedByDefault: false,
        unlockRequirement: { type: 'achievement', value: 'perfectFloor' },
        char: '◊',
        color: [200, 200, 255],
        stats: {
            health: 60,
            speed: 180,
            damage: 11
        },
        weapon: 'smg',
        ability: 'ethereal' // +25% dodge, +15% crit chance
    }
};

// Weapon unlocks
export const WEAPON_UNLOCKS = {
    default: {
        name: 'Default Weapon',
        description: 'Single bullet weapon',
        cost: 0,
        unlockedByDefault: true
    },
    spreadShot: {
        name: 'Spread Shot',
        description: 'Fires 3 projectiles in a cone, lower damage each',
        cost: 250,
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 2 }
    },
    boomerang: {
        name: 'Boomerang Blaster',
        description: 'Projectiles return, hitting enemies twice',
        cost: 400,
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 3 }
    },
    chainLightning: {
        name: 'Chain Lightning',
        description: 'Bounces to 3 nearby enemies, -20% per bounce',
        cost: 500,
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 3 }
    },
    railgun: {
        name: 'Railgun',
        description: 'Pierces ALL enemies in a line, 3s cooldown',
        cost: 600,
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 4 },
        requiredAchievement: 'boss25'
    },
    homingMissiles: {
        name: 'Homing Missiles',
        description: 'Slower projectiles that track enemies',
        cost: 700,
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 4 }
    },
    plasmaRifle: {
        name: 'Plasma Rifle',
        description: 'High damage, penetrates 2 enemies',
        cost: 800,
        unlockedByDefault: false,
        unlockRequirement: { type: 'floor', value: 5 },
        requiredAchievement: 'floor10'
    }
};

// Cosmetic unlocks - visual customizations (unlocked via achievements)
export const COSMETIC_UNLOCKS = {
    // === Player Trails ===
    trailNone: {
        name: 'No Trail',
        description: 'Default appearance',
        cost: 0,
        unlockedByDefault: true,
        category: 'trail'
    },
    trailFire: {
        name: 'Fire Trail',
        description: 'Leave a blazing trail behind you',
        cost: 0,
        unlockedByDefault: false,
        category: 'trail',
        color: [255, 100, 50],
        requiredAchievement: 'kill100'
    },
    trailIce: {
        name: 'Ice Trail',
        description: 'Leave a frosty trail behind you',
        cost: 0,
        unlockedByDefault: false,
        category: 'trail',
        color: [100, 200, 255],
        requiredAchievement: 'floor5'
    },
    trailPoison: {
        name: 'Toxic Trail',
        description: 'Leave a poisonous trail behind you',
        cost: 0,
        unlockedByDefault: false,
        category: 'trail',
        color: [100, 255, 100],
        requiredAchievement: 'kill500'
    },
    trailShadow: {
        name: 'Shadow Trail',
        description: 'Leave a dark trail behind you',
        cost: 0,
        unlockedByDefault: false,
        category: 'trail',
        color: [80, 50, 120],
        requiredAchievement: 'firstSynergy'
    },
    trailRainbow: {
        name: 'Rainbow Trail',
        description: 'Leave a colorful trail behind you',
        cost: 0,
        unlockedByDefault: false,
        category: 'trail',
        color: 'rainbow',
        requiredAchievement: 'synergyMaster'
    },

    // === Death Effects ===
    deathNone: {
        name: 'Standard Death',
        description: 'Default enemy death effect',
        cost: 0,
        unlockedByDefault: true,
        category: 'death'
    },
    deathExplosion: {
        name: 'Explosive Death',
        description: 'Enemies explode dramatically',
        cost: 0,
        unlockedByDefault: false,
        category: 'death',
        requiredAchievement: 'firstBoss'
    },
    deathDisintegrate: {
        name: 'Disintegration',
        description: 'Enemies crumble into particles',
        cost: 0,
        unlockedByDefault: false,
        category: 'death',
        requiredAchievement: 'boss5'
    },
    deathVaporize: {
        name: 'Vaporize',
        description: 'Enemies vanish in a puff of smoke',
        cost: 0,
        unlockedByDefault: false,
        category: 'death',
        requiredAchievement: 'killStreak10'
    },
    deathPixelate: {
        name: 'Pixelate',
        description: 'Enemies break into pixels',
        cost: 0,
        unlockedByDefault: false,
        category: 'death',
        requiredAchievement: 'multikill'
    },

    // === Player Glow ===
    glowNone: {
        name: 'No Glow',
        description: 'Default appearance',
        cost: 0,
        unlockedByDefault: true,
        category: 'glow'
    },
    glowGold: {
        name: 'Golden Aura',
        description: 'Radiate a golden glow',
        cost: 0,
        unlockedByDefault: false,
        category: 'glow',
        color: [255, 200, 50],
        requiredAchievement: 'earn500'
    },
    glowCrimson: {
        name: 'Crimson Aura',
        description: 'Radiate a blood-red glow',
        cost: 0,
        unlockedByDefault: false,
        category: 'glow',
        color: [200, 50, 50],
        requiredAchievement: 'closeCall'
    },
    glowElectric: {
        name: 'Electric Aura',
        description: 'Crackle with electricity',
        cost: 0,
        unlockedByDefault: false,
        category: 'glow',
        color: [100, 150, 255],
        requiredAchievement: 'speedRunner'
    },
    glowVoid: {
        name: 'Void Aura',
        description: 'Emanate dark energy',
        cost: 0,
        unlockedByDefault: false,
        category: 'glow',
        color: [50, 0, 80],
        requiredAchievement: 'perfectFloor'
    }
};

// Run Boosters - one-time consumables for next run
export const RUN_BOOSTER_UNLOCKS = {
    healthPack: {
        name: 'Health Pack',
        description: 'Start next run with +30 bonus HP',
        cost: 30,
        consumable: true,
        effect: { type: 'startingHealth', value: 30 }
    },
    damageAmp: {
        name: 'Damage Amp',
        description: '+25% damage for first floor',
        cost: 35,
        consumable: true,
        effect: { type: 'tempDamage', value: 0.25, duration: 'floor' }
    },
    speedSerum: {
        name: 'Speed Serum',
        description: '+30% speed for first floor',
        cost: 25,
        consumable: true,
        effect: { type: 'tempSpeed', value: 0.30, duration: 'floor' }
    },
    wealthCharm: {
        name: 'Wealth Charm',
        description: '+30% credits earned this run',
        cost: 50,
        consumable: true,
        effect: { type: 'creditMultiplier', value: 0.30, duration: 'run' }
    },
    luckyCoin: {
        name: 'Lucky Coin',
        description: '+15% crit chance for first floor',
        cost: 40,
        consumable: true,
        effect: { type: 'tempCrit', value: 0.15, duration: 'floor' }
    },
    armorPlating: {
        name: 'Armor Plating',
        description: '+20% damage reduction for first floor',
        cost: 45,
        consumable: true,
        effect: { type: 'tempDefense', value: 0.20, duration: 'floor' }
    },
    xpBooster: {
        name: 'XP Booster',
        description: '+50% XP gained for first floor',
        cost: 40,
        consumable: true,
        effect: { type: 'tempXP', value: 0.50, duration: 'floor' }
    },
    emergencyRevive: {
        name: 'Emergency Revive',
        description: 'Auto-revive once at 25% HP',
        cost: 75,
        consumable: true,
        effect: { type: 'autoRevive', value: 0.25, uses: 1 }
    }
};

// Permanent upgrade unlocks
export const PERMANENT_UPGRADE_UNLOCKS = {
    // === TIER 1: Basic Stats (cheap, essential) ===
    startingHealth: {
        name: 'Starting Health +10',
        description: 'Start the show with +10 max health',
        cost: 50,
        maxLevel: 5,
        tier: 1
    },
    startingDamage: {
        name: 'Starting Damage +1',
        description: 'Start the show with +1 damage',
        cost: 75,
        maxLevel: 5,
        tier: 1
    },
    startingSpeed: {
        name: 'Starting Speed +10',
        description: 'Start the show with +10 speed',
        cost: 60,
        maxLevel: 5,
        tier: 1
    },

    // === TIER 2: Utility (moderate cost) ===
    xpMagnet: {
        name: 'XP Magnet',
        description: '+15% XP pickup radius per level',
        cost: 60,
        maxLevel: 5,
        tier: 2
    },
    propDurability: {
        name: 'Prop Durability',
        description: 'Props last +2 seconds per level',
        cost: 80,
        maxLevel: 5,
        tier: 2
    },
    propDropChance: {
        name: 'Prop Drop Chance',
        description: '+5% prop drop chance per level',
        cost: 100,
        maxLevel: 5,
        tier: 2
    },
    creditBonus: {
        name: 'Credit Bonus',
        description: '+8% credits earned per level',
        cost: 120,
        maxLevel: 5,
        tier: 2
    },

    // === TIER 3: Combat (higher cost) ===
    luckyStart: {
        name: 'Lucky Start',
        description: '+5% starting crit chance per level',
        cost: 100,
        maxLevel: 4,
        tier: 3
    },
    thickSkin: {
        name: 'Thick Skin',
        description: '+3% damage reduction per level',
        cost: 100,
        maxLevel: 5,
        tier: 3
    },
    secondWind: {
        name: 'Second Wind',
        description: '+5% revive health per level (up to 25%)',
        cost: 150,
        maxLevel: 4,
        tier: 3
    },
    bossBounty: {
        name: 'Boss Bounty',
        description: '+15 bonus credits per boss kill',
        cost: 150,
        maxLevel: 3,
        tier: 3
    },

    // === TIER 4: Premium (expensive, powerful) ===
    mulligan: {
        name: 'Mulligan',
        description: '+1 reroll per run for upgrade drafts',
        cost: 300,
        maxLevel: 3,
        tier: 4
    },
    comfortZone: {
        name: 'Comfort Zone',
        description: '+0.1s invulnerability after hit',
        cost: 200,
        maxLevel: 3,
        tier: 4
    },
    toughChoices: {
        name: 'Tough Choices',
        description: '+1 upgrade option in drafts (4 total)',
        cost: 500,
        maxLevel: 1,
        tier: 4
    },
    headStart: {
        name: 'Head Start',
        description: 'Begin each run at level 2',
        cost: 750,
        maxLevel: 1,
        tier: 4
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
        case 'cosmetics':
            return COSMETIC_UNLOCKS;
        case 'boosters':
            return RUN_BOOSTER_UNLOCKS;
        default:
            return {};
    }
}

// Get unlock info
export function getUnlockInfo(category, key) {
    const unlocks = getUnlocksForCategory(category);
    return unlocks[key] || null;
}

// Get cosmetics by sub-category (trail, death, glow)
export function getCosmeticsByType(type) {
    return Object.entries(COSMETIC_UNLOCKS)
        .filter(([key, item]) => item.category === type)
        .reduce((acc, [key, item]) => ({ ...acc, [key]: item }), {});
}

