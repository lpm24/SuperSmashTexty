/**
 * Explosive Barrel Entity
 *
 * Destructible environmental hazard that:
 * - Has a health bar and takes multiple hits to destroy
 * - Creates AOE explosion damaging players and enemies
 * - Can trigger chain reactions with nearby barrels
 * - Adds tactical depth to combat
 */

import { isMultiplayerActive, isHost } from '../systems/multiplayerGame.js';
import { broadcast } from '../systems/networkSystem.js';

// Barrel configuration
const BARREL_CONFIG = {
    // Visual
    CHAR: '◉',
    SIZE: 20,
    COLOR: [180, 80, 40], // Orange-red
    DAMAGED_COLOR: [220, 100, 30], // Brighter when damaged
    CRITICAL_COLOR: [255, 60, 20], // Red when near death

    // Stats
    MAX_HEALTH: 3,

    // Explosion
    EXPLOSION_RADIUS: 80,
    EXPLOSION_DAMAGE: 25,
    CHAIN_DELAY: 0.15, // Delay before chain reaction (seconds)
    KNOCKBACK_FORCE: 200,

    // Visual effects
    SHAKE_INTENSITY: 0.5,
    EXPLOSION_DURATION: 0.3
};

// Track all barrels for chain reactions
let allBarrels = [];

/**
 * Create an explosive barrel
 * @param {object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {object} options - Optional configuration overrides
 * @returns {object} - Barrel entity
 */
export function createBarrel(k, x, y, options = {}) {
    const config = { ...BARREL_CONFIG, ...options };

    const barrel = k.add([
        k.text(config.CHAR, { size: config.SIZE }),
        k.pos(x, y),
        k.anchor('center'),
        k.area({ width: config.SIZE, height: config.SIZE }),
        k.color(...config.COLOR),
        k.z(50),
        k.opacity(1),
        'barrel',
        'obstacle', // Blocks movement like other obstacles
        {
            maxHealth: config.MAX_HEALTH,
            currentHealth: config.MAX_HEALTH,
            explosionRadius: config.EXPLOSION_RADIUS,
            explosionDamage: config.EXPLOSION_DAMAGE,
            chainDelay: config.CHAIN_DELAY,
            knockbackForce: config.KNOCKBACK_FORCE,
            isExploding: false,
            barrelId: Math.random().toString(36).substr(2, 9)
        }
    ]);

    // Create health bar background
    const healthBarBg = k.add([
        k.rect(24, 4),
        k.pos(x, y - 18),
        k.anchor('center'),
        k.color(40, 40, 40),
        k.z(51),
        'barrelHealthBar'
    ]);

    // Create health bar fill
    const healthBarFill = k.add([
        k.rect(22, 2),
        k.pos(x - 11, y - 18),
        k.anchor('left'),
        k.color(255, 100, 50),
        k.z(52),
        'barrelHealthBar'
    ]);

    // Store references
    barrel.healthBarBg = healthBarBg;
    barrel.healthBarFill = healthBarFill;

    // Update health bar position and size
    barrel.updateHealthBar = () => {
        if (!barrel.exists()) return;

        const healthPercent = barrel.currentHealth / barrel.maxHealth;

        if (healthBarBg.exists()) {
            healthBarBg.pos.x = barrel.pos.x;
            healthBarBg.pos.y = barrel.pos.y - 18;
        }

        if (healthBarFill.exists()) {
            healthBarFill.pos.x = barrel.pos.x - 11;
            healthBarFill.pos.y = barrel.pos.y - 18;
            healthBarFill.width = 22 * healthPercent;

            // Color based on health
            if (healthPercent <= 0.33) {
                healthBarFill.color = k.rgb(255, 50, 50);
            } else if (healthPercent <= 0.66) {
                healthBarFill.color = k.rgb(255, 150, 50);
            }
        }

        // Update barrel color based on damage
        if (healthPercent <= 0.33) {
            barrel.color = k.rgb(...config.CRITICAL_COLOR);
            // Add shake effect when critical
            barrel.pos.x += (Math.random() - 0.5) * 2;
            barrel.pos.y += (Math.random() - 0.5) * 2;
        } else if (healthPercent <= 0.66) {
            barrel.color = k.rgb(...config.DAMAGED_COLOR);
        }
    };

    // Take damage from any source
    barrel.takeDamage = (damage = 1, sourceId = null, fromNetwork = false) => {
        if (barrel.isExploding || !barrel.exists()) return;

        barrel.currentHealth -= damage;
        barrel.updateHealthBar();

        // Broadcast damage in multiplayer (only host broadcasts, and only if not from network)
        if (!fromNetwork && isMultiplayerActive() && isHost()) {
            broadcast('barrel_damage', {
                x: barrel.pos.x,
                y: barrel.pos.y,
                damage: damage,
                currentHealth: barrel.currentHealth
            });
        }

        // Flash effect
        const originalColor = barrel.color;
        barrel.color = k.rgb(255, 255, 255);
        k.wait(0.05, () => {
            if (barrel.exists()) {
                barrel.updateHealthBar(); // Restore color based on health
            }
        });

        // Check for destruction
        if (barrel.currentHealth <= 0) {
            barrel.explode(sourceId);
        }
    };

    // Explode the barrel
    barrel.explode = (sourceId = null) => {
        if (barrel.isExploding || !barrel.exists()) return;
        barrel.isExploding = true;

        const explosionX = barrel.pos.x;
        const explosionY = barrel.pos.y;

        // Broadcast explosion in multiplayer
        if (isMultiplayerActive() && isHost()) {
            broadcast('barrel_explode', {
                barrelId: barrel.barrelId,
                x: explosionX,
                y: explosionY,
                radius: barrel.explosionRadius,
                damage: barrel.explosionDamage
            });
        }

        // Create explosion visual
        createExplosionEffect(k, explosionX, explosionY, barrel.explosionRadius);

        // Deal damage to entities in range
        dealExplosionDamage(k, explosionX, explosionY, barrel.explosionRadius, barrel.explosionDamage, barrel.knockbackForce, sourceId);

        // Trigger chain reactions after delay
        k.wait(barrel.chainDelay, () => {
            triggerChainReaction(k, explosionX, explosionY, barrel.explosionRadius, barrel.barrelId);
        });

        // Cleanup
        if (healthBarBg.exists()) k.destroy(healthBarBg);
        if (healthBarFill.exists()) k.destroy(healthBarFill);

        // Remove from tracking
        allBarrels = allBarrels.filter(b => b !== barrel);

        k.destroy(barrel);
    };

    // Add to tracking array
    allBarrels.push(barrel);

    return barrel;
}

/**
 * Create explosion visual effect
 */
function createExplosionEffect(k, x, y, radius) {
    // Outer explosion ring
    const outerRing = k.add([
        k.circle(radius),
        k.pos(x, y),
        k.anchor('center'),
        k.color(255, 150, 50),
        k.opacity(0.8),
        k.z(100),
        'explosionEffect'
    ]);

    // Inner explosion
    const innerRing = k.add([
        k.circle(radius * 0.6),
        k.pos(x, y),
        k.anchor('center'),
        k.color(255, 255, 150),
        k.opacity(0.9),
        k.z(101),
        'explosionEffect'
    ]);

    // Core flash
    const core = k.add([
        k.text('*', { size: 40 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(255, 255, 255),
        k.z(102),
        'explosionEffect'
    ]);

    // Animate and fade out
    k.tween(outerRing.scale, k.vec2(1.5, 1.5), 0.2, (val) => outerRing.scale = val);
    k.tween(outerRing.opacity, 0, 0.3, (val) => outerRing.opacity = val, k.easings.easeOutQuad).onEnd(() => {
        if (outerRing.exists()) k.destroy(outerRing);
    });

    k.tween(innerRing.scale, k.vec2(1.3, 1.3), 0.15, (val) => innerRing.scale = val);
    k.tween(innerRing.opacity, 0, 0.25, (val) => innerRing.opacity = val, k.easings.easeOutQuad).onEnd(() => {
        if (innerRing.exists()) k.destroy(innerRing);
    });

    k.tween(core.scale, k.vec2(2, 2), 0.1, (val) => core.scale = val);
    k.tween(core.opacity, 0, 0.2, (val) => core.opacity = val).onEnd(() => {
        if (core.exists()) k.destroy(core);
    });

    // Spawn debris particles
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const speed = 100 + Math.random() * 100;

        const debris = k.add([
            k.text(['#', '*', '+', '~'][Math.floor(Math.random() * 4)], { size: 12 }),
            k.pos(x, y),
            k.anchor('center'),
            k.color(255, 150 + Math.random() * 100, 50),
            k.opacity(1),
            k.z(99),
            'explosionDebris'
        ]);

        const targetX = x + Math.cos(angle) * speed;
        const targetY = y + Math.sin(angle) * speed;

        k.tween(debris.pos, k.vec2(targetX, targetY), 0.4, (val) => debris.pos = val, k.easings.easeOutQuad);
        k.tween(debris.opacity, 0, 0.4, (val) => debris.opacity = val).onEnd(() => {
            if (debris.exists()) k.destroy(debris);
        });
    }
}

/**
 * Deal explosion damage to all entities in range
 */
function dealExplosionDamage(k, x, y, radius, damage, knockbackForce, sourceId) {
    // Damage enemies
    k.get('enemy').forEach(enemy => {
        if (!enemy.exists()) return;

        const dist = k.vec2(enemy.pos.x - x, enemy.pos.y - y).len();
        if (dist <= radius) {
            // Damage falls off with distance
            const falloff = 1 - (dist / radius) * 0.5;
            const finalDamage = Math.floor(damage * falloff);

            if (enemy.takeDamage) {
                enemy.takeDamage(finalDamage);
            } else if (enemy.hp) {
                enemy.hurt(finalDamage);
            }

            // Apply knockback
            if (dist > 0) {
                const dir = k.vec2(enemy.pos.x - x, enemy.pos.y - y).unit();
                const knockback = knockbackForce * falloff;
                enemy.pos.x += dir.x * knockback * 0.1;
                enemy.pos.y += dir.y * knockback * 0.1;
            }
        }
    });

    // Damage minibosses
    k.get('miniboss').forEach(miniboss => {
        if (!miniboss.exists()) return;

        const dist = k.vec2(miniboss.pos.x - x, miniboss.pos.y - y).len();
        if (dist <= radius) {
            const falloff = 1 - (dist / radius) * 0.5;
            const finalDamage = Math.floor(damage * falloff);

            if (miniboss.takeDamage) {
                miniboss.takeDamage(finalDamage, null);
            }
        }
    });

    // Damage bosses
    k.get('boss').forEach(boss => {
        if (!boss.exists()) return;

        const dist = k.vec2(boss.pos.x - x, boss.pos.y - y).len();
        if (dist <= radius) {
            const falloff = 1 - (dist / radius) * 0.5;
            const finalDamage = Math.floor(damage * falloff);

            if (boss.takeDamage) {
                boss.takeDamage(finalDamage, null);
            }
        }
    });

    // Damage players
    k.get('player').forEach(player => {
        if (!player.exists() || player.isDead) return;

        const dist = k.vec2(player.pos.x - x, player.pos.y - y).len();
        if (dist <= radius) {
            const falloff = 1 - (dist / radius) * 0.5;
            const finalDamage = Math.floor(damage * falloff * 0.5); // Players take half damage

            // Check invulnerability
            if (!player.invulnerable) {
                player.hurt(finalDamage);

                // Apply knockback
                if (dist > 0) {
                    const dir = k.vec2(player.pos.x - x, player.pos.y - y).unit();
                    const knockback = knockbackForce * falloff;
                    player.pos.x += dir.x * knockback * 0.05;
                    player.pos.y += dir.y * knockback * 0.05;
                }
            }
        }
    });
}

/**
 * Trigger chain reaction with nearby barrels
 */
function triggerChainReaction(k, x, y, radius, sourceBarrelId) {
    // Find barrels in range (slightly larger than explosion for chain feel)
    const chainRadius = radius * 1.2;

    allBarrels.forEach(barrel => {
        if (!barrel.exists() || barrel.isExploding || barrel.barrelId === sourceBarrelId) return;

        const dist = k.vec2(barrel.pos.x - x, barrel.pos.y - y).len();
        if (dist <= chainRadius) {
            // Damage the barrel, potentially causing it to explode
            barrel.takeDamage(barrel.maxHealth, sourceBarrelId); // Instant kill for chain
        }
    });
}

/**
 * Get all active barrels
 */
export function getAllBarrels() {
    return allBarrels.filter(b => b.exists());
}

/**
 * Find a barrel by position (for multiplayer sync)
 * Uses position matching since IDs may differ between host/client
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} tolerance - Position tolerance (default 5)
 * @returns {object|null} - Barrel entity or null
 */
export function findBarrelByPosition(x, y, tolerance = 5) {
    return allBarrels.find(barrel => {
        if (!barrel.exists() || barrel.isExploding) return false;
        const dx = Math.abs(barrel.pos.x - x);
        const dy = Math.abs(barrel.pos.y - y);
        return dx <= tolerance && dy <= tolerance;
    }) || null;
}

/**
 * Clear all barrels (for room transitions)
 */
export function clearAllBarrels() {
    allBarrels.forEach(barrel => {
        if (barrel.exists()) {
            if (barrel.healthBarBg && barrel.healthBarBg.exists()) {
                barrel.healthBarBg.destroy();
            }
            if (barrel.healthBarFill && barrel.healthBarFill.exists()) {
                barrel.healthBarFill.destroy();
            }
            barrel.destroy();
        }
    });
    allBarrels = [];
}

/**
 * Handle barrel collision with projectiles
 * Call this from the combat system
 */
export function handleProjectileBarrelCollision(k, projectile, barrel) {
    if (!barrel.exists() || barrel.isExploding) return;

    barrel.takeDamage(1);

    // Destroy the projectile unless it pierces
    if (!projectile.piercing || projectile.piercing <= 0) {
        if (projectile.exists()) k.destroy(projectile);
    }
}

export { BARREL_CONFIG };
