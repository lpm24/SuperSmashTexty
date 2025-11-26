/**
 * Miniboss Type Definitions
 *
 * Scaled-down bosses that appear randomly in rooms.
 * Minibosses have armor/shield systems but lower stats than full bosses.
 */

export const MINIBOSS_TYPES = {
    brute: {
        name: 'Security Chief',
        coreChar: 'B',
        armorChar: '[]',
        shieldChar: '{}',
        color: [255, 100, 50], // Orange-red
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255],
        baseHealth: 200,
        baseArmorHealth: 50,
        baseShieldHealth: 0,
        baseSpeed: 60,
        size: 24,
        baseXPValue: 50,
        damageReduction: 0.25,
        shieldRegenRate: 0,
        meleeDamage: 18,
        behavior: 'charge' // Charges at player periodically
    },
    sentinel: {
        name: 'Technical Director',
        coreChar: 'S',
        armorChar: '[]',
        shieldChar: '{}',
        color: [100, 200, 255], // Light blue
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255],
        baseHealth: 180,
        baseArmorHealth: 40,
        baseShieldHealth: 30, // Has shields
        baseSpeed: 50,
        size: 24,
        baseXPValue: 45,
        damageReduction: 0.2,
        shieldRegenRate: 2, // 2 HP/sec regen
        projectileDamage: 12,
        projectileSpeed: 250,
        fireRate: 1.2,
        behavior: 'shoot' // Ranged attacker
    },
    berserker: {
        name: 'Stunt Coordinator',
        coreChar: 'Z',
        armorChar: '[]',
        shieldChar: '{}',
        color: [255, 50, 50], // Red
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255],
        baseHealth: 250,
        baseArmorHealth: 0,
        baseShieldHealth: 0,
        baseSpeed: 80, // Fast
        size: 24,
        baseXPValue: 55,
        damageReduction: 0,
        shieldRegenRate: 0,
        meleeDamage: 20,
        behavior: 'rush' // Fast, aggressive
    },
    guardian: {
        name: 'Studio Manager',
        coreChar: 'G',
        armorChar: '[]',
        shieldChar: '{}',
        color: [150, 150, 255], // Light purple
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255],
        baseHealth: 220,
        baseArmorHealth: 60, // Heavy armor
        baseShieldHealth: 0,
        baseSpeed: 40, // Slow
        size: 24,
        baseXPValue: 50,
        damageReduction: 0.3,
        shieldRegenRate: 0,
        meleeDamage: 16,
        behavior: 'rush' // Tanky, slow
    },
    warlock: {
        name: 'Creative Director',
        coreChar: 'W',
        armorChar: '[]',
        shieldChar: '{}',
        color: [200, 100, 255], // Purple
        armorColor: [200, 200, 200],
        shieldColor: [100, 200, 255],
        baseHealth: 160,
        baseArmorHealth: 0,
        baseShieldHealth: 40, // Has shields
        baseSpeed: 55,
        size: 24,
        baseXPValue: 48,
        damageReduction: 0,
        shieldRegenRate: 3, // 3 HP/sec regen
        projectileDamage: 14,
        projectileSpeed: 220,
        fireRate: 1.0,
        behavior: 'shoot' // Ranged with shields
    }
};

/**
 * Get miniboss definition by type key
 * @param {string} type - Miniboss type key
 * @returns {object} Miniboss configuration
 */
export function getMinibossDefinition(type) {
    return MINIBOSS_TYPES[type] || MINIBOSS_TYPES.brute;
}

/**
 * Get all miniboss types
 * @returns {Array<string>} Array of miniboss type keys
 */
export function getAllMinibossTypes() {
    return Object.keys(MINIBOSS_TYPES);
}
