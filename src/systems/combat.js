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
import { broadcastDamageEvent, isMultiplayerActive, isHost } from './multiplayerGame.js';

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

        // Don't allow shooting if canShoot is false (e.g., player is dead)
        if (player.canShoot === false) {
            return;
        }

        // Handle orbital weapons (passive, no firing needed)
        if (player.weaponKey === 'orbital') {
            updateOrbitalWeapons(k, player);
            return; // Orbital weapons don't fire projectiles
        }

        const mousePos = k.mousePos();
        const time = k.time();
        
        // Calculate direction to mouse
        const toMouse = k.vec2(
            mousePos.x - player.pos.x,
            mousePos.y - player.pos.y
        );
        const distance = toMouse.len();
        
        if (distance > 0) {
            const baseDirection = toMouse.unit();
            
            // Fire if enough time has passed
            if (time - lastFireTime >= 1 / player.fireRate) {
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

                            // Add burn DoT effect
                            const burnDamagePerTick = Math.floor(finalDamage * 0.3); // 30% of hit damage per tick
                            const burnDuration = 2.0; // 2 seconds of burn
                            const dotMultiplier = player.fireDotMultiplier || 1.0;

                            projectile.burnDamage = Math.floor(burnDamagePerTick * dotMultiplier);
                            projectile.burnDuration = burnDuration;
                        } else if (player.weaponKey === 'explosive') {
                            // Explosive launcher - create explosive projectile
                            const projectile = createExplosiveProjectile(k, player.pos.x, player.pos.y, direction,
                                player.projectileSpeed, finalDamage,
                                player.explosionRadius, player.explosionDamage, weaponRange, isCrit);
                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
                            }
                        } else if (player.weaponKey === 'chainLightning') {
                            // Chain lightning - create chaining projectile
                            const projectile = createChainProjectile(k, player.pos.x, player.pos.y, direction,
                                player.projectileSpeed, finalDamage,
                                player.chainRange, player.maxJumps, player.chainDamageReduction, weaponRange, isCrit);
                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
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
                        }
                    });
                });

                lastFireTime = time;

                // Decrement powerup weapon ammo if applicable
                decrementPowerupAmmo(player);
            }
        }
    });

    // Collision: Projectile hits Wall (check obstacle piercing)
    k.onCollide('projectile', 'wall', (projectile, wall) => {
        if (k.paused) return;
        
        // Explosive projectiles are handled separately
        if (projectile.isExplosive) {
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

    // Collision: Projectile hits Enemy
    k.onCollide('projectile', 'enemy', (projectile, enemy) => {
        if (k.paused) return;

        // Only player projectiles can hit enemies (enemy/boss projectiles pass through)
        if (projectile.isEnemyProjectile || projectile.isBossProjectile) {
            return;
        }

        // Check if this projectile has already hit this enemy (for piercing)
        if (projectile.piercedEnemies && projectile.piercedEnemies.has(enemy)) {
            return; // Already hit this enemy
        }

        // Play enemy hit sound
        playEnemyHit();

        // Use takeDamage if available (handles armor/shields), otherwise use hurt
        if (enemy.takeDamage) {
            enemy.takeDamage(projectile.damage);
        } else {
            enemy.hurt(projectile.damage);
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
    
    // Collision: Explosive Projectile hits Boss
    k.onCollide('projectile', 'boss', (projectile, boss) => {
        if (k.paused) return;
        if (!projectile.isExplosive) return; // Only handle explosive projectiles here
        
        // Explode on impact
        explodeProjectile(k, projectile, boss.pos.x, boss.pos.y);
    });
    
    // Collision: Chain Lightning Projectile hits Boss
    k.onCollide('projectile', 'boss', (projectile, boss) => {
        if (k.paused) return;
        if (!projectile.isChainLightning) return; // Only handle chain lightning here
        
        // Check if already hit this boss
        if (projectile.chainedEnemies && projectile.chainedEnemies.has(boss)) {
            return;
        }
        
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
        
        // Track this boss
        if (projectile.chainedEnemies) {
            projectile.chainedEnemies.add(boss);
        }
        
        // Chain to next enemy if jumps remaining
        // Use a small delay to ensure collision detection works properly
        k.wait(0.01, () => {
            if (!projectile.exists()) return;
            if (projectile.chainJumps < projectile.maxJumps) {
                chainToNextEnemy(k, projectile, boss);
            } else {
                // No more jumps, destroy projectile
                k.destroy(projectile);
            }
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
        
        // Calculate final damage (with crit)
        let finalDamage = projectile.damage;
        if (projectile.isCrit) {
            finalDamage = Math.floor(finalDamage * 1.5); // 50% crit bonus
        }

        // Use takeDamage to handle armor/shields
        miniboss.takeDamage(finalDamage);

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
    
    // Collision: Projectile hits Boss (with armor system - regular projectiles)
    k.onCollide('projectile', 'boss', (projectile, boss) => {
        if (k.paused) return;
        
        // Skip special weapon types (handled separately)
        if (projectile.isExplosive || projectile.isChainLightning) {
            return;
        }
        
        // Check if this projectile has already hit this boss (for piercing)
        if (projectile.piercedEnemies && projectile.piercedEnemies.has(boss)) {
            return; // Already hit this boss
        }
        
        // Use boss's takeDamage method which handles armor
        if (boss.takeDamage) {
            boss.takeDamage(projectile.damage);
        } else {
            // Fallback to regular damage if takeDamage not available
            boss.hurt(projectile.damage);
        }

        // Apply fire DoT if projectile has burn effect
        if (projectile.burnDamage && projectile.burnDuration) {
            boss.burnDamage = projectile.burnDamage;
            boss.burnDuration = projectile.burnDuration;
            boss.burnTimer = 0;
        }

        // Spawn blood splatter particle effect
        spawnBloodSplatter(k, boss.pos.x, boss.pos.y, { isCrit: projectile.isCrit });

        // Track this boss for piercing
        if (projectile.piercedEnemies) {
            projectile.piercedEnemies.add(boss);
        }

        // Destroy projectile if it can't pierce anymore
        if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
            k.destroy(projectile);
        }

        // Knockback boss away from projectile direction
        const knockbackDir = k.vec2(
            boss.pos.x - projectile.pos.x,
            boss.pos.y - projectile.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = COMBAT_CONFIG.KNOCKBACK_BOSS_FROM_PROJECTILE;
            applySafeKnockback(k, boss, normalized, knockbackAmount);
        }

        // Spawn hit impact particle effect
        spawnHitImpact(k, boss.pos.x, boss.pos.y, knockbackDir, { isCrit: projectile.isCrit });
        
        // Visual feedback (different color for crits)
        boss.color = projectile.isCrit ? k.rgb(255, 200, 0) : k.rgb(255, 255, 255);
        k.wait(0.1, () => {
            if (boss.exists()) {
                // Restore boss color (will be updated by updateVisual if armor changed)
                boss.updateVisual();
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
        
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }

        // Play player hit sound
        playPlayerHit();

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

        // Play player hit sound
        playPlayerHit();

        // Minibosses deal more damage than regular enemies but less than bosses
        // Melee miniboss deals melee damage, others use base damage
        let baseDamage = COMBAT_CONFIG.BASE_MINIBOSS_DAMAGE;
        if (miniboss.type === 'brute' || miniboss.type === 'berserker' || miniboss.type === 'guardian') {
            if (miniboss.meleeDamage) {
                baseDamage = miniboss.meleeDamage;
            }
        }
        const finalDamage = calculateDamageAfterDefense(baseDamage, player.defense || 0, 0);
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
        
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }

        // Play player hit sound
        playPlayerHit();

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
        
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }

        // Play player hit sound
        playPlayerHit();

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
        
        // Deal damage
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
        
        // Deal damage using boss's takeDamage method
        if (boss.takeDamage) {
            boss.takeDamage(orb.damage);
        } else {
            boss.hurt(orb.damage);
        }
        
        // Set contact cooldown
        orb.contactCooldown = orb.contactCooldownDuration || 0.2;
    });
    
    // Collision: Explosive Projectile hits Enemy (separate handler for priority)
    k.onCollide('projectile', 'enemy', (projectile, enemy) => {
        if (k.paused) return;
        if (!projectile.isExplosive) return; // Only handle explosive projectiles here
        
        // Explode on impact
        explodeProjectile(k, projectile, enemy.pos.x, enemy.pos.y);
    });
    
    // Collision: Explosive Projectile hits Wall
    k.onCollide('projectile', 'wall', (projectile, wall) => {
        if (k.paused) return;
        if (!projectile.isExplosive) return; // Only handle explosive projectiles here
        
        // Explode on wall impact
        explodeProjectile(k, projectile, projectile.pos.x, projectile.pos.y);
    });
    
    // Collision: Chain Lightning Projectile hits Enemy (separate handler for priority)
    k.onCollide('projectile', 'enemy', (projectile, enemy) => {
        if (k.paused) return;
        if (!projectile.isChainLightning) return; // Only handle chain lightning here
        
        // Check if already hit this enemy
        if (projectile.chainedEnemies && projectile.chainedEnemies.has(enemy)) {
            return;
        }
        
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
        
        // Track this enemy
        if (projectile.chainedEnemies) {
            projectile.chainedEnemies.add(enemy);
        }
        
        // Chain to next enemy if jumps remaining
        if (projectile.chainJumps < projectile.maxJumps) {
            chainToNextEnemy(k, projectile, enemy);
        } else {
            // No more jumps, destroy projectile
            k.destroy(projectile);
        }
    });
}

// Initialize orbital weapons
function initializeOrbitalWeapons(k, player) {
    if (!player.orbitalOrbs) {
        player.orbitalOrbs = [];
        player.orbitalAngles = [];
    }
    
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

    // Play explosion sound
    playExplosion();

    const explosionRadius = projectile.explosionRadius || 50;
    const explosionDamage = projectile.explosionDamage || 15;

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
        
        // Visual chain effect
        const chainLine = k.add([
            k.line(currentEnemy.pos, nearestEnemy.pos, 2),
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

