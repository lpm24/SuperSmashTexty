// Boss entity definition with armor system
export function createBoss(k, x, y, type = 'gatekeeper', floor = 1) {
    const bossTypes = {
        gatekeeper: {
            coreChar: 'GG',
            armorChar: '()',
            color: [255, 50, 50], // Red
            armorColor: [200, 200, 200], // Gray/white for armor
            baseHealth: 500,
            baseArmorHealth: 125, // 100-150 range, using middle
            baseSpeed: 70, // 60-80 range, using middle
            size: 28,
            baseXPValue: 125, // 100-150 range
            damageReduction: 0.3, // 30% damage reduction when armor is active
        },
        swarmQueen: {
            coreChar: 'QQ',
            armorChar: '()',
            color: [200, 100, 255], // Purple
            armorColor: [200, 200, 200],
            baseHealth: 800,
            baseArmorHealth: 175, // 150-200 range
            baseSpeed: 50, // 40-60 range
            size: 28,
            baseXPValue: 250, // 200-300 range
            damageReduction: 0.35, // 35% damage reduction
        },
        twinGuardian: {
            coreChar: '▶◈', // Two characters side-by-side
            armorChar: '()',
            color: [255, 50, 50], // Red for melee, will be split
            armorColor: [200, 200, 200],
            baseHealth: 600, // Per guardian
            baseArmorHealth: 125, // Per guardian
            baseSpeed: 110, // Melee guardian speed
            size: 28,
            baseXPValue: 350, // 300-400 range
            damageReduction: 0.3,
        }
    };

    const baseConfig = bossTypes[type] || bossTypes.gatekeeper;
    
    // Scale stats based on floor
    const floorMultiplier = 1 + (floor - 1) * 0.2; // 20% increase per floor
    const config = {
        coreChar: baseConfig.coreChar,
        armorChar: baseConfig.armorChar,
        color: baseConfig.color,
        armorColor: baseConfig.armorColor,
        health: Math.floor(baseConfig.baseHealth * floorMultiplier),
        armorHealth: Math.floor(baseConfig.baseArmorHealth * floorMultiplier),
        maxArmorHealth: Math.floor(baseConfig.baseArmorHealth * floorMultiplier),
        speed: Math.floor(baseConfig.baseSpeed * (1 + (floor - 1) * 0.05)),
        size: baseConfig.size,
        xpValue: Math.floor(baseConfig.baseXPValue * floorMultiplier),
        damageReduction: baseConfig.damageReduction
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
    
    // Armor properties
    boss.armorHealth = config.armorHealth;
    boss.maxArmorHealth = config.maxArmorHealth;
    boss.damageReduction = config.damageReduction;
    boss.coreChar = config.coreChar;
    boss.armorChar = config.armorChar;
    boss.armorColor = config.armorColor;
    
    // Function to update visual representation
    boss.updateVisual = function() {
        // Armor degradation states:
        // Full armor (>50%): (GG)
        // Left armor gone (0-50%): GG)
        // No armor (0%): GG
        let leftArmor = '';
        let rightArmor = '';
        
        if (boss.armorHealth > boss.maxArmorHealth * 0.5) {
            // Full armor
            leftArmor = '(';
            rightArmor = ')';
        } else if (boss.armorHealth > 0) {
            // Left armor destroyed, right still intact
            leftArmor = '';
            rightArmor = ')';
        } else {
            // No armor
            leftArmor = '';
            rightArmor = '';
        }
        
        const visual = `${leftArmor}${boss.coreChar}${rightArmor}`;
        
        // Update text component (KAPLAY allows direct text assignment)
        boss.text = visual;
        
        // Update color - restore boss color
        boss.color = k.rgb(...config.color);
    };
    
    // Function to take damage (handles armor)
    boss.takeDamage = function(damage) {
        let armorChanged = false;
        const previousArmorHealth = boss.armorHealth;
        
        // If armor exists, armor takes damage first
        if (boss.armorHealth > 0) {
            const armorDamage = Math.min(damage, boss.armorHealth);
            boss.armorHealth = Math.max(0, boss.armorHealth - armorDamage);
            armorChanged = (boss.armorHealth !== previousArmorHealth);
            
            // Remaining damage goes to boss, but reduced if armor still exists
            const remainingDamage = damage - armorDamage;
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
        
        // Update visual when armor changes
        if (armorChanged) {
            boss.updateVisual();
        }
    };
    
    // AI based on boss type
    boss.onUpdate(() => {
        if (k.paused) return;
        
        const player = k.get('player')[0];
        if (!player) return;
        
        const dir = k.vec2(
            player.pos.x - boss.pos.x,
            player.pos.y - boss.pos.y
        );
        const distance = dir.len();
        
        if (distance > 0) {
            const normalized = dir.unit();
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
                
                // Check X movement
                const bossLeftX = newX - bossSize;
                const bossRightX = newX + bossSize;
                const bossTopX = boss.pos.y - bossSize;
                const bossBottomX = boss.pos.y + bossSize;
                
                if (bossRightX > obsLeft && bossLeftX < obsRight &&
                    bossBottomX > obsTop && bossTopX < obsBottom) {
                    canMoveX = false;
                }
                
                // Check Y movement
                const bossLeftY = boss.pos.x - bossSize;
                const bossRightY = boss.pos.x + bossSize;
                const bossTopY = newY - bossSize;
                const bossBottomY = newY + bossSize;
                
                if (bossRightY > obsLeft && bossLeftY < obsRight &&
                    bossBottomY > obsTop && bossTopY < obsBottom) {
                    canMoveY = false;
                }
            }
            
            // Apply movement if no collision
            if (canMoveX) boss.pos.x = newX;
            if (canMoveY) boss.pos.y = newY;
        }
    });

    // Mark as not dead initially
    boss.isDead = false;
    
    // Initialize visual
    boss.updateVisual();

    return boss;
}

