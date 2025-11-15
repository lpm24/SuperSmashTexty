// Miniboss entity definition - scaled-down bosses that appear randomly in rooms
import { createProjectile } from './projectile.js';

export function createMiniboss(k, x, y, type = 'brute', floor = 1) {
    const minibossTypes = {
        brute: {
            coreChar: 'B',
            armorChar: '[]',
            shieldChar: '{}',
            color: [255, 100, 50], // Orange-red
            armorColor: [200, 200, 200],
            shieldColor: [100, 200, 255],
            baseHealth: 200,
            baseArmorHealth: 50,
            baseShieldHealth: 0,
            baseSpeed: 60,
            size: 24,
            baseXPValue: 50,
            damageReduction: 0.25,
            shieldRegenRate: 0,
            meleeDamage: 18,
            behavior: 'charge' // Charges at player periodically
        },
        sentinel: {
            coreChar: 'S',
            armorChar: '[]',
            shieldChar: '{}',
            color: [100, 200, 255], // Light blue
            armorColor: [200, 200, 200],
            shieldColor: [100, 200, 255],
            baseHealth: 180,
            baseArmorHealth: 40,
            baseShieldHealth: 30, // Has shields
            baseSpeed: 50,
            size: 24,
            baseXPValue: 45,
            damageReduction: 0.2,
            shieldRegenRate: 2, // 2 HP/sec regen
            projectileDamage: 12,
            projectileSpeed: 250,
            fireRate: 1.2,
            behavior: 'shoot' // Ranged attacker
        },
        berserker: {
            coreChar: 'Z',
            armorChar: '[]',
            shieldChar: '{}',
            color: [255, 50, 50], // Red
            armorColor: [200, 200, 200],
            shieldColor: [100, 200, 255],
            baseHealth: 250,
            baseArmorHealth: 0,
            baseShieldHealth: 0,
            baseSpeed: 80, // Fast
            size: 24,
            baseXPValue: 55,
            damageReduction: 0,
            shieldRegenRate: 0,
            meleeDamage: 20,
            behavior: 'rush' // Fast, aggressive
        },
        guardian: {
            coreChar: 'G',
            armorChar: '[]',
            shieldChar: '{}',
            color: [150, 150, 255], // Light purple
            armorColor: [200, 200, 200],
            shieldColor: [100, 200, 255],
            baseHealth: 220,
            baseArmorHealth: 60, // Heavy armor
            baseShieldHealth: 0,
            baseSpeed: 40, // Slow
            size: 24,
            baseXPValue: 50,
            damageReduction: 0.3,
            shieldRegenRate: 0,
            meleeDamage: 16,
            behavior: 'rush' // Tanky, slow
        },
        warlock: {
            coreChar: 'W',
            armorChar: '[]',
            shieldChar: '{}',
            color: [200, 100, 255], // Purple
            armorColor: [200, 200, 200],
            shieldColor: [100, 200, 255],
            baseHealth: 160,
            baseArmorHealth: 0,
            baseShieldHealth: 40, // Has shields
            baseSpeed: 55,
            size: 24,
            baseXPValue: 48,
            damageReduction: 0,
            shieldRegenRate: 3, // 3 HP/sec regen
            projectileDamage: 14,
            projectileSpeed: 220,
            fireRate: 1.0,
            behavior: 'shoot' // Ranged with shields
        }
    };

    const baseConfig = minibossTypes[type] || minibossTypes.brute;
    
    // Scale stats based on floor
    const floorMultiplier = 1 + (floor - 1) * 0.2; // 20% increase per floor
    const config = {
        coreChar: baseConfig.coreChar,
        armorChar: baseConfig.armorChar || '[]',
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
        shieldRegenRate: (baseConfig.shieldRegenRate || 0) * floorMultiplier
    };
    
    // Create miniboss entity
    const miniboss = k.add([
        k.text(config.coreChar, { size: config.size }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...config.color),
        k.area(),
        k.health(config.health),
        'miniboss'
    ]);

    miniboss.maxHealth = config.health;
    miniboss.speed = config.speed;
    miniboss.xpValue = config.xpValue;
    miniboss.type = type;
    miniboss.floor = floor;
    
    // Store miniboss-specific stats
    if (baseConfig.meleeDamage) miniboss.meleeDamage = baseConfig.meleeDamage;
    if (baseConfig.projectileDamage) miniboss.projectileDamage = baseConfig.projectileDamage;
    if (baseConfig.projectileSpeed) miniboss.projectileSpeed = baseConfig.projectileSpeed;
    if (baseConfig.fireRate) miniboss.fireRate = baseConfig.fireRate;
    
    // Armor properties
    miniboss.armorHealth = config.armorHealth;
    miniboss.maxArmorHealth = config.maxArmorHealth;
    miniboss.damageReduction = config.damageReduction;
    miniboss.coreChar = config.coreChar;
    miniboss.armorChar = config.armorChar;
    miniboss.armorColor = config.armorColor;
    
    // Shield properties
    miniboss.shieldHealth = config.shieldHealth;
    miniboss.maxShieldHealth = config.maxShieldHealth;
    miniboss.shieldRegenRate = config.shieldRegenRate;
    miniboss.shieldChar = config.shieldChar;
    miniboss.shieldColor = config.shieldColor;
    miniboss.shieldRegenTimer = 0;
    miniboss.shieldRegenCooldown = 0;
    miniboss.lastDamageTime = 0;
    
    // Behavior-specific timers
    miniboss.attackTimer = 0;
    miniboss.chargeCooldownTimer = 0;
    miniboss.chargeDurationTimer = 0;
    miniboss.isCharging = false;
    miniboss.chargeDirection = null;
    miniboss.chargeSpeed = 0;
    
    // Function to update visual representation
    miniboss.updateVisual = function() {
        // Priority: Shields > Armor > Core
        let leftShield = '';
        let rightShield = '';
        let leftArmor = '';
        let rightArmor = '';
        
        // Shields take priority (outermost layer)
        // Size scales with health: Full = ⟦ ⟧, Medium = { }, Low = ⦃ ⦄
        // Using ⟦ ⟧ instead of {{ }} to avoid KAPLAY styled text tag parsing
        if (miniboss.shieldHealth > 0) {
            const shieldPercent = miniboss.shieldHealth / miniboss.maxShieldHealth;
            
            if (shieldPercent > 0.66) {
                // Full shield (66-100%): Double brackets ⟦ ⟧ (mathematical double brackets)
                leftShield = '⟦';
                rightShield = '⟧';
            } else if (shieldPercent > 0.33) {
                // Medium shield (33-66%): Single braces
                leftShield = '{';
                rightShield = '}';
            } else {
                // Low shield (0-33%): Thin braces ⦃ ⦄
                leftShield = '⦃';
                rightShield = '⦄';
            }
        }
        
        // Armor (middle layer, can appear with shields: {[B]})
        // Size scales with health: Full = ⟦ ⟧, Medium = [ ], Low = ⦅ ⦆
        // Using ⟦ ⟧ instead of [[ ]] to avoid potential parsing issues
        if (miniboss.armorHealth > 0) {
            const armorPercent = miniboss.armorHealth / miniboss.maxArmorHealth;
            
            if (armorPercent > 0.66) {
                // Full armor (66-100%): Double brackets ⟦ ⟧ (mathematical double brackets)
                leftArmor = '⟦';
                rightArmor = '⟧';
            } else if (armorPercent > 0.33) {
                // Medium armor (33-66%): Single brackets
                leftArmor = '[';
                rightArmor = ']';
            } else {
                // Low armor (0-33%): Thin brackets ⦅ ⦆
                leftArmor = '⦅';
                rightArmor = '⦆';
            }
        }
        
        // Visual format: {[B]} (shields outside, armor inside)
        const visual = `${leftShield}${leftArmor}${miniboss.coreChar}${rightArmor}${rightShield}`;
        
        // Update text component
        miniboss.text = visual;
        
        // Update color - use shield color if shields exist, otherwise original color
        if (miniboss.shieldHealth > 0) {
            miniboss.color = k.rgb(...config.shieldColor);
        } else {
            miniboss.color = k.rgb(...config.color);
        }
    };
    
    // Function to take damage (handles shields, then armor, then health)
    miniboss.takeDamage = function(damage) {
        let shieldChanged = false;
        let armorChanged = false;
        const previousShieldHealth = miniboss.shieldHealth;
        const previousArmorHealth = miniboss.armorHealth;
        
        // Track damage time for shield regen cooldown
        miniboss.lastDamageTime = k.time();
        const shieldRegenCooldownDuration = 3.0; // 3 seconds cooldown after taking damage
        miniboss.shieldRegenCooldown = shieldRegenCooldownDuration;
        
        // Priority: Shields > Armor > Health
        // Shields take normal damage (no reduction)
        if (miniboss.shieldHealth > 0) {
            const shieldDamage = Math.min(damage, miniboss.shieldHealth);
            miniboss.shieldHealth = Math.max(0, miniboss.shieldHealth - shieldDamage);
            shieldChanged = (miniboss.shieldHealth !== previousShieldHealth);
            
            // Remaining damage goes to armor/health
            const remainingDamage = damage - shieldDamage;
            if (remainingDamage > 0) {
                miniboss.takeDamageInternal(remainingDamage);
            }
        } else {
            // No shields - damage goes to armor/health
            miniboss.takeDamageInternal(damage);
        }
        
        armorChanged = (miniboss.armorHealth !== previousArmorHealth);
        
        // Update visual when shields or armor change
        if (shieldChanged || armorChanged) {
            miniboss.updateVisual();
        }
    };
    
    // Internal damage function (handles armor and health)
    miniboss.takeDamageInternal = function(damage) {
        // If armor exists, armor takes reduced damage first
        if (miniboss.armorHealth > 0) {
            // Apply damage reduction to armor damage
            const reducedDamage = Math.floor(damage * (1 - miniboss.damageReduction));
            const armorDamage = Math.min(reducedDamage, miniboss.armorHealth);
            miniboss.armorHealth = Math.max(0, miniboss.armorHealth - armorDamage);
            
            // Remaining damage goes to miniboss, but reduced if armor still exists
            const remainingDamage = damage - reducedDamage;
            if (remainingDamage > 0) {
                const damageMultiplier = miniboss.armorHealth > 0 ? (1 - miniboss.damageReduction) : 1;
                const finalDamage = Math.floor(remainingDamage * damageMultiplier);
                miniboss.hurt(finalDamage);
            }
        } else {
            // No armor - full damage
            miniboss.hurt(damage);
        }
    };
    
    // Charge attack
    miniboss.startCharge = function(targetPos) {
        if (!miniboss.exists()) return;
        
        miniboss.isCharging = true;
        const dir = k.vec2(targetPos.x - miniboss.pos.x, targetPos.y - miniboss.pos.y);
        if (dir.len() > 0) {
            miniboss.chargeDirection = dir.unit();
            miniboss.chargeSpeed = miniboss.speed * 2.5; // 2.5x speed for charge
        }
    };
    
    // AI based on behavior type
    miniboss.onUpdate(() => {
        if (k.paused) return;
        
        // Shield regeneration (if shields exist and regen rate > 0)
        // Only regen if cooldown has expired (not damaged recently)
        if (miniboss.shieldRegenRate > 0 && miniboss.shieldHealth < miniboss.maxShieldHealth) {
            // Update cooldown timer
            if (miniboss.shieldRegenCooldown > 0) {
                miniboss.shieldRegenCooldown -= k.dt();
            }
            
            // Only regenerate if cooldown has expired
            if (miniboss.shieldRegenCooldown <= 0) {
                miniboss.shieldRegenTimer += k.dt();
                const regenInterval = 1.0; // Regenerate every second
                
                if (miniboss.shieldRegenTimer >= regenInterval) {
                    const regenAmount = miniboss.shieldRegenRate * regenInterval;
                    miniboss.shieldHealth = Math.min(miniboss.maxShieldHealth, miniboss.shieldHealth + regenAmount);
                    miniboss.shieldRegenTimer = 0;
                    
                    // Update visual if shield regenerated
                    if (miniboss.shieldHealth > 0) {
                        miniboss.updateVisual();
                    }
                }
            }
        }
        
        const player = k.get('player')[0];
        if (!player || !player.exists()) return;
        
        const dir = k.vec2(
            player.pos.x - miniboss.pos.x,
            player.pos.y - miniboss.pos.y
        );
        const distance = dir.len();
        
        // Behavior-specific AI
        if (baseConfig.behavior === 'charge') {
            // Brute: Charges at player periodically
            miniboss.attackTimer += k.dt();
            miniboss.chargeCooldownTimer += k.dt();
            
            const chargeCooldown = 6; // 6 seconds between charges
            const chargeDistance = 200; // Distance to start charge
            
            // Handle charge attack
            if (miniboss.isCharging) {
                const chargeMove = miniboss.chargeDirection.scale(miniboss.chargeSpeed * k.dt());
                miniboss.pos.x += chargeMove.x;
                miniboss.pos.y += chargeMove.y;
                
                miniboss.chargeDurationTimer += k.dt();
                const chargeDuration = 1.0;
                if (miniboss.chargeDurationTimer >= chargeDuration) {
                    miniboss.isCharging = false;
                    miniboss.chargeDurationTimer = 0;
                    miniboss.chargeCooldownTimer = 0;
                }
            } else {
                // Normal movement toward player
                if (distance > 0) {
                    const normalized = dir.unit();
                    const moveAmount = normalized.scale(miniboss.speed * k.dt());
                    miniboss.pos.x += moveAmount.x;
                    miniboss.pos.y += moveAmount.y;
                }
                
                // Charge attack when close enough
                if (miniboss.chargeCooldownTimer >= chargeCooldown && distance < chargeDistance) {
                    miniboss.color = k.rgb(255, 255, 0); // Yellow telegraph
                    k.wait(0.3, () => {
                        if (miniboss.exists()) {
                            miniboss.color = k.rgb(...config.color);
                            miniboss.startCharge(player.pos);
                        }
                    });
                    miniboss.chargeCooldownTimer = 0;
                }
            }
        } else if (baseConfig.behavior === 'shoot') {
            // Sentinel/Warlock: Ranged attacker
            miniboss.attackTimer += k.dt();
            
            // Movement: maintain distance from player
            const preferredDistance = 180;
            if (distance > 0) {
                const normalized = dir.unit();
                let moveSpeed = miniboss.speed;
                
                // Move away if too close, move closer if too far
                if (distance < preferredDistance) {
                    // Move away from player
                    const moveAmount = normalized.scale(-moveSpeed * k.dt());
                    miniboss.pos.x += moveAmount.x;
                    miniboss.pos.y += moveAmount.y;
                } else if (distance > preferredDistance * 1.5) {
                    // Move closer if too far
                    const moveAmount = normalized.scale(moveSpeed * k.dt());
                    miniboss.pos.x += moveAmount.x;
                    miniboss.pos.y += moveAmount.y;
                }
            }
            
            // Fire projectiles at player
            const fireInterval = 1 / miniboss.fireRate;
            if (miniboss.attackTimer >= fireInterval) {
                if (distance > 0) {
                    const direction = dir.unit();
                    const projectile = createProjectile(
                        k, 
                        miniboss.pos.x, 
                        miniboss.pos.y, 
                        direction, 
                        miniboss.projectileSpeed, 
                        miniboss.projectileDamage, 
                        0, 
                        0, 
                        false
                    );
                    projectile.isBossProjectile = true;
                    projectile.color = k.rgb(...config.color);
                }
                miniboss.attackTimer = 0;
            }
        } else if (baseConfig.behavior === 'rush') {
            // Berserker/Guardian: Direct charge at player
            if (distance > 0) {
                const normalized = dir.unit();
                const moveAmount = normalized.scale(miniboss.speed * k.dt());
                miniboss.pos.x += moveAmount.x;
                miniboss.pos.y += moveAmount.y;
            }
        }
    });
    
    // Mark as not dead initially
    miniboss.isDead = false;
    
    // Initialize visual
    miniboss.updateVisual();

    return miniboss;
}

