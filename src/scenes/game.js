/**
 * Main Game Scene
 *
 * Handles the core gameplay loop including:
 * - Room generation and progression
 * - Enemy spawning and combat
 * - Boss encounters
 * - Player state management
 * - HUD and UI rendering
 *
 * Architecture:
 * - NEW: Integrates with centralized GameState for multiplayer support
 * - LEGACY: Maintains backward compatibility with existing systems
 */

// Entity imports
import { createPlayer } from '../entities/player.js';
import { createEnemy } from '../entities/enemy.js';
import { createBoss, createTwinGuardians } from '../entities/boss.js';
import { createMiniboss } from '../entities/miniboss.js';
import { createXPPickup } from '../entities/pickup.js';
import { createDoor } from '../entities/door.js';
import { createObstacle } from '../entities/obstacle.js';
import { createProjectile } from '../entities/projectile.js';

// System imports
import { setupCombatSystem } from '../systems/combat.js';
import { setupProgressionSystem } from '../systems/progression.js';
import { getRandomEnemyType } from '../systems/enemySpawn.js';
import { getWeightedRoomTemplate, getFloorColors } from '../systems/roomGeneration.js';
import { checkAndApplySynergies } from '../systems/synergies.js';
import { updateRunStats, calculateCurrencyEarned, addCurrency, getPermanentUpgradeLevel, checkFloorUnlocks } from '../systems/metaProgression.js';
import { checkAchievements } from '../systems/achievementChecker.js';
import { isUpgradeDraftActive } from './upgradeDraft.js';
import { updateParticles, spawnBloodSplatter, spawnHitImpact, spawnDeathExplosion } from '../systems/particleSystem.js';
import { playXPPickup, playDoorOpen, playBossSpawn, playBossDeath, playEnemyDeath, playPause, playUnpause, initAudio } from '../systems/sounds.js';
import { generateFloorMap } from '../systems/floorMap.js';
import { createMinimap } from '../systems/minimap.js';

// Config imports
import { PICKUP_CONFIG } from '../config/constants.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    UI_TERMS,
    formatHealth,
    formatXP,
    formatFloorRoom
} from '../config/uiConfig.js';

// NEW ARCHITECTURE: Core systems for multiplayer support
import { stateManager } from '../core/GameState.js';
import { inputManager } from '../core/InputManager.js';
import { networkManager } from '../core/NetworkManager.js';

// Game state (persists across scene reloads)
let gameState = {
    currentFloor: 1,
    currentRoom: 1,
    playerStats: null, // Store player stats between rooms
    entryDirection: null, // Direction player entered from (opposite of exit direction)
    floorMap: null, // NEW: Floor map grid system
    minimap: null // NEW: Minimap UI instance
};

// Run statistics (reset on new game)
let runStats = {
    floorsReached: 1,
    roomsCleared: 0,
    enemiesKilled: 0,
    bossesKilled: 0
};

// Apply permanent upgrades to player
function applyPermanentUpgrades(k, player) {
    // Apply starting health upgrades
    const healthLevel = getPermanentUpgradeLevel('startingHealth');
    if (healthLevel > 0) {
        player.maxHealth += healthLevel * 10;
        player.setHP(player.maxHealth); // Full health
    }
    
    // Apply starting damage upgrades
    const damageLevel = getPermanentUpgradeLevel('startingDamage');
    if (damageLevel > 0) {
        player.projectileDamage += damageLevel;
    }
    
    // Apply starting speed upgrades
    const speedLevel = getPermanentUpgradeLevel('startingSpeed');
    if (speedLevel > 0) {
        player.speed += speedLevel * 10;
    }
}

export function setupGameScene(k) {
    k.scene('game', (args) => {
        // ==========================================
        // NEW ARCHITECTURE INITIALIZATION
        // ==========================================

        // Initialize new systems on first run or reset
        if (args?.resetState) {
            // Initialize network manager (local mode by default)
            const playerId = networkManager.init('local');

            // Initialize input manager
            inputManager.init(k);

            // Initialize game state
            const state = stateManager.init('singleplayer');

            // Add local player to state
            // TODO: Get selected character from menu
            const characterKey = 'survivor'; // Default for now
            state.addPlayer(playerId, characterKey);

            console.log('[Game] New architecture initialized:', {
                playerId,
                sessionId: state.sessionId,
                gameMode: state.gameMode
            });
        }

        // Get current game state (for both new and continuing games)
        const state = stateManager.getState();

        // ==========================================
        // LEGACY STATE (keeping for now)
        // ==========================================

        // Reset game state on new game (when coming from menu)
        if (args?.resetState) {
            gameState.currentFloor = 1;
            gameState.currentRoom = 1;
            gameState.playerStats = null;
            gameState.entryDirection = null;
            gameState.floorMap = null; // Clear old floor map
            // Reset run statistics
            runStats = {
                floorsReached: 1,
                roomsCleared: 0,
                enemiesKilled: 0,
                bossesKilled: 0
            };
        }

        // Use persistent game state
        let currentFloor = gameState.currentFloor;
        let currentRoom = gameState.currentRoom;

        // Generate floor map if starting new floor or no map exists
        if (!gameState.floorMap || gameState.floorMap.floor !== currentFloor) {
            console.log(`[Game] Generating new floor map for floor ${currentFloor}`);
            gameState.floorMap = generateFloorMap(currentFloor);

            // Destroy old minimap if it exists
            if (gameState.minimap) {
                gameState.minimap.destroy();
            }

            // Create new minimap
            gameState.minimap = createMinimap(k, gameState.floorMap);
        } else {
            // Update minimap if it exists
            if (gameState.minimap) {
                gameState.minimap.update();
            }
        }
        
        // Update run stats for floors reached
        if (currentFloor > runStats.floorsReached) {
            runStats.floorsReached = currentFloor;
        }
        
        // Calculate player spawn position based on entry direction
        // If entering from a door, spawn at that door position
        // Otherwise (new game), spawn at center
        const doorMargin = 30;
        let playerSpawnX = k.width() / 2;
        let playerSpawnY = k.height() / 2;
        
        if (gameState.entryDirection) {
            // Spawn player at the door they entered from
            switch (gameState.entryDirection) {
                case 'north':
                    playerSpawnX = k.width() / 2;
                    playerSpawnY = doorMargin;
                    break;
                case 'south':
                    playerSpawnX = k.width() / 2;
                    playerSpawnY = k.height() - doorMargin;
                    break;
                case 'west':
                    playerSpawnX = doorMargin;
                    playerSpawnY = k.height() / 2;
                    break;
                case 'east':
                    playerSpawnX = k.width() - doorMargin;
                    playerSpawnY = k.height() / 2;
                    break;
            }
        }
        
        // Create player
        let player;
        if (gameState.playerStats) {
            // Restore player with previous stats
            player = createPlayer(k, playerSpawnX, playerSpawnY);
            // Restore stats
            Object.assign(player, gameState.playerStats);
            // Restore health to current HP (not max)
            player.setHP(gameState.playerStats.currentHP || player.maxHealth);
            // Restore synergy tracking
            if (gameState.playerStats.selectedUpgrades) {
                player.selectedUpgrades = new Set(gameState.playerStats.selectedUpgrades);
            }
            if (gameState.playerStats.activeSynergies) {
                player.activeSynergies = new Set(gameState.playerStats.activeSynergies);
            }
        } else {
            // New game - create fresh player
            player = createPlayer(k, playerSpawnX, playerSpawnY);
            
            // Apply permanent upgrades
            applyPermanentUpgrades(k, player);
        }
        
        // ==========================================
        // NEW ARCHITECTURE: Sync player entity with PlayerState
        // ==========================================

        // Get the local player state
        const localPlayerId = state.localPlayerId;
        const playerState = state.getPlayer(localPlayerId);

        // Sync player entity properties to PlayerState
        if (playerState) {
            // Position
            playerState.x = player.pos.x;
            playerState.y = player.pos.y;

            // Stats
            playerState.health = player.hp();
            playerState.maxHealth = player.maxHealth;
            playerState.speed = player.speed;

            // Progression
            playerState.level = player.level;
            playerState.xp = player.xp;
            playerState.xpToNext = player.xpToNext;
            playerState.xpMultiplier = player.xpMultiplier || 1.0;

            // Weapon & Combat
            playerState.weaponKey = 'pistol'; // TODO: sync actual weapon
            playerState.fireRate = player.fireRate;
            playerState.projectileSpeed = player.projectileSpeed;
            playerState.projectileDamage = player.projectileDamage;
            playerState.projectileCount = player.projectileCount || 1;
            playerState.piercing = player.piercing || 0;
            playerState.obstaclePiercing = player.obstaclePiercing || 0;
            playerState.critChance = player.critChance || 0.05;
            playerState.critDamage = player.critDamage || 2.0;
            playerState.spreadAngle = player.spreadAngle || 0;
            playerState.weaponRange = player.weaponRange || 600;

            // Passive stats
            playerState.pickupRadius = player.pickupRadius;
            playerState.defense = player.defense || 0;
            playerState.damageReduction = player.damageReduction || 0;
            playerState.dodgeChance = player.dodgeChance || 0;

            console.log('[Game] Player entity synced to PlayerState:', {
                playerId: localPlayerId,
                position: { x: playerState.x, y: playerState.y },
                health: `${playerState.health}/${playerState.maxHealth}`,
                level: playerState.level
            });
        }

        // Setup systems
        setupCombatSystem(k, player);
        setupProgressionSystem(k, player);
        
        // Re-apply synergies if loading from saved state
        if (gameState.playerStats && gameState.playerStats.selectedUpgrades) {
            // Wait a frame to ensure player is fully initialized
            k.wait(0.1, () => {
                checkAndApplySynergies(k, player);
            });
        }
        
        // Get room template from floor map (or fallback to weighted generation)
        const currentRoomNode = gameState.floorMap.getCurrentRoom();
        const roomTemplate = currentRoomNode && currentRoomNode.template
            ? currentRoomNode.template
            : getWeightedRoomTemplate(currentFloor);
        const floorColors = getFloorColors(k, currentFloor);
        const margin = 20;
        
        // Room boundaries (visual) - use floor-based colors
        k.add([
            k.rect(k.width() - margin * 2, 2),
            k.pos(k.width() / 2, margin),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        k.add([
            k.rect(k.width() - margin * 2, 2),
            k.pos(k.width() / 2, k.height() - margin),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        k.add([
            k.rect(2, k.height() - margin * 2),
            k.pos(margin, k.height() / 2),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        k.add([
            k.rect(2, k.height() - margin * 2),
            k.pos(k.width() - margin, k.height() / 2),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        
        // Create obstacles from room template
        // Skip obstacles in first room of first floor for better new player experience
        const isFirstRoom = currentRoom === 1 && currentFloor === 1;
        
        // Safe zone around player spawn and entrance door
        const safeZoneRadius = 80; // Minimum distance from spawn
        
        // Calculate entrance door position (where player entered from)
        let entranceDoorX = k.width() / 2;
        let entranceDoorY = k.height() / 2;
        if (gameState.entryDirection) {
            switch (gameState.entryDirection) {
                case 'north':
                    entranceDoorX = k.width() / 2;
                    entranceDoorY = doorMargin;
                    break;
                case 'south':
                    entranceDoorX = k.width() / 2;
                    entranceDoorY = k.height() - doorMargin;
                    break;
                case 'west':
                    entranceDoorX = doorMargin;
                    entranceDoorY = k.height() / 2;
                    break;
                case 'east':
                    entranceDoorX = k.width() - doorMargin;
                    entranceDoorY = k.height() / 2;
                    break;
            }
        }
        
        const obstacles = [];
        if (!isFirstRoom) {
            roomTemplate.obstacles.forEach(obs => {
            // Check if obstacle would overlap with player spawn safe zone
            const distanceToSpawn = Math.sqrt(
                Math.pow(obs.x - playerSpawnX, 2) + 
                Math.pow(obs.y - playerSpawnY, 2)
            );
            
            // Check if obstacle would block entrance door
            const distanceToEntrance = Math.sqrt(
                Math.pow(obs.x - entranceDoorX, 2) + 
                Math.pow(obs.y - entranceDoorY, 2)
            );
            
            const obstacleRadius = Math.max(obs.width, obs.height) / 2;
            
            // Skip obstacle if it's too close to spawn or entrance door
            if (distanceToSpawn < safeZoneRadius + obstacleRadius || 
                distanceToEntrance < safeZoneRadius + obstacleRadius) {
                return; // Skip this obstacle
            }
            
            const obstacleColor = obs.type === 'wall' 
                ? floorColors.obstacleColor 
                : floorColors.coverColor;
            const obstacle = createObstacle(
                k, 
                obs.x, 
                obs.y, 
                obs.width, 
                obs.height, 
                obs.type, 
                obs.char || '#',
                obstacleColor
            );
            obstacles.push(obstacle);
            });
        }
        
        // HUD
        const healthBar = k.add([
            k.text(formatHealth(100, 100), { size: UI_TEXT_SIZES.HUD }),
            k.pos(20, 20),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const levelText = k.add([
            k.text(`${UI_TERMS.LEVEL}: 1`, { size: UI_TEXT_SIZES.HUD }),
            k.pos(20, 40),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const floorText = k.add([
            k.text(formatFloorRoom(1, 1, true), { size: UI_TEXT_SIZES.HUD }),
            k.pos(20, 60),
            k.color(...UI_COLORS.INFO),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const xpText = k.add([
            k.text(formatXP(0, 10), { size: UI_TEXT_SIZES.HUD }),
            k.pos(20, 80),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const enemiesCounter = k.add([
            k.text('Enemies: 0/0', { size: UI_TEXT_SIZES.HUD }),
            k.pos(20, 100),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        
        // Boss HUD elements (only shown when boss exists)
        const bossNameText = k.add([
            k.text('', { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() / 2, 20),
            k.anchor('center'),
            k.color(...UI_COLORS.BOSS_NAME),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        const bossHealthBarBg = k.add([
            k.rect(300, 20),
            k.pos(k.width() / 2, 45),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_DARK),
            k.outline(2, k.rgb(...UI_COLORS.TEXT_DISABLED)),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        const bossHealthBar = k.add([
            k.rect(296, 16),
            k.pos(k.width() / 2, 45),
            k.anchor('center'),
            k.color(...UI_COLORS.HEALTH_LOW),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 1)
        ]);

        const bossArmorBarBg = k.add([
            k.rect(300, 12),
            k.pos(k.width() / 2, 65),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_DARK),
            k.outline(2, k.rgb(...UI_COLORS.TEXT_DISABLED)),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        const bossArmorBar = k.add([
            k.rect(296, 8),
            k.pos(k.width() / 2, 65),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 1)
        ]);

        const bossHealthText = k.add([
            k.text('', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, 45),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 2)
        ]);

        const bossArmorText = k.add([
            k.text('', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, 65),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 2)
        ]);

        // Shield bar (above armor bar)
        const bossShieldBarBg = k.add([
            k.rect(300, 12),
            k.pos(k.width() / 2, 85),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_DARK),
            k.outline(2, k.rgb(...UI_COLORS.TEXT_DISABLED)),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        const bossShieldBar = k.add([
            k.rect(296, 8),
            k.pos(k.width() / 2, 85),
            k.anchor('center'),
            k.color(...UI_COLORS.XP_BAR),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 1)
        ]);

        const bossShieldText = k.add([
            k.text('', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, 85),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 2)
        ]);
        
        // Initially hide boss HUD
        bossNameText.hidden = true;
        bossHealthBarBg.hidden = true;
        bossHealthBar.hidden = true;
        bossArmorBarBg.hidden = true;
        bossArmorBar.hidden = true;
        bossHealthText.hidden = true;
        bossArmorText.hidden = true;
        bossShieldBarBg.hidden = true;
        bossShieldBar.hidden = true;
        bossShieldText.hidden = true;
        
        // Update particle system
        k.onUpdate(() => {
            if (k.paused) return;
            updateParticles(k);
        });

        // Update HUD
        k.onUpdate(() => {
            const currentHP = player.exists() ? player.hp() : 0;
            healthBar.text = formatHealth(Math.max(0, Math.floor(currentHP)), player.maxHealth);

            // Level/XP as decimal: Level X.YZ where YZ is hundredths of XP progress (e.g., 1.55 = 55% to next)
            const xpPercent = player.xpToNext > 0 ? Math.floor((player.xp / player.xpToNext) * 100) : 0;
            const xpPercentStr = xpPercent.toString().padStart(2, '0'); // Pad to 2 digits (e.g., "05" for 5%)
            levelText.text = `${UI_TERMS.LEVEL}: ${player.level}.${xpPercentStr}`;

            xpText.text = formatXP(player.xp, player.xpToNext);
            floorText.text = formatFloorRoom(currentFloor, currentRoom, true);
            
            // Update enemies counter (only show in regular rooms, not boss rooms)
            if (!isBossRoom && !roomCompleted) {
                const currentEnemies = k.get('enemy').length;
                const totalEnemies = enemiesToSpawn + (isMinibossRoom ? 1 : 0); // Include miniboss if present
                const currentMinibosses = k.get('miniboss').length;
                const remainingEnemies = currentEnemies + currentMinibosses + Math.max(0, totalEnemies - enemiesSpawned - (isMinibossRoom && minibossSpawned ? 1 : 0));
                enemiesCounter.text = `Enemies: ${remainingEnemies}/${totalEnemies}`;
                enemiesCounter.hidden = false;
            } else {
                enemiesCounter.hidden = true;
            }
            
            // Update boss HUD
            const bosses = k.get('boss');
            const twinGuardians = bosses.filter(b => b.type === 'twinGuardianMelee' || b.type === 'twinGuardianRanged');
            
            if (twinGuardians.length > 0) {
                // Special handling for Twin Guardians - show combined health
                const meleeGuardian = twinGuardians.find(b => b.type === 'twinGuardianMelee');
                const rangedGuardian = twinGuardians.find(b => b.type === 'twinGuardianRanged');
                
                if (meleeGuardian && rangedGuardian && (meleeGuardian.exists() || rangedGuardian.exists())) {
                    // Show boss HUD
                    bossNameText.hidden = false;
                    bossNameText.text = 'THE TWIN GUARDIANS';
                    
                    // Calculate combined health
                    const meleeHP = meleeGuardian.exists() ? meleeGuardian.hp() : 0;
                    const rangedHP = rangedGuardian.exists() ? rangedGuardian.hp() : 0;
                    const totalHP = meleeHP + rangedHP;
                    const totalMaxHP = (meleeGuardian.maxHealth || 0) + (rangedGuardian.maxHealth || 0);
                    
                    // Show combined health bar
                    const healthPercent = totalMaxHP > 0 ? Math.max(0, Math.min(1, totalHP / totalMaxHP)) : 0;
                    bossHealthBar.width = 296 * healthPercent;
                    bossHealthBar.pos.x = k.width() / 2 - (296 * (1 - healthPercent)) / 2;
                    bossHealthText.text = `${Math.max(0, Math.floor(totalHP))}/${totalMaxHP}`;
                    bossHealthBarBg.hidden = false;
                    bossHealthBar.hidden = false;
                    bossHealthText.hidden = false;
                    
                    // Show shields if either has shields
                    const meleeShield = meleeGuardian.exists() ? (meleeGuardian.shieldHealth || 0) : 0;
                    const rangedShield = rangedGuardian.exists() ? (rangedGuardian.shieldHealth || 0) : 0;
                    const totalShield = meleeShield + rangedShield;
                    const totalMaxShield = (meleeGuardian.maxShieldHealth || 0) + (rangedGuardian.maxShieldHealth || 0);
                    
                    if (totalMaxShield > 0) {
                        const shieldPercent = Math.max(0, Math.min(1, totalShield / totalMaxShield));
                        bossShieldBar.width = 296 * shieldPercent;
                        bossShieldBar.pos.x = k.width() / 2 - (296 * (1 - shieldPercent)) / 2;
                        bossShieldText.text = `Shield: ${Math.max(0, Math.floor(totalShield))}/${totalMaxShield}`;
                        bossShieldBarBg.hidden = false;
                        bossShieldBar.hidden = false;
                        bossShieldText.hidden = false;
                    } else {
                        bossShieldBarBg.hidden = true;
                        bossShieldBar.hidden = true;
                        bossShieldText.hidden = true;
                    }
                    
                    // Show armor if either has armor
                    const meleeArmor = meleeGuardian.exists() ? (meleeGuardian.armorHealth || 0) : 0;
                    const rangedArmor = rangedGuardian.exists() ? (rangedGuardian.armorHealth || 0) : 0;
                    const totalArmor = meleeArmor + rangedArmor;
                    const totalMaxArmor = (meleeGuardian.maxArmorHealth || 0) + (rangedGuardian.maxArmorHealth || 0);
                    
                    if (totalMaxArmor > 0) {
                        const armorPercent = Math.max(0, Math.min(1, totalArmor / totalMaxArmor));
                        bossArmorBar.width = 296 * armorPercent;
                        bossArmorBar.pos.x = k.width() / 2 - (296 * (1 - armorPercent)) / 2;
                        bossArmorText.text = `Armor: ${Math.max(0, Math.floor(totalArmor))}/${totalMaxArmor}`;
                        bossArmorBarBg.hidden = false;
                        bossArmorBar.hidden = false;
                        bossArmorText.hidden = false;
                    } else {
                        bossArmorBarBg.hidden = true;
                        bossArmorBar.hidden = true;
                        bossArmorText.hidden = true;
                    }
                    
                    // Change health bar color based on health percentage
                    if (healthPercent > 0.6) {
                        bossHealthBar.color = k.rgb(255, 50, 50); // Red
                    } else if (healthPercent > 0.3) {
                        bossHealthBar.color = k.rgb(255, 150, 50); // Orange
                    } else {
                        bossHealthBar.color = k.rgb(255, 200, 0); // Yellow (critical)
                    }
                } else {
                    // One guardian dead, show remaining one
                    const remainingBoss = meleeGuardian?.exists() ? meleeGuardian : rangedGuardian;
                    if (remainingBoss) {
                        const bossHP = remainingBoss.hp();
                        const bossMaxHP = remainingBoss.maxHealth;
                        const bossShieldHP = remainingBoss.shieldHealth || 0;
                        const bossMaxShieldHP = remainingBoss.maxShieldHealth || 0;
                        const bossArmorHP = remainingBoss.armorHealth || 0;
                        const bossMaxArmorHP = remainingBoss.maxArmorHealth || 0;
                        
                        bossNameText.hidden = false;
                        bossNameText.text = remainingBoss.enraged ? 'THE TWIN GUARDIANS (ENRAGED)' : 'THE TWIN GUARDIANS';
                        
                        const healthPercent = Math.max(0, Math.min(1, bossHP / bossMaxHP));
                        bossHealthBar.width = 296 * healthPercent;
                        bossHealthBar.pos.x = k.width() / 2 - (296 * (1 - healthPercent)) / 2;
                        bossHealthText.text = `${Math.max(0, Math.floor(bossHP))}/${bossMaxHP}`;
                        bossHealthBarBg.hidden = false;
                        bossHealthBar.hidden = false;
                        bossHealthText.hidden = false;
                        
                        // Show shields
                        if (bossMaxShieldHP > 0) {
                            const shieldPercent = Math.max(0, Math.min(1, bossShieldHP / bossMaxShieldHP));
                            bossShieldBar.width = 296 * shieldPercent;
                            bossShieldBar.pos.x = k.width() / 2 - (296 * (1 - shieldPercent)) / 2;
                            bossShieldText.text = `Shield: ${Math.max(0, Math.floor(bossShieldHP))}/${bossMaxShieldHP}`;
                            bossShieldBarBg.hidden = false;
                            bossShieldBar.hidden = false;
                            bossShieldText.hidden = false;
                        } else {
                            bossShieldBarBg.hidden = true;
                            bossShieldBar.hidden = true;
                            bossShieldText.hidden = true;
                        }
                        
                        if (bossMaxArmorHP > 0) {
                            const armorPercent = Math.max(0, Math.min(1, bossArmorHP / bossMaxArmorHP));
                            bossArmorBar.width = 296 * armorPercent;
                            bossArmorBar.pos.x = k.width() / 2 - (296 * (1 - armorPercent)) / 2;
                            bossArmorText.text = `Armor: ${Math.max(0, Math.floor(bossArmorHP))}/${bossMaxArmorHP}`;
                            bossArmorBarBg.hidden = false;
                            bossArmorBar.hidden = false;
                            bossArmorText.hidden = false;
                        } else {
                            bossArmorBarBg.hidden = true;
                            bossArmorBar.hidden = true;
                            bossArmorText.hidden = true;
                        }
                        
                        if (healthPercent > 0.6) {
                            bossHealthBar.color = k.rgb(255, 50, 50);
                        } else if (healthPercent > 0.3) {
                            bossHealthBar.color = k.rgb(255, 150, 50);
                        } else {
                            bossHealthBar.color = k.rgb(255, 200, 0);
                        }
                    } else {
                        // Both dead, hide HUD
                        bossNameText.hidden = true;
                        bossHealthBarBg.hidden = true;
                        bossHealthBar.hidden = true;
                        bossArmorBarBg.hidden = true;
                        bossArmorBar.hidden = true;
                        bossHealthText.hidden = true;
                        bossArmorText.hidden = true;
                    }
                }
            } else if (bosses.length > 0 && bosses[0].exists()) {
                // Regular single boss
                const boss = bosses[0];
                const bossHP = boss.hp();
                const bossMaxHP = boss.maxHealth;
                const bossShieldHP = boss.shieldHealth || 0;
                const bossMaxShieldHP = boss.maxShieldHealth || 0;
                const bossArmorHP = boss.armorHealth || 0;
                const bossMaxArmorHP = boss.maxArmorHealth || 0;
                
                // Get boss name
                const bossNames = {
                    'gatekeeper': 'THE GATEKEEPER',
                    'swarmQueen': 'THE SWARM QUEEN',
                    'twinGuardianMelee': 'THE TWIN GUARDIANS',
                    'twinGuardianRanged': 'THE TWIN GUARDIANS'
                };
                const bossName = bossNames[boss.type] || 'BOSS';
                
                // Show boss HUD
                bossNameText.hidden = false;
                bossHealthBarBg.hidden = false;
                bossHealthBar.hidden = false;
                bossArmorBarBg.hidden = false;
                bossArmorBar.hidden = false;
                bossHealthText.hidden = false;
                bossArmorText.hidden = false;
                
                // Update boss name
                bossNameText.text = bossName;
                
                // Update health bar
                const healthPercent = Math.max(0, Math.min(1, bossHP / bossMaxHP));
                bossHealthBar.width = 296 * healthPercent;
                bossHealthBar.pos.x = k.width() / 2 - (296 * (1 - healthPercent)) / 2;
                bossHealthText.text = `${Math.max(0, Math.floor(bossHP))}/${bossMaxHP}`;
                
                // Update shield bar (only show if shields exist)
                if (bossMaxShieldHP > 0) {
                    const shieldPercent = Math.max(0, Math.min(1, bossShieldHP / bossMaxShieldHP));
                    bossShieldBar.width = 296 * shieldPercent;
                    bossShieldBar.pos.x = k.width() / 2 - (296 * (1 - shieldPercent)) / 2;
                    bossShieldText.text = `Shield: ${Math.max(0, Math.floor(bossShieldHP))}/${bossMaxShieldHP}`;
                    bossShieldBarBg.hidden = false;
                    bossShieldBar.hidden = false;
                    bossShieldText.hidden = false;
                } else {
                    bossShieldBarBg.hidden = true;
                    bossShieldBar.hidden = true;
                    bossShieldText.hidden = true;
                }
                
                // Update armor bar (only show if armor exists)
                if (bossMaxArmorHP > 0) {
                    const armorPercent = Math.max(0, Math.min(1, bossArmorHP / bossMaxArmorHP));
                    bossArmorBar.width = 296 * armorPercent;
                    bossArmorBar.pos.x = k.width() / 2 - (296 * (1 - armorPercent)) / 2;
                    bossArmorText.text = `Armor: ${Math.max(0, Math.floor(bossArmorHP))}/${bossMaxArmorHP}`;
                    bossArmorBarBg.hidden = false;
                    bossArmorBar.hidden = false;
                    bossArmorText.hidden = false;
                } else {
                    bossArmorBarBg.hidden = true;
                    bossArmorBar.hidden = true;
                    bossArmorText.hidden = true;
                }
                
                // Change health bar color based on health percentage
                if (healthPercent > 0.6) {
                    bossHealthBar.color = k.rgb(255, 50, 50); // Red
                } else if (healthPercent > 0.3) {
                    bossHealthBar.color = k.rgb(255, 150, 50); // Orange
                } else {
                    bossHealthBar.color = k.rgb(255, 200, 0); // Yellow (critical)
                }
            } else {
                // Hide boss HUD when no boss
                bossNameText.hidden = true;
                bossHealthBarBg.hidden = true;
                bossHealthBar.hidden = true;
                bossArmorBarBg.hidden = true;
                bossArmorBar.hidden = true;
                bossHealthText.hidden = true;
                bossArmorText.hidden = true;
                bossShieldBarBg.hidden = true;
                bossShieldBar.hidden = true;
                bossShieldText.hidden = true;
            }
        });

        // ==========================================
        // NEW ARCHITECTURE: Continuous sync of player entity to PlayerState
        // ==========================================
        k.onUpdate(() => {
            if (!player.exists() || k.paused) return;

            const playerState = state.getPlayer(localPlayerId);
            if (!playerState) return;

            // Update position
            playerState.x = player.pos.x;
            playerState.y = player.pos.y;
            playerState.velocityX = 0; // TODO: track actual velocity
            playerState.velocityY = 0;

            // Update health
            playerState.health = player.hp();
            playerState.maxHealth = player.maxHealth;

            // Update progression (in case of level up or XP gain)
            playerState.level = player.level;
            playerState.xp = player.xp;
            playerState.xpToNext = player.xpToNext;

            // Update combat stats (in case of upgrades)
            playerState.projectileDamage = player.projectileDamage;
            playerState.fireRate = player.fireRate;
            playerState.projectileSpeed = player.projectileSpeed;
            playerState.projectileCount = player.projectileCount || 1;
            playerState.piercing = player.piercing || 0;
            playerState.critChance = player.critChance || 0.05;
            playerState.critDamage = player.critDamage || 2.0;

            // Update passive stats
            playerState.pickupRadius = player.pickupRadius;
            playerState.defense = player.defense || 0;

            // Update state flags
            playerState.isDead = !player.exists() || player.hp() <= 0;
            playerState.invulnerable = player.invulnerable || false;

            // Update state time
            state.updateTime(k.dt());
        });

        // ==========================================
        // NEW ARCHITECTURE: Sync room/floor state
        // ==========================================
        // Sync legacy gameState to new state system
        state.currentFloor = currentFloor;
        state.currentRoom = currentRoom;
        state.roomCleared = false;

        console.log('[Game] Room state synced:', {
            floor: state.currentFloor,
            room: state.currentRoom,
            isBossRoom: currentRoom === 3
        });

        // ==========================================
        // NEW ARCHITECTURE: InputManager integration
        // ==========================================
        // Start collecting inputs for the local player each frame
        // (Running in parallel with legacy input for now)
        k.onUpdate(() => {
            if (k.paused) return;

            // Get input manager
            const inputMgr = inputManager.getManager();

            // Collect inputs for this frame
            const inputs = inputMgr.getInputsForFrame([localPlayerId]);

            // Get input for local player
            const playerInput = inputs.get(localPlayerId);

            // Log occasionally to verify it's working
            if (Math.random() < 0.01) { // Log ~1% of frames
                console.log('[InputManager] Frame:', inputMgr.frameNumber, 'Input:', {
                    move: `(${playerInput.moveX}, ${playerInput.moveY})`,
                    aim: `(${playerInput.aimX}, ${playerInput.aimY})`,
                    firing: playerInput.firing
                });
            }
        });

        // ==========================================
        // LEGACY STATE (keeping for now)
        // ==========================================

        // Room state
        let roomCompleted = false;
        const isBossRoom = currentRoomNode ? currentRoomNode.isBossRoom : (currentRoom === 3); // Use floor map if available
        let enemiesToSpawn = isBossRoom ? 0 : (8 + (currentFloor - 1) * 2); // No regular enemies in boss rooms
        let enemiesSpawned = 0;
        let initialSpawnDelay = 2; // Wait before first spawn
        let bossSpawned = false;
        let minibossSpawned = false;
        let isMinibossRoom = false; // Track if this room has a miniboss
        let entranceDoorExclusionTime = 4; // Seconds to exclude entrance door from enemy spawning (3-5 seconds)
        let roomStartTime = 0; // Track when room started
        
        // Determine if this room should have a miniboss (random chance, not in boss rooms)
        // 15% chance for miniboss room, increases with floor
        if (!isBossRoom && currentRoom !== 1) { // Don't spawn miniboss in first room or boss room
            const minibossChance = 0.15 + (currentFloor - 1) * 0.05; // 15% base, +5% per floor
            isMinibossRoom = Math.random() < minibossChance;
        }
        
        // If miniboss room, reduce normal enemy count
        if (isMinibossRoom) {
            enemiesToSpawn = Math.floor(enemiesToSpawn * 0.5); // Half normal enemies
        }
        
        // Get random miniboss type for floor
        function getRandomMinibossType(floor) {
            const minibossTypes = ['brute', 'sentinel', 'berserker', 'guardian', 'warlock'];
            // Weight certain types by floor
            if (floor >= 3) {
                // Higher floors get more variety
                return minibossTypes[Math.floor(Math.random() * minibossTypes.length)];
            } else {
                // Lower floors get simpler types
                const simpleTypes = ['brute', 'berserker', 'guardian'];
                return simpleTypes[Math.floor(Math.random() * simpleTypes.length)];
            }
        }
        
        // Determine boss type based on floor
        function getBossTypeForFloor(floor) {
            const bossMap = {
                1: 'gatekeeper',
                2: 'swarmQueen',
                3: 'twinGuardian',
                // Default to gatekeeper for floors beyond 3 (can expand later)
            };
            return bossMap[floor] || 'gatekeeper';
        }
        
        // Spawn doors - create at room start for enemy spawning
        const spawnDoors = [];
        // doorMargin already declared above for player spawn calculation

        // Map grid directions to door directions (grid uses up/down/right, doors use north/south/east/west)
        const gridToDoorDirection = {
            'up': 'north',
            'down': 'south',
            'right': 'east'
        };

        // Get all door positions (we'll determine which are open/blocked based on floor map)
        const allDoorPositions = [
            { x: k.width() / 2, y: doorMargin, direction: 'north', gridDir: 'up' },
            { x: k.width() / 2, y: k.height() - doorMargin, direction: 'south', gridDir: 'down' },
            { x: doorMargin, y: k.height() / 2, direction: 'west', gridDir: null }, // West is always blocked (no backtracking)
            { x: k.width() - doorMargin, y: k.height() / 2, direction: 'east', gridDir: 'right' }
        ];

        // Get available exits from floor map (only shows unvisited connected rooms)
        const availableExits = gameState.floorMap ? gameState.floorMap.getAvailableExits() : [];
        const availableGridDirs = new Set(availableExits.map(exit => exit.direction));

        // Create all doors and determine which are blocked
        allDoorPositions.forEach(pos => {
            const spawnDoor = createDoor(k, pos.x, pos.y, pos.direction);
            spawnDoor.open = false;
            spawnDoor.isSpawnDoor = true; // Mark as spawn door
            spawnDoor.gridDirection = pos.gridDir; // Store grid direction for later reference

            // Block doors that don't lead to available rooms
            // West door is always blocked (no backtracking)
            // Other doors are blocked if not in available exits
            if (pos.gridDir === null || !availableGridDirs.has(pos.gridDir)) {
                spawnDoor.blocked = true;
            }

            spawnDoor.updateVisual(); // Update appearance based on state
            spawnDoors.push(spawnDoor);
        });
        
        // Spawn enemies periodically
        let enemySpawnTimer = 0;
        const enemySpawnInterval = 3; // seconds between spawns
        
        // Track room start time for entrance door exclusion (after first frame)
        let roomStartTimeSet = false;
        
        k.onUpdate(() => {
            if (k.paused || roomCompleted) return;
            
            // Set room start time on first update
            if (!roomStartTimeSet) {
                roomStartTime = k.time();
                roomStartTimeSet = true;
            }
            
            // Boss room logic
            if (isBossRoom) {
                // Spawn boss if not already spawned
                if (!bossSpawned) {
                    bossSpawned = true;
                    const bossType = getBossTypeForFloor(currentFloor);
                    
                    // Special handling for Twin Guardians - spawn from opposite doors
                    if (bossType === 'twinGuardian') {
                        // Strategy: Spawn guardians from opposite sides for dramatic entrance
                        // Exclude the door player entered from to avoid spawning on top of player
                        const availableDoors = spawnDoors.filter(d => d.direction !== gameState.entryDirection);
                        let door1, door2;

                        if (availableDoors.length >= 2) {
                            // Step 1: Randomize available doors
                            const shuffled = [...availableDoors].sort(() => Math.random() - 0.5);
                            door1 = shuffled[0];

                            // Step 2: Find the door directly opposite to door1 for maximum dramatic effect
                            const oppositeMap = {
                                'north': 'south',
                                'south': 'north',
                                'east': 'west',
                                'west': 'east'
                            };

                            // Try to find exact opposite door, fallback to second random door if not found
                            door2 = availableDoors.find(d => d.direction === oppositeMap[door1.direction]) || shuffled[1];
                        } else {
                            // Fallback: Not enough doors available (shouldn't happen normally)
                            // Just use any two available doors
                            door1 = spawnDoors[0];
                            door2 = spawnDoors[spawnDoors.length > 1 ? 1 : 0];
                        }
                        
                        createTwinGuardians(k, door1, door2, currentFloor);

                        // Play boss spawn sound
                        playBossSpawn();

                        // Show boss announcement
                        const announcement = k.add([
                            k.text('THE TWIN GUARDIANS', { size: 32 }),
                            k.pos(k.width() / 2, k.height() / 2 - 100),
                            k.anchor('center'),
                            k.color(255, 100, 100),
                            k.fixed()
                        ]);
                        k.wait(2, () => {
                            if (announcement.exists()) k.destroy(announcement);
                        });
                    } else {
                        // Regular boss spawning
                        // Spawn boss at a door (prefer top door, or random door)
                        // Avoid spawning at entrance door if player entered from one
                        let bossSpawnDoor = spawnDoors.find(d => d.direction === 'north');
                        if (!bossSpawnDoor || (gameState.entryDirection === 'north' && spawnDoors.length > 1)) {
                            // If top door is entrance or doesn't exist, pick random non-entrance door
                            const availableDoors = spawnDoors.filter(d => d.direction !== gameState.entryDirection);
                            if (availableDoors.length > 0) {
                                bossSpawnDoor = availableDoors[Math.floor(Math.random() * availableDoors.length)];
                            } else {
                                // Fallback to any door
                                bossSpawnDoor = spawnDoors[Math.floor(Math.random() * spawnDoors.length)];
                            }
                        }
                        
                        const bossX = bossSpawnDoor ? bossSpawnDoor.pos.x : k.width() / 2;
                        const bossY = bossSpawnDoor ? bossSpawnDoor.pos.y : k.height() / 2;
                        createBoss(k, bossX, bossY, bossType, currentFloor);

                        // Play boss spawn sound
                        playBossSpawn();

                        // Show boss announcement
                        const bossName = bossType === 'gatekeeper' ? 'THE GATEKEEPER' :
                                       bossType === 'swarmQueen' ? 'THE SWARM QUEEN' :
                                       'THE TWIN GUARDIANS';
                        const announcement = k.add([
                            k.text(bossName, { size: 32 }),
                            k.pos(k.width() / 2, k.height() / 2 - 100),
                            k.anchor('center'),
                            k.color(255, 100, 100),
                            k.fixed()
                        ]);
                        k.wait(2, () => {
                            if (announcement.exists()) k.destroy(announcement);
                        });
                    }
                }
                
                // Check if boss is defeated
                const bosses = k.get('boss');
                if (bosses.length === 0 && !roomCompleted) {
                    roomCompleted = true;
                    handleRoomCompletion();
                }
                return; // Skip regular enemy spawning in boss rooms
            }
            
            // Miniboss room logic
            if (isMinibossRoom && !minibossSpawned) {
                // Spawn miniboss after a short delay
                if (k.time() - roomStartTime >= 1.0) {
                    minibossSpawned = true;
                    const minibossType = getRandomMinibossType(currentFloor);
                    
                    // Spawn miniboss at a random door (avoid entrance door)
                    const availableDoors = spawnDoors.filter(d => d.direction !== gameState.entryDirection);
                    const doorsToUse = availableDoors.length > 0 ? availableDoors : spawnDoors;
                    const randomDoor = doorsToUse[Math.floor(Math.random() * doorsToUse.length)];
                    
                    const minibossX = randomDoor.pos.x;
                    const minibossY = randomDoor.pos.y;
                    createMiniboss(k, minibossX, minibossY, minibossType, currentFloor);
                    
                    // Show miniboss announcement
                    const minibossNames = {
                        'brute': 'MINIBOSS: BRUTE',
                        'sentinel': 'MINIBOSS: SENTINEL',
                        'berserker': 'MINIBOSS: BERSERKER',
                        'guardian': 'MINIBOSS: GUARDIAN',
                        'warlock': 'MINIBOSS: WARLOCK'
                    };
                    const announcement = k.add([
                        k.text(minibossNames[minibossType] || 'MINIBOSS', { size: 24 }),
                        k.pos(k.width() / 2, k.height() / 2 - 100),
                        k.anchor('center'),
                        k.color(255, 200, 100),
                        k.fixed()
                    ]);
                    k.wait(1.5, () => {
                        if (announcement.exists()) k.destroy(announcement);
                    });
                }
            }
            
            // Regular room logic
            // Check if all enemies and minibosses are defeated
            const currentEnemies = k.get('enemy').length;
            const currentMinibosses = k.get('miniboss').length;
            const allEnemiesSpawned = enemiesSpawned >= enemiesToSpawn;
            const allDefeated = allEnemiesSpawned && currentEnemies === 0 && currentMinibosses === 0;
            
            if (allDefeated && !roomCompleted) {
                roomCompleted = true;
                handleRoomCompletion();
            }
            
            // Spawn enemies if we haven't reached the limit
            if (enemiesSpawned < enemiesToSpawn) {
                enemySpawnTimer += k.dt();
                
                // Initial delay before first spawn
                if (enemiesSpawned === 0 && enemySpawnTimer < initialSpawnDelay) {
                    return;
                }
                
                if (enemySpawnTimer >= enemySpawnInterval) {
                    enemySpawnTimer = 0;
                    enemiesSpawned++;
                    
                    // Spawn enemy from random spawn door
                    // Strategy: Give player breathing room at start by not spawning at entrance
                    if (spawnDoors.length > 0) {
                        const timeSinceRoomStart = k.time() - roomStartTime;

                        // Exclude entrance door for first few seconds to avoid overwhelming player
                        // This gives them time to assess the room and prepare
                        const excludeEntranceDoor = gameState.entryDirection &&
                                                   timeSinceRoomStart < entranceDoorExclusionTime;

                        // Filter out entrance door if we're in the exclusion period
                        const availableDoors = excludeEntranceDoor
                            ? spawnDoors.filter(door => door.direction !== gameState.entryDirection)
                            : spawnDoors;

                        // Safety check: If all doors are excluded (shouldn't happen), use all doors
                        const doorsToUse = availableDoors.length > 0 ? availableDoors : spawnDoors;
                        const randomDoor = doorsToUse[Math.floor(Math.random() * doorsToUse.length)];
                        const spawnX = randomDoor.pos.x;
                        const spawnY = randomDoor.pos.y;
                        
                        // Add slight random offset to avoid stacking
                        const offset = 15;
                        const offsetX = spawnX + (Math.random() - 0.5) * offset;
                        const offsetY = spawnY + (Math.random() - 0.5) * offset;
                        
                        // Spawn random enemy type based on floor
                        const enemyType = getRandomEnemyType(currentFloor);
                        createEnemy(k, offsetX, offsetY, enemyType, currentFloor);
                    } else {
                        // Fallback to edge spawning if no doors (shouldn't happen)
                        const side = k.rand(0, 4);
                        let x, y;
                        
                        switch (Math.floor(side)) {
                            case 0: // Top
                                x = k.rand(margin, k.width() - margin);
                                y = margin;
                                break;
                            case 1: // Right
                                x = k.width() - margin;
                                y = k.rand(margin, k.height() - margin);
                                break;
                            case 2: // Bottom
                                x = k.rand(margin, k.width() - margin);
                                y = k.height() - margin;
                                break;
                            case 3: // Left
                                x = margin;
                                y = k.rand(margin, k.height() - margin);
                                break;
                        }
                        
                        const enemyType = getRandomEnemyType(currentFloor);
                        createEnemy(k, x, y, enemyType, currentFloor);
                    }
                }
            }
        });
        
        // Update enemy death handling
        k.onUpdate(() => {
            if (k.paused) return;
            
            k.get('enemy').forEach(enemy => {
                if (enemy.hp() <= 0 && !enemy.isDead) {
                    enemy.isDead = true;
                    const xpValue = enemy.xpValue;
                    const posX = enemy.pos.x;
                    const posY = enemy.pos.y;

                    // Clean up health bars before destroying enemy
                    if (enemy.cleanupHealthBars) {
                        enemy.cleanupHealthBars();
                    }

                    // Handle explosion (damage nearby entities)
                    if (enemy.explodes && enemy.explosionRadius) {
                        const explosionRadius = enemy.explosionRadius;
                        const explosionDamage = enemy.explosionDamage || 15;

                        // Damage player if in range
                        if (player.exists()) {
                            const distToPlayer = Math.sqrt(
                                Math.pow(player.pos.x - posX, 2) +
                                Math.pow(player.pos.y - posY, 2)
                            );
                            if (distToPlayer <= explosionRadius) {
                                player.takeDamage(explosionDamage);
                            }
                        }

                        // Damage other enemies in range
                        k.get('enemy').forEach(other => {
                            if (other === enemy || !other.exists()) return;
                            const distToOther = Math.sqrt(
                                Math.pow(other.pos.x - posX, 2) +
                                Math.pow(other.pos.y - posY, 2)
                            );
                            if (distToOther <= explosionRadius) {
                                other.hurt(explosionDamage);
                            }
                        });

                        // Spawn larger explosion particle for exploding enemies
                        spawnDeathExplosion(k, posX, posY, {
                            color: [255, 150, 50],
                            scale: 1.5
                        });
                    } else {
                        // Normal death explosion particle effect
                        spawnDeathExplosion(k, posX, posY, { color: [255, 100, 100] });
                    }

                    // Handle shrapnel (projectiles in all directions)
                    if (enemy.shrapnel && enemy.shrapnelCount) {
                        const shrapnelCount = enemy.shrapnelCount;
                        const angleStep = (Math.PI * 2) / shrapnelCount;
                        const shrapnelSpeed = 250;
                        const shrapnelDamage = Math.floor((enemy.explosionDamage || 15) * 0.6);

                        for (let i = 0; i < shrapnelCount; i++) {
                            const angle = angleStep * i;
                            const direction = k.vec2(Math.cos(angle), Math.sin(angle));
                            const projectile = createProjectile(
                                k,
                                posX,
                                posY,
                                direction,
                                shrapnelSpeed,
                                shrapnelDamage,
                                0, // piercing
                                0, // obstaclePiercing
                                false // isCrit
                            );
                            projectile.isEnemyProjectile = true;
                            projectile.color = k.rgb(...enemy.originalColor);
                        }
                    }

                    k.destroy(enemy);

                    // Play enemy death sound
                    playEnemyDeath();

                    // Track enemy kill
                    runStats.enemiesKilled++;

                    // Spawn XP pickup at enemy position
                    createXPPickup(k, posX, posY, xpValue);
                }
            });
            
            // Update miniboss death handling
            k.get('miniboss').forEach(miniboss => {
                if (miniboss.hp() <= 0 && !miniboss.isDead) {
                    miniboss.isDead = true;
                    const xpValue = miniboss.xpValue;
                    const posX = miniboss.pos.x;
                    const posY = miniboss.pos.y;

                    // Spawn death explosion particle effect for miniboss
                    spawnDeathExplosion(k, posX, posY, { color: [255, 150, 100], isMiniboss: true });

                    k.destroy(miniboss);

                    // Play enemy death sound (louder for miniboss)
                    playEnemyDeath();

                    // Track miniboss kill (counts as enemy too)
                    runStats.enemiesKilled++;

                    // Spawn XP pickup at miniboss position (minibosses give more XP than regular enemies)
                    createXPPickup(k, posX, posY, xpValue);
                    
                    // Miniboss death effects (visual feedback)
                    const deathText = k.add([
                        k.text('MINIBOSS DEFEATED!', { size: 20 }),
                        k.pos(posX, posY - 30),
                        k.anchor('center'),
                        k.color(255, 200, 100),
                        k.fixed()
                    ]);
                    k.wait(1.0, () => {
                        if (deathText.exists()) k.destroy(deathText);
                    });
                }
            });
            
            // Update boss death handling
            k.get('boss').forEach(boss => {
                if (boss.hp() <= 0 && !boss.isDead) {
                    boss.isDead = true;
                    const xpValue = boss.xpValue;
                    const posX = boss.pos.x;
                    const posY = boss.pos.y;

                    // Spawn death explosion particle effect for boss
                    spawnDeathExplosion(k, posX, posY, { color: [255, 200, 100], isBoss: true });

                    k.destroy(boss);

                    // Play boss death sound
                    playBossDeath();

                    // Track boss kill (counts as enemy too)
                    runStats.enemiesKilled++;
                    runStats.bossesKilled++;

                    // Spawn XP pickup at boss position (bosses give more XP)
                    createXPPickup(k, posX, posY, xpValue);
                    
                    // Boss death effects (visual feedback)
                    const deathText = k.add([
                        k.text('BOSS DEFEATED!', { size: 24 }),
                        k.pos(posX, posY - 30),
                        k.anchor('center'),
                        k.color(255, 255, 100),
                        k.fixed()
                    ]);
                    k.wait(1.5, () => {
                        if (deathText.exists()) k.destroy(deathText);
                    });
                }
            });
        });
        
        // Handle XP pickup magnetization and collection
        k.onUpdate(() => {
            if (!player.exists() || k.paused) return;

            k.get('xpPickup').forEach(pickup => {
                if (pickup.collected) return;

                // Calculate distance to player
                const distance = k.vec2(
                    player.pos.x - pickup.pos.x,
                    player.pos.y - pickup.pos.y
                ).len();

                // Start magnetizing if within pickup radius (once started, never stops)
                if (!pickup.magnetizing && distance <= player.pickupRadius) {
                    pickup.magnetizing = true;
                    pickup.targetPlayer = player;
                }

                // Auto-collect if very close (collection radius is smaller than pickup radius)
                if (distance <= PICKUP_CONFIG.COLLECTION_RADIUS) {
                    pickup.collected = true;
                    playXPPickup();
                    player.addXP(pickup.value);
                    k.destroy(pickup);
                }
            });
        });
        
        // Handle door interaction (proximity-based)
        let doorEntered = false;
        k.onUpdate(() => {
            if (!player.exists() || k.paused || doorEntered) return;
            
            k.get('door').forEach(door => {
                // Only interact with exit doors (not spawn doors, not blocked doors)
                if (!door.open || doorEntered || door.isSpawnDoor || door.blocked) return;
                
                // Check if player is near door
                const distance = k.vec2(
                    player.pos.x - door.pos.x,
                    player.pos.y - door.pos.y
                ).len();
                
                // Auto-enter if very close (within 40 pixels)
                if (distance <= 40) {
                    doorEntered = true;
                    playDoorOpen();
                    handleDoorEntry(door.direction);
                }
            });
        });
        
        // Handle room completion
        function handleRoomCompletion() {
            // ==========================================
            // NEW ARCHITECTURE: Update state on room completion
            // ==========================================
            state.roomCleared = true;
            state.clearRoom();

            console.log('[Game] Room cleared:', {
                floor: state.currentFloor,
                room: state.currentRoom,
                cleared: state.roomCleared
            });

            // ==========================================
            // LEGACY STATE
            // ==========================================
            // Track room cleared
            runStats.roomsCleared++;

            // Mark room as cleared in floor map
            if (gameState.floorMap && currentRoomNode) {
                gameState.floorMap.markRoomCleared(currentRoomNode.position.x, currentRoomNode.position.y);
            }

            // Convert spawn doors to exit doors (but keep blocked doors blocked)
            spawnDoors.forEach(door => {
                if (door.exists() && !door.blocked) {
                    door.open = true;
                    door.isSpawnDoor = false; // No longer a spawn door
                    door.updateVisual(); // Refresh door appearance
                }
            });

            // Update minimap to reflect room clear
            if (gameState.minimap) {
                gameState.minimap.update();
            }
            
            // Show completion message (different for boss rooms)
            const completionText = isBossRoom 
                ? `BOSS DEFEATED! Floor ${currentFloor} Complete! Enter a door to continue`
                : 'Room Cleared! Enter a door to continue';
            const completionMsg = k.add([
                k.text(completionText, { size: 20 }),
                k.pos(k.width() / 2, k.height() - 40),
                k.anchor('center'),
                k.color(100, 255, 100),
                k.fixed(),
                k.z(500)
            ]);
            
            // Remove message after 5 seconds
            k.wait(5, () => {
                if (completionMsg.exists()) {
                    k.destroy(completionMsg);
                }
            });
        }
        
        // Handle door entry
        function handleDoorEntry(direction) {
            // Save player stats before transitioning
            gameState.playerStats = {
                level: player.level,
                xp: player.xp,
                xpToNext: player.xpToNext,
                maxHealth: player.maxHealth,
                currentHP: player.hp(),
                speed: player.speed,
                fireRate: player.fireRate,
                projectileSpeed: player.projectileSpeed,
                projectileDamage: player.projectileDamage,
                pickupRadius: player.pickupRadius,
                xpMultiplier: player.xpMultiplier || 1,
                // Advanced weapon stats
                projectileCount: player.projectileCount || 1,
                piercing: player.piercing || 0,
                obstaclePiercing: player.obstaclePiercing || 0,
                critChance: player.critChance || 0,
                critDamage: player.critDamage || 2.0,
                spreadAngle: player.spreadAngle || 0,
                defense: player.defense || 0,
                // Synergy tracking
                selectedUpgrades: player.selectedUpgrades ? Array.from(player.selectedUpgrades) : [],
                activeSynergies: player.activeSynergies ? Array.from(player.activeSynergies) : [],
                piercingDamageBonus: player.piercingDamageBonus || 1.0
            };

            // Calculate entry direction for next room (opposite of exit direction)
            // If player exits north, they enter from south in next room
            const entryDirectionMap = {
                'north': 'south',
                'south': 'north',
                'west': 'east',
                'east': 'west'
            };
            gameState.entryDirection = entryDirectionMap[direction] || null;

            // ==========================================
            // FLOOR MAP NAVIGATION
            // ==========================================
            if (gameState.floorMap) {
                // Map door direction to grid direction
                const doorToGridDirection = {
                    'north': 'up',
                    'south': 'down',
                    'east': 'right'
                };
                const gridDirection = doorToGridDirection[direction];

                if (gridDirection) {
                    // Try to move in the floor map
                    const moved = gameState.floorMap.moveToRoom(gridDirection);
                    if (!moved) {
                        console.error('[Game] Failed to move in floor map - should not happen!');
                        // Fallback to old room increment
                        currentRoom++;
                    } else {
                        // Successfully moved - check if we entered the boss room
                        const newRoom = gameState.floorMap.getCurrentRoom();
                        if (newRoom.isBossRoom) {
                            // Boss room reached! This completes the floor
                            console.log('[Game] Boss room reached - floor complete after this room');
                        }
                        // Update current room count for legacy systems
                        currentRoom = gameState.floorMap.getVisitedCount();
                    }
                } else {
                    console.warn('[Game] Invalid door direction:', direction);
                    currentRoom++;
                }

                // Check if we need to advance to next floor (boss defeated)
                // In the new system, we advance floors after defeating boss
                if (currentRoomNode && currentRoomNode.isBossRoom && currentRoomNode.cleared) {
                    currentFloor++;

                    // Check for character unlocks based on floor completion
                    checkFloorUnlocks(currentFloor - 1).then(unlocked => {
                        if (unlocked) {
                            // Show unlock notification (could be enhanced later)
                            const unlockText = k.add([
                                k.text('NEW CHARACTER UNLOCKED!', { size: 24 }),
                                k.pos(k.width() / 2, k.height() / 2 - 50),
                                k.anchor('center'),
                                k.color(100, 255, 100),
                                k.z(300)
                            ]);
                            k.wait(3, () => {
                                if (unlockText.exists()) k.destroy(unlockText);
                            });
                        }
                    });

                    // Reset floor map for new floor
                    gameState.floorMap = null;
                    gameState.entryDirection = null; // Start from center on new floor

                    // Update new state system for floor transition
                    state.nextFloor();

                    console.log('[Game] Advanced to next floor:', state.currentFloor);
                } else {
                    // Just advancing to next room
                    state.nextRoom();

                    console.log('[Game] Advanced to next room:', {
                        floor: state.currentFloor,
                        room: state.currentRoom
                    });
                }
            } else {
                // ==========================================
                // LEGACY ROOM PROGRESSION (fallback if no floor map)
                // ==========================================
                currentRoom++;

                // Every 3 rooms, advance to next floor
                if (currentRoom > 3) {
                    currentFloor++;

                    // Check for character unlocks based on floor completion
                    checkFloorUnlocks(currentFloor - 1).then(unlocked => {
                        if (unlocked) {
                            // Show unlock notification (could be enhanced later)
                            const unlockText = k.add([
                                k.text('NEW CHARACTER UNLOCKED!', { size: 24 }),
                                k.pos(k.width() / 2, k.height() / 2 - 50),
                                k.anchor('center'),
                                k.color(100, 255, 100),
                                k.z(300)
                            ]);
                            k.wait(3, () => {
                                if (unlockText.exists()) k.destroy(unlockText);
                            });
                        }
                    });
                    currentRoom = 1;
                    // Reset entry direction when starting new floor (player enters from center on floor start)
                    gameState.entryDirection = null;

                    // Update new state system for floor transition
                    state.nextFloor();

                    console.log('[Game] Advanced to next floor:', state.currentFloor);
                } else {
                    // Just advancing to next room
                    state.nextRoom();

                    console.log('[Game] Advanced to next room:', {
                        floor: state.currentFloor,
                        room: state.currentRoom
                    });
                }
            }

            // ==========================================
            // LEGACY STATE (keeping for now)
            // ==========================================
            // Update persistent state
            gameState.currentFloor = currentFloor;
            gameState.currentRoom = currentRoom;

            // Restart game scene with new room/floor
            k.go('game');
        }
        
        // Game over on player death
        player.onDeath(() => {
            // Calculate currency earned
            const currencyEarned = calculateCurrencyEarned(runStats);
            
            // Add level and currency to run stats for achievement checking
            const fullRunStats = {
                ...runStats,
                level: player.level,
                currencyEarned: currencyEarned
            };
            
            // Update persistent stats and add currency
            updateRunStats(fullRunStats);
            addCurrency(currencyEarned);
            
            // Check for achievements
            checkAchievements(k);
            
            // Pass run stats to game over scene
            k.go('gameOver', {
                runStats: { ...runStats },
                currencyEarned: currencyEarned
            });
        });
        
        // Pause overlay
        const pauseOverlay = k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(0, 0, 0),
            k.opacity(0.7),
            k.fixed(),
            k.z(2000),
            'pauseOverlay'
        ]);
        
        const pauseText = k.add([
            k.text('PAUSED', { size: 48 }),
            k.pos(k.width() / 2, k.height() / 2 - 100),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(2001),
            'pauseText'
        ]);
        
        // Pause menu buttons
        const buttonY = k.height() / 2;
        const buttonSpacing = 60;
        const buttonWidth = 200;
        const buttonHeight = 40;

        // Resume button
        const resumeButton = k.add([
            k.rect(buttonWidth, buttonHeight),
            k.pos(k.width() / 2, buttonY - buttonSpacing / 2),
            k.anchor('center'),
            k.color(50, 150, 50),
            k.outline(2, k.rgb(100, 200, 100)),
            k.area(),
            k.fixed(),
            k.z(2001),
            'pauseButton'
        ]);

        const resumeText = k.add([
            k.text('Resume (ESC)', { size: 18 }),
            k.pos(k.width() / 2, buttonY - buttonSpacing / 2),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(2002),
            'pauseButton'
        ]);

        // Quit to Menu button
        const quitButton = k.add([
            k.rect(buttonWidth, buttonHeight),
            k.pos(k.width() / 2, buttonY + buttonSpacing / 2),
            k.anchor('center'),
            k.color(150, 50, 50),
            k.outline(2, k.rgb(200, 100, 100)),
            k.area(),
            k.fixed(),
            k.z(2001),
            'pauseButton'
        ]);

        const quitText = k.add([
            k.text('Quit to Menu', { size: 18 }),
            k.pos(k.width() / 2, buttonY + buttonSpacing / 2),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(2002),
            'pauseButton'
        ]);
        
        // Initially hide pause overlay
        pauseOverlay.hidden = true;
        pauseText.hidden = true;
        k.get('pauseButton').forEach(btn => btn.hidden = true);
        
        // Button handlers
        resumeButton.onClick(() => {
            k.paused = false;
            pauseOverlay.hidden = true;
            pauseText.hidden = true;
            k.get('pauseButton').forEach(btn => btn.hidden = true);
        });

        quitButton.onClick(() => {
            // Reset game state
            gameState.currentFloor = 1;
            gameState.currentRoom = 1;
            gameState.playerStats = null;
            k.go('menu');
        });
        
        // Toggle minimap with 'M' key
        k.onKeyPress('m', () => {
            if (gameState.minimap && !k.paused) {
                gameState.minimap.toggle();
            }
        });

        // Pause
        k.onKeyPress('escape', () => {
            // Don't allow pause menu if upgrade draft is showing
            if (isUpgradeDraftActive()) {
                return; // Prevent escape key from interfering with upgrade selection
            }

            k.paused = !k.paused;

            // Play pause or unpause sound
            if (k.paused) {
                playPause();
            } else {
                playUnpause();
            }

            pauseOverlay.hidden = !k.paused;
            pauseText.hidden = !k.paused;
            k.get('pauseButton').forEach(btn => btn.hidden = !k.paused);
        });
    });
}

