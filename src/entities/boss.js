/**
 * Boss Entity
 *
 * Creates and manages boss entities with advanced mechanics:
 * - Multi-layered defense system (shields, armor, health)
 * - Shield regeneration mechanics
 * - Visual state updates based on defense layers
 * - Unique boss types: Gatekeeper, Swarm Queen, Twin Guardians
 * - Spawning mechanics and minion control
 * - Floor-based stat scaling
 */

// Entity imports
import { createEnemy } from './enemy.js';
import { createProjectile } from './projectile.js';

// Data imports
import { getBossDefinition } from '../data/bosses.js';

// Multiplayer imports
import { isMultiplayerActive, isHost, registerEnemy, broadcastDeathEvent, broadcastBossEnrage } from '../systems/multiplayerGame.js';

export function createBoss(k, x, y, type = 'gatekeeper', floor = 1, rng = null) {
    const baseConfig = getBossDefinition(type);
    
    // Scale stats based on floor
    const floorMultiplier = 1 + (floor - 1) * 0.2; // 20% increase per floor
    const config = {
        coreChar: baseConfig.coreChar,
        armorChar: baseConfig.armorChar || '()',
        shieldChar: baseConfig.shieldChar || '{}',
        color: baseConfig.color,
        armorColor: baseConfig.armorColor || [200, 200, 200],
        shieldColor: baseConfig.shieldColor || [100, 200, 255],
        health: Math.floor(baseConfig.baseHealth * floorMultiplier),
        armorHealth: Math.floor((baseConfig.baseArmorHealth || 0) * floorMultiplier),
        maxArmorHealth: Math.floor((baseConfig.baseArmorHealth || 0) * floorMultiplier),
        shieldHealth: Math.floor((baseConfig.baseShieldHealth || 0) * floorMultiplier),
        maxShieldHealth: Math.floor((baseConfig.baseShieldHealth || 0) * floorMultiplier),
        speed: Math.floor(baseConfig.baseSpeed * (1 + (floor - 1) * 0.05)),
        size: baseConfig.size,
        xpValue: Math.floor(baseConfig.baseXPValue * floorMultiplier),
        damageReduction: baseConfig.damageReduction || 0,
        shieldRegenRate: (baseConfig.shieldRegenRate || 0) * floorMultiplier // Scale regen with floor
    };
    
    // Build the visual representation based on armor state
    function getBossVisual() {
        const leftArmor = config.armorHealth > config.maxArmorHealth * 0.5 ? '(' : '';
        const rightArmor = config.armorHealth > 0 ? ')' : '';
        return `${leftArmor}${config.coreChar}${rightArmor}`;
    }
    
    // Create boss entity with dynamic text
    const boss = k.add([
        k.text(getBossVisual(), { size: config.size }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...config.color),
        k.area(),
        k.health(config.health),
        'boss'
    ]);

    boss.maxHealth = config.health;
    boss.speed = config.speed;
    boss.xpValue = config.xpValue;
    boss.type = type;
    boss.floor = floor;
    boss.textSize = config.size; // Store text size for later use
    boss.rng = rng; // Store seeded RNG for multiplayer synchronization
    
    // Store boss-specific stats
    if (baseConfig.meleeDamage) boss.meleeDamage = baseConfig.meleeDamage;
    if (baseConfig.projectileDamage) boss.projectileDamage = baseConfig.projectileDamage;
    if (baseConfig.projectileSpeed) boss.projectileSpeed = baseConfig.projectileSpeed;
    if (baseConfig.fireRate) boss.fireRate = baseConfig.fireRate;
    
    // Initialize enraged state for Twin Guardians
    if (type === 'twinGuardianMelee' || type === 'twinGuardianRanged') {
        boss.enraged = false;
        boss.enrage = function() {
            if (this.enraged) return;
            this.enraged = true;
            this.speed = Math.floor(this.speed * 1.5);
            if (this.type === 'twinGuardianMelee') {
                this.chargeCooldownTimer = 0;
                this.meleeDamage = Math.floor(this.meleeDamage * 1.25);
            } else { // Ranged
                this.fireRate = this.fireRate * 1.5;
                this.projectileDamage = Math.floor(this.projectileDamage * 1.25);
            }
            this.color = k.rgb(255, 200, 0);
        }
    }
    
    // Armor properties
    boss.armorHealth = config.armorHealth;
    boss.maxArmorHealth = config.maxArmorHealth;
    boss.damageReduction = config.damageReduction;
    boss.coreChar = config.coreChar;
    boss.armorChar = config.armorChar;
    boss.armorColor = config.armorColor;
    
    // Shield properties
    boss.shieldHealth = config.shieldHealth;
    boss.maxShieldHealth = config.maxShieldHealth;
    boss.shieldRegenRate = config.shieldRegenRate;
    boss.shieldChar = config.shieldChar;
    boss.shieldColor = config.shieldColor;
    boss.shieldRegenTimer = 0; // Timer for shield regeneration
    boss.shieldRegenCooldown = 0; // Cooldown after taking damage (prevents regen)
    boss.lastDamageTime = 0; // Track when last damaged
    
    // Function to update visual representation
    boss.updateVisual = function() {
        // Priority: Shields > Armor > Core
        // Shields: {GG}
        // Armor: [GG]
        // Core: GG
        
        let leftShield = '';
        let rightShield = '';
        let leftArmor = '';
        let rightArmor = '';
        
        // Shields take priority (outermost layer)
        // Size scales with health: Full = ⟦ ⟧, Medium = ⦃ ⦄, Low = ⦅ ⦆
        // Using Unicode characters to avoid KAPLAY styled text tag parsing
        if (boss.shieldHealth > 0) {
            const shieldPercent = boss.shieldHealth / boss.maxShieldHealth;
            
            if (shieldPercent > 0.66) {
                // Full shield (66-100%): Double brackets ⟦ ⟧ (mathematical double brackets)
                leftShield = '⟦';
                rightShield = '⟧';
            } else if (shieldPercent > 0.33) {
                // Medium shield (33-66%): Left/right white parenthesis ⦃ ⦄
                leftShield = '⦃';
                rightShield = '⦄';
            } else {
                // Low shield (0-33%): Left/right angle brackets ⦅ ⦆
                leftShield = '⦅';
                rightShield = '⦆';
            }
        }
        
        // Armor (middle layer, can appear with shields: {[GG]})
        // Size scales with health: Full = ⟦ ⟧, Medium = ⦅ ⦆, Low = ⦉ ⦊
        // Using Unicode characters to avoid KAPLAY styled text tag parsing
        if (boss.armorHealth > 0) {
            const armorPercent = boss.armorHealth / boss.maxArmorHealth;
            
            if (armorPercent > 0.66) {
                // Full armor (66-100%): Double brackets ⟦ ⟧ (mathematical double brackets)
                leftArmor = '⟦';
                rightArmor = '⟧';
            } else if (armorPercent > 0.33) {
                // Medium armor (33-66%): Left/right angle brackets ⦅ ⦆
                leftArmor = '⦅';
                rightArmor = '⦆';
            } else {
                // Low armor (0-33%): Left/right double angle brackets ⦉ ⦊
                leftArmor = '⦉';
                rightArmor = '⦊';
            }
        }
        
        // Visual format: {[GG]} (shields outside, armor inside)
        const visual = `${leftShield}${leftArmor}${boss.coreChar}${rightArmor}${rightShield}`;
        
        // Update text directly (same approach as enemy and miniboss)
        boss.text = visual;
        
        // Update color - use shield color if shields exist, otherwise boss color
        if (boss.shieldHealth > 0) {
            boss.color = k.rgb(...config.shieldColor);
        } else {
            boss.color = k.rgb(...config.color);
        }
    };
    
    // Function to take damage (handles shields, then armor, then health)
    boss.takeDamage = function(damage) {
        let shieldChanged = false;
        let armorChanged = false;
        const previousShieldHealth = boss.shieldHealth;
        const previousArmorHealth = boss.armorHealth;
        
        // Track damage time for shield regen cooldown
        boss.lastDamageTime = k.time();
        const shieldRegenCooldownDuration = 3.0; // 3 seconds cooldown after taking damage
        boss.shieldRegenCooldown = shieldRegenCooldownDuration;
        
        // Priority: Shields > Armor > Health
        // Shields take normal damage (no reduction)
        if (boss.shieldHealth > 0) {
            const shieldDamage = Math.min(damage, boss.shieldHealth);
            boss.shieldHealth = Math.max(0, boss.shieldHealth - shieldDamage);
            shieldChanged = (boss.shieldHealth !== previousShieldHealth);
            
            // Remaining damage goes to armor/health
            const remainingDamage = damage - shieldDamage;
            if (remainingDamage > 0) {
                boss.takeDamageInternal(remainingDamage);
            }
        } else {
            // No shields - damage goes to armor/health
            boss.takeDamageInternal(damage);
        }
        
        armorChanged = (boss.armorHealth !== previousArmorHealth);
        
        // Update visual when shields or armor change
        if (shieldChanged || armorChanged) {
            boss.updateVisual();
        }
    };
    
    // Internal damage function (handles armor and health)
    boss.takeDamageInternal = function(damage) {
        // If armor exists, armor takes reduced damage first
        if (boss.armorHealth > 0) {
            // Apply damage reduction to armor damage
            const reducedDamage = Math.floor(damage * (1 - boss.damageReduction));
            const armorDamage = Math.min(reducedDamage, boss.armorHealth);
            boss.armorHealth = Math.max(0, boss.armorHealth - armorDamage);
            
            // Remaining damage goes to boss, but reduced if armor still exists
            const remainingDamage = damage - reducedDamage;
            if (remainingDamage > 0) {
                // If armor still exists, apply damage reduction
                // If armor is destroyed, remaining damage goes through at full
                const damageMultiplier = boss.armorHealth > 0 ? (1 - boss.damageReduction) : 1;
                const finalDamage = Math.floor(remainingDamage * damageMultiplier);
                boss.hurt(finalDamage);
            }
        } else {
            // No armor - full damage
            boss.hurt(damage);
        }
    };
    
    // Boss-specific mechanics initialization
    boss.attackTimer = 0;
    boss.minionSpawnTimer = 0;
    boss.chargeCooldownTimer = 0; // Time until next charge can start
    boss.chargeDurationTimer = 0; // Time spent charging
    boss.radialBurstTimer = 0;
    boss.isCharging = false;
    boss.chargeDirection = null;
    boss.chargeSpeed = 0;
    boss.spawnedMinions = []; // Track minions for cleanup
    boss.enraged = false; // For twin guardians enrage system
    boss.twinPartner = null; // Reference to other guardian (for enrage system)
    
    // Get current phase based on health
    boss.getPhase = function() {
        const healthPercent = boss.hp() / boss.maxHealth;
        if (healthPercent > 0.75) return 1;
        if (healthPercent > 0.5) return 2;
        return 3; // Enraged
    };
    
    // Spawn minions function
    boss.spawnMinions = function() {
        if (!boss.exists()) return;

        const phase = boss.getPhase();
        const minionCount = phase === 1 ? 2 : phase === 2 ? 3 : 3; // 2-3 minions

        for (let i = 0; i < minionCount; i++) {
            // Spawn minions around boss in a circle
            // Use seeded RNG if available (multiplayer), otherwise Math.random()
            const angleVariation = boss.rng ? boss.rng.next() * 0.5 : Math.random() * 0.5;
            const angle = (Math.PI * 2 / minionCount) * i + angleVariation;

            const distanceVariation = boss.rng ? boss.rng.next() * 20 : Math.random() * 20;
            const spawnDistance = 40 + distanceVariation;

            const spawnX = boss.pos.x + Math.cos(angle) * spawnDistance;
            const spawnY = boss.pos.y + Math.sin(angle) * spawnDistance;

            // Randomly choose rusher or basic (as proxy for shooter)
            const minionTypeRoll = boss.rng ? boss.rng.next() : Math.random();
            const minionType = minionTypeRoll < 0.5 ? 'rusher' : 'basic';
            const minion = createEnemy(k, spawnX, spawnY, minionType, floor);
            minion.isBossMinion = true; // Mark as boss minion
            boss.spawnedMinions.push(minion);

            // Register minion for multiplayer sync
            if (isMultiplayerActive() && isHost()) {
                registerEnemy(minion, { type: minionType, floor: floor, isBossMinion: true });
            }
        }
    };
    
    // Radial burst attack (8 directions)
    boss.radialBurst = function() {
        if (!boss.exists()) return;
        
        const directions = [
            k.vec2(0, -1),   // N
            k.vec2(0.707, -0.707), // NE
            k.vec2(1, 0),    // E
            k.vec2(0.707, 0.707),  // SE
            k.vec2(0, 1),    // S
            k.vec2(-0.707, 0.707), // SW
            k.vec2(-1, 0),   // W
            k.vec2(-0.707, -0.707) // NW
        ];
        
        const phase = boss.getPhase();
        const projectileSpeed = 200;
        const projectileDamage = 12;
        
        directions.forEach(dir => {
            const projectile = createProjectile(k, boss.pos.x, boss.pos.y, dir, projectileSpeed, projectileDamage, 0, 0, false);
            projectile.isBossProjectile = true; // Mark as boss projectile
            projectile.color = k.rgb(255, 100, 100); // Red color for boss projectiles
        });
    };
    
    // Charge attack
    boss.startCharge = function(targetPos) {
        if (!boss.exists()) return;
        
        boss.isCharging = true;
        const dir = k.vec2(targetPos.x - boss.pos.x, targetPos.y - boss.pos.y);
        if (dir.len() > 0) {
            boss.chargeDirection = dir.unit();
            // Charge speed is set before calling startCharge, or use default based on phase
            if (!boss.chargeSpeed || boss.chargeSpeed === 0) {
                const phase = boss.getPhase ? boss.getPhase() : 1;
                boss.chargeSpeed = boss.speed * (phase === 1 ? 2.5 : phase === 2 ? 3.0 : 3.5); // Faster in later phases
            }
        }
    };
    
    // AI based on boss type
    boss.onUpdate(() => {
        if (k.paused) return;
        
        // Shield regeneration (if shields exist and regen rate > 0)
        // Only regen if cooldown has expired (not damaged recently) and boss is alive
        if (boss.shieldRegenRate > 0 && boss.shieldHealth < boss.maxShieldHealth && boss.hp() > 0 && !boss.isDead) {
            // Update cooldown timer
            if (boss.shieldRegenCooldown > 0) {
                boss.shieldRegenCooldown -= k.dt();
            }
            
            // Only regenerate if cooldown has expired
            if (boss.shieldRegenCooldown <= 0) {
                boss.shieldRegenTimer += k.dt();
                const regenInterval = 1.0; // Regenerate every second
                
                if (boss.shieldRegenTimer >= regenInterval) {
                    const regenAmount = boss.shieldRegenRate * regenInterval;
                    boss.shieldHealth = Math.min(boss.maxShieldHealth, boss.shieldHealth + regenAmount);
                    boss.shieldRegenTimer = 0;
                    
                    // Update visual if shield regenerated
                    if (boss.shieldHealth > 0) {
                        boss.updateVisual();
                    }
                }
            }
        }

        // Process burn DoT (Damage over Time) from flamethrower
        if (boss.burnDuration > 0 && boss.hp() > 0 && !boss.isDead) {
            boss.burnTimer = (boss.burnTimer || 0) + k.dt();
            const burnTickInterval = 0.5; // Deal burn damage every 0.5 seconds

            if (boss.burnTimer >= burnTickInterval) {
                // In multiplayer, only host deals burn damage
                if (!isMultiplayerActive() || isHost()) {
                    // Deal burn damage
                    if (boss.takeDamage) {
                        boss.takeDamage(boss.burnDamage);
                    } else {
                        boss.hurt(boss.burnDamage);
                    }
                }

                // Visual feedback for burn damage (orange tint) on all clients
                const originalColor = boss.color;
                boss.color = k.rgb(255, 150, 50);
                k.wait(0.1, () => {
                    if (boss.exists()) {
                        boss.updateVisual();
                    }
                });

                boss.burnTimer = 0;
            }

            // Decrease burn duration
            boss.burnDuration -= k.dt();
            if (boss.burnDuration <= 0) {
                boss.burnDamage = 0;
                boss.burnTimer = 0;
            }
        }

        const player = k.get('player')[0];
        if (!player || !player.exists()) return;
        
        const phase = boss.getPhase();
        
        // Gatekeeper-specific mechanics
        if (boss.type === 'gatekeeper') {
            boss.attackTimer += k.dt();
            boss.minionSpawnTimer += k.dt();
            boss.radialBurstTimer += k.dt();
            
            // Phase-based timing
            const minionSpawnInterval = phase === 1 ? 8 : phase === 2 ? 6 : 5; // 8s → 6s → 5s
            const chargeCooldown = 10; // 10 seconds between charges
            const radialBurstInterval = phase === 1 ? 8 : phase === 2 ? 6 : 5; // 8s → 6s → 5s
            
            // Handle charge attack
            if (boss.isCharging) {
                const chargeMove = boss.chargeDirection.scale(boss.chargeSpeed * k.dt());
                boss.pos.x += chargeMove.x;
                boss.pos.y += chargeMove.y;
                
                // Track charge duration
                boss.chargeDurationTimer += k.dt();
                const chargeDuration = 1.0;
                if (boss.chargeDurationTimer >= chargeDuration) {
                    boss.isCharging = false;
                    boss.chargeDurationTimer = 0;
                    boss.chargeCooldownTimer = 0; // Reset cooldown after charge ends
                }
            } else {
                // Increment charge cooldown timer when not charging
                boss.chargeCooldownTimer += k.dt();
                // Normal movement (slower when not charging)
                const dir = k.vec2(
                    player.pos.x - boss.pos.x,
                    player.pos.y - boss.pos.y
                );
                const distance = dir.len();
                
                if (distance > 0) {
                    const normalized = dir.unit();
                    // Movement speed scales with phase
                    const moveSpeed = boss.speed * (phase === 1 ? 1.0 : phase === 2 ? 1.2 : 1.5);
                    const moveAmount = normalized.scale(moveSpeed * k.dt());
                    
                    // Check collision with obstacles
                    const newX = boss.pos.x + moveAmount.x;
                    const newY = boss.pos.y + moveAmount.y;
                    
                    let canMoveX = true;
                    let canMoveY = true;
                    
                    const obstacles = k.get('obstacle');
                    const bossSize = boss.size || 14;
                    
                    for (const obstacle of obstacles) {
                        if (!obstacle.exists()) continue;
                        
                        const obsLeft = obstacle.pos.x - obstacle.width / 2;
                        const obsRight = obstacle.pos.x + obstacle.width / 2;
                        const obsTop = obstacle.pos.y - obstacle.height / 2;
                        const obsBottom = obstacle.pos.y + obstacle.height / 2;
                        
                        // Check X movement
                        const bossLeftX = newX - bossSize;
                        const bossRightX = newX + bossSize;
                        const bossTopX = boss.pos.y - bossSize;
                        const bossBottomX = boss.pos.y + bossSize;
                        
                        if (bossRightX > obsLeft && bossLeftX < obsRight &&
                            bossBottomX > obsTop && bossTopX < obsBottom) {
                            canMoveX = false;
                            if (boss.isCharging) {
                                boss.isCharging = false;
                                boss.chargeTimer = 0;
                            }
                        }
                        
                        // Check Y movement
                        const bossLeftY = boss.pos.x - bossSize;
                        const bossRightY = boss.pos.x + bossSize;
                        const bossTopY = newY - bossSize;
                        const bossBottomY = newY + bossSize;
                        
                        if (bossRightY > obsLeft && bossLeftY < obsRight &&
                            bossBottomY > obsTop && bossTopY < obsBottom) {
                            canMoveY = false;
                            if (boss.isCharging) {
                                boss.isCharging = false;
                                boss.chargeTimer = 0;
                            }
                        }
                    }
                    
                    // Apply movement if no collision
                    if (canMoveX) boss.pos.x = newX;
                    if (canMoveY) boss.pos.y = newY;
                }
                
                // Spawn minions
                if (boss.minionSpawnTimer >= minionSpawnInterval) {
                    boss.spawnMinions();
                    boss.minionSpawnTimer = 0;
                }
                
                // Charge attack
                if (boss.chargeCooldownTimer >= chargeCooldown) {
                    // Brief telegraph (flash color)
                    boss.color = k.rgb(255, 255, 0);
                    k.wait(0.3, () => {
                        if (boss.exists()) {
                            boss.color = k.rgb(...config.color);
                            boss.startCharge(player.pos);
                        }
                    });
                    boss.chargeCooldownTimer = 0;
                }
                
                // Radial burst
                if (boss.radialBurstTimer >= radialBurstInterval) {
                    boss.radialBurst();
                    boss.radialBurstTimer = 0;
                }
            }
        } else if (boss.type === 'twinGuardianMelee') {
            // Melee Guardian AI: Charge player, melee attacks
            boss.attackTimer += k.dt();
            boss.chargeCooldownTimer += k.dt();
            
            const chargeCooldown = 8; // 8 seconds between charges
            const chargeDistance = 150; // Distance to start charge
            
            const dir = k.vec2(
                player.pos.x - boss.pos.x,
                player.pos.y - boss.pos.y
            );
            const distance = dir.len();
            
            // Handle charge attack
            if (boss.isCharging) {
                const chargeMove = boss.chargeDirection.scale(boss.chargeSpeed * k.dt());
                boss.pos.x += chargeMove.x;
                boss.pos.y += chargeMove.y;
                
                boss.chargeDurationTimer += k.dt();
                const chargeDuration = 1.2;
                if (boss.chargeDurationTimer >= chargeDuration) {
                    boss.isCharging = false;
                    boss.chargeDurationTimer = 0;
                    boss.chargeCooldownTimer = 0;
                }
            } else {
                // Normal movement - charge at player
                if (distance > 0) {
                    const normalized = dir.unit();
                    const moveSpeed = boss.speed * (boss.enraged ? 1.5 : 1.0);
                    const moveAmount = normalized.scale(moveSpeed * k.dt());
                    
                    // Check collision with obstacles
                    const newX = boss.pos.x + moveAmount.x;
                    const newY = boss.pos.y + moveAmount.y;
                    
                    let canMoveX = true;
                    let canMoveY = true;
                    
                    const obstacles = k.get('obstacle');
                    const bossSize = boss.size || 14;
                    
                    for (const obstacle of obstacles) {
                        if (!obstacle.exists()) continue;
                        
                        const obsLeft = obstacle.pos.x - obstacle.width / 2;
                        const obsRight = obstacle.pos.x + obstacle.width / 2;
                        const obsTop = obstacle.pos.y - obstacle.height / 2;
                        const obsBottom = obstacle.pos.y + obstacle.height / 2;
                        
                        const bossLeftX = newX - bossSize;
                        const bossRightX = newX + bossSize;
                        const bossTopX = boss.pos.y - bossSize;
                        const bossBottomX = boss.pos.y + bossSize;
                        
                        if (bossRightX > obsLeft && bossLeftX < obsRight &&
                            bossBottomX > obsTop && bossTopX < obsBottom) {
                            canMoveX = false;
                        }
                        
                        const bossLeftY = boss.pos.x - bossSize;
                        const bossRightY = boss.pos.x + bossSize;
                        const bossTopY = newY - bossSize;
                        const bossBottomY = newY + bossSize;
                        
                        if (bossRightY > obsLeft && bossLeftY < obsRight &&
                            bossBottomY > obsTop && bossTopY < obsBottom) {
                            canMoveY = false;
                        }
                    }
                    
                    if (canMoveX) boss.pos.x = newX;
                    if (canMoveY) boss.pos.y = newY;
                }
                
                // Charge attack when close enough
                if (boss.chargeCooldownTimer >= chargeCooldown && distance < chargeDistance) {
                    boss.color = k.rgb(255, 255, 0); // Yellow telegraph
                    k.wait(0.3, () => {
                        if (boss.exists()) {
                            boss.color = k.rgb(...config.color);
                            // Set charge speed based on enrage
                            const chargeSpeedMultiplier = boss.enraged ? 3.5 : 2.5;
                            boss.chargeSpeed = boss.speed * chargeSpeedMultiplier;
                            boss.startCharge(player.pos);
                        }
                    });
                    boss.chargeCooldownTimer = 0;
                }
            }
        } else if (boss.type === 'twinGuardianRanged') {
            // Ranged Guardian AI: Maintain distance, fire projectiles
            boss.attackTimer += k.dt();
            
            const preferredDistance = 200; // Maintain this distance from player
            const dir = k.vec2(
                player.pos.x - boss.pos.x,
                player.pos.y - boss.pos.y
            );
            const distance = dir.len();
            
            // Movement: maintain distance from player
            if (distance > 0) {
                const normalized = dir.unit();
                let moveSpeed = boss.speed * (boss.enraged ? 1.5 : 1.0);
                
                // Move away if too close, move closer if too far
                if (distance < preferredDistance) {
                    // Move away from player
                    const moveAmount = normalized.scale(-moveSpeed * k.dt());
                    const newX = boss.pos.x + moveAmount.x;
                    const newY = boss.pos.y + moveAmount.y;
                    
                    // Check collision with obstacles
                    let canMoveX = true;
                    let canMoveY = true;
                    const obstacles = k.get('obstacle');
                    const bossSize = boss.size || 14;
                    
                    for (const obstacle of obstacles) {
                        if (!obstacle.exists()) continue;
                        
                        const obsLeft = obstacle.pos.x - obstacle.width / 2;
                        const obsRight = obstacle.pos.x + obstacle.width / 2;
                        const obsTop = obstacle.pos.y - obstacle.height / 2;
                        const obsBottom = obstacle.pos.y + obstacle.height / 2;
                        
                        const bossLeftX = newX - bossSize;
                        const bossRightX = newX + bossSize;
                        const bossTopX = boss.pos.y - bossSize;
                        const bossBottomX = boss.pos.y + bossSize;
                        
                        if (bossRightX > obsLeft && bossLeftX < obsRight &&
                            bossBottomX > obsTop && bossTopX < obsBottom) {
                            canMoveX = false;
                        }
                        
                        const bossLeftY = boss.pos.x - bossSize;
                        const bossRightY = boss.pos.x + bossSize;
                        const bossTopY = newY - bossSize;
                        const bossBottomY = newY + bossSize;
                        
                        if (bossRightY > obsLeft && bossLeftY < obsRight &&
                            bossBottomY > obsTop && bossTopY < obsBottom) {
                            canMoveY = false;
                        }
                    }
                    
                    if (canMoveX) boss.pos.x = newX;
                    if (canMoveY) boss.pos.y = newY;
                } else if (distance > preferredDistance * 1.5) {
                    // Move closer if too far
                    const moveAmount = normalized.scale(moveSpeed * k.dt());
                    const newX = boss.pos.x + moveAmount.x;
                    const newY = boss.pos.y + moveAmount.y;
                    
                    // Check collision (same as above)
                    let canMoveX = true;
                    let canMoveY = true;
                    const obstacles = k.get('obstacle');
                    const bossSize = boss.size || 14;
                    
                    for (const obstacle of obstacles) {
                        if (!obstacle.exists()) continue;
                        
                        const obsLeft = obstacle.pos.x - obstacle.width / 2;
                        const obsRight = obstacle.pos.x + obstacle.width / 2;
                        const obsTop = obstacle.pos.y - obstacle.height / 2;
                        const obsBottom = obstacle.pos.y + obstacle.height / 2;
                        
                        const bossLeftX = newX - bossSize;
                        const bossRightX = newX + bossSize;
                        const bossTopX = boss.pos.y - bossSize;
                        const bossBottomX = boss.pos.y + bossSize;
                        
                        if (bossRightX > obsLeft && bossLeftX < obsRight &&
                            bossBottomX > obsTop && bossTopX < obsBottom) {
                            canMoveX = false;
                        }
                        
                        const bossLeftY = boss.pos.x - bossSize;
                        const bossRightY = boss.pos.x + bossSize;
                        const bossTopY = newY - bossSize;
                        const bossBottomY = newY + bossSize;
                        
                        if (bossRightY > obsLeft && bossLeftY < obsRight &&
                            bossBottomY > obsTop && bossTopY < obsBottom) {
                            canMoveY = false;
                        }
                    }
                    
                    if (canMoveX) boss.pos.x = newX;
                    if (canMoveY) boss.pos.y = newY;
                }
            }
            
            // Fire projectiles at player
            const fireInterval = 1 / (boss.fireRate * (boss.enraged ? 1.5 : 1.0));
            if (boss.attackTimer >= fireInterval) {
                if (distance > 0) {
                    const direction = dir.unit();
                    const projectile = createProjectile(
                        k, 
                        boss.pos.x, 
                        boss.pos.y, 
                        direction, 
                        boss.projectileSpeed, 
                        boss.projectileDamage * (boss.enraged ? 1.25 : 1.0), 
                        0, // piercing
                        0, // obstaclePiercing
                        false // isCrit
                    );
                    projectile.isBossProjectile = true;
                    projectile.color = k.rgb(100, 150, 255); // Blue for ranged guardian
                }
                boss.attackTimer = 0;
            }
        } else if (boss.type === 'swarmQueen') {
            // Swarm Queen mechanics
            boss.minionSpawnTimer += k.dt();
            
            // Get health percentage for escalating spawn rate
            const healthPercent = boss.hp() / boss.maxHealth;
            let spawnInterval;
            if (healthPercent > 0.66) {
                spawnInterval = 5; // Every 5 seconds
            } else if (healthPercent > 0.33) {
                spawnInterval = 3; // Every 3 seconds
            } else {
                spawnInterval = 2; // Every 2 seconds (enraged)
            }
            
            // Count active minions
            const activeMinions = boss.spawnedMinions.filter(m => m.exists() && m.hp() > 0);
            const maxMinions = 8; // Up to 8 minions active
            
            // Spawn minions if under limit
            if (boss.minionSpawnTimer >= spawnInterval && activeMinions.length < maxMinions) {
                // Spawn Bat or Slime (using fast or basic as proxy)
                // Use seeded RNG for multiplayer consistency
                const minionType = (boss.rng ? boss.rng.next() : Math.random()) < 0.5 ? 'fast' : 'basic';
                const angle = (boss.rng ? boss.rng.next() : Math.random()) * Math.PI * 2;
                const spawnDistance = 50 + (boss.rng ? boss.rng.next() : Math.random()) * 30;
                const spawnX = boss.pos.x + Math.cos(angle) * spawnDistance;
                const spawnY = boss.pos.y + Math.sin(angle) * spawnDistance;
                
                const minion = createEnemy(k, spawnX, spawnY, minionType, floor);
                minion.isBossMinion = true;
                boss.spawnedMinions.push(minion);
                
                // Remove dead minions from tracking
                boss.spawnedMinions = boss.spawnedMinions.filter(m => m.exists());
                
                boss.minionSpawnTimer = 0;
            }
            
            // Positioning: Move to center, maintain distance from player
            const centerX = k.width() / 2;
            const centerY = k.height() / 2;
            const preferredDistance = 150; // Distance from player
            
            const toCenter = k.vec2(centerX - boss.pos.x, centerY - boss.pos.y);
            const toPlayer = k.vec2(player.pos.x - boss.pos.x, player.pos.y - boss.pos.y);
            const playerDistance = toPlayer.len();
            
            // Move toward center, but maintain distance from player
            let moveDir = k.vec2(0, 0);
            
            if (toCenter.len() > 30) {
                // Move toward center
                moveDir = moveDir.add(toCenter.unit().scale(0.5));
            }
            
            if (playerDistance < preferredDistance) {
                // Move away from player
                moveDir = moveDir.add(toPlayer.unit().scale(-1));
            }
            
            if (moveDir.len() > 0) {
                const normalized = moveDir.unit();
                const moveAmount = normalized.scale(boss.speed * k.dt());
                
                // Check collision with obstacles
                const newX = boss.pos.x + moveAmount.x;
                const newY = boss.pos.y + moveAmount.y;
                
                let canMoveX = true;
                let canMoveY = true;
                
                const obstacles = k.get('obstacle');
                const bossSize = boss.size || 14;
                
                for (const obstacle of obstacles) {
                    if (!obstacle.exists()) continue;
                    
                    const obsLeft = obstacle.pos.x - obstacle.width / 2;
                    const obsRight = obstacle.pos.x + obstacle.width / 2;
                    const obsTop = obstacle.pos.y - obstacle.height / 2;
                    const obsBottom = obstacle.pos.y + obstacle.height / 2;
                    
                    const bossLeftX = newX - bossSize;
                    const bossRightX = newX + bossSize;
                    const bossTopX = boss.pos.y - bossSize;
                    const bossBottomX = boss.pos.y + bossSize;
                    
                    if (bossRightX > obsLeft && bossLeftX < obsRight &&
                        bossBottomX > obsTop && bossTopX < obsBottom) {
                        canMoveX = false;
                    }
                    
                    const bossLeftY = boss.pos.x - bossSize;
                    const bossRightY = boss.pos.x + bossSize;
                    const bossTopY = newY - bossSize;
                    const bossBottomY = newY + bossSize;
                    
                    if (bossRightY > obsLeft && bossLeftY < obsRight &&
                        bossBottomY > obsTop && bossTopY < obsBottom) {
                        canMoveY = false;
                    }
                }
                
                if (canMoveX) boss.pos.x = newX;
                if (canMoveY) boss.pos.y = newY;
            }
        } else {
            // Default behavior for other boss types (just movement)
            const dir = k.vec2(
                player.pos.x - boss.pos.x,
                player.pos.y - boss.pos.y
            );
            const distance = dir.len();
            
            if (distance > 0) {
                const normalized = dir.unit();
                const moveAmount = normalized.scale(boss.speed * k.dt());
                
                // Check collision with obstacles (same as before)
                const newX = boss.pos.x + moveAmount.x;
                const newY = boss.pos.y + moveAmount.y;
                
                let canMoveX = true;
                let canMoveY = true;
                
                const obstacles = k.get('obstacle');
                const bossSize = boss.size || 14;
                
                for (const obstacle of obstacles) {
                    if (!obstacle.exists()) continue;
                    
                    const obsLeft = obstacle.pos.x - obstacle.width / 2;
                    const obsRight = obstacle.pos.x + obstacle.width / 2;
                    const obsTop = obstacle.pos.y - obstacle.height / 2;
                    const obsBottom = obstacle.pos.y + obstacle.height / 2;
                    
                    const bossLeftX = newX - bossSize;
                    const bossRightX = newX + bossSize;
                    const bossTopX = boss.pos.y - bossSize;
                    const bossBottomX = boss.pos.y + bossSize;
                    
                    if (bossRightX > obsLeft && bossLeftX < obsRight &&
                        bossBottomX > obsTop && bossTopX < obsBottom) {
                        canMoveX = false;
                    }
                    
                    const bossLeftY = boss.pos.x - bossSize;
                    const bossRightY = boss.pos.x + bossSize;
                    const bossTopY = newY - bossSize;
                    const bossBottomY = newY + bossSize;
                    
                    if (bossRightY > obsLeft && bossLeftY < obsRight &&
                        bossBottomY > obsTop && bossTopY < obsBottom) {
                        canMoveY = false;
                    }
                }
                
                if (canMoveX) boss.pos.x = newX;
                if (canMoveY) boss.pos.y = newY;
            }
        }
        
        // Keep boss in bounds (room boundaries) - same as player and enemies
        const roomWidth = k.width();
        const roomHeight = k.height();
        const margin = 20;
        const bossSize = boss.size || 14;
        
        boss.pos.x = k.clamp(boss.pos.x, margin + bossSize, roomWidth - margin - bossSize);
        boss.pos.y = k.clamp(boss.pos.y, margin + bossSize, roomHeight - margin - bossSize);
    });

    // Mark as not dead initially
    boss.isDead = false;

    boss.onDeath(() => {
        // In multiplayer, broadcast death event from host
        if (isMultiplayerActive() && isHost() && boss.mpEntityId) {
            broadcastDeathEvent({
                entityId: boss.mpEntityId,
                entityType: 'boss',
                x: boss.pos.x,
                y: boss.pos.y,
                xpDropped: boss.xpValue
            });
        }
    });
    
    // Swarm Queen death explosion handler
    if (type === 'swarmQueen') {
        boss.onDeath(() => {
            // Spawn 8-12 minions in burst on death
            // Use seeded RNG for multiplayer consistency
            const minionCount = 8 + Math.floor((boss.rng ? boss.rng.next() : Math.random()) * 5); // 8-12 minions
            for (let i = 0; i < minionCount; i++) {
                const angle = (Math.PI * 2 / minionCount) * i + (boss.rng ? boss.rng.next() : Math.random()) * 0.3;
                const spawnDistance = 40 + (boss.rng ? boss.rng.next() : Math.random()) * 20;
                const spawnX = boss.pos.x + Math.cos(angle) * spawnDistance;
                const spawnY = boss.pos.y + Math.sin(angle) * spawnDistance;

                const minionType = (boss.rng ? boss.rng.next() : Math.random()) < 0.5 ? 'fast' : 'basic';
                const minion = createEnemy(k, spawnX, spawnY, minionType, floor);
                minion.isBossMinion = true;
            }
        });
    }
    
    // Initialize visual
    boss.updateVisual();

    // Multiplayer: Register boss for network sync if host
    if (isMultiplayerActive() && isHost()) {
        registerEnemy(boss, { type, floor, isBoss: true });
        boss.enemyType = type; // Store type for sync
    }

    return boss;
}

// Spawn twin guardians as separate entities from opposite doors
export function createTwinGuardians(k, door1, door2, floor = 1, rng = null) {
    // Spawn melee guardian from first door
    const meleeGuardian = createBoss(k, door1.pos.x, door1.pos.y, 'twinGuardianMelee', floor, rng);

    // Spawn ranged guardian from second door
    const rangedGuardian = createBoss(k, door2.pos.x, door2.pos.y, 'twinGuardianRanged', floor, rng);
    
    // Link them together for enrage system
    meleeGuardian.twinPartner = rangedGuardian;
    rangedGuardian.twinPartner = meleeGuardian;
    
    // Set up death handlers for enrage system
    meleeGuardian.onDeath(() => {
        if (rangedGuardian && rangedGuardian.exists() && !rangedGuardian.enraged) {
            // Enrage the ranged guardian
            rangedGuardian.enrage();
            if (isMultiplayerActive() && isHost()) {
                broadcastBossEnrage(rangedGuardian.networkId);
            }
        }
    });

    rangedGuardian.onDeath(() => {
        if (meleeGuardian && meleeGuardian.exists() && !meleeGuardian.enraged) {
            // Enrage the melee guardian
            meleeGuardian.enrage();
            if (isMultiplayerActive() && isHost()) {
                broadcastBossEnrage(meleeGuardian.networkId);
            }
        }
    });
    
    return [meleeGuardian, rangedGuardian];
}

