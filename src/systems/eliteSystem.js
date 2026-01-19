/**
 * Elite Enemy System
 *
 * Handles elite enemy modifiers:
 * - Swift: Yellow tint, +50% speed
 * - Armored: Blue tint, +100% HP, 25% damage reduction
 * - Vampiric: Red tint, heals 10 HP on hitting player
 *
 * Elite spawn chance: 10-15% on floor 2+
 */

// Elite modifier definitions
export const ELITE_MODIFIERS = {
    swift: {
        name: 'Swift',
        prefix: '⚡',
        color: [255, 255, 100], // Yellow tint
        apply: (enemy) => {
            enemy.speed = Math.floor(enemy.speed * 1.5); // +50% speed
        }
    },
    armored: {
        name: 'Armored',
        prefix: '◆',
        color: [100, 150, 255], // Blue tint
        apply: (enemy) => {
            // +100% HP
            enemy.maxHealth = Math.floor(enemy.maxHealth * 2);
            enemy.setHP(enemy.maxHealth);
            // +25% damage reduction
            enemy.damageReduction = (enemy.damageReduction || 0) + 0.25;
        }
    },
    vampiric: {
        name: 'Vampiric',
        prefix: '♦',
        color: [255, 100, 100], // Red tint
        apply: (enemy) => {
            // Mark as vampiric - heals on hit
            enemy.isVampiric = true;
            enemy.vampiricHealAmount = 10;
        }
    }
};

// Elite spawn configuration by floor
const ELITE_CONFIG = {
    2: { spawnChance: 0.10 }, // 10% chance on floor 2
    3: { spawnChance: 0.12 }, // 12% chance on floor 3
    4: { spawnChance: 0.15 }  // 15% chance on floor 4+
};

/**
 * Check if an enemy should be elite based on floor
 * @param {number} floor - Current floor number
 * @param {object} rng - Optional seeded RNG for multiplayer sync
 * @returns {boolean} Whether the enemy should be elite
 */
export function shouldSpawnElite(floor, rng = null) {
    if (floor < 2) return false; // No elites on floor 1

    const config = ELITE_CONFIG[floor] || ELITE_CONFIG[4]; // Default to floor 4+ config
    const roll = rng ? rng.next() : Math.random();

    return roll < config.spawnChance;
}

/**
 * Get a random elite modifier
 * @param {object} rng - Optional seeded RNG for multiplayer sync
 * @returns {string} Elite modifier key
 */
export function getRandomEliteModifier(rng = null) {
    const modifiers = Object.keys(ELITE_MODIFIERS);
    const roll = rng ? rng.next() : Math.random();
    const index = Math.floor(roll * modifiers.length);

    return modifiers[index];
}

/**
 * Apply elite modifier to an enemy
 * @param {object} k - KAPLAY instance
 * @param {object} enemy - Enemy entity
 * @param {string} modifierKey - Elite modifier key
 */
export function applyEliteModifier(k, enemy, modifierKey) {
    const modifier = ELITE_MODIFIERS[modifierKey];
    if (!modifier) return;

    // Mark as elite
    enemy.isElite = true;
    enemy.eliteModifier = modifierKey;

    // Apply stat changes
    modifier.apply(enemy);

    // Update visual - add prefix and change color
    const newChar = `${modifier.prefix}${enemy.coreChar}`;
    enemy.coreChar = newChar;
    enemy.text = newChar;

    // Update color
    enemy.originalColor = modifier.color;
    enemy.color = k.rgb(...modifier.color);

    // Increase XP value for elites (+50%)
    enemy.xpValue = Math.floor(enemy.xpValue * 1.5);

    // Update visual
    if (enemy.updateVisual) {
        enemy.updateVisual();
    }
}

/**
 * Create an elite enemy (combines shouldSpawnElite check and application)
 * @param {object} k - KAPLAY instance
 * @param {object} enemy - Enemy entity
 * @param {number} floor - Current floor number
 * @param {object} rng - Optional seeded RNG for multiplayer sync
 * @returns {boolean} Whether the enemy became elite
 */
export function tryMakeElite(k, enemy, floor, rng = null) {
    // Never make bosses elite - they're already powerful enough
    if (enemy.isBoss || enemy.isBossEnemy) {
        return false;
    }

    if (!shouldSpawnElite(floor, rng)) {
        return false;
    }

    const modifierKey = getRandomEliteModifier(rng);
    applyEliteModifier(k, enemy, modifierKey);

    return true;
}
