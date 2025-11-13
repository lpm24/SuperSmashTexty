// Synergy system - handles upgrade combinations and special effects

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
        // Check if player has all required upgrades
        const hasAllRequired = synergy.required.every(upgradeKey => 
            player.selectedUpgrades.has(upgradeKey)
        );
        
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


