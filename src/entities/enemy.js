/**
 * Enemy Entity
 *
 * Creates and manages enemy entities with 21 different types:
 * - Basic, Rusher, Sniper, Tank, Healer, etc.
 * - Behavior patterns: rush, shoot, explode, teleport, heal
 * - Health bars for visual feedback
 * - Floor-based stat scaling
 * - Death handling and cleanup
 */

// Entity imports
import { createProjectile } from './projectile.js';

// Data imports
import { getEnemyDefinition } from '../data/enemies.js';

// System imports
import { getSmartMoveDirection, getPerimeterMoveDirection } from '../systems/pathfinding.js';
import { registerEnemy, isHost, isMultiplayerActive, broadcastEnemySplit, broadcastDeathEvent } from '../systems/multiplayerGame.js';

export function createEnemy(k, x, y, type = 'basic', floor = 1, rng = null) {
    const baseConfig = getEnemyDefinition(type);
    
    // Scale stats based on floor
    const floorMultiplier = 1 + (floor - 1) * 0.3; // 30% increase per floor
    const config = {
        char: baseConfig.char,
        color: baseConfig.color,
        health: Math.floor(baseConfig.baseHealth * floorMultiplier),
        speed: Math.floor(baseConfig.baseSpeed * (1 + (floor - 1) * 0.1)), // 10% speed increase per floor
        size: baseConfig.size,
        xpValue: Math.floor(baseConfig.baseXPValue * floorMultiplier),
        behavior: baseConfig.behavior
    };
    
    // Build visual representation (will be updated if armor/shields exist)
    // Note: Floor-based bonuses calculated later, so initial visual is just base character
    function getEnemyVisual() {
        return config.char;
    }
    
    const enemy = k.add([
        k.text(getEnemyVisual(), { size: config.size }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...config.color),
        k.area(),
        k.health(config.health),
        'enemy'
    ]);
    
    // Store original color for later use
    enemy.originalColor = config.color;

    enemy.maxHealth = config.health;
    enemy.speed = config.speed;
    enemy.xpValue = config.xpValue;
    enemy.type = type;
    enemy.behavior = config.behavior;
    enemy.floor = floor;
    enemy.pathfindingMode = baseConfig.pathfindingMode || 'none'; // Pathfinding mode: 'none', 'smart', 'perimeter'
    
    // Store enemy-specific properties
    if (baseConfig.damage) enemy.damage = baseConfig.damage;
    if (baseConfig.fireRate) enemy.fireRate = baseConfig.fireRate;
    if (baseConfig.projectileSpeed) enemy.projectileSpeed = baseConfig.projectileSpeed;
    if (baseConfig.projectileDamage) enemy.projectileDamage = baseConfig.projectileDamage;
    if (baseConfig.chargeCooldown) enemy.chargeCooldown = baseConfig.chargeCooldown;
    if (baseConfig.splits) enemy.splits = true;
    if (baseConfig.explodes) {
        enemy.explodes = true;
        enemy.explosionDamage = baseConfig.explosionDamage;
        enemy.explosionRadius = baseConfig.explosionRadius;
        if (baseConfig.shrapnel) {
            enemy.shrapnel = true;
            enemy.shrapnelCount = baseConfig.shrapnelCount || 8;
        }
    }
    
    // Floor-based armor/shield scaling
    // Floor 1: No armor/shields
    // Floor 2: Some enemies get armor
    // Floor 3: More enemies get armor, some get shields
    // Floor 4+: Mix of armor and shields, some get both
    
    // Calculate floor-based armor/shield bonuses
    let floorArmorBonus = 0;
    let floorShieldBonus = 0;
    let floorShieldRegen = 0;
    
    if (floor >= 2) {
        // Floor 2+: Some enemies get armor (30% chance, or specific types)
        // Use seeded RNG if provided, fall back to Math.random() for backwards compatibility
        const armorRoll = rng ? rng.next() : Math.random();
        if (floor >= 2 && (type === 'zombie' || type === 'turret' || type === 'heavyTank' || armorRoll < 0.3)) {
            floorArmorBonus = Math.floor(15 + (floor - 2) * 5); // 15 base, +5 per floor
        }
    }

    if (floor >= 3) {
        // Floor 3+: Some enemies get shields (20% chance, or specific types)
        // Use seeded RNG if provided, fall back to Math.random() for backwards compatibility
        const shieldRoll = rng ? rng.next() : Math.random();
        if (type === 'shooter' || type === 'turret' || type === 'wraith' || shieldRoll < 0.2) {
            floorShieldBonus = Math.floor(10 + (floor - 3) * 5); // 10 base, +5 per floor
            floorShieldRegen = 1 + (floor - 3) * 0.5; // 1 HP/sec base, +0.5 per floor
        }
    }

    if (floor >= 4) {
        // Floor 4+: Some enemies get both armor and shields (10% chance, or specific types)
        // Use seeded RNG if provided, fall back to Math.random() for backwards compatibility
        const bothRoll = rng ? rng.next() : Math.random();
        if (type === 'heavyTank' || type === 'spawner' || bothRoll < 0.1) {
            if (floorArmorBonus === 0) floorArmorBonus = Math.floor(20 + (floor - 4) * 5);
            if (floorShieldBonus === 0) {
                floorShieldBonus = Math.floor(15 + (floor - 4) * 5);
                floorShieldRegen = 1.5 + (floor - 4) * 0.5;
            }
        }
    }
    
    // Armor properties (base + floor bonus)
    const totalBaseArmor = (baseConfig.baseArmorHealth || 0) + floorArmorBonus;
    enemy.armorHealth = Math.floor(totalBaseArmor * floorMultiplier);
    enemy.maxArmorHealth = Math.floor(totalBaseArmor * floorMultiplier);
    enemy.damageReduction = baseConfig.damageReduction || (totalBaseArmor > 0 ? 0.2 : 0); // 20% reduction if has armor
    enemy.armorChar = baseConfig.armorChar || '[]'; // Changed from () to []
    enemy.armorColor = baseConfig.armorColor || [200, 200, 200];
    
    // Shield properties (base + floor bonus)
    const totalBaseShield = (baseConfig.baseShieldHealth || 0) + floorShieldBonus;
    enemy.shieldHealth = Math.floor(totalBaseShield * floorMultiplier);
    enemy.maxShieldHealth = Math.floor(totalBaseShield * floorMultiplier);
    enemy.shieldRegenRate = ((baseConfig.shieldRegenRate || 0) + floorShieldRegen) * floorMultiplier;
    enemy.shieldChar = baseConfig.shieldChar || '{}';
    enemy.shieldColor = baseConfig.shieldColor || [100, 200, 255];
    enemy.shieldRegenTimer = 0;
    enemy.shieldRegenCooldown = 0; // Cooldown after taking damage (prevents regen)
    enemy.lastDamageTime = 0; // Track when last damaged
    
    // Store original color for visual updates
    enemy.originalColor = config.color;
    enemy.coreChar = config.char;
    
    // Function to update visual representation (for armor/shield changes)
    enemy.updateVisual = function() {
        // Priority: Shields > Armor > Core
        let leftShield = '';
        let rightShield = '';
        let leftArmor = '';
        let rightArmor = '';
        
        // Shields take priority (outermost layer)
        // Size scales with health: Full = ⟦ ⟧, Medium = ⦃ ⦄, Low = ⦅ ⦆
        // Using Unicode characters to avoid KAPLAY styled text tag parsing
        if (enemy.shieldHealth > 0) {
            const shieldPercent = enemy.shieldHealth / enemy.maxShieldHealth;
            
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
        
        // Armor (middle layer, can appear with shields: {[E]})
        // Size scales with health: Full = ⟦ ⟧, Medium = ⦅ ⦆, Low = ⦉ ⦊
        // Using Unicode characters to avoid KAPLAY styled text tag parsing
        if (enemy.armorHealth > 0) {
            const armorPercent = enemy.armorHealth / enemy.maxArmorHealth;
            
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
        
        // Visual format: {[E]} (shields outside, armor inside)
        const visual = `${leftShield}${leftArmor}${enemy.coreChar}${rightArmor}${rightShield}`;
        
        // Update text component
        enemy.text = visual;
        
        // Update color - use shield color if shields exist, otherwise original color
        if (enemy.shieldHealth > 0) {
            enemy.color = k.rgb(...enemy.shieldColor);
        } else {
            enemy.color = k.rgb(...enemy.originalColor);
        }
    };
    
    // Function to take damage (handles shields, then armor, then health)
    enemy.takeDamage = function(damage) {
        let shieldChanged = false;
        let armorChanged = false;
        const previousShieldHealth = enemy.shieldHealth;
        const previousArmorHealth = enemy.armorHealth;
        
        // Track damage time for shield regen cooldown
        enemy.lastDamageTime = k.time();
        const shieldRegenCooldownDuration = 3.0; // 3 seconds cooldown after taking damage
        enemy.shieldRegenCooldown = shieldRegenCooldownDuration;
        
        // Priority: Shields > Armor > Health
        // Shields take normal damage (no reduction)
        if (enemy.shieldHealth > 0) {
            const shieldDamage = Math.min(damage, enemy.shieldHealth);
            enemy.shieldHealth = Math.max(0, enemy.shieldHealth - shieldDamage);
            shieldChanged = (enemy.shieldHealth !== previousShieldHealth);
            
            // Remaining damage goes to armor/health
            const remainingDamage = damage - shieldDamage;
            if (remainingDamage > 0) {
                enemy.takeDamageInternal(remainingDamage);
            }
        } else {
            // No shields - damage goes to armor/health
            enemy.takeDamageInternal(damage);
        }
        
        armorChanged = (enemy.armorHealth !== previousArmorHealth);
        
        // Update visual when shields or armor change
        if (shieldChanged || armorChanged) {
            enemy.updateVisual();
        }
    };
    
    // Internal damage function (handles armor and health)
    enemy.takeDamageInternal = function(damage) {
        // If armor exists, armor takes reduced damage first
        if (enemy.armorHealth > 0) {
            // Apply damage reduction to armor damage
            const reducedDamage = Math.floor(damage * (1 - enemy.damageReduction));
            const armorDamage = Math.min(reducedDamage, enemy.armorHealth);
            enemy.armorHealth = Math.max(0, enemy.armorHealth - armorDamage);
            
            // Remaining damage goes to enemy, but reduced if armor still exists
            const remainingDamage = damage - reducedDamage;
            if (remainingDamage > 0) {
                // If armor still exists, apply damage reduction
                // If armor is destroyed, remaining damage goes through at full
                const damageMultiplier = enemy.armorHealth > 0 ? (1 - enemy.damageReduction) : 1;
                const finalDamage = Math.floor(remainingDamage * damageMultiplier);
                enemy.hurt(finalDamage);
            }
        } else {
            // No armor - full damage
            enemy.hurt(damage);
        }
    };
    
    if (baseConfig.blocksProjectiles) enemy.blocksProjectiles = true;
    if (baseConfig.teleportCooldown) enemy.teleportCooldown = baseConfig.teleportCooldown;
    if (baseConfig.teleportRange) enemy.teleportRange = baseConfig.teleportRange;
    if (baseConfig.spawnInterval) enemy.spawnInterval = baseConfig.spawnInterval;
    if (baseConfig.spawnType) enemy.spawnType = baseConfig.spawnType;
    if (baseConfig.buffRadius) enemy.buffRadius = baseConfig.buffRadius;
    
    if (baseConfig.buffAmount) enemy.buffAmount = baseConfig.buffAmount;
    if (baseConfig.healRadius) enemy.healRadius = baseConfig.healRadius;
    if (baseConfig.healAmount) enemy.healAmount = baseConfig.healAmount;
    if (baseConfig.healInterval) enemy.healInterval = baseConfig.healInterval;
    if (baseConfig.slowRadius) enemy.slowRadius = baseConfig.slowRadius;
    if (baseConfig.slowAmount) enemy.slowAmount = baseConfig.slowAmount;
    if (baseConfig.lifesteal) enemy.lifesteal = baseConfig.lifesteal;
    
    // Initialize visual with armor/shields if they exist (after all properties are set)
    enemy.updateVisual();
    
    // Initialize behavior-specific timers
    enemy.attackTimer = 0;
    enemy.chargeTimer = 0;
    enemy.isCharging = false;
    enemy.chargeDirection = null;
    enemy.chargeDuration = 0;
    enemy.chargePauseTimer = 0;
    enemy.teleportTimer = 0;
    enemy.spawnTimer = 0;
    enemy.healTimer = 0;
    enemy.buffedEnemies = new Set(); // Track which enemies are buffed by this buffer
    
    // Obstacle avoidance state
    enemy.stuckTimer = 0; // Track how long enemy has been stuck
    enemy.stuckThreshold = 1.0; // Seconds before considered stuck
    enemy.lastPosition = { x: x, y: y };
    enemy.lastPositionUpdateTime = 0; // Track when last position was updated
    enemy.avoidanceDirection = null; // Current avoidance direction
    enemy.avoidanceTimer = 0; // How long to continue avoidance
    
    // Health bar components (only shown when health is low)
    const healthBarWidth = 30;
    const healthBarHeight = 3;
    const healthBarOffset = -20; // Offset above enemy
    
    const healthBarBg = k.add([
        k.rect(healthBarWidth, healthBarHeight),
        k.pos(x, y + healthBarOffset),
        k.anchor('center'),
        k.color(50, 50, 50),
        k.z(100),
        'enemyHealthBar'
    ]);
    
    const healthBar = k.add([
        k.rect(healthBarWidth, healthBarHeight),
        k.pos(x, y + healthBarOffset),
        k.anchor('center'),
        k.color(200, 200, 200), // Simple gray color
        k.z(101),
        'enemyHealthBar'
    ]);
    
    // Link health bars to enemy
    enemy.healthBarBg = healthBarBg;
    enemy.healthBar = healthBar;
    enemy.showHealthThreshold = 0.5; // Show health bar when below 50% health
    
    // Initially hide health bars
    healthBarBg.hidden = true;
    healthBar.hidden = true;

    // AI based on behavior type
    enemy.onUpdate(() => {
        // Update health bar position and visibility
        if (enemy.exists() && enemy.healthBar && enemy.healthBarBg) {
            const healthPercent = enemy.hp() / enemy.maxHealth;
            const shouldShow = healthPercent < enemy.showHealthThreshold && healthPercent > 0;
            
            if (shouldShow) {
                // Show and update health bars
                enemy.healthBarBg.hidden = false;
                enemy.healthBar.hidden = false;
                
                // Update position
                enemy.healthBarBg.pos.x = enemy.pos.x;
                enemy.healthBarBg.pos.y = enemy.pos.y + healthBarOffset;
                enemy.healthBar.pos.x = enemy.pos.x;
                enemy.healthBar.pos.y = enemy.pos.y + healthBarOffset;
                
                // Update health bar width
                const barWidth = healthBarWidth * healthPercent;
                enemy.healthBar.width = Math.max(1, barWidth);
                enemy.healthBar.pos.x = enemy.pos.x - (healthBarWidth - barWidth) / 2;
            } else {
                // Hide health bars
                enemy.healthBarBg.hidden = true;
                enemy.healthBar.hidden = true;
            }
        }
    });
    
    // Cleanup function for health bars
    enemy.cleanupHealthBars = function() {
        if (enemy.healthBarBg && enemy.healthBarBg.exists()) {
            k.destroy(enemy.healthBarBg);
        }
        if (enemy.healthBar && enemy.healthBar.exists()) {
            k.destroy(enemy.healthBar);
        }
    };
    
    // Helper function to check if a position is clear of obstacles
    const isPositionClear = (testX, testY) => {
        const obstacles = k.get('obstacle');
        const enemySize = enemy.size || 12;
        
        for (const obstacle of obstacles) {
            if (!obstacle.exists()) continue;
            
            const obsLeft = obstacle.pos.x - obstacle.width / 2;
            const obsRight = obstacle.pos.x + obstacle.width / 2;
            const obsTop = obstacle.pos.y - obstacle.height / 2;
            const obsBottom = obstacle.pos.y + obstacle.height / 2;
            
            const enemyLeft = testX - enemySize;
            const enemyRight = testX + enemySize;
            const enemyTop = testY - enemySize;
            const enemyBottom = testY + enemySize;
            
            if (enemyRight > obsLeft && enemyLeft < obsRight &&
                enemyBottom > obsTop && enemyTop < obsBottom) {
                return false; // Collision detected
            }
        }
        return true; // Position is clear
    };
    
    // Obstacle avoidance function - tries to find a path around obstacles
    const applyObstacleAvoidance = (desiredMove) => {
        const moveSpeed = desiredMove.len();
        const desiredDir = moveSpeed > 0 ? desiredMove.unit() : k.vec2(0, 0);
        
        // Update stuck detection
        enemy.lastPositionUpdateTime += k.dt();
        if (enemy.lastPositionUpdateTime >= 0.1) {
            // Update last position every 0.1 seconds
            const movedDistance = Math.sqrt(
                Math.pow(enemy.pos.x - enemy.lastPosition.x, 2) +
                Math.pow(enemy.pos.y - enemy.lastPosition.y, 2)
            );
            
            if (movedDistance < 5) {
                // Enemy hasn't moved much
                enemy.stuckTimer += enemy.lastPositionUpdateTime;
            } else {
                // Enemy is moving, reset stuck timer
                enemy.stuckTimer = 0;
            }
            
            enemy.lastPosition = { x: enemy.pos.x, y: enemy.pos.y };
            enemy.lastPositionUpdateTime = 0;
        }
        
        // Check if desired position is clear
        const newX = enemy.pos.x + desiredMove.x;
        const newY = enemy.pos.y + desiredMove.y;
        
        if (isPositionClear(newX, newY)) {
            // Desired path is clear - reset avoidance
            enemy.avoidanceDirection = null;
            enemy.avoidanceTimer = 0;
            return desiredMove;
        }
        
        // Movement is blocked - try obstacle avoidance
        enemy.avoidanceTimer -= k.dt();
        
        // If stuck for too long or avoidance timer expired, try new direction
        if (enemy.stuckTimer >= enemy.stuckThreshold || enemy.avoidanceTimer <= 0) {
            // Try perpendicular directions to find a way around
            const perpendicular1 = k.vec2(-desiredDir.y, desiredDir.x); // 90 degrees left
            const perpendicular2 = k.vec2(desiredDir.y, -desiredDir.x); // 90 degrees right
            
            // Try multiple directions: perpendicular, diagonal, and slight variations
            const testDirections = [
                perpendicular1.scale(moveSpeed), // Left
                perpendicular2.scale(moveSpeed), // Right
                k.vec2(perpendicular1.x * 0.7 + desiredDir.x * 0.3, perpendicular1.y * 0.7 + desiredDir.y * 0.3).unit().scale(moveSpeed), // Diagonal left-forward
                k.vec2(perpendicular2.x * 0.7 + desiredDir.x * 0.3, perpendicular2.y * 0.7 + desiredDir.y * 0.3).unit().scale(moveSpeed), // Diagonal right-forward
                k.vec2(perpendicular1.x * 0.5 + desiredDir.x * 0.5, perpendicular1.y * 0.5 + desiredDir.y * 0.5).unit().scale(moveSpeed), // More forward-left
                k.vec2(perpendicular2.x * 0.5 + desiredDir.x * 0.5, perpendicular2.y * 0.5 + desiredDir.y * 0.5).unit().scale(moveSpeed), // More forward-right
            ];
            
            // Find first clear direction
            for (const testDir of testDirections) {
                const testX = enemy.pos.x + testDir.x;
                const testY = enemy.pos.y + testDir.y;
                if (isPositionClear(testX, testY)) {
                    enemy.avoidanceDirection = k.vec2(testDir.x, testDir.y).unit();
                    enemy.avoidanceTimer = 0.8; // Continue avoidance for 0.8 seconds
                    return testDir;
                }
            }
            
            // No clear path found - try moving in avoidance direction if we have one
            if (enemy.avoidanceDirection) {
                const avoidMove = enemy.avoidanceDirection.scale(moveSpeed);
                const avoidX = enemy.pos.x + avoidMove.x;
                const avoidY = enemy.pos.y + avoidMove.y;
                if (isPositionClear(avoidX, avoidY)) {
                    return avoidMove;
                }
            }
            
            // Still stuck - try partial movement (X or Y only)
            if (isPositionClear(newX, enemy.pos.y)) {
                return k.vec2(desiredMove.x, 0);
            } else if (isPositionClear(enemy.pos.x, newY)) {
                return k.vec2(0, desiredMove.y);
            }
            
            // Completely blocked
            return k.vec2(0, 0);
        } else if (enemy.avoidanceDirection) {
            // Continue in avoidance direction
            const avoidMove = enemy.avoidanceDirection.scale(moveSpeed);
            const avoidX = enemy.pos.x + avoidMove.x;
            const avoidY = enemy.pos.y + avoidMove.y;
            if (isPositionClear(avoidX, avoidY)) {
                return avoidMove;
            } else {
                // Avoidance direction blocked, reset
                enemy.avoidanceDirection = null;
                enemy.avoidanceTimer = 0;
            }
        }
        
        // Fallback: try partial movement
        if (isPositionClear(newX, enemy.pos.y)) {
            return k.vec2(desiredMove.x, 0);
        } else if (isPositionClear(enemy.pos.x, newY)) {
            return k.vec2(0, desiredMove.y);
        }
        
        // Completely blocked
        return k.vec2(0, 0);
    };
    
    enemy.onUpdate(() => {
        if (k.paused) return;
        
        // Shield regeneration (if shields exist and regen rate > 0)
        // Only regen if cooldown has expired (not damaged recently) and enemy is alive
        // Host-authoritative in multiplayer to prevent desync from frame rate differences
        if (enemy.shieldRegenRate > 0 && enemy.shieldHealth < enemy.maxShieldHealth && enemy.hp() > 0 && !enemy.isDead) {
            // Only process shield regen on host (or in single player)
            if (!isMultiplayerActive() || isHost()) {
                // Update cooldown timer
                if (enemy.shieldRegenCooldown > 0) {
                    enemy.shieldRegenCooldown -= k.dt();
                }

                // Only regenerate if cooldown has expired
                if (enemy.shieldRegenCooldown <= 0) {
                    enemy.shieldRegenTimer += k.dt();
                    const regenInterval = 1.0; // Regenerate every second

                    if (enemy.shieldRegenTimer >= regenInterval) {
                        const regenAmount = enemy.shieldRegenRate * regenInterval;
                        enemy.shieldHealth = Math.min(enemy.maxShieldHealth, enemy.shieldHealth + regenAmount);
                        enemy.shieldRegenTimer = 0;
                    }
                }
            }

            // Update visual on all clients (synced via game_state)
            if (enemy.shieldHealth > 0 && enemy.updateVisual) {
                enemy.updateVisual();
            }
        }

        // Process burn DoT (Damage over Time) from flamethrower
        if (enemy.burnDuration > 0 && enemy.hp() > 0 && !enemy.isDead) {
            enemy.burnTimer = (enemy.burnTimer || 0) + k.dt();
            const burnTickInterval = 0.5; // Deal burn damage every 0.5 seconds

            if (enemy.burnTimer >= burnTickInterval) {
                // In multiplayer, only host deals burn damage
                if (!isMultiplayerActive() || isHost()) {
                    // Deal burn damage
                    if (enemy.takeDamage) {
                        enemy.takeDamage(enemy.burnDamage);
                    } else {
                        enemy.hurt(enemy.burnDamage);
                    }
                }

                // Visual feedback for burn damage (orange tint) on all clients
                enemy.color = k.rgb(255, 150, 50);
                k.wait(0.1, () => {
                    if (enemy.exists()) {
                        enemy.color = k.rgb(...enemy.originalColor);
                    }
                });

                enemy.burnTimer = 0;
            }

            // Decrease burn duration
            enemy.burnDuration -= k.dt();
            if (enemy.burnDuration <= 0) {
                enemy.burnDamage = 0;
                enemy.burnTimer = 0;
            }
        }

        // Find nearest alive player (support multiplayer)
        const allPlayers = k.get('player');
        const alivePlayers = allPlayers.filter(p => p.exists() && !p.isDead && p.hp() > 0);

        if (alivePlayers.length === 0) return; // No alive players to target

        // Find closest alive player
        let player = alivePlayers[0];
        let minDistance = Math.sqrt(
            Math.pow(player.pos.x - enemy.pos.x, 2) +
            Math.pow(player.pos.y - enemy.pos.y, 2)
        );

        for (let i = 1; i < alivePlayers.length; i++) {
            const p = alivePlayers[i];
            const d = Math.sqrt(
                Math.pow(p.pos.x - enemy.pos.x, 2) +
                Math.pow(p.pos.y - enemy.pos.y, 2)
            );
            if (d < minDistance) {
                minDistance = d;
                player = p;
            }
        }

        const dir = k.vec2(
            player.pos.x - enemy.pos.x,
            player.pos.y - enemy.pos.y
        );
        const distance = dir.len();
        
        // Behavior-specific AI
        if (enemy.behavior === 'turret') {
            // Turret: Stationary, just fires projectiles
            enemy.attackTimer += k.dt();
            if (distance > 0 && enemy.attackTimer >= 1 / enemy.fireRate) {
                const direction = dir.unit();
                const projectile = createProjectile(
                    k,
                    enemy.pos.x,
                    enemy.pos.y,
                    direction,
                    enemy.projectileSpeed,
                    enemy.projectileDamage,
                    0, // piercing
                    0, // obstaclePiercing
                    false // isCrit
                );
                projectile.isEnemyProjectile = true;
                projectile.color = k.rgb(...enemy.originalColor);
                enemy.attackTimer = 0;
            }
            return; // Turrets don't move
        }
        
        if (enemy.behavior === 'shoot') {
            // Shooter: Maintains distance, fires projectiles
            enemy.attackTimer += k.dt();
            
            // Movement: try to maintain distance
            const preferredDistance = 150;
            let moveAmount = k.vec2(0, 0);
            
            if (distance > preferredDistance * 1.2) {
                // Too far, move closer
                moveAmount = dir.unit().scale(enemy.speed * k.dt());
            } else if (distance < preferredDistance * 0.8) {
                // Too close, move away
                moveAmount = dir.unit().scale(-enemy.speed * k.dt());
            }
            
            // Fire projectiles
            if (distance > 0 && enemy.attackTimer >= 1 / enemy.fireRate) {
                const direction = dir.unit();
                const projectile = createProjectile(
                    k,
                    enemy.pos.x,
                    enemy.pos.y,
                    direction,
                    enemy.projectileSpeed,
                    enemy.projectileDamage,
                    0,
                    0,
                    false
                );
                projectile.isEnemyProjectile = true;
                projectile.color = k.rgb(...enemy.originalColor);
                enemy.attackTimer = 0;
            }
            
            // Apply movement with obstacle avoidance
            if (moveAmount.len() > 0) {
                const finalMove = applyObstacleAvoidance(moveAmount);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;

                // Keep in bounds (prevent backpedaling off screen)
                const margin = 20;
                const enemySize = enemy.size || 12;
                enemy.pos.x = k.clamp(enemy.pos.x, margin + enemySize, k.width() - margin - enemySize);
                enemy.pos.y = k.clamp(enemy.pos.y, margin + enemySize, k.height() - margin - enemySize);
            }
            return;
        }
        
        if (enemy.behavior === 'charge') {
            // Charger: Charges in straight line, then pauses
            enemy.chargeTimer += k.dt();
            
            if (enemy.isCharging) {
                // Currently charging
                enemy.chargeDuration += k.dt();
                const chargeTime = 0.8; // Charge for 0.8 seconds
                
                if (enemy.chargeDuration >= chargeTime) {
                    // Stop charging, start pause
                    enemy.isCharging = false;
                    enemy.chargeDuration = 0;
                    enemy.chargePauseTimer = 0;
                } else {
                    // Continue charging - use obstacle avoidance but prefer straight line
                    const chargeMove = enemy.chargeDirection.scale(enemy.speed * k.dt());
                    const finalMove = applyObstacleAvoidance(chargeMove);
                    // If heavily blocked, stop charging
                    if (finalMove.len() < chargeMove.len() * 0.3) {
                        enemy.isCharging = false;
                        enemy.chargePauseTimer = 0.1;
                    } else {
                        enemy.pos.x += finalMove.x;
                        enemy.pos.y += finalMove.y;
                    }
                }
            } else {
                // Not charging - normal movement or pause
                if (enemy.chargePauseTimer > 0) {
                    // Pausing after charge
                    enemy.chargePauseTimer += k.dt();
                    if (enemy.chargePauseTimer >= 1.0) {
                        enemy.chargePauseTimer = 0;
                        enemy.chargeTimer = 0; // Reset cooldown
                    }
                } else if (enemy.chargeTimer >= enemy.chargeCooldown) {
                    // Ready to charge - telegraph and charge
                    enemy.color = k.rgb(255, 255, 0); // Yellow telegraph
                    k.wait(0.2, () => {
                        if (enemy.exists()) {
                            enemy.color = k.rgb(...enemy.originalColor);
                            if (distance > 0) {
                                enemy.isCharging = true;
                                enemy.chargeDirection = dir.unit();
                                enemy.chargeDuration = 0;
                            }
                        }
                    });
                    enemy.chargeTimer = 0;
                } else {
                    // Normal movement toward player
                    const normalized = dir.unit();
                    const desiredMove = normalized.scale(enemy.speed * 0.5 * k.dt()); // Slower when not charging
                    const finalMove = applyObstacleAvoidance(desiredMove);
                    
                    // If movement is blocked, stop charging
                    if (finalMove.len() < desiredMove.len() * 0.5 && enemy.isCharging) {
                        enemy.isCharging = false;
                        enemy.chargePauseTimer = 0.1; // Start pause
                    }
                    
                    enemy.pos.x += finalMove.x;
                    enemy.pos.y += finalMove.y;
                }
            }
            return;
        }
        
        if (enemy.behavior === 'erratic') {
            // Erratic: Fast, unpredictable movement (Bat, Zippy)
            if (distance > 0) {
                const normalized = dir.unit();
                // Add jitter for unpredictability
                const jitter = k.vec2(
                    (Math.random() - 0.5) * 0.4,
                    (Math.random() - 0.5) * 0.4
                );
                const moveDir = k.vec2(
                    normalized.x + jitter.x,
                    normalized.y + jitter.y
                ).unit();
                const desiredMove = moveDir.scale(enemy.speed * k.dt());
                const finalMove = applyObstacleAvoidance(desiredMove);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;
            }
            return;
        }
        
        if (enemy.behavior === 'shield') {
            // Shield Bearer: High health, blocks projectiles from front (simplified - just high health for now)
            if (distance > 0) {
                const normalized = dir.unit();
                const desiredMove = normalized.scale(enemy.speed * k.dt());
                const finalMove = applyObstacleAvoidance(desiredMove);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;
            }
            return;
        }
        
        if (enemy.behavior === 'teleport') {
            // Wraith: Teleports periodically
            enemy.teleportTimer += k.dt();
            
            if (enemy.teleportTimer >= enemy.teleportCooldown && distance > 0) {
                // Teleport toward player
                const teleportDir = dir.unit();
                const teleportPos = k.vec2(
                    enemy.pos.x + teleportDir.x * enemy.teleportRange,
                    enemy.pos.y + teleportDir.y * enemy.teleportRange
                );
                
                // Check if teleport position is clear
                if (isPositionClear(teleportPos.x, teleportPos.y)) {
                    enemy.pos.x = teleportPos.x;
                    enemy.pos.y = teleportPos.y;
                    enemy.teleportTimer = 0;
                    
                    // Visual effect
                    enemy.color = k.rgb(255, 255, 255);
                    k.wait(0.1, () => {
                        if (enemy.exists()) {
                            enemy.color = k.rgb(...enemy.originalColor);
                        }
                    });
                }
            } else {
                // Normal movement
                if (distance > 0) {
                    const normalized = dir.unit();
                    const desiredMove = normalized.scale(enemy.speed * k.dt());
                    const finalMove = applyObstacleAvoidance(desiredMove);
                    enemy.pos.x += finalMove.x;
                    enemy.pos.y += finalMove.y;
                }
            }
            return;
        }
        
        if (enemy.behavior === 'spawner') {
            // Spawner: Periodically spawns minions
            enemy.spawnTimer += k.dt();
            
            if (enemy.spawnTimer >= enemy.spawnInterval) {
                // Spawn minion
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnDistance = 30;
                const spawnX = enemy.pos.x + Math.cos(spawnAngle) * spawnDistance;
                const spawnY = enemy.pos.y + Math.sin(spawnAngle) * spawnDistance;
                
                if (isPositionClear(spawnX, spawnY)) {
                    const minion = createEnemy(k, spawnX, spawnY, enemy.spawnType || 'rusher', enemy.floor);
                    minion.isBossMinion = true; // Mark as minion
                    enemy.spawnTimer = 0;
                }
            }
            
            // Normal movement (slow)
            if (distance > 0) {
                const normalized = dir.unit();
                const desiredMove = normalized.scale(enemy.speed * k.dt());
                const finalMove = applyObstacleAvoidance(desiredMove);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;
            }
            return;
        }
        
        if (enemy.behavior === 'buffer') {
            // Buffer: Buffs nearby enemies
            enemy.attackTimer += k.dt();
            
            if (enemy.attackTimer >= 1.0) { // Check every second
                const nearbyEnemies = k.get('enemy');
                for (const otherEnemy of nearbyEnemies) {
                    if (!otherEnemy.exists() || otherEnemy === enemy) continue;
                    
                    const buffDir = k.vec2(
                        otherEnemy.pos.x - enemy.pos.x,
                        otherEnemy.pos.y - enemy.pos.y
                    );
                    const buffDistance = buffDir.len();
                    
                    if (buffDistance <= enemy.buffRadius) {
                        // Buff this enemy
                        if (!otherEnemy.buffed) {
                            otherEnemy.buffed = true;
                            otherEnemy.originalSpeed = otherEnemy.speed;
                            otherEnemy.originalDamage = otherEnemy.damage || 10;
                        }
                        otherEnemy.speed = otherEnemy.originalSpeed * (1 + enemy.buffAmount);
                        otherEnemy.damage = otherEnemy.originalDamage * (1 + enemy.buffAmount);
                        enemy.buffedEnemies.add(otherEnemy);
                    } else if (enemy.buffedEnemies.has(otherEnemy)) {
                        // Remove buff if out of range
                        if (otherEnemy.buffed) {
                            otherEnemy.speed = otherEnemy.originalSpeed;
                            otherEnemy.damage = otherEnemy.originalDamage;
                            otherEnemy.buffed = false;
                        }
                        enemy.buffedEnemies.delete(otherEnemy);
                    }
                }
                enemy.attackTimer = 0;
            }
            
            // Normal movement
            if (distance > 0) {
                const normalized = dir.unit();
                const desiredMove = normalized.scale(enemy.speed * k.dt());
                const finalMove = applyObstacleAvoidance(desiredMove);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;
            }
            return;
        }
        
        if (enemy.behavior === 'healer') {
            // Healer: Heals nearby enemies
            enemy.healTimer += k.dt();
            
            if (enemy.healTimer >= enemy.healInterval) {
                const nearbyEnemies = k.get('enemy');
                for (const otherEnemy of nearbyEnemies) {
                    if (!otherEnemy.exists() || otherEnemy === enemy) continue;
                    
                    const healDir = k.vec2(
                        otherEnemy.pos.x - enemy.pos.x,
                        otherEnemy.pos.y - enemy.pos.y
                    );
                    const healDistance = healDir.len();
                    
                    if (healDistance <= enemy.healRadius) {
                        // Heal this enemy
                        const currentHP = otherEnemy.hp();
                        const maxHP = otherEnemy.maxHealth;
                        if (currentHP < maxHP) {
                            const newHP = Math.min(maxHP, currentHP + enemy.healAmount);
                            otherEnemy.setHP(newHP);
                            
                            // Visual effect
                            const healText = k.add([
                                k.text('+', { size: 16 }),
                                k.pos(otherEnemy.pos.x, otherEnemy.pos.y - 20),
                                k.anchor('center'),
                                k.color(100, 255, 100),
                                k.z(200)
                            ]);
                            k.wait(0.5, () => {
                                if (healText.exists()) k.destroy(healText);
                            });
                        }
                    }
                }
                enemy.healTimer = 0;
            }
            
            // Normal movement
            if (distance > 0) {
                const normalized = dir.unit();
                const desiredMove = normalized.scale(enemy.speed * k.dt());
                const finalMove = applyObstacleAvoidance(desiredMove);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;
            }
            return;
        }
        
        if (enemy.behavior === 'teleportPlayer') {
            // Teleporter: Teleports player when close
            enemy.teleportTimer += k.dt();
            
            if (enemy.teleportTimer >= enemy.teleportCooldown && distance <= 80) {
                // Teleport player to random location
                const teleportAngle = Math.random() * Math.PI * 2;
                const teleportX = player.pos.x + Math.cos(teleportAngle) * enemy.teleportRange;
                const teleportY = player.pos.y + Math.sin(teleportAngle) * enemy.teleportRange;
                
                // Clamp to screen bounds
                const clampedX = Math.max(50, Math.min(k.width() - 50, teleportX));
                const clampedY = Math.max(50, Math.min(k.height() - 50, teleportY));
                
                player.pos.x = clampedX;
                player.pos.y = clampedY;
                enemy.teleportTimer = 0;
                
                // Visual effect
                const teleportText = k.add([
                    k.text('!', { size: 24 }),
                    k.pos(player.pos.x, player.pos.y),
                    k.anchor('center'),
                    k.color(255, 200, 0),
                    k.z(200)
                ]);
                k.wait(0.3, () => {
                    if (teleportText.exists()) k.destroy(teleportText);
                });
            }
            
            // Normal movement
            if (distance > 0) {
                const normalized = dir.unit();
                const desiredMove = normalized.scale(enemy.speed * k.dt());
                const finalMove = applyObstacleAvoidance(desiredMove);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;
            }
            return;
        }
        
        if (enemy.behavior === 'freeze') {
            // Freezer: Slows player when nearby
            if (distance <= enemy.slowRadius) {
                if (!player.slowed) {
                    player.slowed = true;
                    player.originalSpeed = player.speed;
                }
                player.speed = player.originalSpeed * (1 - enemy.slowAmount);
            } else {
                if (player.slowed) {
                    player.speed = player.originalSpeed;
                    player.slowed = false;
                }
            }
            
            // Normal movement
            if (distance > 0) {
                const normalized = dir.unit();
                const desiredMove = normalized.scale(enemy.speed * k.dt());
                const finalMove = applyObstacleAvoidance(desiredMove);
                enemy.pos.x += finalMove.x;
                enemy.pos.y += finalMove.y;
            }
            return;
        }
        
        // Default behavior: rush (direct charge)
        if (enemy.behavior === 'rush') {
            if (distance > 0) {
                let moveDir;

                // Use smart pathfinding if enabled
                if (enemy.pathfindingMode === 'smart') {
                    moveDir = getSmartMoveDirection(k, enemy, player.pos.x, player.pos.y);
                } else {
                    // Fallback to direct movement with obstacle avoidance
                    const normalized = dir.unit();
                    const desiredMove = normalized.scale(enemy.speed * k.dt());
                    const finalMove = applyObstacleAvoidance(desiredMove);
                    moveDir = finalMove.unit();
                }

                enemy.pos.x += moveDir.x * enemy.speed * k.dt();
                enemy.pos.y += moveDir.y * enemy.speed * k.dt();
            }
        }

        // Perimeter behavior: walks around edge of map
        if (enemy.behavior === 'perimeter') {
            const moveDir = getPerimeterMoveDirection(k, enemy);
            enemy.pos.x += moveDir.x * enemy.speed * k.dt();
            enemy.pos.y += moveDir.y * enemy.speed * k.dt();
        }
        
        // Keep enemy in bounds (room boundaries) - same as player
        const roomWidth = k.width();
        const roomHeight = k.height();
        const margin = 20;
        const enemySize = enemy.size || 12;
        
        enemy.pos.x = k.clamp(enemy.pos.x, margin + enemySize, roomWidth - margin - enemySize);
        enemy.pos.y = k.clamp(enemy.pos.y, margin + enemySize, roomHeight - margin - enemySize);
    });

    // Mark as not dead initially
    enemy.isDead = false;
    
    // Cleanup buffs when buffer dies
    enemy.onDeath(() => {
        // Remove buffs from enemies when buffer dies
        if (enemy.behavior === 'buffer' && enemy.buffedEnemies) {
            for (const buffedEnemy of enemy.buffedEnemies) {
                if (buffedEnemy.exists() && buffedEnemy.buffed) {
                    buffedEnemy.speed = buffedEnemy.originalSpeed;
                    buffedEnemy.damage = buffedEnemy.originalDamage;
                    buffedEnemy.buffed = false;
                }
            }
        }
    });
    
    // Handle special death mechanics
    enemy.onDeath(() => {
        // In multiplayer, broadcast death event from host
        if (isMultiplayerActive() && isHost() && enemy.mpEntityId) {
            broadcastDeathEvent({
                entityId: enemy.mpEntityId,
                entityType: 'enemy',
                x: enemy.pos.x,
                y: enemy.pos.y,
                xpDropped: enemy.xpValue
            });
        }

        // Slime splitting - only spawn on host in multiplayer to avoid desyncs
        if (enemy.splits && enemy.hp() <= 0) {
            // In multiplayer, only host spawns split enemies and broadcasts them
            if (isMultiplayerActive() && !isHost()) {
                return; // Clients skip spawning - they'll receive spawn_entity messages
            }

            const splitCount = 2; // Split into 2 smaller slimes
            for (let i = 0; i < splitCount; i++) {
                const angle = (Math.PI * 2 / splitCount) * i;
                const spawnDistance = 20;
                const spawnX = enemy.pos.x + Math.cos(angle) * spawnDistance;
                const spawnY = enemy.pos.y + Math.sin(angle) * spawnDistance;

                // Create smaller slime (half health, smaller size)
                const smallSlime = createEnemy(k, spawnX, spawnY, 'slime', enemy.floor);
                smallSlime.maxHealth = Math.floor(smallSlime.maxHealth / 2);
                smallSlime.setHP(smallSlime.maxHealth);
                smallSlime.size = Math.floor(smallSlime.size * 0.8);
                smallSlime.splits = false; // Don't split again
                smallSlime.isSplitEnemy = true; // Mark as split enemy for tracking

                // Register split enemy for multiplayer sync (host only)
                if (isMultiplayerActive() && isHost() && registerEnemy) {
                    registerEnemy(smallSlime, {
                        enemyType: 'slime',
                        maxHealth: smallSlime.maxHealth,
                        floor: enemy.floor,
                        isSplitEnemy: true
                    });
                }
            }

            // Increment split enemy counter
            if (k.gameData && k.gameData.incrementSplitEnemies) {
                k.gameData.incrementSplitEnemies(splitCount);
            }

            // Broadcast split event to clients in multiplayer
            if (isMultiplayerActive() && isHost()) {
                broadcastEnemySplit(splitCount);
            }
        }
        
        // Exploder explosion
        if (enemy.explodes && enemy.hp() <= 0) {
            // Damage all players within explosion radius (only host in multiplayer)
            if (!isMultiplayerActive() || isHost()) {
                const allPlayers = k.get('player');
                allPlayers.forEach(player => {
                    if (player && player.exists() && !player.isDead) {
                        const explosionDir = k.vec2(
                            player.pos.x - enemy.pos.x,
                            player.pos.y - enemy.pos.y
                        );
                        const explosionDistance = explosionDir.len();

                        if (explosionDistance <= enemy.explosionRadius) {
                            // Player is in explosion radius
                            if (!player.invulnerable) {
                                const finalDamage = Math.max(1, enemy.explosionDamage - (player.defense || 0));
                                player.hurt(finalDamage);
                                player.invulnerable = true;
                                player.invulnerableTime = player.invulnerableDuration;
                                player.color = k.rgb(255, 100, 100);
                            }
                        }
                    }
                });
            }
            
            // Visual explosion effect (could add particles later)
            const explosionText = k.add([
                k.text('*', { size: 24 }),
                k.pos(enemy.pos.x, enemy.pos.y),
                k.anchor('center'),
                k.color(255, 200, 0),
                k.z(200)
            ]);
            k.wait(0.2, () => {
                if (explosionText.exists()) k.destroy(explosionText);
            });
        }
    });

    // Multiplayer: Register enemy for network sync if host
    if (isMultiplayerActive() && isHost()) {
        registerEnemy(enemy, { type, floor });
        enemy.enemyType = type; // Store type for sync
    }

    return enemy;
}

