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
        charger: 20,   // Charger →
        turret: 15,    // Turret ┼
        heavyTank: 20, // Heavy Tank █
        zippy: 20,     // Zippy ◐
        exploder: 25   // Exploder ◎
    },
    3: {
        mage: 20,        // Mage ✦
        shieldBearer: 15, // Shield Bearer ▓
        golem: 15,       // Golem ◼
        wraith: 15,      // Wraith ≈
        spawner: 15,     // Spawner ◔
        buffer: 20,      // Buffer ✚
        orbiter: 10      // Orbiter ◉ - Walks perimeter, explodes into shrapnel
    },
    4: {
        healer: 25,     // Healer ✛
        teleporter: 20, // Teleporter ◖
        freezer: 25,    // Freezer ❄
        leech: 30       // Leech ◗
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
function weightedRandom(weights) {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * total;
    
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
export function getRandomEnemyType(floor = 1) {
    const weights = ENEMY_SPAWN_WEIGHTS[floor] || getDefaultWeights();
    return weightedRandom(weights);
}


