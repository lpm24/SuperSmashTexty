// Weapon definitions - defines all weapon types and their properties

export const WEAPON_DEFINITIONS = {
    pistol: {
        name: 'Basic Pistol',
        icon: '⌐', // Gun icon
        char: '•', // Bullet point
        color: [255, 255, 255],
        fireRate: 3.75, // Shots per second (2.5x multiplier)
        projectileSpeed: 300,
        baseDamage: 10,
        projectileCount: 1,
        spreadAngle: 0, // No spread
        piercing: 0,
        obstaclePiercing: 0,
        critChance: 0.05, // 5% base crit chance
        critDamage: 2.0, // 200% damage
        range: 600, // Medium range
        category: 'balanced', // balanced, rapid, spread, precision, area
        upgradeCategories: ['damage', 'fireRate', 'multiShot', 'piercing', 'crit'] // Available upgrade types
    },
    smg: {
        name: 'Rapid Fire SMG',
        icon: '▓', // Rapid fire icon
        char: '│', // Box drawing vertical
        color: [100, 200, 255],
        fireRate: 7.5, // Shots per second (2.5x multiplier)
        projectileSpeed: 350,
        baseDamage: 6,
        projectileCount: 1,
        spreadAngle: 0,
        piercing: 0,
        obstaclePiercing: 0,
        critChance: 0.05,
        critDamage: 2.0,
        range: 700, // Medium-long range
        category: 'rapid',
        upgradeCategories: ['damage', 'fireRate', 'multiShot', 'piercing', 'crit'] // Removed 'speed' (passive upgrade)
    },
    shotgun: {
        name: 'Spread Shotgun',
        icon: '╬', // Spread pattern icon
        char: '◦', // White bullet
        color: [255, 200, 100],
        fireRate: 2.0, // Shots per second (2.5x multiplier)
        projectileSpeed: 250,
        baseDamage: 8, // Per pellet
        projectileCount: 3, // 3-5 pellets
        spreadAngle: 35, // Degrees
        piercing: 0,
        obstaclePiercing: 0,
        critChance: 0.05,
        critDamage: 2.0,
        range: 400, // Short-medium range
        category: 'spread',
        upgradeCategories: ['damage', 'pelletCount', 'spread', 'fireRate', 'crit']
    },
    sniper: {
        name: 'Sniper Rifle',
        icon: '━', // Long barrel icon
        char: '→', // Arrow
        color: [100, 255, 255],
        fireRate: 1.0, // Very slow (2.5x multiplier)
        projectileSpeed: 500, // Very fast
        baseDamage: 20, // Very high
        projectileCount: 1,
        spreadAngle: 0,
        piercing: 1, // Passes through 1 enemy
        obstaclePiercing: 0,
        critChance: 0.05,
        critDamage: 2.5, // Higher crit damage
        range: 900, // Long range
        category: 'precision',
        upgradeCategories: ['damage', 'piercing', 'crit', 'fireRate', 'range']
    },
    flamethrower: {
        name: 'Flame Thrower',
        icon: '≋', // Flame wave icon
        char: '═', // Double line
        color: [255, 150, 50],
        fireRate: 12.5, // Continuous fire (ticks per second) (2.5x multiplier)
        projectileSpeed: 200,
        baseDamage: 8, // Per tick
        projectileCount: 1,
        spreadAngle: 15, // Small spread
        piercing: 0,
        obstaclePiercing: 0,
        critChance: 0.05,
        critDamage: 2.0,
        range: 150, // Short range
        category: 'area',
        upgradeCategories: ['damage', 'fireRate', 'range', 'spread', 'dot'] // DoT upgrades
    },
    orbital: {
        name: 'Orbital Weapons',
        icon: '◎', // Orbital icon
        char: '○', // White circle
        color: [100, 200, 255],
        fireRate: 0, // No firing - passive orbs
        projectileSpeed: 0,
        baseDamage: 12, // Per contact
        projectileCount: 1, // Starting orbs
        spreadAngle: 0,
        piercing: 0,
        obstaclePiercing: 0,
        critChance: 0,
        critDamage: 1.0,
        range: 0,
        orbitRadius: 45, // Distance from player
        rotationSpeed: 180, // Degrees per second
        category: 'passive',
        upgradeCategories: ['orbitalCount', 'orbitalSpeed', 'orbitalRadius', 'damage'] // Orbital-specific upgrades
    },
    explosive: {
        name: 'Explosive Launcher',
        icon: '◉', // Explosion icon
        char: '●', // Black circle
        color: [255, 100, 50],
        fireRate: 1.5, // Slow fire rate (2.5x multiplier)
        projectileSpeed: 200, // Slow, visible
        baseDamage: 25, // Base explosion damage
        projectileCount: 1,
        spreadAngle: 0,
        piercing: 0,
        obstaclePiercing: 0,
        critChance: 0.05,
        critDamage: 2.0,
        range: 500, // Medium range
        explosionRadius: 50, // Area damage radius
        explosionDamage: 15, // Area damage
        category: 'area',
        upgradeCategories: ['damage', 'explosionRadius', 'explosionDamage', 'fireRate', 'range']
    },
    chainLightning: {
        name: 'Chain Lightning',
        icon: '⚡', // Lightning icon
        char: '⚡', // Lightning bolt
        color: [255, 255, 100],
        fireRate: 3.0, // Shots per second (2.5x multiplier)
        projectileSpeed: 400, // Fast
        baseDamage: 12, // Base damage
        projectileCount: 1,
        spreadAngle: 0,
        piercing: 0,
        obstaclePiercing: 0,
        critChance: 0.05,
        critDamage: 2.0,
        range: 600, // Medium range
        chainRange: 70, // Distance between chain jumps
        maxJumps: 3, // Starting chain jumps
        chainDamageReduction: 0.15, // -15% damage per jump
        category: 'multiTarget',
        upgradeCategories: ['damage', 'chainJumps', 'chainRange', 'fireRate', 'chainDamage']
    }
};

// Get weapon definition by key
export function getWeaponDefinition(weaponKey) {
    return WEAPON_DEFINITIONS[weaponKey] || WEAPON_DEFINITIONS.pistol;
}

// Get all weapons in a category
export function getWeaponsByCategory(category) {
    return Object.entries(WEAPON_DEFINITIONS)
        .filter(([key, weapon]) => weapon.category === category)
        .map(([key, weapon]) => ({ key, ...weapon }));
}

// Check if upgrade category is valid for weapon
export function isUpgradeValidForWeapon(weaponKey, upgradeCategory) {
    const weapon = getWeaponDefinition(weaponKey);
    return weapon.upgradeCategories.includes(upgradeCategory);
}

