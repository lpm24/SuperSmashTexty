/**
 * Enemy Spawn System
 *
 * Handles enemy selection and spawning logic:
 * - Weighted random selection based on floor
 * - Floor-specific enemy pools (5 per floor)
 * - Progressive difficulty (enemies get harder each floor)
 * - Balanced variety within each floor
 * - Mix of different enemy types and behaviors
 */

// Enemy spawn weights by floor
// Each floor has 5 enemy types with different weights
const ENEMY_SPAWN_WEIGHTS = {
    1: {
        rusher: 25,    // Basic Rusher ▶
        shooter: 20,   // Basic Shooter ◈
        zombie: 20,    // Zombie ☠
        slime: 15,     // Slime ●
        bat: 20        // Bat ▼
    },
    2: {
        charger: 18,   // Charger →
        turret: 12,    // Turret ┼
        heavyTank: 18, // Heavy Tank █
        zippy: 18,     // Zippy ◐
        exploder: 20,  // Exploder ◎
        splitter: 14   // Intern ◇ - Splits into 2 smaller copies on death
    },
    3: {
        mage: 15,        // Mage ✦
        shieldBearer: 12, // Shield Bearer ▓
        golem: 12,       // Golem ◼
        wraith: 12,      // Wraith ≈
        spawner: 12,     // Spawner ◔
        buffer: 15,      // Buffer ✚
        orbiter: 7,      // Orbiter ◉ - Walks perimeter, explodes into shrapnel
        phaser: 8,       // Ghost Writer ◌ - Phases through obstacles
        mimic: 7         // Stunt Double @ - Copies player movement
    },
    4: {
        healer: 18,     // Healer ✛
        teleporter: 15, // Teleporter ◖
        freezer: 18,    // Freezer ❄
        leech: 20,      // Leech ◗
        reflector: 14,  // Mirror Master ◈ - Reflects projectiles
        bomber: 15      // Demolitions Expert ◆ - Launches homing bombs
    }
};

// Get default weights for floors beyond defined
function getDefaultWeights() {
    return {
        basic: 15,
        rusher: 25,
        tank: 30,
        fast: 30
    };
}

// Weighted random selection
function weightedRandom(weights, rng = null) {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    // Use seeded RNG if provided (for multiplayer sync), otherwise Math.random
    let random = (rng ? rng.next() : Math.random()) * total;

    for (const [type, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) {
            return type;
        }
    }

    // Fallback (shouldn't happen)
    return Object.keys(weights)[0];
}

// Get random enemy type for a given floor
// Pass rng parameter for multiplayer to ensure consistent spawns across clients
export function getRandomEnemyType(floor = 1, rng = null) {
    const weights = ENEMY_SPAWN_WEIGHTS[floor] || getDefaultWeights();
    return weightedRandom(weights, rng);
}


