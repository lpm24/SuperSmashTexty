/**
 * Boss Type Definitions
 *
 * All boss types and their properties.
 * Bosses have armor/shield systems and higher stats than regular enemies.
 */

export const BOSS_TYPES = {
    gatekeeper: {
        coreChar: 'GG',
        armorChar: '[]',
        shieldChar: '{}',
        color: [255, 50, 50], // Red
        armorColor: [200, 200, 200], // Gray/white for armor
        shieldColor: [100, 200, 255], // Light blue for shields
        baseHealth: 500,
        baseArmorHealth: 125, // 100-150 range, using middle
        baseShieldHealth: 0, // No shields by default
        baseSpeed: 70, // 60-80 range, using middle
        size: 28,
        baseXPValue: 125, // 100-150 range
        damageReduction: 0.3, // 30% damage reduction when armor is active
        shieldRegenRate: 0, // HP per second (0 = no regen)
    },
    swarmQueen: {
        coreChar: 'QQ',
        armorChar: '[]',
        shieldChar: '{}',
        color: [200, 100, 255], // Purple
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255], // Light blue for shields
        baseHealth: 800,
        baseArmorHealth: 175, // 150-200 range
        baseShieldHealth: 0, // No shields by default
        baseSpeed: 50, // 40-60 range
        size: 28,
        baseXPValue: 250, // 200-300 range
        damageReduction: 0.35, // 35% damage reduction
        shieldRegenRate: 0, // HP per second (0 = no regen)
    },
    twinGuardianMelee: {
        coreChar: '▶',
        armorChar: '[]',
        shieldChar: '{}',
        color: [255, 50, 50], // Red
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255], // Light blue for shields
        baseHealth: 600,
        baseArmorHealth: 125,
        baseShieldHealth: 0, // No shields by default
        baseSpeed: 110, // Faster, aggressive
        size: 28,
        baseXPValue: 175, // Half of total (350/2)
        damageReduction: 0.3,
        meleeDamage: 22, // 20-25 range, using middle
        shieldRegenRate: 0, // HP per second (0 = no regen)
    },
    twinGuardianRanged: {
        coreChar: '◈',
        armorChar: '[]',
        shieldChar: '{}',
        color: [100, 150, 255], // Blue
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255], // Light blue for shields
        baseHealth: 600,
        baseArmorHealth: 125,
        baseShieldHealth: 0, // No shields by default
        baseSpeed: 70, // 60-80 range, slower, maintains distance
        size: 28,
        baseXPValue: 175, // Half of total (350/2)
        damageReduction: 0.3,
        projectileDamage: 13, // 12-15 range, using middle
        projectileSpeed: 250,
        fireRate: 1.0, // Shots per second
        shieldRegenRate: 0, // HP per second (0 = no regen)
    }
};

/**
 * Get boss definition by type key
 * @param {string} type - Boss type key
 * @returns {object} Boss configuration
 */
export function getBossDefinition(type) {
    return BOSS_TYPES[type] || BOSS_TYPES.gatekeeper;
}

/**
 * Get all boss types
 * @returns {Array<string>} Array of boss type keys
 */
export function getAllBossTypes() {
    return Object.keys(BOSS_TYPES);
}
