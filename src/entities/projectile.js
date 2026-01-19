/**
 * Projectile Entity
 *
 * Creates and manages bullet/projectile entities:
 * - Player and enemy projectiles
 * - Piercing mechanics (enemy and obstacle)
 * - Critical hit visual feedback
 * - Range limiting
 * - Lifetime tracking
 * - Collision detection and cleanup
 * - Object pooling support for performance
 */

// Configuration imports
import { WEAPON_CONFIG } from '../config/constants.js';
import { registerProjectile, isHost, isMultiplayerActive, unregisterProjectile } from '../systems/multiplayerGame.js';
import { getProjectilePool } from '../systems/objectPool.js';

// Track projectiles that use pooling for proper cleanup
let pooledProjectileUpdateHandler = null;

export function createProjectile(k, x, y, direction, speed, damage, piercing = 0, obstaclePiercing = 0, isCrit = false, maxRange = null) {
    // Calculate rotation angle from direction vector
    // Add 90 degrees offset since most bullet characters (like │) are vertical by default
    const angle = (Math.atan2(direction.y, direction.x) * (180 / Math.PI)) + 90;

    const projectile = k.add([
        k.text('*', { size: 16 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(isCrit ? 255 : 255, isCrit ? 200 : 255, isCrit ? 0 : 100), // Orange/red for crits
        k.rotate(angle), // Rotate to face direction of travel
        k.area(),
        'projectile'
    ]);

    projectile.damage = damage;
    projectile.piercing = piercing; // Number of enemies this can pass through
    projectile.obstaclePiercing = obstaclePiercing; // Number of obstacles this can pass through (separate from enemy piercing)
    projectile.piercedEnemies = new Set(); // Track which enemies this has already hit
    projectile.piercedObstacles = new Set(); // Track which obstacles this has already hit
    projectile.isCrit = isCrit;
    // Set max range - use provided range or default
    projectile.maxRange = maxRange || WEAPON_CONFIG.DEFAULT_WEAPON_RANGE;
    projectile.distanceTraveled = 0;
    projectile.direction = direction; // Store direction for manual movement
    projectile.speed = speed; // Store speed for manual movement

    // Boomerang properties (set by weapon system when creating boomerang projectiles)
    projectile.isBoomerang = false;
    projectile.isReturning = false;
    projectile.ownerPlayer = null; // Reference to player for return targeting
    projectile.returnSpeedMultiplier = 1.2;
    
    // Method to apply weapon visual properties
    projectile.useWeaponVisual = function(weaponDef) {
        if (weaponDef && weaponDef.char) {
            // Update text directly (KAPLAY allows direct text assignment)
            projectile.text = weaponDef.char;
        }
        if (weaponDef && weaponDef.color) {
            // Keep crit color if it's a crit, otherwise use weapon color
            if (!projectile.isCrit) {
                projectile.color = k.rgb(...weaponDef.color);
            }
        }
        if (weaponDef && weaponDef.range) {
            projectile.maxRange = weaponDef.range;
        }
    };

    // Manual movement and range management
    projectile.onUpdate(() => {
        if (k.paused) return;

        // Boomerang return logic
        if (projectile.isBoomerang) {
            if (!projectile.isReturning) {
                // Moving outward
                const moveAmount = projectile.direction.scale(projectile.speed * k.dt());
                projectile.distanceTraveled += moveAmount.len();

                projectile.pos.x += moveAmount.x;
                projectile.pos.y += moveAmount.y;

                // Check if should start returning
                if (projectile.distanceTraveled >= projectile.maxRange) {
                    projectile.isReturning = true;
                    projectile.piercedEnemies.clear(); // Reset hit tracking so it can hit enemies on return
                    projectile.distanceTraveled = 0;
                }
            } else {
                // Returning to player
                if (projectile.ownerPlayer && projectile.ownerPlayer.exists() && !projectile.ownerPlayer.isDead) {
                    const toPlayer = k.vec2(
                        projectile.ownerPlayer.pos.x - projectile.pos.x,
                        projectile.ownerPlayer.pos.y - projectile.pos.y
                    );
                    const distToPlayer = toPlayer.len();

                    // Move toward player
                    if (distToPlayer > 0) {
                        const returnDir = toPlayer.unit();
                        const returnSpeed = projectile.speed * projectile.returnSpeedMultiplier;
                        const moveAmount = returnDir.scale(returnSpeed * k.dt());

                        projectile.pos.x += moveAmount.x;
                        projectile.pos.y += moveAmount.y;
                        projectile.direction = returnDir; // Update direction for rotation

                        // Destroy when close to player
                        if (distToPlayer < 30) {
                            k.destroy(projectile);
                            return;
                        }
                    }
                } else {
                    // No player to return to - destroy
                    k.destroy(projectile);
                    return;
                }
            }

            // Update rotation for boomerang visual
            const angle = (Math.atan2(projectile.direction.y, projectile.direction.x) * (180 / Math.PI)) + 90;
            projectile.angle = angle;
            return;
        }

        // Normal projectile movement
        const moveAmount = projectile.direction.scale(projectile.speed * k.dt());
        const distanceThisFrame = moveAmount.len();
        projectile.distanceTraveled += distanceThisFrame;

        projectile.pos.x += moveAmount.x;
        projectile.pos.y += moveAmount.y;

        // Remove if exceeded max range
        if (projectile.distanceTraveled >= projectile.maxRange) {
            k.destroy(projectile);
            return;
        }

        // Remove if out of bounds
        if (projectile.pos.x < 0 || projectile.pos.x > k.width() ||
            projectile.pos.y < 0 || projectile.pos.y > k.height()) {
            k.destroy(projectile);
        }
    });

    // Multiplayer: Register projectile for network sync if host
    if (isMultiplayerActive() && isHost()) {
        registerProjectile(projectile);
    }

    // Cleanup: Remove from tracking map when destroyed (prevents memory leak)
    if (isMultiplayerActive()) {
        projectile.onDestroy(() => {
            unregisterProjectile(projectile);
        });
    }

    return projectile;
}

/**
 * Release a projectile back to the pool instead of destroying it
 * Falls back to k.destroy if pooling is not enabled
 * @param {Object} k - Kaplay instance
 * @param {Object} projectile - The projectile to release
 */
export function releaseProjectile(k, projectile) {
    if (!projectile || !projectile.exists()) return;

    // Unregister from multiplayer tracking
    if (isMultiplayerActive()) {
        unregisterProjectile(projectile);
    }

    // Try to release to pool, otherwise destroy
    const pool = getProjectilePool();
    if (pool && projectile._pooled) {
        pool.release(projectile);
    } else {
        k.destroy(projectile);
    }
}

