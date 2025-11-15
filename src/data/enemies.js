/**
 * Enemy Type Definitions
 *
 * All enemy types and their properties.
 * Extracted from enemy.js for better organization and maintainability.
 */

export const ENEMY_TYPES = {
    // =================================================================
    // FLOOR 1 ENEMIES
    // =================================================================
    rusher: {
        char: '▶', // Right-pointing triangle
        color: [255, 150, 100],
        baseHealth: 25, // 20-30 range
        baseSpeed: 90, // 80-100 range
        size: 18,
        baseXPValue: 6,
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 9 // 8-10 range
    },
    shooter: {
        char: '◈', // White diamond containing black small diamond
        color: [100, 200, 255],
        baseHealth: 30, // 25-35 range
        baseSpeed: 70, // 60-80 range
        size: 18,
        baseXPValue: 7,
        behavior: 'shoot',
        fireRate: 0.8, // Shots per second
        projectileSpeed: 200,
        projectileDamage: 7 // 6-8 range
    },
    zombie: {
        char: '☠', // Skull and crossbones
        color: [150, 150, 150],
        baseHealth: 45, // 40-50 range
        baseSpeed: 50, // 40-60 range
        size: 20,
        baseXPValue: 8,
        behavior: 'rush',
        damage: 11 // 10-12 range
    },
    slime: {
        char: '●', // Black circle
        color: [100, 255, 100],
        baseHealth: 12, // 10-15 range
        baseSpeed: 40, // 30-50 range
        size: 16,
        baseXPValue: 4,
        behavior: 'rush',
        damage: 5,
        splits: true // Splits on death
    },
    bat: {
        char: '▼', // Black down triangle
        color: [200, 150, 255],
        baseHealth: 10, // 8-12 range
        baseSpeed: 135, // 120-150 range
        size: 14,
        baseXPValue: 5,
        behavior: 'erratic',
        damage: 6 // 5-7 range
    },

    // =================================================================
    // FLOOR 2 ENEMIES
    // =================================================================
    charger: {
        char: '→', // Right arrow
        color: [255, 200, 100],
        baseHealth: 20, // 15-25 range
        baseSpeed: 175, // 150-200 range (charge speed)
        size: 18,
        baseXPValue: 8,
        behavior: 'charge',
        damage: 17, // 15-20 range
        chargeCooldown: 3 // Seconds between charges
    },
    turret: {
        char: '┼', // Box drawing cross
        color: [200, 200, 200],
        baseHealth: 60, // 50-70 range
        baseSpeed: 0, // Stationary
        size: 20,
        baseXPValue: 10,
        behavior: 'turret',
        fireRate: 1.2, // Shots per second
        projectileSpeed: 250,
        projectileDamage: 13 // 12-15 range
    },
    heavyTank: {
        char: '█', // Full block
        color: [150, 150, 255],
        baseHealth: 125, // 100-150 range
        baseSpeed: 40, // 30-50 range
        size: 24,
        baseXPValue: 15,
        behavior: 'rush',
        damage: 22 // 20-25 range
    },
    zippy: {
        char: '◐', // Circle with left half black
        color: [255, 255, 150],
        baseHealth: 7, // 5-10 range
        baseSpeed: 200, // 180-220 range
        size: 14,
        baseXPValue: 6,
        behavior: 'erratic',
        damage: 5 // 4-6 range
    },
    exploder: {
        char: '◎', // Bullseye
        color: [255, 100, 50],
        baseHealth: 25, // 20-30 range
        baseSpeed: 80, // 70-90 range
        size: 18,
        baseXPValue: 8,
        behavior: 'rush',
        pathfindingMode: 'smart',
        damage: 8,
        explodes: true, // Explodes on death
        explosionDamage: 17, // 15-20 range
        explosionRadius: 60 // Pixels
    },
    orbiter: {
        char: '◉', // Fisheye
        color: [255, 150, 0],
        baseHealth: 35, // Slightly tankier
        baseSpeed: 60, // Slower, methodical movement
        size: 20,
        baseXPValue: 12, // Higher reward for unique enemy
        behavior: 'perimeter', // Walks around edge of map
        pathfindingMode: 'perimeter',
        damage: 10,
        explodes: true, // Explodes into shrapnel
        explosionDamage: 20,
        explosionRadius: 80,
        shrapnel: true, // Shoots projectiles in all directions on death
        shrapnelCount: 12 // Number of projectiles
    },

    // =================================================================
    // FLOOR 3 ENEMIES
    // =================================================================
    mage: {
        char: '✦', // Four-pointed star
        color: [200, 100, 255],
        baseHealth: 70, // 60-80 range
        baseSpeed: 50, // 40-60 range
        size: 20,
        baseXPValue: 12,
        behavior: 'shoot',
        fireRate: 0.6, // Slower but more powerful
        projectileSpeed: 180,
        projectileDamage: 12 // 10-15 range
    },
    shieldBearer: {
        char: '▓', // Dark shade
        color: [150, 150, 200],
        baseHealth: 90, // 80-100 range
        baseSpeed: 40, // 30-50 range
        size: 22,
        baseXPValue: 14,
        behavior: 'shield',
        damage: 15,
        blocksProjectiles: true // Blocks from front (simplified for now)
    },
    golem: {
        char: '◼', // Black medium square
        color: [100, 100, 100],
        baseHealth: 250, // 200-300 range
        baseSpeed: 30, // 20-40 range
        size: 26,
        baseXPValue: 20,
        behavior: 'rush',
        damage: 30 // 25-35 range
    },
    wraith: {
        char: '≈', // Almost equal (wave)
        color: [150, 150, 255],
        baseHealth: 20, // 15-25 range
        baseSpeed: 225, // 200-250 range
        size: 16,
        baseXPValue: 10,
        behavior: 'teleport',
        damage: 13, // 12-15 range
        teleportCooldown: 4, // Seconds between teleports
        teleportRange: 150 // Teleport distance
    },
    spawner: {
        char: '◔', // Circle with upper right quadrant black
        color: [255, 150, 100],
        baseHealth: 80, // 70-90 range
        baseSpeed: 40, // 30-50 range
        size: 20,
        baseXPValue: 15,
        behavior: 'spawner',
        damage: 8,
        spawnInterval: 6, // Spawn every 6 seconds
        spawnType: 'rusher' // Spawns basic rushers
    },
    buffer: {
        char: '✚', // Heavy plus
        color: [255, 200, 100],
        baseHealth: 35, // 30-40 range
        baseSpeed: 50, // 40-60 range
        size: 18,
        baseXPValue: 10,
        behavior: 'buffer',
        damage: 6,
        buffRadius: 100, // Buffs enemies within this radius
        buffAmount: 0.2 // +20% speed and damage
    },

    // =================================================================
    // FLOOR 4 ENEMIES
    // =================================================================
    healer: {
        char: '✛', // Open center cross
        color: [100, 255, 150],
        baseHealth: 70, // 60-80 range
        baseSpeed: 40, // 30-50 range
        size: 20,
        baseXPValue: 12,
        behavior: 'healer',
        damage: 8,
        healRadius: 120, // Heals enemies within this radius
        healAmount: 12, // 10-15 range
        healInterval: 4 // Heal every 4 seconds
    },
    teleporter: {
        char: '◖', // Left half black circle
        color: [200, 150, 255],
        baseHealth: 25, // 20-30 range
        baseSpeed: 90, // 80-100 range
        size: 18,
        baseXPValue: 9,
        behavior: 'teleportPlayer',
        damage: 8,
        teleportRange: 200, // Teleport player this distance
        teleportCooldown: 5 // Seconds between teleports
    },
    freezer: {
        char: '❄', // Snowflake
        color: [150, 200, 255],
        baseHealth: 60, // 50-70 range
        baseSpeed: 50, // 40-60 range
        size: 20,
        baseXPValue: 11,
        behavior: 'freeze',
        damage: 10,
        slowRadius: 80, // Slows player within this radius
        slowAmount: 0.4 // -40% speed
    },
    leech: {
        char: '◗', // Right half black circle
        color: [255, 100, 150],
        baseHealth: 30, // 25-35 range
        baseSpeed: 80, // 70-90 range
        size: 18,
        baseXPValue: 9,
        behavior: 'rush',
        damage: 8,
        lifesteal: 7 // 5-10 range, heals this much on hit
    },

    // =================================================================
    // LEGACY TYPES (for backwards compatibility)
    // =================================================================
    basic: {
        char: 'E',
        color: [255, 100, 100],
        baseHealth: 30,
        baseSpeed: 50,
        size: 20,
        baseXPValue: 5,
        behavior: 'rush',
        damage: 8
    },
    tank: {
        char: '█', // Full block (same as heavyTank)
        color: [150, 150, 255],
        baseHealth: 80,
        baseSpeed: 30,
        size: 24,
        baseXPValue: 12,
        behavior: 'rush',
        damage: 20
    },
    fast: {
        char: 'F',
        color: [255, 255, 100],
        baseHealth: 20,
        baseSpeed: 90,
        size: 16,
        baseXPValue: 7,
        behavior: 'rush',
        damage: 6
    }
};

/**
 * Get enemy definition by type key
 * @param {string} type - Enemy type key
 * @returns {object} Enemy configuration
 */
export function getEnemyDefinition(type) {
    return ENEMY_TYPES[type] || ENEMY_TYPES.basic;
}

/**
 * Get all enemy types for a specific floor
 * @param {number} floor - Floor number
 * @returns {Array<string>} Array of enemy type keys for that floor
 */
export function getEnemiesForFloor(floor) {
    const floor1 = ['rusher', 'shooter', 'zombie', 'slime', 'bat'];
    const floor2 = ['charger', 'turret', 'heavyTank', 'zippy', 'exploder'];
    const floor3 = ['mage', 'shieldBearer', 'golem', 'wraith', 'spawner', 'buffer'];
    const floor4 = ['healer', 'teleporter', 'freezer', 'leech'];

    if (floor === 1) return floor1;
    if (floor === 2) return [...floor1, ...floor2];
    if (floor === 3) return [...floor2, ...floor3];
    if (floor >= 4) return [...floor3, ...floor4];

    return floor1; // Default to floor 1
}
