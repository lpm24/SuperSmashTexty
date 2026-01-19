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
        name: 'Security Guard',
        char: '▶', // Right-pointing triangle
        color: [255, 150, 100],
        baseHealth: 25, // 20-30 range
        baseSpeed: 90, // 80-100 range
        size: 18,
        baseXPValue: 2, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 9 // 8-10 range
    },
    shooter: {
        name: 'Camera Operator',
        char: '◈', // White diamond containing black small diamond
        color: [100, 200, 255],
        baseHealth: 30, // 25-35 range
        baseSpeed: 70, // 60-80 range
        size: 18,
        baseXPValue: 2, // Reduced by 3x for balance
        behavior: 'shoot',
        fireRate: 0.53, // Shots per second (reduced by 1/3 from 0.8)
        projectileSpeed: 200,
        projectileDamage: 7 // 6-8 range
    },
    zombie: {
        name: 'Audience Member',
        char: '☠', // Skull and crossbones
        color: [150, 150, 150],
        baseHealth: 45, // 40-50 range
        baseSpeed: 50, // 40-60 range
        size: 20,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 11 // 10-12 range
    },
    slime: {
        name: 'Fan',
        char: '●', // Black circle
        color: [100, 255, 100],
        baseHealth: 12, // 10-15 range
        baseSpeed: 40, // 30-50 range
        size: 16,
        baseXPValue: 1, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 5,
        splits: true // Splits on death
    },
    bat: {
        name: 'Stagehand',
        char: '▼', // Black down triangle
        color: [200, 150, 255],
        baseHealth: 10, // 8-12 range
        baseSpeed: 135, // 120-150 range
        size: 14,
        baseXPValue: 2, // Reduced by 3x for balance
        behavior: 'erratic',
        damage: 6 // 5-7 range
    },

    // =================================================================
    // FLOOR 2 ENEMIES
    // =================================================================
    charger: {
        name: 'Head of Security',
        char: '→', // Right arrow
        color: [255, 200, 100],
        baseHealth: 20, // 15-25 range
        baseSpeed: 175, // 150-200 range (charge speed)
        size: 18,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'charge',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 17, // 15-20 range
        chargeCooldown: 3 // Seconds between charges
    },
    turret: {
        name: 'Camera Director',
        char: '┼', // Box drawing cross
        color: [200, 200, 200],
        baseHealth: 60, // 50-70 range
        baseSpeed: 0, // Stationary
        size: 20,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'turret',
        fireRate: 1.2, // Shots per second
        projectileSpeed: 250,
        projectileDamage: 13 // 12-15 range
    },
    heavyTank: {
        name: 'Bouncer',
        char: '█', // Full block
        color: [150, 150, 255],
        baseHealth: 125, // 100-150 range
        baseSpeed: 40, // 30-50 range
        size: 24,
        baseXPValue: 5, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 22 // 20-25 range
    },
    zippy: {
        name: 'Runner',
        char: '◐', // Circle with left half black
        color: [255, 255, 150],
        baseHealth: 7, // 5-10 range
        baseSpeed: 200, // 180-220 range
        size: 14,
        baseXPValue: 2, // Reduced by 3x for balance
        behavior: 'erratic',
        damage: 5 // 4-6 range
    },
    exploder: {
        name: 'Pyrotechnics Tech',
        char: '◎', // Bullseye
        color: [255, 100, 50],
        baseHealth: 25, // 20-30 range
        baseSpeed: 80, // 70-90 range
        size: 18,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart',
        damage: 8,
        explodes: true, // Explodes on death
        explosionDamage: 17, // 15-20 range
        explosionRadius: 60 // Pixels
    },
    orbiter: {
        name: 'Floor Manager',
        char: '◉', // Fisheye
        color: [255, 150, 0],
        baseHealth: 35, // Slightly tankier
        baseSpeed: 60, // Slower, methodical movement
        size: 20,
        baseXPValue: 4, // Reduced by 3x for balance
        behavior: 'perimeter', // Walks around edge of map
        pathfindingMode: 'perimeter',
        damage: 10,
        explodes: true, // Explodes into shrapnel
        explosionDamage: 20,
        explosionRadius: 80,
        shrapnel: true, // Shoots projectiles in all directions on death
        shrapnelCount: 12 // Number of projectiles
    },
    splitter: {
        name: 'Intern',
        char: '◇', // White diamond
        color: [200, 255, 200],
        baseHealth: 40, // 35-45 range
        baseSpeed: 75, // 70-80 range
        size: 20,
        baseXPValue: 3,
        behavior: 'rush',
        pathfindingMode: 'smart',
        damage: 8,
        splits: true, // Splits into 2 smaller copies on death
        splitCount: 2
    },

    // =================================================================
    // FLOOR 3 ENEMIES
    // =================================================================
    mage: {
        name: 'Lighting Director',
        char: '✦', // Four-pointed star
        color: [200, 100, 255],
        baseHealth: 70, // 60-80 range
        baseSpeed: 50, // 40-60 range
        size: 20,
        baseXPValue: 4, // Reduced by 3x for balance
        behavior: 'shoot',
        fireRate: 0.6, // Slower but more powerful
        projectileSpeed: 180,
        projectileDamage: 12 // 10-15 range
    },
    shieldBearer: {
        name: 'Stage Manager',
        char: '▓', // Dark shade
        color: [150, 150, 200],
        baseHealth: 90, // 80-100 range
        baseSpeed: 40, // 30-50 range
        size: 22,
        baseXPValue: 5, // Reduced by 3x for balance
        behavior: 'shield',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 15,
        blocksProjectiles: true // Blocks from front (simplified for now)
    },
    golem: {
        name: 'Set Designer',
        char: '◼', // Black medium square
        color: [100, 100, 100],
        baseHealth: 250, // 200-300 range
        baseSpeed: 30, // 20-40 range
        size: 26,
        baseXPValue: 7, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 30 // 25-35 range
    },
    wraith: {
        name: 'Editor',
        char: '≈', // Almost equal (wave)
        color: [150, 150, 255],
        baseHealth: 20, // 15-25 range
        baseSpeed: 225, // 200-250 range
        size: 16,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'teleport',
        damage: 13, // 12-15 range
        teleportCooldown: 4, // Seconds between teleports
        teleportRange: 150 // Teleport distance
    },
    spawner: {
        name: 'Casting Director',
        char: '◔', // Circle with upper right quadrant black
        color: [255, 150, 100],
        baseHealth: 80, // 70-90 range
        baseSpeed: 40, // 30-50 range
        size: 20,
        baseXPValue: 5, // Reduced by 3x for balance
        behavior: 'spawner',
        damage: 8,
        spawnInterval: 6, // Spawn every 6 seconds
        spawnType: 'rusher' // Spawns basic rushers
    },
    buffer: {
        name: 'Assistant Director',
        char: '✚', // Heavy plus
        color: [255, 200, 100],
        baseHealth: 35, // 30-40 range
        baseSpeed: 50, // 40-60 range
        size: 18,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'buffer',
        damage: 6,
        buffRadius: 100, // Buffs enemies within this radius
        buffAmount: 0.2 // +20% speed and damage
    },
    phaser: {
        name: 'Ghost Writer',
        char: '◌', // Dotted circle
        color: [180, 180, 255],
        baseHealth: 25, // 20-30 range
        baseSpeed: 100, // 90-110 range
        size: 18,
        baseXPValue: 3,
        behavior: 'phase',
        pathfindingMode: 'none', // Phases through obstacles, no pathfinding needed
        damage: 10,
        phaseOpacity: 0.5, // Semi-transparent
        phaseThroughObstacles: true // Can move through obstacles
    },
    mimic: {
        name: 'Stunt Double',
        char: '@', // Same as player
        color: [255, 100, 100],
        baseHealth: 35, // 30-40 range
        baseSpeed: 150, // Matches player speed
        size: 18,
        baseXPValue: 4,
        behavior: 'mimic',
        pathfindingMode: 'none',
        damage: 12,
        mimicDuration: 2.0, // Seconds to copy player movement
        mimicCooldown: 4.0 // Seconds between mimic attempts
    },

    // =================================================================
    // FLOOR 4 ENEMIES
    // =================================================================
    healer: {
        name: 'Producer',
        char: '✛', // Open center cross
        color: [100, 255, 150],
        baseHealth: 70, // 60-80 range
        baseSpeed: 40, // 30-50 range
        size: 20,
        baseXPValue: 4, // Reduced by 3x for balance
        behavior: 'healer',
        damage: 8,
        healRadius: 120, // Heals enemies within this radius
        healAmount: 12, // 10-15 range
        healInterval: 4 // Heal every 4 seconds
    },
    teleporter: {
        name: 'Executive Producer',
        char: '◖', // Left half black circle
        color: [200, 150, 255],
        baseHealth: 25, // 20-30 range
        baseSpeed: 90, // 80-100 range
        size: 18,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'teleportPlayer',
        damage: 8,
        teleportRange: 200, // Teleport player this distance
        teleportCooldown: 5 // Seconds between teleports
    },
    freezer: {
        name: 'Network Executive',
        char: '❄', // Snowflake
        color: [150, 200, 255],
        baseHealth: 60, // 50-70 range
        baseSpeed: 50, // 40-60 range
        size: 20,
        baseXPValue: 4, // Reduced by 3x for balance
        behavior: 'freeze',
        damage: 10,
        slowRadius: 80, // Slows player within this radius
        slowAmount: 0.4 // -40% speed
    },
    leech: {
        name: 'Talent Agent',
        char: '◗', // Right half black circle
        color: [255, 100, 150],
        baseHealth: 30, // 25-35 range
        baseSpeed: 80, // 70-90 range
        size: 18,
        baseXPValue: 3, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 8,
        lifesteal: 7 // 5-10 range, heals this much on hit
    },
    reflector: {
        name: 'Mirror Master',
        char: '◈', // Diamond with dot
        color: [200, 200, 255],
        baseHealth: 80, // 70-90 range
        baseSpeed: 45, // 40-50 range
        size: 22,
        baseXPValue: 5,
        behavior: 'shield',
        pathfindingMode: 'smart',
        damage: 12,
        reflectsProjectiles: true, // Reflects projectiles back at player
        reflectChance: 0.4 // 40% chance to reflect
    },
    bomber: {
        name: 'Demolitions Expert',
        char: '◆', // Black diamond
        color: [255, 150, 100],
        baseHealth: 70, // 60-80 range
        baseSpeed: 0, // Stationary
        size: 22,
        baseXPValue: 5,
        behavior: 'bomber',
        fireRate: 0.4, // Launches a bomb every 2.5 seconds
        projectileSpeed: 100, // Slow moving bombs
        projectileDamage: 20,
        homingStrength: 0.5, // How strongly bombs home in on player
        bombExplosionRadius: 50 // Explosion radius when bomb hits
    },

    // =================================================================
    // LEGACY TYPES (for backwards compatibility)
    // =================================================================
    basic: {
        name: 'Crew Member',
        char: 'E',
        color: [255, 100, 100],
        baseHealth: 30,
        baseSpeed: 50,
        size: 20,
        baseXPValue: 2, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 8
    },
    tank: {
        name: 'Camera Operator',
        char: '█', // Full block (same as heavyTank)
        color: [150, 150, 255],
        baseHealth: 80,
        baseSpeed: 30,
        size: 24,
        baseXPValue: 4, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
        damage: 20
    },
    fast: {
        name: 'Runner',
        char: 'F',
        color: [255, 255, 100],
        baseHealth: 20,
        baseSpeed: 90,
        size: 16,
        baseXPValue: 2, // Reduced by 3x for balance
        behavior: 'rush',
        pathfindingMode: 'smart', // Uses A* pathfinding
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
    const floor2 = ['charger', 'turret', 'heavyTank', 'zippy', 'exploder', 'splitter'];
    const floor3 = ['mage', 'shieldBearer', 'golem', 'wraith', 'spawner', 'buffer', 'phaser', 'mimic'];
    const floor4 = ['healer', 'teleporter', 'freezer', 'leech', 'reflector', 'bomber'];

    if (floor === 1) return floor1;
    if (floor === 2) return [...floor1, ...floor2];
    if (floor === 3) return [...floor2, ...floor3];
    if (floor >= 4) return [...floor3, ...floor4];

    return floor1; // Default to floor 1
}
