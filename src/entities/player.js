/**
 * Player Entity
 *
 * Creates and manages the player character including:
 * - Character selection and stats
 * - Health and death handling
 * - Progression (level, XP)
 * - Upgrades and abilities
 * - Invulnerability frames
 * - Character-specific abilities (dodge, XP boost, etc.)
 */

// System imports
import { getSelectedCharacter } from '../systems/metaProgression.js';

// Data imports
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { getWeaponDefinition } from '../data/weapons.js';

// Configuration imports
import {
    PLAYER_CONFIG,
    PROGRESSION_CONFIG,
    CHARACTER_ABILITIES
} from '../config/constants.js';

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
    player.level = PROGRESSION_CONFIG.STARTING_LEVEL;
    player.xp = PROGRESSION_CONFIG.STARTING_XP;
    player.xpToNext = PROGRESSION_CONFIG.BASE_XP_TO_NEXT_LEVEL;
    player.pickupRadius = PLAYER_CONFIG.BASE_PICKUP_RADIUS;
    player.invulnerable = false; // Immunity frames flag
    player.invulnerableTime = 0; // Time remaining in immunity
    player.invulnerableDuration = PLAYER_CONFIG.INVULNERABILITY_DURATION;
    
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
        player.xpMultiplier = CHARACTER_ABILITIES.SURVIVOR_XP_BOOST;
    } else if (charData.ability === 'speedBoost') {
        player.speed = player.speed * CHARACTER_ABILITIES.SCOUT_SPEED_BOOST;
        player.originalSpeed = player.speed;
        player.dodgeChance = CHARACTER_ABILITIES.SCOUT_DODGE_CHANCE;
    } else if (charData.ability === 'tankStats') {
        player.maxHealth = Math.floor(player.maxHealth * CHARACTER_ABILITIES.TANK_HEALTH_BOOST);
        player.setHP(player.maxHealth);
        player.damageReduction = CHARACTER_ABILITIES.TANK_DAMAGE_REDUCTION;
    } else if (charData.ability === 'critBoost') {
        player.critChance = (player.critChance || 0) * CHARACTER_ABILITIES.SNIPER_CRIT_CHANCE_MULTIPLIER;
        player.critDamage = (player.critDamage || 2.0) * CHARACTER_ABILITIES.SNIPER_CRIT_DAMAGE_MULTIPLIER;
    } else if (charData.ability === 'fireDot') {
        player.fireDotMultiplier = CHARACTER_ABILITIES.PYRO_FIRE_DOT_MULTIPLIER;
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
                player.color = k.rgb(...PLAYER_CONFIG.NORMAL_COLOR);
            } else {
                // Flash effect during immunity
                const flashRate = PLAYER_CONFIG.IMMUNITY_FLASH_RATE;
                const shouldShow = Math.floor(player.invulnerableTime * flashRate) % 2 === 0;
                if (shouldShow) {
                    player.color = k.rgb(...PLAYER_CONFIG.NORMAL_COLOR);
                } else {
                    player.color = k.rgb(...PLAYER_CONFIG.NORMAL_COLOR, PLAYER_CONFIG.IMMUNITY_ALPHA);
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
            const playerSize = PLAYER_CONFIG.COLLISION_SIZE;
            
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
        const margin = PLAYER_CONFIG.ROOM_MARGIN;

        player.pos.x = k.clamp(player.pos.x, margin, roomWidth - margin);
        player.pos.y = k.clamp(player.pos.y, margin, roomHeight - margin);
    });

    return player;
}

