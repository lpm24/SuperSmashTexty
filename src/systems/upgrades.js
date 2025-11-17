// Upgrade system - handles upgrade definitions and application
import { isUpgradeValidForWeapon, getWeaponDefinition, WEAPON_DEFINITIONS } from '../data/weapons.js';

// Upgrade stack limits
export const UPGRADE_STACK_LIMITS = {
    damage: 10, // 10 stacks = 250% total (25% per stack)
    fireRate: 10, // 10 stacks = ~620% total (20% per stack, multiplicative)
    speed: 10, // 10 stacks = ~405% total (15% per stack, multiplicative)
    health: 10, // 10 stacks = +200 HP total (20 per stack)
    projectileSpeed: 10, // 10 stacks = ~931% total (25% per stack, multiplicative)
    xpGain: 10, // 10 stacks = +150% total (15% per stack)
    pickupRadius: 10, // 10 stacks = ~5766% total (50% per stack, multiplicative)
    multiShot: 5, // 5 stacks = +5 projectiles total
    piercing: 5, // 5 stacks = +5 penetration total
    obstaclePiercing: 5, // 5 stacks = +5 obstacle penetration total
    critChance: 10, // 10 stacks = +100% crit chance total (10% per stack)
    critDamage: 10, // 10 stacks = +500% crit damage total (50% per stack)
    spreadShot: 5, // 5 stacks = +150° spread total (30° per stack)
    pelletCount: 5, // 5 stacks = +5 pellets total
    range: 5, // 5 stacks = ~305% total (25% per stack, multiplicative)
    dot: 10, // 10 stacks = +250% DoT total (25% per stack)
    orbitalCount: 5, // 5 stacks = +5 orbs total
    orbitalSpeed: 10, // 10 stacks = ~5766% total (50% per stack, multiplicative)
    orbitalRadius: 10, // 10 stacks = ~619% total (20% per stack, multiplicative)
    explosionRadius: 10, // 10 stacks = ~931% total (25% per stack, multiplicative)
    explosionDamage: 10, // 10 stacks = ~931% total (25% per stack, multiplicative)
    chainJumps: 5, // 5 stacks = +5 jumps total
    chainRange: 10, // 10 stacks = ~931% total (25% per stack, multiplicative)
    chainDamage: 10, // 10 stacks = -100% damage reduction (minimum 5% per jump)
    defense: 10 // 10 stacks = +20 damage reduction total (2 per stack)
};

// Basic upgrade definitions
// Each upgrade can specify which weapons it's valid for
export const UPGRADES = {
    damage: {
        name: 'Damage Boost',
        icon: '⚔',
        description: '+25% damage',
        category: 'weapon',
        upgradeCategory: 'damage',
        maxStacks: 10,
        getDescription: (stacks) => `+25% damage${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.damage})` : ''}`,
        apply: (player) => {
            // Stackable: recalculate from base damage
            const stacks = player.upgradeStacks?.damage || 0;
            const baseDamage = player.baseProjectileDamage || player.weaponDef?.baseDamage || 10;
            const multiplier = Math.pow(1.25, stacks);
            player.projectileDamage = Math.floor(baseDamage * multiplier);
        }
    },
    fireRate: {
        name: 'Fire Rate',
        icon: '⟫',
        description: '+20% fire rate',
        category: 'weapon',
        upgradeCategory: 'fireRate',
        maxStacks: 10,
        getDescription: (stacks) => `+20% fire rate${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.fireRate})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.fireRate || 0;
            const baseFireRate = player.baseFireRate || player.weaponDef?.fireRate || 1.5;
            const multiplier = Math.pow(1.2, stacks);
            player.fireRate = baseFireRate * multiplier;
        }
    },
    speed: {
        name: 'Movement Speed',
        icon: '☄',
        description: '+15% movement speed',
        category: 'passive',
        maxStacks: 10,
        getDescription: (stacks) => `+15% movement speed${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.speed})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.speed || 0;
            const baseSpeed = player.characterData?.stats?.speed || 150;
            const multiplier = Math.pow(1.15, stacks);
            player.speed = Math.floor(baseSpeed * multiplier);
            player.originalSpeed = player.speed;
        }
    },
    health: {
        name: 'Max Health',
        icon: '♥',
        description: '+20 max HP',
        category: 'passive',
        maxStacks: 10,
        getDescription: (stacks) => `+20 max HP${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.health})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.health || 0;
            const baseHealth = player.characterData?.stats?.health || 100;
            const bonusHP = stacks * 20;
            const oldMaxHealth = player.maxHealth;
            player.maxHealth = baseHealth + bonusHP;
            // Heal the difference
            const hpDiff = player.maxHealth - oldMaxHealth;
            if (hpDiff > 0) {
                player.setHP(player.hp() + hpDiff);
            }
        }
    },
    projectileSpeed: {
        name: 'Projectile Speed',
        icon: '➤',
        description: '+25% projectile speed',
        category: 'weapon',
        maxStacks: 10,
        getDescription: (stacks) => `+25% projectile speed${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.projectileSpeed})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.projectileSpeed || 0;
            const baseSpeed = player.baseProjectileSpeed || player.weaponDef?.projectileSpeed || 300;
            const multiplier = Math.pow(1.25, stacks);
            player.projectileSpeed = Math.floor(baseSpeed * multiplier);
        }
    },
    xpGain: {
        name: 'XP Gain',
        icon: '★',
        description: '+15% XP from enemies',
        category: 'passive',
        maxStacks: 10,
        getDescription: (stacks) => `+15% XP from enemies${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.xpGain})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.xpGain || 0;
            const baseMultiplier = player.characterData?.ability === 'xpBoost' ? 1.1 : 1.0;
            player.xpMultiplier = baseMultiplier + (stacks * 0.15);
        }
    },
    pickupRadius: {
        name: 'Pickup Radius',
        icon: '◐',
        description: '+50% pickup range',
        category: 'passive',
        maxStacks: 10,
        getDescription: (stacks) => `+50% pickup range${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.pickupRadius})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.pickupRadius || 0;
            const baseRadius = 30;
            const multiplier = Math.pow(1.5, stacks);
            player.pickupRadius = Math.floor(baseRadius * multiplier);
        }
    },
    multiShot: {
        name: 'Multi-Shot',
        icon: '⋮',
        description: '+1 projectile per shot',
        category: 'weapon',
        upgradeCategory: 'multiShot',
        validWeapons: ['pistol', 'smg', 'sniper'],
        maxStacks: 5,
        getDescription: (stacks) => `+1 projectile per shot${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.multiShot})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.multiShot || 0;
            const baseCount = player.weaponDef?.projectileCount || 1;
            player.projectileCount = baseCount + stacks;
        }
    },
    piercing: {
        name: 'Piercing',
        icon: '⇉',
        description: '+1 enemy penetration',
        category: 'weapon',
        upgradeCategory: 'piercing',
        maxStacks: 5,
        getDescription: (stacks) => `+1 enemy penetration${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.piercing})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.piercing || 0;
            const basePiercing = player.weaponDef?.piercing || 0;
            player.piercing = basePiercing + stacks;
        }
    },
    obstaclePiercing: {
        name: 'Obstacle Piercing',
        icon: '⊡',
        description: '+1 obstacle penetration',
        category: 'weapon',
        maxStacks: 5,
        getDescription: (stacks) => `+1 obstacle penetration${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.obstaclePiercing})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.obstaclePiercing || 0;
            const baseObstaclePiercing = player.weaponDef?.obstaclePiercing || 0;
            player.obstaclePiercing = baseObstaclePiercing + stacks;
        }
    },
    critChance: {
        name: 'Critical Strike',
        icon: '◆',
        description: '+10% crit chance',
        category: 'weapon',
        upgradeCategory: 'crit',
        maxStacks: 10,
        getDescription: (stacks) => `+10% crit chance${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.critChance})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.critChance || 0;
            const baseCritChance = player.weaponDef?.critChance || 0.05;
            let finalCritChance = baseCritChance + (stacks * 0.1);
            // Apply character bonus if applicable
            if (player.characterData?.ability === 'critBoost') {
                finalCritChance *= 1.5;
            }
            player.critChance = finalCritChance;
        }
    },
    critDamage: {
        name: 'Critical Power',
        icon: '◈',
        description: '+50% crit damage',
        category: 'weapon',
        upgradeCategory: 'crit',
        maxStacks: 10,
        getDescription: (stacks) => `+50% crit damage${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.critDamage})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.critDamage || 0;
            const baseCritDamage = player.weaponDef?.critDamage || 2.0;
            let finalCritDamage = baseCritDamage + (stacks * 0.5);
            // Apply character bonus if applicable
            if (player.characterData?.ability === 'critBoost') {
                finalCritDamage *= 1.25;
            }
            player.critDamage = finalCritDamage;
        }
    },
    spreadShot: {
        name: 'Spread Shot',
        icon: '⋰',
        description: '+30° spread angle',
        category: 'weapon',
        upgradeCategory: 'spread',
        validWeapons: ['shotgun'], // Only shotgun has 'spread' in upgradeCategories
        maxStacks: 5,
        getDescription: (stacks) => `+30° spread angle${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.spreadShot})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.spreadShot || 0;
            const baseSpread = player.weaponDef?.spreadAngle || 0;
            player.spreadAngle = baseSpread + (stacks * 30);
        }
    },
    pelletCount: {
        name: 'More Pellets',
        icon: '⁘',
        description: '+1 pellet per shot',
        category: 'weapon',
        upgradeCategory: 'pelletCount',
        validWeapons: ['shotgun'],
        maxStacks: 5,
        getDescription: (stacks) => `+1 pellet per shot${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.pelletCount})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.pelletCount || 0;
            const baseCount = player.weaponDef?.projectileCount || 3;
            player.projectileCount = baseCount + stacks;
        }
    },
    range: {
        name: 'Extended Range',
        icon: '↔',
        description: '+25% weapon range',
        category: 'weapon',
        upgradeCategory: 'range',
        validWeapons: ['sniper', 'flamethrower', 'explosive'], // All weapons with 'range' in upgradeCategories
        maxStacks: 5,
        getDescription: (stacks) => `+25% weapon range${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.range})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.range || 0;
            const baseRange = player.weaponDef?.range || 600;
            const multiplier = Math.pow(1.25, stacks);
            player.weaponRange = Math.floor(baseRange * multiplier);
        }
    },
    dot: {
        name: 'Burn Damage',
        icon: '♨',
        description: '+25% fire damage over time',
        category: 'weapon',
        upgradeCategory: 'dot',
        validWeapons: ['flamethrower'],
        maxStacks: 10,
        getDescription: (stacks) => `+25% fire damage over time${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.dot})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.dot || 0;
            const baseMultiplier = player.characterData?.ability === 'fireDot' ? 1.25 : 1.0;
            player.fireDotMultiplier = baseMultiplier + (stacks * 0.25);
        }
    },
    orbitalCount: {
        name: 'Extra Orb',
        icon: '◉',
        description: '+1 orbital orb',
        category: 'weapon',
        upgradeCategory: 'orbitalCount',
        validWeapons: ['orbital'],
        maxStacks: 5,
        getDescription: (stacks) => `+1 orbital orb${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.orbitalCount})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.orbitalCount || 0;
            const baseCount = player.weaponDef?.projectileCount || 1;
            player.projectileCount = baseCount + stacks;
            // Reinitialize orbital weapons if needed
            if (player.weaponKey === 'orbital' && player.orbitalOrbs) {
                // Mark for reinitialization
                player.orbitalNeedsReinit = true;
            }
        }
    },
    orbitalSpeed: {
        name: 'Faster Orbit',
        icon: '⟲',
        description: '+50% orbital rotation speed',
        category: 'weapon',
        upgradeCategory: 'orbitalSpeed',
        validWeapons: ['orbital'],
        maxStacks: 10,
        getDescription: (stacks) => `+50% orbital rotation speed${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.orbitalSpeed})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.orbitalSpeed || 0;
            const baseSpeed = player.weaponDef?.rotationSpeed || 180;
            const multiplier = Math.pow(1.5, stacks);
            player.rotationSpeed = baseSpeed * multiplier;
        }
    },
    orbitalRadius: {
        name: 'Wider Orbit',
        icon: '○',
        description: '+20% orbital radius',
        category: 'weapon',
        upgradeCategory: 'orbitalRadius',
        validWeapons: ['orbital'],
        maxStacks: 10,
        getDescription: (stacks) => `+20% orbital radius${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.orbitalRadius})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.orbitalRadius || 0;
            const baseRadius = player.weaponDef?.orbitRadius || 45;
            const multiplier = Math.pow(1.2, stacks);
            player.orbitRadius = Math.floor(baseRadius * multiplier);
        }
    },
    explosionRadius: {
        name: 'Bigger Explosion',
        icon: '◎',
        description: '+25% explosion radius',
        category: 'weapon',
        upgradeCategory: 'explosionRadius',
        validWeapons: ['explosive'],
        maxStacks: 10,
        getDescription: (stacks) => `+25% explosion radius${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.explosionRadius})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.explosionRadius || 0;
            const baseRadius = player.weaponDef?.explosionRadius || 50;
            const multiplier = Math.pow(1.25, stacks);
            player.explosionRadius = Math.floor(baseRadius * multiplier);
        }
    },
    explosionDamage: {
        name: 'Explosive Power',
        icon: '☢',
        description: '+25% explosion damage',
        category: 'weapon',
        upgradeCategory: 'explosionDamage',
        validWeapons: ['explosive'],
        maxStacks: 10,
        getDescription: (stacks) => `+25% explosion damage${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.explosionDamage})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.explosionDamage || 0;
            const baseDamage = player.weaponDef?.explosionDamage || 15;
            const multiplier = Math.pow(1.25, stacks);
            player.explosionDamage = Math.floor(baseDamage * multiplier);
        }
    },
    chainJumps: {
        name: 'More Chains',
        icon: '⚡',
        description: '+1 chain jump',
        category: 'weapon',
        upgradeCategory: 'chainJumps',
        validWeapons: ['chainLightning'],
        maxStacks: 5,
        getDescription: (stacks) => `+1 chain jump${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.chainJumps})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.chainJumps || 0;
            const baseJumps = player.weaponDef?.maxJumps || 3;
            player.maxJumps = baseJumps + stacks;
        }
    },
    chainRange: {
        name: 'Longer Chain',
        icon: '⌁',
        description: '+25% chain range',
        category: 'weapon',
        upgradeCategory: 'chainRange',
        validWeapons: ['chainLightning'],
        maxStacks: 10,
        getDescription: (stacks) => `+25% chain range${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.chainRange})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.chainRange || 0;
            const baseRange = player.weaponDef?.chainRange || 70;
            const multiplier = Math.pow(1.25, stacks);
            player.chainRange = Math.floor(baseRange * multiplier);
        }
    },
    chainDamage: {
        name: 'Chain Power',
        icon: '⚡',
        description: '-10% damage reduction per jump',
        category: 'weapon',
        upgradeCategory: 'chainDamage',
        validWeapons: ['chainLightning'],
        maxStacks: 10,
        getDescription: (stacks) => `-10% damage reduction per jump${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.chainDamage})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.chainDamage || 0;
            const baseReduction = player.weaponDef?.chainDamageReduction || 0.15;
            // Reduce damage reduction (so damage stays higher)
            player.chainDamageReduction = Math.max(0.05, baseReduction - (stacks * 0.1));
        }
    },
    defense: {
        name: 'Armor',
        icon: '▲',
        description: '+2 damage reduction',
        category: 'passive',
        maxStacks: 10,
        getDescription: (stacks) => `+2 damage reduction${stacks > 0 ? ` (${stacks}/${UPGRADE_STACK_LIMITS.defense})` : ''}`,
        apply: (player) => {
            const stacks = player.upgradeStacks?.defense || 0;
            const baseDefense = player.characterData?.ability === 'tankStats' ? 0.15 : 0;
            player.defense = baseDefense + (stacks * 2);
        }
    }
};

// Check if upgrade is valid for player
function isUpgradeValidForPlayer(upgrade, player) {
    // Passive upgrades
    if (upgrade.category === 'passive') {
        // Check stack limit
        const stacks = player.upgradeStacks?.[upgrade.key] || 0;
        const maxStacks = upgrade.maxStacks || UPGRADE_STACK_LIMITS[upgrade.key] || 10;
        if (stacks >= maxStacks) {
            return false;
        }
        return true;
    }

    // Weapon stat upgrades
    if (upgrade.category === 'weapon') {
        // Check stack limit
        const stacks = player.upgradeStacks?.[upgrade.key] || 0;
        const maxStacks = upgrade.maxStacks || UPGRADE_STACK_LIMITS[upgrade.key] || 10;
        if (stacks >= maxStacks) {
            return false;
        }

        // Check weapon validity - only show upgrades for character's starting weapon
        // (not powerup weapons, since those are temporary)
        const startingWeapon = player.characterData?.weapon || player.weaponKey || 'pistol';

        if (upgrade.validWeapons) {
            // Must match starting weapon exactly
            return upgrade.validWeapons.includes(startingWeapon);
        }

        if (upgrade.upgradeCategory) {
            return isUpgradeValidForWeapon(startingWeapon, upgrade.upgradeCategory);
        }

        return true;
    }

    return true;
}

// Get random upgrades for draft (weapon-aware)
// @param {number} count - Number of upgrades to return
// @param {Object} player - Player object to filter valid upgrades
// @param {SeededRandom} rng - Optional seeded RNG for multiplayer synchronization
export function getRandomUpgrades(count = 3, player = null, rng = null) {
    const upgradeKeys = Object.keys(UPGRADES);

    // Map upgrade keys to full upgrade objects
    let allOptions = upgradeKeys.map(key => ({ key, ...UPGRADES[key], type: 'upgrade' }));

    // Filter based on player state
    let validOptions = allOptions;
    if (player) {
        validOptions = allOptions.filter(option => isUpgradeValidForPlayer(option, player));
    }

    // If not enough valid options, fall back to all options
    if (validOptions.length < count) {
        validOptions = allOptions;
    }

    const selected = [];
    const used = new Set();

    while (selected.length < count && selected.length < validOptions.length) {
        // Use seeded RNG if provided (for multiplayer sync), otherwise Math.random()
        const randomIndex = rng
            ? rng.range(0, validOptions.length)
            : Math.floor(Math.random() * validOptions.length);
        const option = validOptions[randomIndex];
        if (!used.has(option.key)) {
            used.add(option.key);
            selected.push(option);
        }
    }

    return selected;
}

// Apply upgrade to player
export function applyUpgrade(player, upgradeKey) {
    // Get the upgrade
    const upgrade = UPGRADES[upgradeKey];
    if (!upgrade) return;
    
    // Track upgrade
    if (upgrade.category === 'passive') {
        if (!player.passiveUpgrades.includes(upgradeKey)) {
            player.passiveUpgrades.push(upgradeKey);
        }
    }
    
    // Increment stack count
    if (!player.upgradeStacks) {
        player.upgradeStacks = {};
    }
    player.upgradeStacks[upgradeKey] = (player.upgradeStacks[upgradeKey] || 0) + 1;
    
    // Apply upgrade (will recalculate from base values)
    recalculateAllUpgrades(player);
}

// Recalculate all upgrades from base values
export function recalculateAllUpgrades(player) {
    // Apply all upgrades in order
    Object.keys(UPGRADES).forEach(key => {
        if (player.upgradeStacks && player.upgradeStacks[key] > 0) {
            UPGRADES[key].apply(player);
        }
    });
}

// Get upgrade description with stack count
export function getUpgradeDescription(upgrade, player) {
    if (!upgrade) return '';
    
    if (upgrade.getDescription) {
        const stacks = player?.upgradeStacks?.[upgrade.key] || 0;
        return upgrade.getDescription(stacks);
    }
    
    if (upgrade.weaponKey) {
        return upgrade.getDescription ? upgrade.getDescription() : upgrade.description;
    }
    
    return upgrade.description;
}
