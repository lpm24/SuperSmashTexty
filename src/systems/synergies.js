// Synergy system - handles upgrade combinations and special effects
import { showSynergyHint } from './tutorial.js';

// Synergy definitions
// Each synergy requires specific upgrades and applies a special effect
export const SYNERGIES = {
    // Multi-shot + Spread Shot = Wider spread pattern
    shotgun: {
        name: 'Shotgun Blast',
        description: 'Multi-Shot + Spread Shot: Wider spread angle',
        required: ['multiShot', 'spreadShot'],
        apply: (player) => {
            // Increase spread angle when both upgrades are present
            if (player.spreadAngle > 0 && player.projectileCount > 1) {
                player.spreadAngle = (player.spreadAngle || 0) * 1.5; // 50% wider spread
            }
        }
    },
    
    // Piercing + Multi-shot = Multiple piercing projectiles
    volley: {
        name: 'Piercing Volley',
        description: 'Piercing + Multi-Shot: All projectiles pierce',
        required: ['piercing', 'multiShot'],
        apply: (player) => {
            // Ensure all projectiles from multi-shot have piercing
            // This is already handled by the combat system, but we can add bonus
            if (player.piercing > 0 && player.projectileCount > 1) {
                player.piercing = (player.piercing || 0) + 1; // Bonus piercing
            }
        }
    },
    
    // Crit Chance + Crit Damage = Enhanced critical system
    criticalMaster: {
        name: 'Critical Master',
        description: 'Critical Strike + Critical Power: +25% crit chance, +100% crit damage',
        required: ['critChance', 'critDamage'],
        apply: (player) => {
            if (player.critChance > 0 && player.critDamage > 2.0) {
                player.critChance = (player.critChance || 0) + 0.25; // Bonus crit chance
                player.critDamage = (player.critDamage || 2.0) + 1.0; // Bonus crit damage
            }
        }
    },
    
    // Multi-shot + Fire Rate = Rapid multi-fire
    barrage: {
        name: 'Barrage',
        description: 'Multi-Shot + Fire Rate: Faster multi-projectile firing',
        required: ['multiShot', 'fireRate'],
        apply: (player) => {
            if (player.projectileCount > 1) {
                player.fireRate = (player.fireRate || 1.5) * 1.3; // 30% faster fire rate
            }
        }
    },
    
    // Piercing + Damage = Armor-piercing rounds
    armorPiercing: {
        name: 'Armor Piercing',
        description: 'Piercing + Damage Boost: Piercing projectiles deal +50% damage',
        required: ['piercing', 'damage'],
        apply: (player) => {
            if (player.piercing > 0) {
                // Store bonus damage for piercing projectiles
                player.piercingDamageBonus = 1.5; // 50% bonus
            }
        }
    },
    
    // Defense + Health = Tank build
    tank: {
        name: 'Tank',
        description: 'Armor + Max Health: +50% max health, +5 defense',
        required: ['defense', 'health'],
        apply: (player) => {
            player.maxHealth = Math.floor(player.maxHealth * 1.5); // 50% more health
            player.setHP(Math.floor(player.hp() * 1.5)); // Scale current HP too
            player.defense = (player.defense || 0) + 5; // Bonus defense
        }
    },
    
    // Speed + Pickup Radius = Loot vacuum
    vacuum: {
        name: 'Loot Vacuum',
        description: 'Movement Speed + Pickup Radius: +100% pickup radius',
        required: ['speed', 'pickupRadius'],
        apply: (player) => {
            if (player.pickupRadius > 0) {
                player.pickupRadius = Math.floor(player.pickupRadius * 2.0); // Double radius
            }
        }
    },
    
    // XP Gain + Pickup Radius = XP magnet
    xpMagnet: {
        name: 'XP Magnet',
        description: 'XP Gain + Pickup Radius: +50% XP multiplier',
        required: ['xpGain', 'pickupRadius'],
        apply: (player) => {
            if (player.xpMultiplier) {
                player.xpMultiplier = (player.xpMultiplier || 1) + 0.5; // 50% more XP
            }
        }
    },

    // NEW SYNERGIES

    // Glass Canon: Trade health for massive damage
    glassCannon: {
        name: 'Glass Cannon',
        description: 'Damage x3 + Health: -25% max HP, +100% damage',
        required: ['damage', 'damage', 'damage', 'health'], // Requires 3x damage upgrades
        requiredCounts: { damage: 3, health: 1 }, // Alternative counting method
        apply: (player) => {
            // Only apply if player has at least 3 damage upgrades
            const damageStacks = player.upgradeStacks?.damage || 0;
            if (damageStacks >= 3) {
                // Reduce max HP by 25%
                const newMaxHealth = Math.floor(player.maxHealth * 0.75);
                player.maxHealth = newMaxHealth;

                // Ensure player HP doesn't drop below 25% of new max (safety threshold)
                // This prevents the synergy from leaving the player in a near-death state
                const minSafeHP = Math.max(1, Math.floor(newMaxHealth * 0.25));
                const newHP = Math.max(minSafeHP, Math.min(player.hp(), newMaxHealth));
                player.setHP(newHP);

                // Double damage (+100%)
                player.projectileDamage = Math.floor(player.projectileDamage * 2);
            }
        }
    },

    // Vampiric Rounds: Heal on critical hits
    vampiricRounds: {
        name: 'Vampiric Rounds',
        description: 'Crit Chance + Crit Damage + Health: Heal 5% of crit damage',
        required: ['critChance', 'critDamage', 'health'],
        apply: (player) => {
            // Enable vampiric healing on crits
            player.vampiricCrits = true;
            player.vampiricHealPercent = 0.05; // 5% of crit damage healed
        }
    },

    // Bullet Time: Faster fire rate while moving
    bulletTime: {
        name: 'Bullet Time',
        description: 'Speed + Fire Rate: +20% fire rate while moving',
        required: ['speed', 'fireRate'],
        apply: (player) => {
            // Enable bullet time effect
            player.bulletTimeEnabled = true;
            player.bulletTimeBonus = 0.2; // +20% fire rate while moving
        }
    },

    // ========================================
    // NEW SYNERGIES
    // ========================================

    // Berserker: Power boost at low health
    berserker: {
        name: 'Berserker',
        description: 'Damage x3 + Speed x2: +50% damage/speed below 30% HP',
        requiredCounts: { damage: 3, speed: 2 },
        apply: (player) => {
            player.berserkerEnabled = true;
            player.berserkerThreshold = 0.3; // Below 30% HP
            player.berserkerDamageBonus = 0.5; // +50% damage
            player.berserkerSpeedBonus = 0.5; // +50% speed
        }
    },

    // Deadeye: Extended crit range
    deadeye: {
        name: 'Deadeye',
        description: 'Crit x2 + Range x2: Crits have +50% range',
        requiredCounts: { critChance: 2, range: 2 },
        apply: (player) => {
            player.deadeyeEnabled = true;
            player.deadeyeRangeBonus = 0.5; // +50% range on crits
        }
    },

    // Survivalist: Out of combat regen
    survivor: {
        name: 'Survivalist',
        description: 'Health x2 + Defense x2: Regen 1% HP/sec out of combat',
        requiredCounts: { health: 2, defense: 2 },
        apply: (player) => {
            player.survivalistEnabled = true;
            player.survivalistRegenPercent = 0.01; // 1% HP per second
            player.survivalistCombatCooldown = 3.0; // 3 seconds out of combat
            player.survivalistLastCombatTime = 0;
        }
    },

    // Retribution: Thorns ignore armor
    thornMaster: {
        name: 'Retribution',
        description: 'Thorns x3 + Defense x2: Thorns ignore enemy armor',
        requiredCounts: { thorns: 3, defense: 2 },
        apply: (player) => {
            player.thornsIgnoreArmor = true;
            // Also boost thorns damage by 50%
            player.thornsPercent = (player.thornsPercent || 0) * 1.5;
        }
    },

    // Vampire Lord: Enhanced lifesteal on crits
    vampireLord: {
        name: 'Vampire Lord',
        description: 'Lifesteal x3 + Crit Dmg x2: Crits heal 3x lifesteal',
        requiredCounts: { lifesteal: 3, critDamage: 2 },
        apply: (player) => {
            player.vampireLordEnabled = true;
            player.vampireLordMultiplier = 3; // 3x lifesteal on crits
        }
    },

    // Executioner: Execute low health enemies
    executioner: {
        name: 'Executioner',
        description: 'Damage x2 + Piercing x2: +100% damage to enemies <25% HP',
        requiredCounts: { damage: 2, piercing: 2 },
        apply: (player) => {
            player.executionerEnabled = true;
            player.executionerThreshold = 0.25; // Below 25% HP
            player.executionerDamageBonus = 1.0; // +100% damage
        }
    },

    // Speed Demon: Fire rate scales with speed
    speedDemon: {
        name: 'Speed Demon',
        description: 'Speed x3 + Fire Rate x2: +1% fire rate per speed stack',
        requiredCounts: { speed: 3, fireRate: 2 },
        apply: (player) => {
            player.speedDemonEnabled = true;
            player.speedDemonFireRatePerStack = 0.01; // +1% fire rate per speed stack
        }
    },

    // Fortress: Complete immunity during invulnerability
    fortress: {
        name: 'Fortress',
        description: 'Health x3 + Invuln x2: Immunity blocks all damage sources',
        requiredCounts: { health: 3, invulnTime: 2 },
        apply: (player) => {
            player.fortressEnabled = true;
            // Also extend invulnerability duration by 50%
            player.invulnerableDuration = (player.invulnerableDuration || 1.0) * 1.5;
        }
    }
};

// Track player's selected upgrades
export function trackUpgrade(player, upgradeKey) {
    if (!player.selectedUpgrades) {
        player.selectedUpgrades = new Set();
    }
    player.selectedUpgrades.add(upgradeKey);
}

// Check and apply synergies
export function checkAndApplySynergies(k, player) {
    if (!player.selectedUpgrades || player.selectedUpgrades.size < 2) {
        return; // Need at least 2 upgrades for synergies
    }

    const activeSynergies = [];

    // Check each synergy
    for (const [synergyKey, synergy] of Object.entries(SYNERGIES)) {
        let hasAllRequired = false;

        // Check if synergy uses requiredCounts (for synergies needing multiple stacks of same upgrade)
        if (synergy.requiredCounts) {
            hasAllRequired = true;
            for (const [upgradeKey, count] of Object.entries(synergy.requiredCounts)) {
                const stacks = player.upgradeStacks?.[upgradeKey] || 0;
                if (stacks < count) {
                    hasAllRequired = false;
                    break;
                }
            }
        } else {
            // Standard check - player has all required upgrades (any count)
            hasAllRequired = synergy.required.every(upgradeKey =>
                player.selectedUpgrades.has(upgradeKey)
            );
        }

        if (hasAllRequired) {
            // Check if synergy is already active (prevent double application)
            if (!player.activeSynergies) {
                player.activeSynergies = new Set();
            }

            if (!player.activeSynergies.has(synergyKey)) {
                // Apply synergy effect
                synergy.apply(player);
                player.activeSynergies.add(synergyKey);
                activeSynergies.push(synergy);

                // Show tutorial hint for synergies
                showSynergyHint(k);

                // Show synergy notification
                showSynergyNotification(k, synergy);
            }
        }
    }

    return activeSynergies;
}

// Show synergy notification
function showSynergyNotification(k, synergy) {
    const notification = k.add([
        k.text(`SYNERGY: ${synergy.name}`, { size: 20 }),
        k.pos(k.width() / 2, 150),
        k.anchor('center'),
        k.color(255, 200, 0), // Gold color for synergies
        k.fixed(),
        k.z(600)
    ]);
    
    const desc = k.add([
        k.text(synergy.description, { size: 14 }),
        k.pos(k.width() / 2, 175),
        k.anchor('center'),
        k.color(200, 200, 100),
        k.fixed(),
        k.z(600)
    ]);
    
    // Fade out after 3 seconds
    k.wait(3, () => {
        if (notification.exists()) {
            k.destroy(notification);
            k.destroy(desc);
        }
    });
}

// Get active synergies for a player
export function getActiveSynergies(player) {
    if (!player.activeSynergies) {
        return [];
    }
    
    return Array.from(player.activeSynergies).map(key => ({
        key,
        ...SYNERGIES[key]
    }));
}


