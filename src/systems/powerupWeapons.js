/**
 * Powerup Weapon System
 *
 * Handles temporary weapon powerups that drop during gameplay:
 * - Limited ammo or timed duration
 * - More powerful than starting weapons
 * - Reverts to starting weapon when depleted
 */

import { WEAPON_DEFINITIONS } from '../data/weapons.js';

// Powerup weapon definitions
export const POWERUP_WEAPONS = {
    orbital: {
        weaponKey: 'orbital',
        name: 'Orbital Weapons',
        duration: 30, // seconds
        isTimeBased: true,
        dropChance: 0.15, // 15% chance from enemies
        icon: '◎',
        color: [100, 200, 255]
    },
    explosive: {
        weaponKey: 'explosive',
        name: 'Explosive Launcher',
        ammo: 20, // number of shots
        isAmmoBased: true,
        dropChance: 0.12, // 12% chance from enemies
        icon: '◉',
        color: [255, 100, 50]
    },
    chainLightning: {
        weaponKey: 'chainLightning',
        name: 'Chain Lightning',
        ammo: 25, // number of shots
        isAmmoBased: true,
        dropChance: 0.12, // 12% chance from enemies
        icon: '⚡',
        color: [255, 255, 100]
    }
};

/**
 * Check if enemy should drop powerup weapon
 * @param {string} enemyType - Type of enemy killed
 * @param {number} floor - Current floor
 * @returns {string|null} - Powerup weapon key or null
 */
export function rollPowerupDrop(enemyType, floor = 1) {
    // Only drop from tougher enemies
    const eligibleEnemies = ['heavyTank', 'golem', 'shieldBearer', 'spawner', 'mage'];

    if (!eligibleEnemies.includes(enemyType)) {
        return null;
    }

    // Increased chance on higher floors
    const floorMultiplier = 1 + (floor - 1) * 0.1;

    for (const [key, powerup] of Object.entries(POWERUP_WEAPONS)) {
        const adjustedChance = powerup.dropChance * floorMultiplier;
        if (Math.random() < adjustedChance) {
            return key;
        }
    }

    return null;
}

/**
 * Apply powerup weapon to player
 * @param {object} player - Player entity
 * @param {string} powerupKey - Powerup weapon key
 */
export function applyPowerupWeapon(player, powerupKey) {
    const powerup = POWERUP_WEAPONS[powerupKey];
    if (!powerup) return;

    const weaponDef = WEAPON_DEFINITIONS[powerup.weaponKey];
    if (!weaponDef) return;

    // Store original weapon state
    if (!player.originalWeapon) {
        player.originalWeapon = {
            weaponKey: player.weaponKey,
            weaponDef: player.weaponDef,
            fireRate: player.fireRate,
            projectileSpeed: player.projectileSpeed,
            projectileDamage: player.projectileDamage,
            projectileCount: player.projectileCount,
            piercing: player.piercing,
            obstaclePiercing: player.obstaclePiercing,
            critChance: player.critChance,
            critDamage: player.critDamage,
            spreadAngle: player.spreadAngle,
            weaponRange: player.weaponRange,
            weaponCategory: player.weaponCategory
        };

        // Store weapon-specific properties if they exist
        if (player.orbitRadius) player.originalWeapon.orbitRadius = player.orbitRadius;
        if (player.rotationSpeed) player.originalWeapon.rotationSpeed = player.rotationSpeed;
        if (player.explosionRadius) player.originalWeapon.explosionRadius = player.explosionRadius;
        if (player.explosionDamage) player.originalWeapon.explosionDamage = player.explosionDamage;
        if (player.chainRange) player.originalWeapon.chainRange = player.chainRange;
        if (player.maxJumps) player.originalWeapon.maxJumps = player.maxJumps;
        if (player.chainDamageReduction) player.originalWeapon.chainDamageReduction = player.chainDamageReduction;
    }

    // Apply powerup weapon
    player.powerupWeapon = powerupKey;
    player.weaponKey = powerup.weaponKey;
    player.weaponDef = weaponDef;

    // Apply weapon stats (don't use upgrade multipliers for powerups)
    player.fireRate = weaponDef.fireRate;
    player.projectileSpeed = weaponDef.projectileSpeed;
    player.projectileDamage = weaponDef.baseDamage;
    player.projectileCount = weaponDef.projectileCount;
    player.piercing = weaponDef.piercing;
    player.obstaclePiercing = weaponDef.obstaclePiercing;
    player.critChance = weaponDef.critChance;
    player.critDamage = weaponDef.critDamage;
    player.spreadAngle = weaponDef.spreadAngle;
    player.weaponRange = weaponDef.range;
    player.weaponCategory = weaponDef.category;

    // Apply weapon-specific properties
    if (weaponDef.orbitRadius) {
        player.orbitRadius = weaponDef.orbitRadius;
        player.rotationSpeed = weaponDef.rotationSpeed;
        player.orbitalOrbs = [];
        player.orbitalAngles = [];
        player.orbitalNeedsReinit = true;
    }
    if (weaponDef.explosionRadius) {
        player.explosionRadius = weaponDef.explosionRadius;
        player.explosionDamage = weaponDef.explosionDamage;
    }
    if (weaponDef.chainRange) {
        player.chainRange = weaponDef.chainRange;
        player.maxJumps = weaponDef.maxJumps;
        player.chainDamageReduction = weaponDef.chainDamageReduction;
    }

    // Set ammo or duration
    if (powerup.isAmmoBased) {
        player.powerupAmmo = powerup.ammo;
        player.powerupDuration = null;
    } else if (powerup.isTimeBased) {
        player.powerupDuration = powerup.duration;
        player.powerupAmmo = null;
    }
}

/**
 * Restore player's original weapon
 * @param {object} player - Player entity
 */
export function restoreOriginalWeapon(player) {
    if (!player.originalWeapon) return;

    const original = player.originalWeapon;

    // Restore weapon state
    player.weaponKey = original.weaponKey;
    player.weaponDef = original.weaponDef;
    player.fireRate = original.fireRate;
    player.projectileSpeed = original.projectileSpeed;
    player.projectileDamage = original.projectileDamage;
    player.projectileCount = original.projectileCount;
    player.piercing = original.piercing;
    player.obstaclePiercing = original.obstaclePiercing;
    player.critChance = original.critChance;
    player.critDamage = original.critDamage;
    player.spreadAngle = original.spreadAngle;
    player.weaponRange = original.weaponRange;
    player.weaponCategory = original.weaponCategory;

    // Restore weapon-specific properties
    if (original.orbitRadius) player.orbitRadius = original.orbitRadius;
    if (original.rotationSpeed) player.rotationSpeed = original.rotationSpeed;
    if (original.explosionRadius) player.explosionRadius = original.explosionRadius;
    if (original.explosionDamage) player.explosionDamage = original.explosionDamage;
    if (original.chainRange) player.chainRange = original.chainRange;
    if (original.maxJumps) player.maxJumps = original.maxJumps;
    if (original.chainDamageReduction) player.chainDamageReduction = original.chainDamageReduction;

    // Clean up orbital weapons if switching away from orbital
    if (player.weaponKey !== 'orbital' && player.orbitalOrbs) {
        player.orbitalOrbs = [];
        player.orbitalAngles = [];
    }

    // Clear powerup state
    player.powerupWeapon = null;
    player.powerupAmmo = null;
    player.powerupDuration = null;
    player.originalWeapon = null;
}

/**
 * Update powerup weapon state (called each shot for ammo-based, or each frame for time-based)
 * @param {object} player - Player entity
 * @param {number} dt - Delta time (for time-based powerups)
 * @returns {boolean} - True if powerup expired
 */
export function updatePowerupWeapon(player, dt = 0) {
    if (!player.powerupWeapon) return false;

    const powerup = POWERUP_WEAPONS[player.powerupWeapon];
    if (!powerup) return false;

    // Update ammo-based powerups
    if (powerup.isAmmoBased && player.powerupAmmo !== null) {
        if (player.powerupAmmo <= 0) {
            restoreOriginalWeapon(player);
            return true;
        }
    }

    // Update time-based powerups
    if (powerup.isTimeBased && player.powerupDuration !== null) {
        player.powerupDuration -= dt;
        if (player.powerupDuration <= 0) {
            restoreOriginalWeapon(player);
            return true;
        }
    }

    return false;
}

/**
 * Decrement powerup ammo (call when player fires)
 * @param {object} player - Player entity
 */
export function decrementPowerupAmmo(player) {
    if (!player.powerupWeapon) return;

    const powerup = POWERUP_WEAPONS[player.powerupWeapon];
    if (powerup && powerup.isAmmoBased && player.powerupAmmo !== null) {
        player.powerupAmmo = Math.max(0, player.powerupAmmo - 1);
    }
}

/**
 * Get powerup weapon display info
 * @param {object} player - Player entity
 * @returns {object|null} - Display info or null
 */
export function getPowerupDisplay(player) {
    if (!player.powerupWeapon) return null;

    const powerup = POWERUP_WEAPONS[player.powerupWeapon];
    if (!powerup) return null;

    return {
        name: powerup.name,
        icon: powerup.icon,
        color: powerup.color,
        ammo: player.powerupAmmo,
        duration: player.powerupDuration,
        isAmmoBased: powerup.isAmmoBased,
        isTimeBased: powerup.isTimeBased
    };
}
