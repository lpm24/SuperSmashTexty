// Enemy spawn system - handles weighted random enemy selection

// Enemy spawn weights by floor
const ENEMY_SPAWN_WEIGHTS = {
    1: {
        basic: 50,
        rusher: 30,
        tank: 15,
        fast: 5
    },
    2: {
        basic: 30,
        rusher: 35,
        tank: 20,
        fast: 15
    },
    3: {
        basic: 20,
        rusher: 30,
        tank: 25,
        fast: 25
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

