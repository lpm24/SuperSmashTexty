// Combat system - handles autofire and collisions
import { createProjectile } from '../entities/projectile.js';

export function setupCombatSystem(k, player) {
    let lastFireTime = 0;
    
    // Initialize orbital weapons if applicable
    if (player.weaponKey === 'orbital') {
        initializeOrbitalWeapons(k, player);
    }

    // Autofire system
    k.onUpdate(() => {
        if (k.paused) return;
        
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
                    const angleStep = spreadAngle / (projectileCount - 1);
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
                    const delay = spreadAngle === 0 && projectileCount > 1 ? index * 0.02 : 0;
                    
                    k.wait(delay, () => {
                        // Check for critical hit
                        const isCrit = Math.random() < (player.critChance || 0);
                        let finalDamage = isCrit 
                            ? Math.floor(player.projectileDamage * (player.critDamage || 2.0))
                            : player.projectileDamage;
                        
                        // Apply synergy bonuses (e.g., armor piercing)
                        if (player.piercingDamageBonus && (player.piercing || 0) > 0) {
                            finalDamage = Math.floor(finalDamage * player.piercingDamageBonus);
                        }
                        
                        // Use weapon's character and color for projectiles
                        const weaponRange = player.weaponRange || 750;
                        
                        // Handle special weapon types
                        if (player.weaponKey === 'explosive') {
                            // Explosive launcher - create explosive projectile
                            const projectile = createExplosiveProjectile(k, player.pos.x, player.pos.y, direction, 
                                player.projectileSpeed, finalDamage, 
                                player.explosionRadius, player.explosionDamage, weaponRange);
                            if (player.weaponDef) {
                                projectile.useWeaponVisual(player.weaponDef);
                            }
                        } else if (player.weaponKey === 'chainLightning') {
                            // Chain lightning - create chaining projectile
                            const projectile = createChainProjectile(k, player.pos.x, player.pos.y, direction, 
                                player.projectileSpeed, finalDamage, 
                                player.chainRange, player.maxJumps, player.chainDamageReduction, weaponRange);
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
        
        // Use takeDamage if available (handles armor/shields), otherwise use hurt
        if (enemy.takeDamage) {
            enemy.takeDamage(projectile.damage);
        } else {
            enemy.hurt(projectile.damage);
        }
        
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
            const knockbackAmount = 15; // Reduced knockback distance
            enemy.pos.x += normalized.x * knockbackAmount;
            enemy.pos.y += normalized.y * knockbackAmount;
        }
        
        // Visual feedback (different color for crits)
        enemy.color = projectile.isCrit ? k.rgb(255, 200, 0) : k.rgb(255, 255, 255);
        k.wait(0.1, () => {
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
            const knockbackAmount = 10; // Reduced knockback for bosses
            boss.pos.x += normalized.x * knockbackAmount;
            boss.pos.y += normalized.y * knockbackAmount;
        }
        
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
        
        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;
        
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }
        
        // Apply damage with defense reduction (use enemy's damage if available)
        const baseDamage = enemy.damage || 10;
        // Apply damage reduction (The Tank ability)
        const damageAfterReduction = baseDamage * (1 - (player.damageReduction || 0));
        const finalDamage = Math.max(1, damageAfterReduction - (player.defense || 0));
        player.hurt(finalDamage);
        player.invulnerable = true;
        player.invulnerableTime = player.invulnerableDuration;
        
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
            const knockbackAmount = 20; // Knockback distance for enemies
            enemy.pos.x += normalized.x * knockbackAmount;
            enemy.pos.y += normalized.y * knockbackAmount;
        }
        
        // Initial hit flash (will be overridden by immunity flash)
        player.color = k.rgb(255, 100, 100);
    });
    
    // Collision: Boss hits Player
    k.onCollide('boss', 'player', (boss, player) => {
        if (k.paused) return;
        
        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;
        
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }
        
        // Bosses deal more damage (15-20 base damage)
        // Melee guardian deals melee damage, others use base damage
        let baseDamage = 18; // Default for most bosses
        if (boss.type === 'twinGuardianMelee' && boss.meleeDamage) {
            baseDamage = boss.meleeDamage * (boss.enraged ? 1.25 : 1.0); // Use melee damage, apply enrage
        }
        
        // Apply damage reduction (The Tank ability)
        const damageAfterReduction = baseDamage * (1 - (player.damageReduction || 0));
        const finalDamage = Math.max(1, damageAfterReduction - (player.defense || 0));
        player.hurt(finalDamage);
        player.invulnerable = true;
        player.invulnerableTime = player.invulnerableDuration;
        
        // Knockback boss away from player (player doesn't move)
        const knockbackDir = k.vec2(
            boss.pos.x - player.pos.x,
            boss.pos.y - player.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = 15; // Reduced knockback for bosses (they're heavier)
            boss.pos.x += normalized.x * knockbackAmount;
            boss.pos.y += normalized.y * knockbackAmount;
        }
        
        // Initial hit flash (will be overridden by immunity flash)
        player.color = k.rgb(255, 100, 100);
    });
    
    // Collision: Enemy/Boss Projectile hits Player
    k.onCollide('projectile', 'player', (projectile, player) => {
        if (k.paused) return;
        
        // Only enemy/boss projectiles can hit player (player projectiles are handled separately)
        if (!projectile.isBossProjectile && !projectile.isEnemyProjectile) return;
        
        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;
        
        // Check for dodge chance (The Scout ability)
        if (player.dodgeChance && Math.random() < player.dodgeChance) {
            // Dodged! No damage taken
            return;
        }
        
        // Apply damage with damage reduction (The Tank ability)
        const damageAfterReduction = projectile.damage * (1 - (player.damageReduction || 0));
        const finalDamage = Math.max(1, damageAfterReduction - (player.defense || 0));
        player.hurt(finalDamage);
        player.invulnerable = true;
        player.invulnerableTime = player.invulnerableDuration;
        
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
    const orbitRadius = player.orbitRadius || 45;
    
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
        orb.contactCooldownDuration = 0.2; // 0.2 seconds between hits
        
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
    
    const rotationSpeed = player.rotationSpeed || 180;
    const orbitRadius = player.orbitRadius || 45;
    
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
function createExplosiveProjectile(k, x, y, direction, speed, damage, explosionRadius, explosionDamage, maxRange) {
    const projectile = createProjectile(k, x, y, direction, speed, damage, 0, 0, false, maxRange);
    projectile.isExplosive = true;
    projectile.explosionRadius = explosionRadius || 50;
    projectile.explosionDamage = explosionDamage || 15;
    
    return projectile;
}

// Create chain lightning projectile
function createChainProjectile(k, x, y, direction, speed, damage, chainRange, maxJumps, damageReduction, maxRange) {
    const projectile = createProjectile(k, x, y, direction, speed, damage, 0, 0, false, maxRange);
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

