// Upgrade system - handles upgrade definitions and application

// Basic upgrade definitions
export const UPGRADES = {
    damage: {
        name: 'Damage Boost',
        description: '+25% damage',
        category: 'weapon',
        apply: (player) => {
            player.projectileDamage = Math.floor(player.projectileDamage * 1.25);
        }
    },
    fireRate: {
        name: 'Fire Rate',
        description: '+20% fire rate',
        category: 'weapon',
        apply: (player) => {
            player.fireRate *= 1.2;
        }
    },
    speed: {
        name: 'Movement Speed',
        description: '+15% movement speed',
        category: 'passive',
        apply: (player) => {
            player.speed = Math.floor(player.speed * 1.15);
        }
    },
    health: {
        name: 'Max Health',
        description: '+20 max HP',
        category: 'passive',
        apply: (player) => {
            player.maxHealth += 20;
            player.setHP(player.hp() + 20); // Heal the bonus HP
        }
    },
    projectileSpeed: {
        name: 'Projectile Speed',
        description: '+25% projectile speed',
        category: 'weapon',
        apply: (player) => {
            player.projectileSpeed = Math.floor(player.projectileSpeed * 1.25);
        }
    },
    xpGain: {
        name: 'XP Gain',
        description: '+15% XP from enemies',
        category: 'passive',
        apply: (player) => {
            if (!player.xpMultiplier) player.xpMultiplier = 1;
            player.xpMultiplier += 0.15;
        }
    },
    pickupRadius: {
        name: 'Pickup Radius',
        description: '+50% pickup range',
        category: 'passive',
        apply: (player) => {
            player.pickupRadius = Math.floor(player.pickupRadius * 1.5);
        }
    },
    multiShot: {
        name: 'Multi-Shot',
        description: '+1 projectile per shot',
        category: 'weapon',
        apply: (player) => {
            player.projectileCount = (player.projectileCount || 1) + 1;
        }
    },
    piercing: {
        name: 'Piercing',
        description: '+1 enemy penetration',
        category: 'weapon',
        apply: (player) => {
            player.piercing = (player.piercing || 0) + 1;
        }
    },
    critChance: {
        name: 'Critical Strike',
        description: '+10% crit chance',
        category: 'weapon',
        apply: (player) => {
            player.critChance = (player.critChance || 0) + 0.1;
        }
    },
    critDamage: {
        name: 'Critical Power',
        description: '+50% crit damage',
        category: 'weapon',
        apply: (player) => {
            player.critDamage = (player.critDamage || 2.0) + 0.5;
        }
    },
    spreadShot: {
        name: 'Spread Shot',
        description: '+30° spread angle',
        category: 'weapon',
        apply: (player) => {
            player.spreadAngle = (player.spreadAngle || 0) + 30;
        }
    },
    defense: {
        name: 'Armor',
        description: '+2 damage reduction',
        category: 'passive',
        apply: (player) => {
            player.defense = (player.defense || 0) + 2;
        }
    }
};

// Get random upgrades for draft
export function getRandomUpgrades(count = 3) {
    const upgradeKeys = Object.keys(UPGRADES);
    const selected = [];
    const used = new Set();
    
    while (selected.length < count && selected.length < upgradeKeys.length) {
        const randomKey = upgradeKeys[Math.floor(Math.random() * upgradeKeys.length)];
        if (!used.has(randomKey)) {
            used.add(randomKey);
            selected.push({
                key: randomKey,
                ...UPGRADES[randomKey]
            });
        }
    }
    
    return selected;
}

// Apply upgrade to player
export function applyUpgrade(player, upgradeKey) {
    const upgrade = UPGRADES[upgradeKey];
    if (upgrade) {
        upgrade.apply(player);
    }
}

