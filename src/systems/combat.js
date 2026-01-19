/**
 * Combat System
 *
 * Handles all combat mechanics including:
 * - Autofire system for player weapons
 * - Projectile spawning with spread patterns
 * - Critical hit calculations
 * - Damage calculations with defense
 * - Orbital weapon mechanics
 * - Enemy collision and knockback
 * - Player damage and invulnerability frames
 */

// Entity imports
import { createProjectile } from '../entities/projectile.js';

// System imports
import { decrementPowerupAmmo } from './powerupWeapons.js';
import { broadcastDamageEvent, isMultiplayerActive, isHost, registerProjectile } from './multiplayerGame.js';

// Configuration imports
import {
    COMBAT_CONFIG,
    WEAPON_CONFIG,
    rollCriticalHit,
    calculateCriticalDamage,
    calculateDamageAfterDefense
} from '../config/constants.js';

// Sound system imports
import {
    playWeaponFire,
    playEnemyHit,
    playPlayerHit,
    playExplosion
} from './sounds.js';

// Particle system imports
import {
    spawnBloodSplatter,
    spawnHitImpact,
    spawnDeathExplosion
} from './particleSystem.js';

// Visual effects imports
import { screenShake, hitFreeze, EffectPresets } from './visualEffects.js';

// Helper function to apply knockback while respecting collisions and room boundaries
function applySafeKnockback(k, entity, knockbackDir, knockbackAmount) {
    if (!entity || !entity.exists()) return;

    const roomMargin = 20; // Keep entities away from room edges
    const maxX = k.width() - roomMargin;
    const maxY = k.height() - roomMargin;
    const minX = roomMargin;
    const minY = roomMargin;

    // Calculate new position
    const newX = entity.pos.x + knockbackDir.x * knockbackAmount;
    const newY = entity.pos.y + knockbackDir.y * knockbackAmount;

    // Constrain to room boundaries first
    const boundedX = Math.max(minX, Math.min(maxX, newX));
    const boundedY = Math.max(minY, Math.min(maxY, newY));

    // Store original position
    const originalX = entity.pos.x;
    const originalY = entity.pos.y;

    // Try to move to new position
    entity.pos.x = boundedX;
    entity.pos.y = boundedY;

    // Check for collision with walls or obstacles
    const walls = k.get('wall');
    const obstacles = k.get('obstacle');
    const allObstacles = [...walls, ...obstacles];

    let colliding = false;
    for (const obstacle of allObstacles) {
        if (!obstacle.exists()) continue;

        // Check if entity area overlaps with obstacle
        if (entity.isColliding && entity.isColliding(obstacle)) {
            colliding = true;
            break;
        }
    }

    // If colliding, revert to original position
    if (colliding) {
        entity.pos.x = originalX;
        entity.pos.y = originalY;
    }
}

export function setupCombatSystem(k, player) {
    let lastFireTime = 0;

    // Initialize orbital weapons if applicable
    if (player.weaponKey === 'orbital') {
        initializeOrbitalWeapons(k, player);
    }

    // Autofire system
    k.onUpdate(() => {
        if (k.paused) return;

        // Update player rotation based on mouse/aim (always, even when not shooting)
        if (!player.isRemote) {
            const mousePos = k.mousePos();
            const toMouse = k.vec2(
                mousePos.x - player.pos.x,
                mousePos.y - player.pos.y
            );
            const distance = toMouse.len();
            if (distance > 0) {
                // Convert to degrees for Kaplay's rotate component
                const aimAngleDeg = Math.atan2(toMouse.y, toMouse.x) * (180 / Math.PI);
                player.angle = aimAngleDeg;
                if (player.outline && player.outline.exists()) {
                    player.outline.angle = aimAngleDeg;
                }
            }
        } else if (player.aimAngle !== undefined) {
            // Remote player rotation from network (already in degrees)
            player.angle = player.aimAngle;
            if (player.outline && player.outline.exists()) {
                player.outline.angle = player.aimAngle;
            }
        }

        // Don't allow shooting if canShoot is false (e.g., player is dead)
        if (player.canShoot === false) {
            player.isShooting = false; // Track shooting state for multiplayer
            return;
        }

        // Check if there are any enemies in the room (enemies, bosses, minibosses)
        const enemies = k.get('enemy');
        const bosses = k.get('boss');
        const minibosses = k.get('miniboss');
        const hasTargets = enemies.length > 0 || bosses.length > 0 || minibosses.length > 0;

        // Don't shoot if there are no targets (except orbital weapons which are passive)
        if (!hasTargets && player.weaponKey !== 'orbital') {
            player.isShooting = false; // Track shooting state for multiplayer
            return;
        }

        // Handle orbital weapons (passive, no firing needed)
        if (player.weaponKey === 'orbital') {
            updateOrbitalWeapons(k, player);
            player.isShooting = false; // Orbital weapons don't shoot
            return; // Orbital weapons don't fire projectiles
        }

        const time = k.time();

        let baseDirection;
        let shouldFire = false;

        // For remote players, use their aimAngle from network
        // For local players, use mouse position
        if (player.isRemote) {
            // Remote player: in multiplayer, projectiles are spawned on the host only
            // Remote players don't spawn projectiles on clients to avoid duplicates
            if (isMultiplayerActive() && !isHost()) {
                player.isShooting = false;
                return; // Projectiles for remote players are handled by host
            }

            // Host: use aimAngle from network input for remote players
            if (player.aimAngle !== undefined && player.isShooting) {
                const angleRad = player.aimAngle * (Math.PI / 180);
                baseDirection = k.vec2(Math.cos(angleRad), Math.sin(angleRad));
                shouldFire = true;
            } else {
                player.isShooting = false;
                return; // No aim angle or not shooting
            }
        } else {
            // Local player: use mouse position
            const mousePos = k.mousePos();

            // Calculate direction to mouse
            const toMouse = k.vec2(
                mousePos.x - player.pos.x,
                mousePos.y - player.pos.y
            );
            const distance = toMouse.len();

            // Track aim angle for multiplayer (angle in degrees from player to mouse)
            if (distance > 0) {
                player.aimAngle = Math.atan2(toMouse.y, toMouse.x) * (180 / Math.PI);
                baseDirection = toMouse.unit();

                // In multiplayer as client, don't spawn projectiles locally
                // Only the host spawns projectiles for all players
                if (isMultiplayerActive() && !isHost()) {
                    player.isShooting = distance > 0 && player.canShoot;
                    return; // Host will spawn projectiles based on our input
                }

                shouldFire = true;
            } else {
                player.aimAngle = 0;
                player.isShooting = false;
                return; // No mouse movement
            }

            // Track shooting state for multiplayer
            player.isShooting = distance > 0 && player.canShoot;
        }

        if (shouldFire && baseDirection) {
            
            // Calculate effective fire rate (with bulletTime bonus if moving)
            let effectiveFireRate = player.fireRate;
            if (player.bulletTimeEnabled && player.bulletTimeBonus && player.move) {
                const isMoving = player.move.x !== 0 || player.move.y !== 0;
                if (isMoving) {
                    effectiveFireRate = player.fireRate * (1 + player.bulletTimeBonus);
                }
            }

            // Fire if enough time has passed
            if (time - lastFireTime >= 1 / effectiveFireRate) {
                const projectileCount = player.projectileCount || 1;
                const spreadAngle = player.spreadAngle || 0;
                
                // Calculate spread directions
                const directions = [];
                if (projectileCount === 1) {
                    directions.push(baseDirection);
                } else if (spreadAngle > 0) {
                    // Spread pattern (shotgun)
                    const angleStep = projectileCount > 1 ? spreadAngle / (projectileCount - 1) : 0;
                    const startAngle = -spreadAngle / 2;
                    for (let i = 0; i < projectileCount; i++) {
                        const angle = startAngle + (angleStep * i);
                        const rad = angle * (Math.PI / 180);
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const dir = k.vec2(
                            baseDirection.x * cos - baseDirection.y * sin,
                            baseDirection.x * sin + baseDirection.y * cos
                        );
                        directions.push(dir.unit());
                    }
                } else {
                    // Multi-shot without spread (all same direction)
                    for (let i = 0; i < projectileCount; i++) {
                        directions.push(baseDirection);
                    }
                }
                
                // Fire all projectiles
                directions.forEach((direction, index) => {
                    // Small delay for multi-shot without spread (staggered)
                    const delay = spreadAngle === 0 && projectileCount > 1
                        ? index * COMBAT_CONFIG.MULTISHOT_STAGGER_DELAY
                        : 0;

                    k.wait(delay, () => {
                        // Check for critical hit
                        const isCrit = rollCriticalHit(player.critChance || 0);
                        let finalDamage = isCrit
                            ? calculateCriticalDamage(player.projectileDamage, player.critDamage || 2.0)
                            : player.projectileDamage;

                        // Apply synergy bonuses (e.g., armor piercing)
                        if (player.piercingDamageBonus && (player.piercing || 0) > 0) {
                            finalDamage = Math.floor(finalDamage * player.piercingDamageBonus);
                        }

                        // Use weapon's character and color for projectiles
                        const weaponRange = player.weaponRange || WEAPON_CONFIG.DEFAULT_WEAPON_RANGE;

                        // Play weapon firing sound
                        playWeaponFire(player.weaponKey);

                        // Handle special weapon types
                        if (player.weaponKey === 'flamethrower') {
                            // Flamethrower - create projectile with burn DoT effect
                            const projectile = createProjectile(k, player.pos.x, player.pos.y, direction,
                                player.projectileSpeed, finalDamage,
                                player.piercing || 0, player.obstaclePiercing || 0, isCrit, weaponRange);

                            // Apply weapon visual properties
                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
                            }

                            // Track projectile owner for kill attribution
                            projectile.ownerSlotIndex = player.slotIndex;

                            // Add burn DoT effect
                            const burnDamagePerTick = Math.floor(finalDamage * 0.3); // 30% of hit damage per tick
                            const burnDuration = 2.0; // 2 seconds of burn
                            const dotMultiplier = player.fireDotMultiplier || 1.0;

                            projectile.burnDamage = Math.floor(burnDamagePerTick * dotMultiplier);
                            projectile.burnDuration = burnDuration;

                            // Register projectile for multiplayer sync
                            if (isMultiplayerActive() && isHost()) {
                                registerProjectile(projectile, {
                                    weaponKey: player.weaponKey,
                                    burnDamage: projectile.burnDamage,
                                    burnDuration: projectile.burnDuration
                                });
                            }
                        } else if (player.weaponKey === 'explosive') {
                            // Explosive launcher - create explosive projectile
                            const projectile = createExplosiveProjectile(k, player.pos.x, player.pos.y, direction,
                                player.projectileSpeed, finalDamage,
                                player.explosionRadius, player.explosionDamage, weaponRange, isCrit);
                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
                            }

                            // Track projectile owner for kill attribution
                            projectile.ownerSlotIndex = player.slotIndex;

                            // Register projectile for multiplayer sync
                            if (isMultiplayerActive() && isHost()) {
                                registerProjectile(projectile, {
                                    weaponKey: player.weaponKey,
                                    explosionRadius: projectile.explosionRadius,
                                    explosionDamage: projectile.explosionDamage
                                });
                            }
                        } else if (player.weaponKey === 'chainLightning') {
                            // Chain lightning - create chaining projectile
                            const projectile = createChainProjectile(k, player.pos.x, player.pos.y, direction,
                                player.projectileSpeed, finalDamage,
                                player.chainRange, player.maxJumps, player.chainDamageReduction, weaponRange, isCrit);
                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
                            }

                            // Track projectile owner for kill attribution
                            projectile.ownerSlotIndex = player.slotIndex;

                            // Register projectile for multiplayer sync
                            if (isMultiplayerActive() && isHost()) {
                                registerProjectile(projectile, {
                                    weaponKey: player.weaponKey,
                                    chainRange: projectile.chainRange,
                                    maxJumps: projectile.maxJumps,
                                    chainDamageReduction: projectile.chainDamageReduction
                                });
                            }
                        } else if (player.weaponKey === 'boomerang') {
                            // Boomerang - create returning projectile
                            const projectile = createProjectile(k, player.pos.x, player.pos.y, direction,
                                player.projectileSpeed, finalDamage,
                                player.piercing || 0, player.obstaclePiercing || 0, isCrit, weaponRange);

                            // Set boomerang properties
                            projectile.isBoomerang = true;
                            projectile.ownerPlayer = player;
                            projectile.returnSpeedMultiplier = player.weaponDef?.returnSpeedMultiplier || 1.2;

                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
                            }

                            // Track projectile owner for kill attribution
                            projectile.ownerSlotIndex = player.slotIndex;

                            // Register projectile for multiplayer sync
                            if (isMultiplayerActive() && isHost()) {
                                registerProjectile(projectile, {
                                    weaponKey: player.weaponKey,
                                    isBoomerang: true
                                });
                            }
                        } else {
                            // Standard projectile
                            const projectile = createProjectile(k, player.pos.x, player.pos.y, direction,
                                player.projectileSpeed, finalDamage,
                                player.piercing || 0, player.obstaclePiercing || 0, isCrit, weaponRange);

                            // Apply weapon visual properties
                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
                            }

                            // Track projectile owner for kill attribution
                            projectile.ownerSlotIndex = player.slotIndex;

                            // Register projectile for multiplayer sync
                            if (isMultiplayerActive() && isHost()) {
                                registerProjectile(projectile, {
                                    weaponKey: player.weaponKey || 'pistol'
                                });
                            }
                        }
                    });
                });

                lastFireTime = time;

                // Decrement powerup weapon ammo if applicable
                decrementPowerupAmmo(player);
            }
        }
    });

    // Collision: Projectile hits Wall (consolidated handler)
    k.onCollide('projectile', 'wall', (projectile, wall) => {
        if (k.paused) return;

        // Handle explosive projectiles
        if (projectile.isExplosive) {
            explodeProjectile(k, projectile, projectile.pos.x, projectile.pos.y);
            return;
        }

        // Check if projectile has already hit this obstacle (for obstacle piercing)
        if (projectile.piercedObstacles && projectile.piercedObstacles.has(wall)) {
            return; // Already hit this obstacle
        }

        // Check if projectile can pierce obstacles
        if (projectile.obstaclePiercing > 0) {
            // Track this obstacle for piercing
            if (projectile.piercedObstacles) {
                projectile.piercedObstacles.add(wall);
            }

            // Destroy projectile if it can't pierce anymore obstacles
            // If obstaclePiercing = n, projectile can hit n+1 obstacles total
            if (projectile.piercedObstacles.size > (projectile.obstaclePiercing || 0)) {
                k.destroy(projectile);
            }
        } else {
            // No obstacle piercing - destroy projectile
            k.destroy(projectile);
        }
    });
    
    // Collision: Projectile hits Cover (check obstacle piercing)
    k.onCollide('projectile', 'cover', (projectile, cover) => {
        if (k.paused) return;
        
        // Cover allows projectiles through by default, but we can still track for piercing
        // Only destroy if projectile has hit max obstacles
        if (projectile.obstaclePiercing > 0 && projectile.piercedObstacles) {
            if (projectile.piercedObstacles.has(cover)) {
                return; // Already hit this obstacle
            }
            
            projectile.piercedObstacles.add(cover);
            
            // Destroy projectile if it can't pierce anymore obstacles
            if (projectile.piercedObstacles.size > (projectile.obstaclePiercing || 0)) {
                k.destroy(projectile);
            }
        }
        // If no obstacle piercing, projectile passes through cover (cover behavior)
    });

    // Collision: Projectile hits Obstacle (check obstacle piercing)
    k.onCollide('projectile', 'obstacle', (projectile, obstacle) => {
        if (k.paused) return;

        // Explosive projectiles are handled separately
        if (projectile.isExplosive) {
            return;
        }

        // Check if projectile has already hit this obstacle (for obstacle piercing)
        if (projectile.piercedObstacles && projectile.piercedObstacles.has(obstacle)) {
            return; // Already hit this obstacle
        }

        // Check if projectile can pierce obstacles
        if (projectile.obstaclePiercing > 0) {
            // Track this obstacle for piercing
            if (projectile.piercedObstacles) {
                projectile.piercedObstacles.add(obstacle);
            }

            // Destroy projectile if it can't pierce anymore obstacles
            if (projectile.piercedObstacles.size > (projectile.obstaclePiercing || 0)) {
                k.destroy(projectile);
            }
        } else {
            // No obstacle piercing - destroy projectile
            k.destroy(projectile);
        }
    });

    // Collision: Projectile hits Enemy (consolidated handler for all projectile types)
    k.onCollide('projectile', 'enemy', (projectile, enemy) => {
        if (k.paused) return;

        // Only player projectiles can hit enemies (enemy/boss projectiles pass through)
        if (projectile.isEnemyProjectile || projectile.isBossProjectile) {
            return;
        }

        // Check if enemy reflects projectiles (reflector enemy type)
        // Max 2 bounces to prevent infinite loops, damage reduced by 30% per bounce
        const maxReflections = 2;
        const reflectionCount = projectile.reflectionCount || 0;
        if (enemy.reflectsProjectiles && !projectile.isReflected && reflectionCount < maxReflections) {
            const reflectRoll = Math.random();
            if (reflectRoll < (enemy.reflectChance || 0.4)) {
                // Reflect the projectile back at the player
                projectile.isReflected = true;
                projectile.reflectionCount = reflectionCount + 1;
                projectile.isEnemyProjectile = true; // Now damages player instead
                projectile.direction = k.vec2(-projectile.direction.x, -projectile.direction.y); // Reverse direction
                projectile.color = k.rgb(255, 100, 100); // Change color to indicate reflected
                // Reduce damage by 30% per reflection to prevent reflected projectiles being too strong
                projectile.damage = Math.floor(projectile.damage * 0.7);

                // Visual feedback for reflection
                const reflectEffect = k.add([
                    k.text('*', { size: 20 }),
                    k.pos(enemy.pos.x, enemy.pos.y),
                    k.anchor('center'),
                    k.color(200, 200, 255),
                    k.opacity(1),
                    k.lifespan(0.3),
                    k.z(500)
                ]);
                return; // Don't damage the enemy
            }
        }

        // Handle explosive projectiles
        if (projectile.isExplosive) {
            explodeProjectile(k, projectile, enemy.pos.x, enemy.pos.y);
            return;
        }

        // Handle chain lightning projectiles
        if (projectile.isChainLightning) {
            // Check if already hit this enemy
            if (projectile.chainedEnemies && projectile.chainedEnemies.has(enemy)) {
                return;
            }

            // Only host deals damage in multiplayer
            if (!isMultiplayerActive() || isHost()) {
                // Calculate damage (reduces per jump)
                const jumpCount = projectile.chainJumps || 0;
                const damageReduction = 1 - (projectile.chainDamageReduction || 0.15) * jumpCount;
                const finalDamage = Math.floor(projectile.damage * Math.max(0.1, damageReduction));

                // Deal damage
                if (enemy.takeDamage) {
                    enemy.takeDamage(finalDamage);
                } else {
                    enemy.hurt(finalDamage);
                }
            }

            // Track this enemy (visual tracking on all clients)
            if (projectile.chainedEnemies) {
                projectile.chainedEnemies.add(enemy);
            }

            // Chain to next enemy if jumps remaining (visual chaining on all clients)
            if (projectile.chainJumps < projectile.maxJumps) {
                chainToNextEnemy(k, projectile, enemy);
            } else {
                // No more jumps, destroy projectile
                k.destroy(projectile);
            }
            return;
        }

        // Check if this projectile has already hit this enemy (for piercing)
        if (projectile.piercedEnemies && projectile.piercedEnemies.has(enemy)) {
            return; // Already hit this enemy
        }

        // In multiplayer, only host deals damage
        // Clients just show visual effects
        if (isMultiplayerActive() && !isHost()) {
            // Client: show visual feedback only
            playEnemyHit();
            spawnBloodSplatter(k, enemy.pos.x, enemy.pos.y, { isCrit: projectile.isCrit });

            // Track for piercing and destroy projectile as needed
            if (projectile.piercedEnemies) {
                projectile.piercedEnemies.add(enemy);
            }
            if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
                k.destroy(projectile);
            }
            return; // Skip damage dealing on client
        }

        // Host or singleplayer: deal damage
        playEnemyHit();

        // Use takeDamage if available (handles armor/shields), otherwise use hurt
        if (enemy.takeDamage) {
            enemy.takeDamage(projectile.damage);
        } else {
            enemy.hurt(projectile.damage);
        }

        // Vampiric Rounds synergy: heal player on crit damage
        if (projectile.isCrit && projectile.ownerSlotIndex !== undefined) {
            // Find the player who owns this projectile
            const allPlayers = k.get('player');
            const ownerPlayer = allPlayers.find(p => p.slotIndex === projectile.ownerSlotIndex);
            if (ownerPlayer && ownerPlayer.vampiricCrits && ownerPlayer.vampiricHealPercent) {
                const healAmount = Math.floor(projectile.damage * ownerPlayer.vampiricHealPercent);
                if (healAmount > 0 && ownerPlayer.hp() < ownerPlayer.maxHealth) {
                    const newHP = Math.min(ownerPlayer.maxHealth, ownerPlayer.hp() + healAmount);
                    ownerPlayer.setHP(newHP);
                }
            }
        }

        // Track who last hit this enemy for kill attribution
        if (projectile.ownerSlotIndex !== undefined) {
            enemy.lastHitBySlot = projectile.ownerSlotIndex;
        }

        // Broadcast damage event for multiplayer
        if (isMultiplayerActive() && isHost()) {
            broadcastDamageEvent({
                targetId: enemy.mpEntityId,
                targetType: 'enemy',
                damage: projectile.damage,
                isCrit: projectile.isCrit || false,
                x: enemy.pos.x,
                y: enemy.pos.y
            });
        }

        // Apply fire DoT if projectile has burn effect
        if (projectile.burnDamage && projectile.burnDuration) {
            enemy.burnDamage = projectile.burnDamage;
            enemy.burnDuration = projectile.burnDuration;
            enemy.burnTimer = 0;
        }

        // Spawn blood splatter particle effect
        spawnBloodSplatter(k, enemy.pos.x, enemy.pos.y, { isCrit: projectile.isCrit });

        // Track this enemy for piercing
        if (projectile.piercedEnemies) {
            projectile.piercedEnemies.add(enemy);
        }

        // Destroy projectile if it can't pierce anymore
        // If piercing = n, projectile can hit n+1 enemies total
        // piercing = 0: hit 1 enemy, piercing = 1: hit 2 enemies, etc.
        if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
            k.destroy(projectile);
        }

        // Knockback enemy away from projectile direction
        const knockbackDir = k.vec2(
            enemy.pos.x - projectile.pos.x,
            enemy.pos.y - projectile.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = COMBAT_CONFIG.KNOCKBACK_ENEMY_FROM_PROJECTILE;
            applySafeKnockback(k, enemy, normalized, knockbackAmount);
        }

        // Spawn hit impact particle effect
        spawnHitImpact(k, enemy.pos.x, enemy.pos.y, knockbackDir, { isCrit: projectile.isCrit });

        // Screen effects for crits
        if (projectile.isCrit) {
            EffectPresets.criticalHit();
        }

        // Visual feedback (different color for crits)
        enemy.color = projectile.isCrit
            ? k.rgb(...COMBAT_CONFIG.CRIT_COLOR)
            : k.rgb(...COMBAT_CONFIG.HIT_COLOR);
        k.wait(COMBAT_CONFIG.HIT_FLASH_DURATION, () => {
            if (enemy.exists()) {
                enemy.color = k.rgb(255, 100, 100);
            }
        });
    });
    
    // Collision: Projectile hits Boss (consolidated handler for all projectile types)
    k.onCollide('projectile', 'boss', (projectile, boss) => {
        if (k.paused) return;

        // Handle explosive projectiles
        if (projectile.isExplosive) {
            explodeProjectile(k, projectile, boss.pos.x, boss.pos.y);
            return;
        }

        // Handle chain lightning projectiles
        if (projectile.isChainLightning) {
            // Check if already hit this boss
            if (projectile.chainedEnemies && projectile.chainedEnemies.has(boss)) {
                return;
            }

            // Only host deals damage in multiplayer
            if (!isMultiplayerActive() || isHost()) {
                // Calculate damage (reduces per jump)
                const jumpCount = projectile.chainJumps || 0;
                const damageReduction = 1 - (projectile.chainDamageReduction || 0.15) * jumpCount;
                const finalDamage = Math.floor(projectile.damage * Math.max(0.1, damageReduction));

                // Deal damage
                if (boss.takeDamage) {
                    boss.takeDamage(finalDamage);
                } else {
                    boss.hurt(finalDamage);
                }
            }

            // Track this boss (visual tracking on all clients)
            if (projectile.chainedEnemies) {
                projectile.chainedEnemies.add(boss);
            }

            // Chain to next enemy if jumps remaining
            k.wait(0.01, () => {
                if (!projectile.exists()) return;
                if (projectile.chainJumps < projectile.maxJumps) {
                    chainToNextEnemy(k, projectile, boss);
                } else {
                    k.destroy(projectile);
                }
            });
            return;
        }

        // Handle regular projectiles
        // Check if this projectile has already hit this boss (for piercing)
        if (projectile.piercedEnemies && projectile.piercedEnemies.has(boss)) {
            return;
        }

        // In multiplayer, only host deals damage
        if (isMultiplayerActive() && !isHost()) {
            spawnBloodSplatter(k, boss.pos.x, boss.pos.y, { isCrit: projectile.isCrit });
            const knockbackDir = k.vec2(boss.pos.x - projectile.pos.x, boss.pos.y - projectile.pos.y);
            spawnHitImpact(k, boss.pos.x, boss.pos.y, knockbackDir, { isCrit: projectile.isCrit });

            if (projectile.piercedEnemies) {
                projectile.piercedEnemies.add(boss);
            }
            if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
                k.destroy(projectile);
            }
            return;
        }

        // Host or singleplayer: deal damage
        if (boss.takeDamage) {
            boss.takeDamage(projectile.damage);
        } else {
            boss.hurt(projectile.damage);
        }

        // Track who last hit this boss for kill attribution
        if (projectile.ownerSlotIndex !== undefined) {
            boss.lastHitBySlot = projectile.ownerSlotIndex;
        }

        // Apply fire DoT
        if (projectile.burnDamage && projectile.burnDuration) {
            boss.burnDamage = projectile.burnDamage;
            boss.burnDuration = projectile.burnDuration;
            boss.burnTimer = 0;
        }

        spawnBloodSplatter(k, boss.pos.x, boss.pos.y, { isCrit: projectile.isCrit });

        if (projectile.piercedEnemies) {
            projectile.piercedEnemies.add(boss);
        }

        if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
            k.destroy(projectile);
        }

        // Knockback
        const knockbackDir = k.vec2(boss.pos.x - projectile.pos.x, boss.pos.y - projectile.pos.y);
        if (knockbackDir.len() > 0) {
            applySafeKnockback(k, boss, knockbackDir.unit(), COMBAT_CONFIG.KNOCKBACK_BOSS_FROM_PROJECTILE);
        }

        spawnHitImpact(k, boss.pos.x, boss.pos.y, knockbackDir, { isCrit: projectile.isCrit });

        // Screen effects for boss hits and crits
        if (projectile.isCrit) {
            EffectPresets.criticalHit();
        } else {
            EffectPresets.bossHit();
        }

        boss.color = projectile.isCrit ? k.rgb(255, 200, 0) : k.rgb(255, 255, 255);
        k.wait(0.1, () => {
            if (boss.exists()) boss.updateVisual();
        });
    });

    // Collision: Projectile hits Miniboss
    k.onCollide('projectile', 'miniboss', (projectile, miniboss) => {
        if (k.paused) return;

        // Only player projectiles can hit minibosses
        if (projectile.isEnemyProjectile || projectile.isBossProjectile) {
            return;
        }

        // Check if this projectile has already hit this miniboss (for piercing)
        if (projectile.piercedEnemies && projectile.piercedEnemies.has(miniboss)) {
            return; // Already hit this miniboss
        }

        // In multiplayer, only host deals damage
        // Clients just show visual effects
        if (isMultiplayerActive() && !isHost()) {
            // Client: show visual feedback only
            spawnBloodSplatter(k, miniboss.pos.x, miniboss.pos.y, { isCrit: projectile.isCrit });
            const impactDir = k.vec2(miniboss.pos.x - projectile.pos.x, miniboss.pos.y - projectile.pos.y);
            spawnHitImpact(k, miniboss.pos.x, miniboss.pos.y, impactDir, { isCrit: projectile.isCrit });

            // Track for piercing and destroy projectile as needed
            if (projectile.piercedEnemies) {
                projectile.piercedEnemies.add(miniboss);
            }
            if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
                k.destroy(projectile);
            }
            return; // Skip damage dealing on client
        }

        // Host or singleplayer: deal damage
        // Calculate final damage (with crit)
        let finalDamage = projectile.damage;
        if (projectile.isCrit) {
            finalDamage = Math.floor(finalDamage * 1.5); // 50% crit bonus
        }

        // Use takeDamage to handle armor/shields
        miniboss.takeDamage(finalDamage);

        // Track who last hit this miniboss for kill attribution
        if (projectile.ownerSlotIndex !== undefined) {
            miniboss.lastHitBySlot = projectile.ownerSlotIndex;
        }

        // Apply fire DoT if projectile has burn effect
        if (projectile.burnDamage && projectile.burnDuration) {
            miniboss.burnDamage = projectile.burnDamage;
            miniboss.burnDuration = projectile.burnDuration;
            miniboss.burnTimer = 0;
        }

        // Spawn blood splatter particle effect
        spawnBloodSplatter(k, miniboss.pos.x, miniboss.pos.y, { isCrit: projectile.isCrit });

        // Spawn hit impact particle effect
        const impactDir = k.vec2(miniboss.pos.x - projectile.pos.x, miniboss.pos.y - projectile.pos.y);
        spawnHitImpact(k, miniboss.pos.x, miniboss.pos.y, impactDir, { isCrit: projectile.isCrit });

        // Screen effects for crits
        if (projectile.isCrit) {
            EffectPresets.criticalHit();
        }

        // Track this miniboss for piercing
        if (projectile.piercedEnemies) {
            projectile.piercedEnemies.add(miniboss);
        }
        
        // Destroy projectile if it can't pierce anymore
        if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
            k.destroy(projectile);
        }
        
        // Visual feedback (different color for crits)
        miniboss.color = projectile.isCrit ? k.rgb(255, 200, 0) : k.rgb(255, 255, 255);
        k.wait(0.1, () => {
            if (miniboss.exists()) {
                // Restore miniboss color (will be updated by updateVisual if armor/shield changed)
                miniboss.updateVisual();
            }
        });
    });

    // Collision: Enemy hits Player
    k.onCollide('enemy', 'player', (enemy, player) => {
        if (k.paused) return;

        // Don't damage dead players
        if (player.isDead || player.hp() <= 0) return;

        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;

        // In multiplayer, only host processes damage
        if (isMultiplayerActive() && !isHost()) {
            // Client: show visual feedback only
            playPlayerHit();
            spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });
            player.color = k.rgb(...COMBAT_CONFIG.HIT_COLOR);
            return;
        }

        // Host or singleplayer: process damage
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }

        // Play player hit sound and effects
        playPlayerHit();
        EffectPresets.playerHit();

        // Apply damage with defense reduction (use enemy's damage if available)
        const baseDamage = enemy.damage || COMBAT_CONFIG.BASE_ENEMY_DAMAGE;
        const finalDamage = calculateDamageAfterDefense(baseDamage, player.defense || 0, player.damageReduction || 0);
        player.hurt(finalDamage);

        // Set invulnerability frames (don't reset timer if already invulnerable)
        if (!player.invulnerable) {
            player.invulnerable = true;
            player.invulnerableTime = player.invulnerableDuration;
        }

        // Spawn blood splatter particle effect for player
        spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });

        // Leech lifesteal: heal enemy when it hits player
        if (enemy.lifesteal && enemy.exists()) {
            const currentHP = enemy.hp();
            const maxHP = enemy.maxHealth;
            if (currentHP < maxHP) {
                const newHP = Math.min(maxHP, currentHP + enemy.lifesteal);
                enemy.setHP(newHP);
            }
        }

        // Vampiric elite: heal enemy when it hits player
        if (enemy.isVampiric && enemy.vampiricHealAmount && enemy.exists()) {
            const currentHP = enemy.hp();
            const maxHP = enemy.maxHealth;
            if (currentHP < maxHP) {
                const newHP = Math.min(maxHP, currentHP + enemy.vampiricHealAmount);
                enemy.setHP(newHP);
            }
        }

        // Knockback enemy away from player (player doesn't move)
        const knockbackDir = k.vec2(
            enemy.pos.x - player.pos.x,
            enemy.pos.y - player.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = COMBAT_CONFIG.KNOCKBACK_ENEMY;
            applySafeKnockback(k, enemy, normalized, knockbackAmount);
        }

        // Initial hit flash (will be overridden by immunity flash)
        player.color = k.rgb(...COMBAT_CONFIG.HIT_COLOR);
    });
    
    // Collision: Miniboss hits Player
    k.onCollide('miniboss', 'player', (miniboss, player) => {
        if (k.paused) return;

        // Don't damage dead players
        if (player.isDead || player.hp() <= 0) return;

        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;

        // In multiplayer, only host processes damage
        if (isMultiplayerActive() && !isHost()) {
            // Client: show visual feedback only
            playPlayerHit();
            spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });
            player.color = k.rgb(255, 100, 100);
            return;
        }

        // Host or singleplayer: process damage
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }

        // Play player hit sound and effects
        playPlayerHit();
        EffectPresets.playerHit();

        // Minibosses deal more damage than regular enemies but less than bosses
        // Melee miniboss deals melee damage, others use base damage
        let baseDamage = COMBAT_CONFIG.BASE_MINIBOSS_DAMAGE;
        if (miniboss.type === 'brute' || miniboss.type === 'berserker' || miniboss.type === 'guardian') {
            if (miniboss.meleeDamage) {
                baseDamage = miniboss.meleeDamage;
            }
        }
        const finalDamage = calculateDamageAfterDefense(baseDamage, player.defense || 0, player.damageReduction || 0);
        player.hurt(finalDamage);

        // Set invulnerability frames (don't reset timer if already invulnerable)
        if (!player.invulnerable) {
            player.invulnerable = true;
            player.invulnerableTime = player.invulnerableDuration;
        }

        // Spawn blood splatter particle effect for player
        spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });
        
        // Knockback miniboss away from player (player doesn't move)
        const knockbackDir = k.vec2(
            miniboss.pos.x - player.pos.x,
            miniboss.pos.y - player.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = COMBAT_CONFIG.KNOCKBACK_MINIBOSS;
            applySafeKnockback(k, miniboss, normalized, knockbackAmount);
        }
        
        // Visual feedback
        player.color = k.rgb(255, 100, 100);
    });
    
    // Collision: Boss hits Player
    k.onCollide('boss', 'player', (boss, player) => {
        if (k.paused) return;

        // Don't damage dead players
        if (player.isDead || player.hp() <= 0) return;

        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;

        // In multiplayer, only host processes damage
        if (isMultiplayerActive() && !isHost()) {
            // Client: show visual feedback only
            playPlayerHit();
            spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });
            player.color = k.rgb(255, 100, 100);
            return;
        }

        // Host or singleplayer: process damage
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }

        // Play player hit sound and effects
        playPlayerHit();
        EffectPresets.playerHit();

        // Bosses deal more damage
        // Melee guardian deals melee damage, others use base damage
        let baseDamage = COMBAT_CONFIG.BASE_BOSS_DAMAGE;
        if (boss.type === 'twinGuardianMelee' && boss.meleeDamage) {
            const enrageMultiplier = boss.enraged ? COMBAT_CONFIG.BOSS_ENRAGE_DAMAGE_MULTIPLIER : 1.0;
            baseDamage = boss.meleeDamage * enrageMultiplier;
        }

        const finalDamage = calculateDamageAfterDefense(baseDamage, player.defense || 0, player.damageReduction || 0);
        player.hurt(finalDamage);

        // Set invulnerability frames (don't reset timer if already invulnerable)
        if (!player.invulnerable) {
            player.invulnerable = true;
            player.invulnerableTime = player.invulnerableDuration;
        }

        // Spawn blood splatter particle effect for player
        spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });
        
        // Knockback boss away from player (player doesn't move)
        const knockbackDir = k.vec2(
            boss.pos.x - player.pos.x,
            boss.pos.y - player.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = COMBAT_CONFIG.KNOCKBACK_BOSS;
            applySafeKnockback(k, boss, normalized, knockbackAmount);
        }
        
        // Initial hit flash (will be overridden by immunity flash)
        player.color = k.rgb(255, 100, 100);
    });
    
    // Collision: Enemy/Boss Projectile hits Player
    k.onCollide('projectile', 'player', (projectile, player) => {
        if (k.paused) return;

        // Only enemy/boss projectiles can hit player (player projectiles are handled separately)
        if (!projectile.isBossProjectile && !projectile.isEnemyProjectile) return;

        // Don't damage dead players
        if (player.isDead || player.hp() <= 0) return;

        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;

        // In multiplayer, only host processes damage
        if (isMultiplayerActive() && !isHost()) {
            // Client: show visual feedback only
            playPlayerHit();
            spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });
            player.color = k.rgb(255, 100, 100);
            k.destroy(projectile);
            return;
        }

        // Host or singleplayer: process damage
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            k.destroy(projectile);
            return;
        }

        // Play player hit sound and effects
        playPlayerHit();
        EffectPresets.playerHit();

        // Apply damage with damage reduction (The Tank ability)
        const damageAfterReduction = projectile.damage * (1 - (player.damageReduction || 0));
        const finalDamage = Math.max(1, damageAfterReduction - (player.defense || 0));
        player.hurt(finalDamage);

        // Set invulnerability frames (don't reset timer if already invulnerable)
        if (!player.invulnerable) {
            player.invulnerable = true;
            player.invulnerableTime = player.invulnerableDuration;
        }

        // Spawn blood splatter particle effect for player
        spawnBloodSplatter(k, player.pos.x, player.pos.y, { color: [255, 100, 100] });

        // Destroy projectile
        k.destroy(projectile);
        
        // Initial hit flash (will be overridden by immunity flash)
        player.color = k.rgb(255, 100, 100);
    });
    
    // Collision: Orbital hits Enemy
    k.onCollide('orbital', 'enemy', (orb, enemy) => {
        if (k.paused) return;
        if (!enemy.exists()) return;

        // Check contact cooldown
        if (orb.contactCooldown > 0) return;

        // In multiplayer, only host deals damage
        if (isMultiplayerActive() && !isHost()) {
            // Client: visual feedback only, skip damage
            orb.contactCooldown = orb.contactCooldownDuration || 0.2;
            return;
        }

        // Host or singleplayer: deal damage
        enemy.hurt(orb.damage);

        // Set contact cooldown
        orb.contactCooldown = orb.contactCooldownDuration || 0.2;
    });
    
    // Collision: Orbital hits Boss
    k.onCollide('orbital', 'boss', (orb, boss) => {
        if (k.paused) return;
        if (!boss.exists()) return;

        // Check contact cooldown
        if (orb.contactCooldown > 0) return;

        // In multiplayer, only host deals damage
        if (isMultiplayerActive() && !isHost()) {
            // Client: visual feedback only, skip damage
            orb.contactCooldown = orb.contactCooldownDuration || 0.2;
            return;
        }

        // Host or singleplayer: deal damage
        // Deal damage using boss's takeDamage method
        if (boss.takeDamage) {
            boss.takeDamage(orb.damage);
        } else {
            boss.hurt(orb.damage);
        }

        // Set contact cooldown
        orb.contactCooldown = orb.contactCooldownDuration || 0.2;
    });
}

// Initialize orbital weapons
function initializeOrbitalWeapons(k, player) {
    // Clean up any existing orbs first to prevent accumulation
    if (player.orbitalOrbs && player.orbitalOrbs.length > 0) {
        player.orbitalOrbs.forEach(orb => {
            if (orb && orb.exists()) k.destroy(orb);
        });
    }

    // Reset arrays
    player.orbitalOrbs = [];
    player.orbitalAngles = [];

    const orbCount = player.projectileCount || 1;
    const orbitRadius = player.orbitRadius || WEAPON_CONFIG.BASE_ORBIT_RADIUS;

    // Create initial orbs
    for (let i = 0; i < orbCount; i++) {
        const angle = (360 / orbCount) * i; // Evenly space orbs
        const rad = (angle * Math.PI) / 180;
        const x = player.pos.x + Math.cos(rad) * orbitRadius;
        const y = player.pos.y + Math.sin(rad) * orbitRadius;
        
        const orb = k.add([
            k.text(player.weaponDef?.char || '○', { size: 16 }),
            k.pos(x, y),
            k.anchor('center'),
            k.color(...(player.weaponDef?.color || [100, 200, 255])),
            k.area(),
            'orbital',
            'playerProjectile' // So it can damage enemies
        ]);
        
        orb.damage = player.projectileDamage || 12;
        orb.contactCooldown = 0; // Cooldown to prevent multiple hits per frame
        orb.contactCooldownDuration = WEAPON_CONFIG.ORBITAL_CONTACT_COOLDOWN;
        
        player.orbitalOrbs.push(orb);
        player.orbitalAngles.push(angle);
    }
}

// Update orbital weapons rotation
function updateOrbitalWeapons(k, player) {
    // Reinitialize if needed (e.g., after upgrade)
    if (player.orbitalNeedsReinit) {
        // Clean up old orbs
        if (player.orbitalOrbs) {
            player.orbitalOrbs.forEach(orb => {
                if (orb.exists()) orb.destroy();
            });
        }
        player.orbitalOrbs = [];
        player.orbitalAngles = [];
        initializeOrbitalWeapons(k, player);
        player.orbitalNeedsReinit = false;
    }
    
    // Reinitialize if orbs are missing or count changed
    const expectedOrbCount = player.projectileCount || 1;
    if (!player.orbitalOrbs || player.orbitalOrbs.length !== expectedOrbCount) {
        initializeOrbitalWeapons(k, player);
    }
    
    if (!player.orbitalOrbs || !player.orbitalAngles) return;

    const rotationSpeed = player.rotationSpeed || WEAPON_CONFIG.BASE_ROTATION_SPEED;
    const orbitRadius = player.orbitRadius || WEAPON_CONFIG.BASE_ORBIT_RADIUS;
    
    // Update each orb
    player.orbitalOrbs.forEach((orb, index) => {
        if (!orb.exists()) return;
        
        // Update angle
        player.orbitalAngles[index] = (player.orbitalAngles[index] + rotationSpeed * k.dt()) % 360;
        const rad = (player.orbitalAngles[index] * Math.PI) / 180;
        
        // Update position
        orb.pos.x = player.pos.x + Math.cos(rad) * orbitRadius;
        orb.pos.y = player.pos.y + Math.sin(rad) * orbitRadius;
        
        // Update contact cooldown
        if (orb.contactCooldown > 0) {
            orb.contactCooldown -= k.dt();
        }
    });
    
    // Clean up destroyed orbs
    player.orbitalOrbs = player.orbitalOrbs.filter(orb => orb.exists());
    // Re-sync angles array if orbs were removed
    if (player.orbitalOrbs.length !== player.orbitalAngles.length) {
        player.orbitalAngles = player.orbitalAngles.slice(0, player.orbitalOrbs.length);
    }
}

// Create explosive projectile
function createExplosiveProjectile(k, x, y, direction, speed, damage, explosionRadius, explosionDamage, maxRange, isCrit = false) {
    const projectile = createProjectile(k, x, y, direction, speed, damage, 0, 0, isCrit, maxRange);
    projectile.isExplosive = true;
    projectile.explosionRadius = explosionRadius || 50;
    projectile.explosionDamage = explosionDamage || 15;

    return projectile;
}

// Create chain lightning projectile
function createChainProjectile(k, x, y, direction, speed, damage, chainRange, maxJumps, damageReduction, maxRange, isCrit = false) {
    const projectile = createProjectile(k, x, y, direction, speed, damage, 0, 0, isCrit, maxRange);
    projectile.isChainLightning = true;
    projectile.chainRange = chainRange || 70;
    projectile.maxJumps = maxJumps || 3;
    projectile.chainDamageReduction = damageReduction || 0.15;
    projectile.chainJumps = 0;
    projectile.chainedEnemies = new Set(); // Track which enemies have been hit

    return projectile;
}

// Explode projectile and deal area damage
function explodeProjectile(k, projectile, x, y) {
    if (!projectile.exists()) return;

    // Play explosion sound and effects
    playExplosion();
    EffectPresets.explosion();

    const explosionRadius = projectile.explosionRadius || 50;
    const explosionDamage = projectile.explosionDamage || 15;

    // Only host deals damage in multiplayer
    if (!isMultiplayerActive() || isHost()) {
        // Damage all enemies in radius
        const enemies = k.get('enemy');
        const bosses = k.get('boss');
        const allTargets = [...enemies, ...bosses];

        for (const target of allTargets) {
            if (!target.exists()) continue;

            const dist = k.vec2(
                target.pos.x - x,
                target.pos.y - y
            ).len();

            if (dist <= explosionRadius) {
                if (target.takeDamage) {
                    // Boss with armor system
                    target.takeDamage(explosionDamage);
                } else {
                    // Regular enemy
                    target.hurt(explosionDamage);
                }
            }
        }
    }
    
    // Visual explosion effect
    const explosionText = k.add([
        k.text('*', { size: 24 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(255, 200, 0),
        k.z(200)
    ]);
    k.wait(0.2, () => {
        if (explosionText.exists()) k.destroy(explosionText);
    });
    
    // Destroy projectile
    k.destroy(projectile);
}

// Chain lightning to next enemy
function chainToNextEnemy(k, projectile, currentEnemy) {
    if (!projectile.exists()) return;
    
    const chainRange = projectile.chainRange || 70;
    const enemies = k.get('enemy');
    const bosses = k.get('boss');
    const allTargets = [...enemies, ...bosses];
    
    // Find nearest enemy within chain range that hasn't been hit
    let nearestEnemy = null;
    let nearestDist = chainRange;
    
    for (const target of allTargets) {
        if (!target.exists() || target === currentEnemy) continue;
        if (projectile.chainedEnemies && projectile.chainedEnemies.has(target)) continue;
        
        const dist = k.vec2(
            target.pos.x - currentEnemy.pos.x,
            target.pos.y - currentEnemy.pos.y
        ).len();
        
        if (dist <= chainRange && dist < nearestDist) {
            nearestEnemy = target;
            nearestDist = dist;
        }
    }
    
    if (nearestEnemy) {
        // Chain to next enemy
        projectile.chainJumps = (projectile.chainJumps || 0) + 1;
        
        // Visual chain effect - use a thin rotated rectangle as a line
        const startPos = currentEnemy.pos;
        const endPos = nearestEnemy.pos;
        const distance = k.vec2(endPos.x - startPos.x, endPos.y - startPos.y).len();
        const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
        const midX = (startPos.x + endPos.x) / 2;
        const midY = (startPos.y + endPos.y) / 2;
        
        const chainLine = k.add([
            k.rect(distance, 2), // Thin rectangle as line
            k.pos(midX, midY),
            k.anchor('center'),
            k.rotate(angle),
            k.color(255, 255, 100),
            k.z(150)
        ]);
        k.wait(0.1, () => {
            if (chainLine.exists()) k.destroy(chainLine);
        });
        
        // Teleport projectile to next enemy position to trigger collision
        projectile.pos.x = nearestEnemy.pos.x;
        projectile.pos.y = nearestEnemy.pos.y;
        
        // The collision handler will be triggered automatically
    } else {
        // No more enemies in range, destroy projectile
        k.destroy(projectile);
    }
}

