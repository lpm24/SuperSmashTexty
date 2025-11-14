// Player entity definition
import { getSelectedCharacter } from '../systems/metaProgression.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { getWeaponDefinition } from '../data/weapons.js';

export function createPlayer(k, x, y) {
    // Get selected character
    const selectedCharKey = getSelectedCharacter();
    const charData = CHARACTER_UNLOCKS[selectedCharKey] || CHARACTER_UNLOCKS.survivor;
    
    const player = k.add([
        k.text(charData.char, { size: 24 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...charData.color),
        k.area(),
        k.health(charData.stats.health),
        'player'
    ]);

    // Store character info
    player.characterKey = selectedCharKey;
    player.characterData = charData;
    
    // Player stats (from character)
    player.speed = charData.stats.speed;
    player.originalSpeed = charData.stats.speed; // Store original speed for debuff restoration
    player.slowed = false; // Track if player is slowed
    player.maxHealth = charData.stats.health;
    player.level = 1;
    player.xp = 0;
    player.xpToNext = 10;
    player.pickupRadius = 30; // Base pickup radius in pixels
    player.invulnerable = false; // Immunity frames flag
    player.invulnerableTime = 0; // Time remaining in immunity
    player.invulnerableDuration = 1.0; // 1 second of immunity after hit
    
    // Sync health component with maxHealth
    player.setHP(player.maxHealth);
    
    // Weapon system - get weapon definition
    const weaponKey = charData.weapon || 'pistol';
    const weaponDef = getWeaponDefinition(weaponKey);
    player.weaponKey = weaponKey;
    player.weaponDef = weaponDef;
    
    // Store base weapon stats (for upgrade recalculation)
    player.baseFireRate = weaponDef.fireRate;
    player.baseProjectileSpeed = weaponDef.projectileSpeed;
    player.baseProjectileDamage = weaponDef.baseDamage;
    
    // Weapon stats (from weapon definition)
    player.fireRate = weaponDef.fireRate;
    player.projectileSpeed = weaponDef.projectileSpeed;
    player.projectileDamage = weaponDef.baseDamage;
    player.lastFireTime = 0;
    
    // Advanced weapon stats (from weapon definition)
    player.projectileCount = weaponDef.projectileCount;
    player.piercing = weaponDef.piercing;
    player.obstaclePiercing = weaponDef.obstaclePiercing;
    player.critChance = weaponDef.critChance;
    player.critDamage = weaponDef.critDamage;
    player.spreadAngle = weaponDef.spreadAngle;
    player.defense = 0; // Damage reduction (flat reduction)
    
    // Weapon-specific properties
    player.weaponRange = weaponDef.range;
    player.weaponCategory = weaponDef.category;
    
    // Orbital weapon properties
    if (weaponDef.orbitRadius) {
        player.orbitRadius = weaponDef.orbitRadius;
        player.rotationSpeed = weaponDef.rotationSpeed;
        player.orbitalOrbs = []; // Array to store orbital entities
        player.orbitalAngles = []; // Array to store orbital angles
    }
    
    // Explosive weapon properties
    if (weaponDef.explosionRadius) {
        player.explosionRadius = weaponDef.explosionRadius;
        player.explosionDamage = weaponDef.explosionDamage;
    }
    
    // Chain lightning properties
    if (weaponDef.chainRange) {
        player.chainRange = weaponDef.chainRange;
        player.maxJumps = weaponDef.maxJumps;
        player.chainDamageReduction = weaponDef.chainDamageReduction;
    }
    
    // Character abilities (apply based on character)
    player.xpMultiplier = 1.0; // Base multiplier
    player.dodgeChance = 0; // Base dodge chance
    player.damageReduction = 0; // Base damage reduction
    
    // Upgrade tracking
    player.weapons = [weaponKey]; // Array of equipped weapon keys (max 4)
    player.passiveUpgrades = []; // Array of passive upgrade keys (max 4)
    player.upgradeStacks = {}; // Track upgrade stack counts: { upgradeKey: count }
    
    // Apply character-specific abilities
    if (charData.ability === 'xpBoost') {
        player.xpMultiplier = 1.1; // +10% XP gain (The Survivor)
    } else if (charData.ability === 'speedBoost') {
        // +20% speed boost (stacks with base)
        player.speed = player.speed * 1.2;
        player.originalSpeed = player.speed;
        player.dodgeChance = 0.1; // +10% dodge chance (The Scout)
    } else if (charData.ability === 'tankStats') {
        // +25% health (already applied in maxHealth)
        player.maxHealth = Math.floor(player.maxHealth * 1.25);
        player.setHP(player.maxHealth);
        player.damageReduction = 0.15; // +15% damage reduction (The Tank)
    } else if (charData.ability === 'critBoost') {
        // +50% crit chance, +25% crit damage (The Sniper)
        // Apply to weapon's base crit chance
        player.critChance = (player.critChance || 0) * 1.5; // +50% multiplier
        player.critDamage = (player.critDamage || 2.0) * 1.25; // +25% multiplier
    } else if (charData.ability === 'fireDot') {
        // +25% fire DoT (The Pyro) - requires DoT system
        player.fireDotMultiplier = 1.25;
    }

    // Movement
    let moveDir = k.vec2(0, 0);
    
    k.onKeyDown(['w', 'up'], () => {
        moveDir.y = -1;
    });
    
    k.onKeyDown(['s', 'down'], () => {
        moveDir.y = 1;
    });
    
    k.onKeyDown(['a', 'left'], () => {
        moveDir.x = -1;
    });
    
    k.onKeyDown(['d', 'right'], () => {
        moveDir.x = 1;
    });
    
    k.onKeyRelease(['w', 'up'], () => {
        if (!k.isKeyDown('s') && !k.isKeyDown('down')) {
            moveDir.y = 0;
        }
    });
    
    k.onKeyRelease(['s', 'down'], () => {
        if (!k.isKeyDown('w') && !k.isKeyDown('up')) {
            moveDir.y = 0;
        }
    });
    
    k.onKeyRelease(['a', 'left'], () => {
        if (!k.isKeyDown('d') && !k.isKeyDown('right')) {
            moveDir.x = 0;
        }
    });
    
    k.onKeyRelease(['d', 'right'], () => {
        if (!k.isKeyDown('a') && !k.isKeyDown('left')) {
            moveDir.x = 0;
        }
    });

    // Update movement and immunity frames
    player.onUpdate(() => {
        if (k.paused) return;
        
        // Update immunity frames
        if (player.invulnerable) {
            player.invulnerableTime -= k.dt();
            if (player.invulnerableTime <= 0) {
                player.invulnerable = false;
                player.color = k.rgb(100, 150, 255); // Reset to normal color
            } else {
                // Flash effect during immunity (every 0.1 seconds)
                const flashRate = 10; // flashes per second
                const shouldShow = Math.floor(player.invulnerableTime * flashRate) % 2 === 0;
                if (shouldShow) {
                    player.color = k.rgb(100, 150, 255);
                } else {
                    player.color = k.rgb(100, 150, 255, 0.3); // Semi-transparent
                }
            }
        }
        
        if (moveDir.len() > 0) {
            const len = moveDir.len();
            const normalized = moveDir.scale(1 / len);
            const moveAmount = normalized.scale(player.speed * k.dt());
            
            // Check collision with obstacles before moving
            const newX = player.pos.x + moveAmount.x;
            const newY = player.pos.y + moveAmount.y;
            
            // Test collision with obstacles (walls and cover both block movement)
            let canMoveX = true;
            let canMoveY = true;
            
            const obstacles = k.get('obstacle');
            const playerSize = 12; // Approximate player collision size
            
            for (const obstacle of obstacles) {
                if (!obstacle.exists()) continue;
                
                // Check X movement
                const obsLeft = obstacle.pos.x - obstacle.width / 2;
                const obsRight = obstacle.pos.x + obstacle.width / 2;
                const obsTop = obstacle.pos.y - obstacle.height / 2;
                const obsBottom = obstacle.pos.y + obstacle.height / 2;
                
                const playerLeft = newX - playerSize;
                const playerRight = newX + playerSize;
                const playerTop = player.pos.y - playerSize;
                const playerBottom = player.pos.y + playerSize;
                
                if (playerRight > obsLeft && playerLeft < obsRight &&
                    playerBottom > obsTop && playerTop < obsBottom) {
                    canMoveX = false;
                }
                
                // Check Y movement
                const playerLeftY = player.pos.x - playerSize;
                const playerRightY = player.pos.x + playerSize;
                const playerTopY = newY - playerSize;
                const playerBottomY = newY + playerSize;
                
                if (playerRightY > obsLeft && playerLeftY < obsRight &&
                    playerBottomY > obsTop && playerTopY < obsBottom) {
                    canMoveY = false;
                }
            }
            
            // Apply movement if no collision
            if (canMoveX) player.pos.x = newX;
            if (canMoveY) player.pos.y = newY;
        }
        
        // Keep player in bounds (room boundaries)
        const roomWidth = k.width();
        const roomHeight = k.height();
        const margin = 20;
        
        player.pos.x = k.clamp(player.pos.x, margin, roomWidth - margin);
        player.pos.y = k.clamp(player.pos.y, margin, roomHeight - margin);
    });

    return player;
}

