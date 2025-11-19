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
import { createXPPickup, createCurrencyPickup, getRandomCurrencyIcon, createPowerupWeaponPickup } from '../entities/pickup.js';
import { createDoor } from '../entities/door.js';
import { createObstacle } from '../entities/obstacle.js';
import { createProjectile } from '../entities/projectile.js';

// System imports
import { setupCombatSystem } from '../systems/combat.js';
import { setupProgressionSystem } from '../systems/progression.js';
import { getRandomEnemyType } from '../systems/enemySpawn.js';
import { getWeightedRoomTemplate, getFloorColors, constrainObstacleToRoom, resetRoomTemplateHistory } from '../systems/roomGeneration.js';
import { checkAndApplySynergies } from '../systems/synergies.js';
import { UPGRADES, recalculateAllUpgrades } from '../systems/upgrades.js';
import { updateRunStats, calculateCurrencyEarned, addCurrency, getCurrency, getPermanentUpgradeLevel, checkFloorUnlocks } from '../systems/metaProgression.js';
import { checkAchievements } from '../systems/achievementChecker.js';
import { isUpgradeDraftActive, showUpgradeDraft } from './upgradeDraft.js';
import { updateParticles, spawnBloodSplatter, spawnHitImpact, spawnDeathExplosion } from '../systems/particleSystem.js';
import { playXPPickup, playCurrencyPickup, playDoorOpen, playBossSpawn, playBossDeath, playEnemyDeath, playPause, playUnpause, initAudio } from '../systems/sounds.js';
import { generateFloorMap } from '../systems/floorMap.js';
import { createMinimap } from '../systems/minimap.js';
import { POWERUP_WEAPONS } from '../systems/powerupWeapons.js';
import { renderFloorDecorations, getFloorTheme } from '../systems/floorTheming.js';
import { rollPowerupDrop, applyPowerupWeapon, getPowerupDisplay, updatePowerupWeapon } from '../systems/powerupWeapons.js';
import { getParty, getPartySize } from '../systems/partySystem.js';
import { initMultiplayerGame, registerPlayer, registerEnemy, registerPickup, updateMultiplayer, isMultiplayerActive, cleanupMultiplayer, getPlayerCount, getRoomRNG, getFloorRNG, setCurrentFloor, setCurrentRoom, broadcastGameSeed, isHost, broadcastPauseState, sendPauseRequest, broadcastDeathEvent, broadcastRoomCompletion, broadcastGameOver, broadcastXPGain, broadcastPlayerDeath, requestResync, broadcastRoomTransition } from '../systems/multiplayerGame.js';
import { onMessage } from '../systems/networkSystem.js';
import { getNetworkInfo } from '../systems/networkSystem.js';

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
            gameState.allPlayerStats = null; // Clear multiplayer stats
            gameState.entryDirection = null;
            gameState.floorMap = null; // Clear old floor map
            resetRoomTemplateHistory(); // Reset room template variation
            // Reset run statistics
            runStats = {
                floorsReached: 1,
                roomsCleared: 0,
                enemiesKilled: 0,
                bossesKilled: 0
            };
            // Reset weapon detail saved state
            if (k.gameData) {
                k.gameData.weaponDetailSavedState = undefined;
            }
        }

        // Use persistent game state
        let currentFloor = gameState.currentFloor;
        let currentRoom = gameState.currentRoom;

        // Get party size early for multiplayer checks throughout the scene
        const partySize = getPartySize();

        // Generate floor map if starting new floor or no map exists
        if (!gameState.floorMap || gameState.floorMap.floor !== currentFloor) {
            console.log(`[Game] Generating new floor map for floor ${currentFloor}`);

            // Set current floor for seeded RNG in multiplayer
            if (partySize > 1) {
                setCurrentFloor(currentFloor);
            }

            // Use seeded RNG for multiplayer to ensure same floor layout on all clients
            const floorRng = partySize > 1 ? getFloorRNG() : null;
            gameState.floorMap = generateFloorMap(currentFloor, floorRng);

            // Destroy old minimap if it exists
            if (gameState.minimap) {
                gameState.minimap.destroy();
            }

            // Create new minimap
            gameState.minimap = createMinimap(k, gameState.floorMap);
            // Update k.gameData reference
            if (k.gameData) {
                k.gameData.minimap = gameState.minimap;
            }
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
            // CRITICAL: Recalculate all upgrades to ensure they're properly applied
            if (player.upgradeStacks && Object.keys(player.upgradeStacks).length > 0) {
                recalculateAllUpgrades(player);
            }
        } else {
            // New game - create fresh player
            player = createPlayer(k, playerSpawnX, playerSpawnY);

            // Apply permanent upgrades
            applyPermanentUpgrades(k, player);
        }
        
        // ==========================================
        // MULTIPLAYER: Initialize multiplayer game if party has multiple players
        // ==========================================
        const party = getParty();
        const networkInfo = getNetworkInfo();
        let players = [player]; // Array of all player entities

        if (partySize > 1 && networkInfo.isInitialized) {
            console.log('[Multiplayer] Initializing multiplayer game with', partySize, 'players');
            console.log('[Multiplayer] Party slots:', party.slots);

            // Find local player slot
            const localSlot = party.slots.findIndex(slot => slot.isLocal);
            console.log('[Multiplayer] Local player slot:', localSlot);

            // Initialize multiplayer system with kaplay instance
            initMultiplayerGame(party.isHost, localSlot, k);

            // Broadcast game seed to clients (host only) to ensure synchronized RNG
            if (party.isHost) {
                broadcastGameSeed();
            }

            // Set slot index on local player
            player.slotIndex = localSlot;

            // Adjust local player position to match slot index (for consistent multiplayer positioning)
            const localOffsetX = localSlot * 30;
            player.pos.x = playerSpawnX + localOffsetX;

            // Register local player
            registerPlayer(localSlot, player);
            console.log('[Multiplayer] Registered local player at slot', localSlot);

            // Spawn additional players for other party members
            party.slots.forEach((slot, index) => {
                if (index !== localSlot && slot.playerId !== null) {
                    console.log('[Multiplayer] Creating remote player for slot', index, ':', slot);
                    // Spawn remote player with their selected character
                    // Use absolute slot index for consistent positioning across all clients
                    const offsetX = index * 30; // Absolute offset based on slot index
                    const remotePlayer = createPlayer(k, playerSpawnX + offsetX, playerSpawnY, slot.selectedCharacter);

                    // Mark as remote player (disable local input)
                    remotePlayer.isRemote = true;
                    remotePlayer.slotIndex = index;
                    remotePlayer.playerName = slot.playerName;

                    // Restore remote player stats if available
                    if (gameState.allPlayerStats && gameState.allPlayerStats.length > 0) {
                        const savedStats = gameState.allPlayerStats.find(stats => stats.slotIndex === index);
                        if (savedStats) {
                            console.log('[Multiplayer] Restoring stats for remote player at slot', index);
                            Object.assign(remotePlayer, savedStats);
                            remotePlayer.setHP(savedStats.currentHP || remotePlayer.maxHealth);

                            // Restore synergy tracking
                            if (savedStats.selectedUpgrades) {
                                remotePlayer.selectedUpgrades = new Set(savedStats.selectedUpgrades);
                            }
                            if (savedStats.activeSynergies) {
                                remotePlayer.activeSynergies = new Set(savedStats.activeSynergies);
                            }

                            // Recalculate upgrades
                            if (remotePlayer.upgradeStacks && Object.keys(remotePlayer.upgradeStacks).length > 0) {
                                recalculateAllUpgrades(remotePlayer);
                            }
                        }
                    } else {
                        // No saved stats - apply permanent upgrades to new remote player
                        applyPermanentUpgrades(k, remotePlayer);
                    }

                    // Setup combat system for remote player (uses network input)
                    setupCombatSystem(k, remotePlayer);

                    // Setup progression system for remote player (for XP/level ups)
                    // Note: reviveAllPlayers callback is passed as null here, will be handled globally
                    setupProgressionSystem(k, remotePlayer, null, true);

                    // Register remote player
                    registerPlayer(index, remotePlayer);
                    players.push(remotePlayer);

                    // Add name tag above remote player
                    const nameTag = k.add([
                        k.text(slot.playerName, { size: 10 }),
                        k.pos(0, -30),
                        k.color(150, 150, 255),
                        k.z(100)
                    ]);

                    // Health bar components (shown when player is hurt)
                    const healthBarWidth = 40;
                    const healthBarHeight = 4;
                    const healthBarOffset = -40; // Below name tag

                    const healthBarBg = k.add([
                        k.rect(healthBarWidth, healthBarHeight),
                        k.pos(remotePlayer.pos.x, remotePlayer.pos.y + healthBarOffset),
                        k.anchor('center'),
                        k.color(50, 50, 50),
                        k.z(100),
                        'playerHealthBar'
                    ]);

                    const healthBar = k.add([
                        k.rect(healthBarWidth, healthBarHeight),
                        k.pos(remotePlayer.pos.x, remotePlayer.pos.y + healthBarOffset),
                        k.anchor('center'),
                        k.color(100, 255, 100), // Green for friendly players
                        k.z(101),
                        'playerHealthBar'
                    ]);

                    // Link health bars to player
                    remotePlayer.healthBarBg = healthBarBg;
                    remotePlayer.healthBar = healthBar;

                    // Initially hide health bars
                    healthBarBg.hidden = true;
                    healthBar.hidden = true;

                    // Make name tag and health bars follow player
                    nameTag.onUpdate(() => {
                        if (remotePlayer.exists()) {
                            nameTag.pos = k.vec2(remotePlayer.pos.x, remotePlayer.pos.y - 30);

                            // Update health bar position and visibility
                            const healthPercent = remotePlayer.hp() / remotePlayer.maxHealth;
                            const isHurt = healthPercent < 1.0 && healthPercent > 0;

                            if (isHurt) {
                                // Show and update health bars
                                healthBarBg.hidden = false;
                                healthBar.hidden = false;

                                // Update position
                                healthBarBg.pos.x = remotePlayer.pos.x;
                                healthBarBg.pos.y = remotePlayer.pos.y + healthBarOffset;
                                healthBar.pos.x = remotePlayer.pos.x;
                                healthBar.pos.y = remotePlayer.pos.y + healthBarOffset;

                                // Update health bar width
                                const barWidth = healthBarWidth * healthPercent;
                                healthBar.width = Math.max(1, barWidth);
                                healthBar.pos.x = remotePlayer.pos.x - (healthBarWidth - barWidth) / 2;
                            } else {
                                // Hide health bars when at full health
                                healthBarBg.hidden = true;
                                healthBar.hidden = true;
                            }
                        } else {
                            nameTag.destroy();
                            if (healthBarBg.exists()) healthBarBg.destroy();
                            if (healthBar.exists()) healthBar.destroy();
                        }
                    });
                }
            });

            console.log('[Multiplayer] Spawned', players.length, 'players');

            // Listen for room transition from host (client only)
            if (!isHost()) {
                onMessage('room_transition', (data) => {
                    console.log('[Multiplayer] Received room transition from host with entry direction:', data.entryDirection);

                    // Update gameState to match host's entry direction for consistent spawn positions
                    gameState.entryDirection = data.entryDirection;

                    // Prevent duplicate transitions
                    if (doorEntered) return;
                    doorEntered = true;

                    // Play door sound for client
                    playDoorOpen();

                    // Transition to next room (same as handleDoorEntry but without broadcasting)
                    // Note: We DON'T call handleDoorEntry because that would save stats again
                    // and broadcast another room_transition. Just transition the scene.
                    k.go('game');
                });

                onMessage('room_completed', () => {
                    console.log('[Multiplayer] Received room completion from host');
                    roomCompleted = true;

                    // Update doors to show they're open
                    spawnDoors.forEach(door => {
                        if (door.exists() && !door.blocked) {
                            door.open = true;
                            door.isSpawnDoor = false;
                            door.updateVisual();
                        }
                    });

                    // Process pending level ups on client
                    processPendingLevelUps();
                });

                // Listen for game over event from host
                onMessage('game_over', (data) => {
                    console.log('[Multiplayer] Received game over event from host');

                    // Calculate currency earned (use host's value if provided)
                    const currencyEarned = data.currencyEarned || calculateCurrencyEarned(runStats);

                    // Update persistent stats and add currency
                    const fullRunStats = {
                        ...runStats,
                        level: player.level,
                        currencyEarned: currencyEarned
                    };
                    updateRunStats(fullRunStats);
                    addCurrency(currencyEarned);

                    // Check for achievements
                    checkAchievements(k);

                    // Cleanup multiplayer
                    cleanupMultiplayer();

                    // Go to game over scene
                    k.go('gameOver', {
                        runStats: { ...runStats },
                        currencyEarned: currencyEarned
                    });
                });
            }
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

        // ==========================================
        // MULTIPLAYER: Revival system - revive all dead players on level up
        // ==========================================
        const reviveAllPlayers = () => {
            // Only in multiplayer with multiple players
            if (partySize <= 1) return;

            let revivedCount = 0;
            players.forEach((p, index) => {
                // Check if player is dead (hp <= 0 or destroyed)
                if ((p.exists() && p.hp() <= 0) || (p.exists() && p.isDead)) {
                    // Revive player
                    p.setHP(p.maxHealth);
                    p.isDead = false;

                    // Re-enable input for local player
                    if (!p.isRemote) {
                        p.canMove = true;
                        p.canShoot = true;
                    }

                    // Show revival effect
                    const reviveEffect = k.add([
                        k.text('★ REVIVED ★', { size: 16 }),
                        k.pos(p.pos.x, p.pos.y - 40),
                        k.anchor('center'),
                        k.color(100, 255, 100),
                        k.opacity(1), // Required for lifespan component
                        k.lifespan(2),
                        k.z(1000)
                    ]);

                    // Animate rising and fading
                    reviveEffect.onUpdate(() => {
                        reviveEffect.pos.y -= 30 * k.dt();
                        reviveEffect.opacity -= 0.5 * k.dt();
                    });

                    // Restore visual state
                    p.opacity = 1; // Restore full opacity
                    if (p.characterData && p.characterData.color) {
                        p.color = k.rgb(...p.characterData.color);
                    }
                    if (p.outline && p.outline.exists()) {
                        p.outline.opacity = 1;
                    }

                    revivedCount++;
                    console.log(`[Revival] Player ${index} revived (${p.playerName || 'Local'})`);
                }
            });

            // Broadcast revival event in multiplayer
            if (revivedCount > 0 && isMultiplayerActive() && isHost()) {
                import('../systems/multiplayerGame.js').then(({ broadcastRevivalEvent }) => {
                    if (broadcastRevivalEvent) {
                        broadcastRevivalEvent();
                    }
                });
            }
        };

        // Setup systems
        setupCombatSystem(k, player);
        setupProgressionSystem(k, player, reviveAllPlayers, partySize > 1);
        
        // Re-apply synergies if loading from saved state
        if (gameState.playerStats && gameState.playerStats.selectedUpgrades) {
            // Wait a frame to ensure player is fully initialized
            k.wait(0.1, () => {
                checkAndApplySynergies(k, player);
            });
        }
        
        // Get room template from floor map (or fallback to weighted generation)
        const currentRoomNode = gameState.floorMap.getCurrentRoom();
        let roomTemplate;
        if (currentRoomNode && currentRoomNode.template) {
            roomTemplate = currentRoomNode.template;
        } else {
            // Use seeded RNG for multiplayer to ensure same room layout on all clients
            const roomRng = partySize > 1 ? getRoomRNG() : null;
            roomTemplate = getWeightedRoomTemplate(currentFloor, roomRng);
        }
        const floorColors = getFloorColors(k, currentFloor);
        const margin = 20;

        // Floor decorations (cosmetic theming based on floor)
        renderFloorDecorations(k, currentFloor, k.width(), k.height());

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

            // Constrain obstacle position to room boundaries
            const constrainedPos = constrainObstacleToRoom(obs.x, obs.y, obs.width, obs.height);

            const obstacleColor = obs.type === 'wall'
                ? floorColors.obstacleColor
                : floorColors.coverColor;
            const obstacle = createObstacle(
                k,
                constrainedPos.x,
                constrainedPos.y,
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
        // Top-left panel background (smaller, just for enemy counter)
        const topLeftPanelBg = k.add([
            k.rect(100, 40),
            k.pos(10, 10),
            k.color(0, 0, 0),
            k.opacity(0.6),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG - 1)
        ]);

        // Enemy counter with skull icon (top left)
        const enemyIcon = k.add([
            k.text('☠', { size: UI_TEXT_SIZES.HUD }),
            k.pos(20, 20),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const enemiesCounter = k.add([
            k.text('0/0', { size: UI_TEXT_SIZES.HUD }),
            k.pos(40, 20),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Top-right panel background
        const topRightPanelBg = k.add([
            k.rect(120, 40),
            k.pos(k.width() - 10, 10),
            k.anchor('topright'),
            k.color(0, 0, 0),
            k.opacity(0.6),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG - 1)
        ]);

        // Credit counter (top right) - z-layer 950 to appear above minimap
        const creditIcon = k.add([
            k.text('$', { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() - 20, 20),
            k.anchor('topright'),
            k.color(255, 215, 0), // Gold color
            k.fixed(),
            k.z(950)
        ]);

        const creditText = k.add([
            k.text('0', { size: UI_TEXT_SIZES.HUD }),
            k.pos(k.width() - 40, 20),
            k.anchor('topright'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(950)
        ]);

        // Multiplayer Connection Indicator (only show if multiplayer is active)
        let connectionIndicator = null;
        let connectionText = null;
        if (isMultiplayerActive()) {
            const playerCount = getPlayerCount();
            const statusColor = networkInfo.isHost ? [100, 255, 100] : [100, 200, 255];
            const statusText = networkInfo.isHost ? 'HOST' : 'CLIENT';

            connectionIndicator = k.add([
                k.circle(4),
                k.pos(20, 70),
                k.color(...statusColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            connectionText = k.add([
                k.text(`${statusText} (${playerCount}P)`, { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(30, 70),
                k.anchor('left'),
                k.color(...statusColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        }

        // XP Bar (bottom of screen)
        const xpBarWidth = k.width() - 40;
        const xpBarHeight = 15; // Reduced by 25% from 20
        const xpBarY = k.height() - 30;

        const xpBarBg = k.add([
            k.rect(xpBarWidth, xpBarHeight),
            k.pos(20, xpBarY),
            k.color(...UI_COLORS.BG_DARK),
            k.outline(2, k.rgb(...UI_COLORS.TEXT_DISABLED)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG)
        ]);

        const xpBarFill = k.add([
            k.rect(0, xpBarHeight - 4),
            k.pos(50, xpBarY + 2), // Start after level badge
            k.color(100, 200, 255), // Light blue XP color (matches pickup)
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG + 1)
        ]);

        const xpBarText = k.add([
            k.text('0/10', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(k.width() / 2, xpBarY + xpBarHeight / 2),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Level badge (circular frame on left end of XP bar)
        const levelBadgeSize = 28;
        const levelBadgeX = 20 + levelBadgeSize / 2;
        const levelBadgeY = xpBarY + xpBarHeight / 2;

        const levelBadgeBg = k.add([
            k.circle(levelBadgeSize / 2),
            k.pos(levelBadgeX, levelBadgeY),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(100, 200, 255)), // Light blue outline to match XP
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG + 2)
        ]);

        const levelText = k.add([
            k.text('1', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(levelBadgeX, levelBadgeY),
            k.anchor('center'),
            k.color(255, 255, 255), // White text for better visibility
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG + 3) // Above the badge background
        ]);

        // Player Health Bar (follows player when damaged, shown below player)
        const playerHealthBarWidth = 40; // Reduced from 60 to 40
        const playerHealthBarHeight = 8;
        const playerHealthBarOffsetY = 25; // Below player

        const playerHealthBarBg = k.add([
            k.rect(playerHealthBarWidth, playerHealthBarHeight),
            k.pos(0, 0),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_DARK),
            k.outline(1, k.rgb(...UI_COLORS.TEXT_DISABLED)),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        const playerHealthBarFill = k.add([
            k.rect(playerHealthBarWidth - 2, playerHealthBarHeight - 2),
            k.pos(0, 0),
            k.anchor('left'), // Changed from 'center' to 'left' so it drains from right
            k.color(100, 255, 100), // Green health color
            k.z(UI_Z_LAYERS.OVERLAY + 1)
        ]);

        // Initially hide player health bar (only show when damaged)
        playerHealthBarBg.hidden = true;
        playerHealthBarFill.hidden = true;

        // ==========================================
        // WEAPON INDICATOR (Bottom Left - Icon Only)
        // ==========================================
        const weaponIconSize = 48;
        const weaponIconX = 20;
        const weaponIconY = k.height() - 85; // Above XP bar (moved up to avoid overlap)

        const weaponIconBg = k.add([
            k.rect(weaponIconSize, weaponIconSize),
            k.pos(weaponIconX, weaponIconY),
            k.color(0, 0, 0),
            k.opacity(0.8),
            k.outline(2, k.rgb(150, 150, 150)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG)
        ]);

        const weaponIconText = k.add([
            k.text('⌐', { size: 32 }),
            k.pos(weaponIconX + weaponIconSize / 2, weaponIconY + weaponIconSize / 2),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Weapon detail popup (shown on click or when paused)
        const weaponDetailWidth = 220;
        const weaponDetailHeight = 90;

        const weaponDetailBg = k.add([
            k.rect(weaponDetailWidth, weaponDetailHeight),
            k.pos(weaponIconX, weaponIconY - weaponDetailHeight - 10),
            k.color(0, 0, 0),
            k.opacity(0.9),
            k.outline(2, k.rgb(200, 200, 200)),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 5)
        ]);

        const weaponDetailIcon = k.add([
            k.text('⌐', { size: 24 }),
            k.pos(weaponIconX + 15, weaponIconY - weaponDetailHeight - 10 + 15),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 6)
        ]);

        const weaponDetailName = k.add([
            k.text('Basic Pistol', { size: UI_TEXT_SIZES.SMALL, width: 160 }), // Width constraint to prevent overflow
            k.pos(weaponIconX + 50, weaponIconY - weaponDetailHeight - 10 + 10),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 6)
        ]);

        const weaponDetailDamage = k.add([
            k.text('DMG: 10', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(weaponIconX + 50, weaponIconY - weaponDetailHeight - 10 + 30),
            k.color(255, 150, 150),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 6)
        ]);

        const weaponDetailFireRate = k.add([
            k.text('RATE: 3.75/s', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(weaponIconX + 50, weaponIconY - weaponDetailHeight - 10 + 47),
            k.color(150, 200, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 6)
        ]);

        const weaponDetailDPS = k.add([
            k.text('DPS: 37.5', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(weaponIconX + 50, weaponIconY - weaponDetailHeight - 10 + 64),
            k.color(255, 255, 150),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 6)
        ]);

        // Initially hide weapon detail popup
        weaponDetailBg.hidden = true;
        weaponDetailIcon.hidden = true;
        weaponDetailName.hidden = true;
        weaponDetailDamage.hidden = true;
        weaponDetailFireRate.hidden = true;
        weaponDetailDPS.hidden = true;

        // Track weapon detail state (reset to minimized on new game)
        let weaponDetailState = false; // false = minimized, true = maximized
        // Reset state on new game
        if (args?.resetState) {
            weaponDetailState = false;
        }
        
        // Click handler for weapon icon
        weaponIconBg.onClick(() => {
            weaponDetailState = !weaponDetailState;
            weaponDetailBg.hidden = !weaponDetailBg.hidden;
            weaponDetailIcon.hidden = !weaponDetailIcon.hidden;
            weaponDetailName.hidden = !weaponDetailName.hidden;
            weaponDetailDamage.hidden = !weaponDetailDamage.hidden;
            weaponDetailFireRate.hidden = !weaponDetailFireRate.hidden;
            weaponDetailDPS.hidden = !weaponDetailDPS.hidden;
        });

        // ==========================================
        // POWERUP WEAPON INDICATOR (Above Main Weapon - Bottom Left)
        // ==========================================
        const powerupIconSize = 40;
        const powerupIconX = weaponIconX;
        const powerupIconY = weaponIconY - powerupIconSize - 10; // Above weapon icon

        const powerupIconBg = k.add([
            k.rect(powerupIconSize, powerupIconSize),
            k.pos(powerupIconX, powerupIconY),
            k.color(0, 0, 0),
            k.opacity(0.8),
            k.outline(2, k.rgb(200, 200, 50)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG)
        ]);

        const powerupIconText = k.add([
            k.text('◎', { size: 28 }),
            k.pos(powerupIconX + powerupIconSize / 2, powerupIconY + powerupIconSize / 2),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const powerupAmmoText = k.add([
            k.text('20', { size: 14 }),
            k.pos(powerupIconX + powerupIconSize + 5, powerupIconY + powerupIconSize / 2),
            k.anchor('left'),
            k.color(255, 255, 150),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Initially hide powerup indicator (only show when player has powerup)
        powerupIconBg.hidden = true;
        powerupIconText.hidden = true;
        powerupAmmoText.hidden = true;

        // ==========================================
        // ACTIVE BUFFS/UPGRADES DISPLAY (Near Weapon - Bottom Left)
        // ==========================================
        const buffsDisplayX = weaponIconX + weaponIconSize + 10; // Right of weapon icon
        const buffsDisplayY = weaponIconY;
        const buffIconSize = 32;
        const buffIconSpacing = 40;

        // Container for buff icons (will be populated dynamically)
        const activeBuffIcons = [];

        // Function to update buff display
        function updateBuffDisplay() {
            // Clear existing buff icons
            activeBuffIcons.forEach(icon => {
                if (icon.exists()) k.destroy(icon);
            });
            activeBuffIcons.length = 0;

            if (!player.exists()) return;

            // Collect all upgrades with their stacks
            const upgradesWithStacks = [];

            // Add weapon upgrades
            if (player.upgradeStacks) {
                Object.entries(player.upgradeStacks).forEach(([key, stacks]) => {
                    if (stacks > 0) {
                        upgradesWithStacks.push({ key, stacks });
                    }
                });
            }

            // Position buffs horizontally from weapon icon
            // Create buff icons
            upgradesWithStacks.forEach((upgrade, index) => {
                const xPos = buffsDisplayX + index * buffIconSpacing;

                // Get upgrade definition for icon
                const upgradeDef = UPGRADES[upgrade.key];
                if (!upgradeDef) return;

                // Background
                const bg = k.add([
                    k.rect(buffIconSize, buffIconSize),
                    k.pos(xPos, buffsDisplayY),
                    k.color(0, 0, 0),
                    k.opacity(0.7),
                    k.outline(1, k.rgb(150, 150, 150)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_BG)
                ]);

                // Icon
                const icon = k.add([
                    k.text(upgradeDef.icon, { size: 20 }),
                    k.pos(xPos + buffIconSize / 2, buffsDisplayY + buffIconSize / 2),
                    k.anchor('center'),
                    k.color(255, 255, 255),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                // Stack count
                const stackText = k.add([
                    k.text(upgrade.stacks.toString(), { size: 10 }),
                    k.pos(xPos + buffIconSize - 4, buffsDisplayY + buffIconSize - 4),
                    k.anchor('botright'),
                    k.color(255, 255, 100),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT + 1)
                ]);

                activeBuffIcons.push(bg, icon, stackText);
            });
        }

        // ==========================================
        // TOOLTIP SYSTEM
        // ==========================================
        const tooltip = k.add([
            k.rect(200, 60),
            k.pos(0, 0),
            k.color(0, 0, 0),
            k.opacity(0.9),
            k.outline(2, k.rgb(200, 200, 200)),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 10)
        ]);

        const tooltipText = k.add([
            k.text('', { size: UI_TEXT_SIZES.SMALL, width: 190 }),
            k.pos(5, 5),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 11)
        ]);

        tooltip.hidden = true;
        tooltipText.hidden = true;

        // Tooltip data for HUD elements
        const tooltipData = {
            level: () => `Level ${player.level}\nXP: ${player.xp}/${player.xpToNext}\nProgress: ${Math.floor((player.xp / player.xpToNext) * 100)}%`,
            enemies: () => {
                const remaining = k.get('enemy').length + k.get('miniboss').length;
                return `Enemies Remaining\nClear all to progress\nKills this run: ${runStats.enemiesKilled}`;
            },
            currency: () => `Total Credits: ${getCurrency()}\nUse in shop between floors\nEarn by killing enemies`,
            weapon: () => {
                const weaponDef = player.weaponDef;
                if (!weaponDef) return 'No weapon equipped';
                return `${weaponDef.name}\nDamage: ${player.projectileDamage}\nFire Rate: ${player.fireRate.toFixed(2)}/s\nDPS: ${(player.projectileDamage * player.fireRate).toFixed(1)}`;
            },
            health: () => `Health: ${Math.floor(player.hp())}/${player.maxHealth}\nDamage Reduction: ${Math.floor(player.damageReduction * 100)}%`
        };

        // Show tooltip on hover
        function showTooltip(key, x, y) {
            const data = tooltipData[key];
            if (!data) return;

            const text = data();
            tooltipText.text = text;

            // Position tooltip near mouse but keep on screen
            tooltip.pos.x = Math.min(x + 10, k.width() - 210);
            tooltip.pos.y = Math.min(y + 10, k.height() - 70);
            tooltipText.pos.x = tooltip.pos.x + 5;
            tooltipText.pos.y = tooltip.pos.y + 5;

            tooltip.hidden = false;
            tooltipText.hidden = false;
        }

        function hideTooltip() {
            tooltip.hidden = true;
            tooltipText.hidden = true;
        }

        function saveTooltipState() {
            return {
                hidden: tooltip.hidden,
                text: tooltipText.text,
                tooltipX: tooltip.pos.x,
                tooltipY: tooltip.pos.y,
                textX: tooltipText.pos.x,
                textY: tooltipText.pos.y
            };
        }

        function restoreTooltipState(state) {
            if (!state) return;
            tooltip.hidden = state.hidden;
            tooltipText.hidden = state.hidden;
            tooltipText.text = state.text;
            tooltip.pos.x = state.tooltipX;
            tooltip.pos.y = state.tooltipY;
            tooltipText.pos.x = state.textX;
            tooltipText.pos.y = state.textY;
        }

        // Export tooltip functions so they can be called from other modules
        k.gameData = k.gameData || {};
        k.gameData.hideTooltip = hideTooltip;
        k.gameData.saveTooltipState = saveTooltipState;
        k.gameData.restoreTooltipState = restoreTooltipState;
        k.gameData.minimap = gameState.minimap;
        // Track split enemies for accurate counter
        k.gameData.additionalEnemiesFromSplits = 0;
        k.gameData.incrementSplitEnemies = (count) => {
            additionalEnemiesFromSplits += count;
            k.gameData.additionalEnemiesFromSplits = additionalEnemiesFromSplits;
        };
        k.gameData.minimapSavedMode = undefined;
        k.gameData.tooltipSavedState = undefined;

        // Hover detection for tooltips
        k.onUpdate(() => {
            // Don't show tooltips when paused or during upgrade draft
            if (k.paused || isUpgradeDraftActive()) {
                return;
            }

            const mousePos = k.mousePos();
            let hovering = false;

            // Check level text
            if (mousePos.x >= 20 && mousePos.x <= 180 && mousePos.y >= 20 && mousePos.y <= 35) {
                showTooltip('level', mousePos.x, mousePos.y);
                hovering = true;
            }
            // Check enemy counter
            else if (mousePos.x >= 20 && mousePos.x <= 180 && mousePos.y >= 40 && mousePos.y <= 55 && !enemiesCounter.hidden) {
                showTooltip('enemies', mousePos.x, mousePos.y);
                hovering = true;
            }
            // Check credit counter
            else if (mousePos.x >= k.width() - 130 && mousePos.x <= k.width() - 10 && mousePos.y >= 10 && mousePos.y <= 50) {
                showTooltip('currency', mousePos.x, mousePos.y);
                hovering = true;
            }
            // Check weapon panel
            else if (mousePos.x >= weaponIconX && mousePos.x <= weaponIconX + weaponIconSize &&
                     mousePos.y >= weaponIconY && mousePos.y <= weaponIconY + weaponIconSize) {
                showTooltip('weapon', mousePos.x, mousePos.y);
                hovering = true;
            }
            // Health bar tooltip removed - health bar moves with player

            if (!hovering) {
                hideTooltip();
            }
        });

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

        // Update multiplayer system
        k.onUpdate(() => {
            if (k.paused) return;
            if (isMultiplayerActive()) {
                updateMultiplayer(k.dt());
            }
        });

        // Update HUD
        k.onUpdate(() => {
            const currentHP = player.exists() ? player.hp() : 0;
            const healthPercent = player.maxHealth > 0 ? currentHP / player.maxHealth : 1;

            // Update level text (just show the number)
            levelText.text = `${player.level || 1}`;

            // Update XP bar
            const xpProgress = player.xpToNext > 0 ? player.xp / player.xpToNext : 0;
            xpBarFill.width = Math.max(0, (xpBarWidth - 34) * xpProgress); // Account for level badge space
            xpBarText.text = formatXP(player.xp, player.xpToNext);

            // Update credit counter
            creditText.text = getCurrency().toString();

            // Update player health bar (follows player, only show when damaged)
            if (healthPercent < 1 && player.exists()) {
                playerHealthBarBg.hidden = false;
                playerHealthBarFill.hidden = false;

                // Position below player
                const healthBarX = player.pos.x;
                const healthBarY = player.pos.y + playerHealthBarOffsetY;
                playerHealthBarBg.pos = k.vec2(healthBarX, healthBarY);

                // Fill bar uses 'left' anchor, so offset X to left edge of background
                const fillBarX = healthBarX - (playerHealthBarWidth / 2) + 1; // +1 for border offset
                playerHealthBarFill.pos = k.vec2(fillBarX, healthBarY);

                // Update health bar width
                playerHealthBarFill.width = Math.max(0, (playerHealthBarWidth - 2) * healthPercent);

                // Color based on health percentage
                if (healthPercent > 0.6) {
                    playerHealthBarFill.color = k.rgb(100, 255, 100); // Green
                } else if (healthPercent > 0.3) {
                    playerHealthBarFill.color = k.rgb(255, 200, 0); // Yellow/Orange
                } else {
                    playerHealthBarFill.color = k.rgb(255, 50, 50); // Red
                }
            } else {
                playerHealthBarBg.hidden = true;
                playerHealthBarFill.hidden = true;
            }

            // Update enemies counter (only show in regular rooms, not boss rooms)
            if (!isBossRoom && !roomCompleted) {
                const currentEnemies = k.get('enemy').length;
                // Include split enemies in total count
                const totalEnemies = enemiesToSpawn + additionalEnemiesFromSplits + (isMinibossRoom ? 1 : 0); // Include miniboss and split enemies
                const currentMinibosses = k.get('miniboss').length;
                // Calculate remaining: current alive + not yet spawned
                const remainingEnemies = currentEnemies + currentMinibosses + Math.max(0, totalEnemies - enemiesSpawned - additionalEnemiesFromSplits - (isMinibossRoom && minibossSpawned ? 1 : 0));
                enemiesCounter.text = `${remainingEnemies}/${totalEnemies}`;
                enemiesCounter.hidden = false;
                enemyIcon.hidden = false;
            } else {
                enemiesCounter.hidden = true;
                enemyIcon.hidden = true;
            }

            // Update weapon indicator
            if (player.exists() && player.weaponDef) {
                const weaponDef = player.weaponDef;
                const dps = (player.projectileDamage * player.fireRate).toFixed(1);

                // Update weapon icon
                weaponIconText.text = weaponDef.icon || '⌐';
                weaponIconText.color = k.rgb(...weaponDef.color);

                // Update weapon detail popup info (always update, even when hidden)
                weaponDetailIcon.text = weaponDef.icon || '⌐';
                weaponDetailIcon.color = k.rgb(...weaponDef.color);
                weaponDetailName.text = weaponDef.name;
                // Ensure name color is always white/primary (explicitly set to prevent color issues)
                weaponDetailName.color = k.rgb(...UI_COLORS.TEXT_PRIMARY);
                weaponDetailDamage.text = `DMG: ${player.projectileDamage}`;
                weaponDetailFireRate.text = `RATE: ${player.fireRate.toFixed(2)}/s`;
                weaponDetailDPS.text = `DPS: ${dps}`;

                // Show weapon details when paused (save state before showing)
                if (k.paused) {
                    // Save current state before forcing it visible
                    if (k.gameData.weaponDetailSavedState === undefined) {
                        k.gameData.weaponDetailSavedState = weaponDetailState;
                    }
                    // Force visible when paused (regardless of saved state)
                    weaponDetailBg.hidden = false;
                    weaponDetailIcon.hidden = false;
                    weaponDetailName.hidden = false;
                    weaponDetailDamage.hidden = false;
                    weaponDetailFireRate.hidden = false;
                    weaponDetailDPS.hidden = false;
                } else {
                    // When not paused, respect the weaponDetailState
                    weaponDetailBg.hidden = !weaponDetailState;
                    weaponDetailIcon.hidden = !weaponDetailState;
                    weaponDetailName.hidden = !weaponDetailState;
                    weaponDetailDamage.hidden = !weaponDetailState;
                    weaponDetailFireRate.hidden = !weaponDetailState;
                    weaponDetailDPS.hidden = !weaponDetailState;
                }
            }

            // Update powerup weapon indicator and countdown
            if (player.exists()) {
                // Update time-based powerups
                updatePowerupWeapon(player, k.dt());

                // Update powerup HUD display
                const powerupDisplay = getPowerupDisplay(player);
                if (powerupDisplay) {
                    // Show powerup indicator
                    powerupIconBg.hidden = false;
                    powerupIconText.hidden = false;
                    powerupAmmoText.hidden = false;

                    // Update icon and color
                    powerupIconText.text = powerupDisplay.icon;
                    powerupIconText.color = k.rgb(...powerupDisplay.color);
                    powerupIconBg.outline.color = k.rgb(...powerupDisplay.color);

                    // Update ammo/duration text
                    if (powerupDisplay.isAmmoBased) {
                        powerupAmmoText.text = `${powerupDisplay.ammo}`;
                    } else if (powerupDisplay.isTimeBased) {
                        powerupAmmoText.text = `${Math.ceil(powerupDisplay.duration)}s`;
                    }
                } else {
                    // Hide powerup indicator
                    powerupIconBg.hidden = true;
                    powerupIconText.hidden = true;
                    powerupAmmoText.hidden = true;
                }
            }

            // Update buff display (call periodically, not every frame for performance)
            if (k.time() % 0.5 < k.dt()) {
                updateBuffDisplay();
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
            // Use player.isDead flag if set, otherwise fall back to HP check
            playerState.isDead = player.isDead || !player.exists() || player.hp() <= 0;
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
        let enemiesToSpawn = isBossRoom ? 0 : (24 + (currentFloor - 1) * 6); // No regular enemies in boss rooms (3x multiplier)
        let enemiesSpawned = 0;
        let initialSpawnDelay = 2; // Wait before first spawn
        let bossSpawned = false;
        let minibossSpawned = false;
        let isMinibossRoom = false; // Track if this room has a miniboss
        let entranceDoorExclusionTime = 4; // Seconds to exclude entrance door from enemy spawning (3-5 seconds)
        let roomStartTime = 0; // Track when room started
        let additionalEnemiesFromSplits = 0; // Track extra enemies created by splitting (e.g., slimes)
        
        // Determine if this room should have a miniboss (random chance, not in boss rooms)
        // 15% chance for miniboss room, increases with floor
        // Use seeded RNG for multiplayer consistency
        const roomRng = partySize > 1 ? getRoomRNG() : null;
        if (!isBossRoom && currentRoom !== 1) { // Don't spawn miniboss in first room or boss room
            const minibossChance = 0.15 + (currentFloor - 1) * 0.05; // 15% base, +5% per floor
            isMinibossRoom = (roomRng ? roomRng.next() : Math.random()) < minibossChance;
        }

        // If miniboss room, reduce normal enemy count
        if (isMinibossRoom) {
            enemiesToSpawn = Math.floor(enemiesToSpawn * 0.5); // Half normal enemies
        }

        // Get random miniboss type for floor
        // Use seeded RNG for multiplayer consistency
        function getRandomMinibossType(floor, rng = null) {
            const minibossTypes = ['brute', 'sentinel', 'berserker', 'guardian', 'warlock'];
            // Weight certain types by floor
            if (floor >= 3) {
                // Higher floors get more variety
                const index = rng ? rng.range(0, minibossTypes.length) : Math.floor(Math.random() * minibossTypes.length);
                return minibossTypes[index];
            } else {
                // Lower floors get simpler types
                const simpleTypes = ['brute', 'berserker', 'guardian'];
                const index = rng ? rng.range(0, simpleTypes.length) : Math.floor(Math.random() * simpleTypes.length);
                return simpleTypes[index];
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
        const enemySpawnInterval = 0.33; // seconds between spawns (3x faster spawn rate)
        
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
                // Spawn boss if not already spawned (only host spawns in multiplayer)
                if (!bossSpawned && (!isMultiplayerActive() || isHost())) {
                    bossSpawned = true;
                    const bossType = getBossTypeForFloor(currentFloor);

                    // Use seeded RNG for boss spawn position in multiplayer
                    const bossRng = partySize > 1 ? getRoomRNG() : null;

                    // Special handling for Twin Guardians - spawn from opposite doors
                    if (bossType === 'twinGuardian') {
                        // Strategy: Spawn guardians from opposite sides for dramatic entrance
                        // Exclude the door player entered from to avoid spawning on top of player
                        const availableDoors = spawnDoors.filter(d => d.direction !== gameState.entryDirection);
                        let door1, door2;

                        if (availableDoors.length >= 2) {
                            // Step 1: Randomize available doors
                            // Use Fisher-Yates shuffle with seeded RNG if in multiplayer
                            const shuffled = [...availableDoors];
                            for (let i = shuffled.length - 1; i > 0; i--) {
                                const j = bossRng ? bossRng.range(0, i + 1) : Math.floor(Math.random() * (i + 1));
                                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                            }
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

                        const twinGuardians = createTwinGuardians(k, door1, door2, currentFloor, bossRng);

                        // Register bosses for multiplayer
                        if (isMultiplayerActive() && isHost()) {
                            // Twin Guardians returns an array of both guardians
                            if (Array.isArray(twinGuardians)) {
                                twinGuardians.forEach(guardian => {
                                    registerEnemy(guardian, { type: 'twinGuardian', floor: currentFloor });
                                });
                            } else if (twinGuardians) {
                                // Fallback if it returns a single entity
                                registerEnemy(twinGuardians, { type: 'twinGuardian', floor: currentFloor });
                            }
                        }

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
                                const doorIndex = bossRng
                                    ? bossRng.range(0, availableDoors.length)
                                    : Math.floor(Math.random() * availableDoors.length);
                                bossSpawnDoor = availableDoors[doorIndex];
                            } else {
                                // Fallback to any door
                                const doorIndex = bossRng
                                    ? bossRng.range(0, spawnDoors.length)
                                    : Math.floor(Math.random() * spawnDoors.length);
                                bossSpawnDoor = spawnDoors[doorIndex];
                            }
                        }

                        const bossX = bossSpawnDoor ? bossSpawnDoor.pos.x : k.width() / 2;
                        const bossY = bossSpawnDoor ? bossSpawnDoor.pos.y : k.height() / 2;
                        const boss = createBoss(k, bossX, bossY, bossType, currentFloor, bossRng);

                        // Register boss for multiplayer
                        if (isMultiplayerActive() && isHost()) {
                            registerEnemy(boss, { type: bossType, floor: currentFloor });
                        }

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
                
                // Check if boss is defeated (only host checks in multiplayer)
                if (!isMultiplayerActive() || isHost()) {
                    const bosses = k.get('boss');
                    const bossMinions = k.get('enemy').filter(e => e.isBossMinion); // Check for boss minions
                    // Room completes when boss and all boss minions are defeated
                    if (bosses.length === 0 && bossMinions.length === 0 && !roomCompleted) {
                        roomCompleted = true;
                        handleRoomCompletion();
                    }
                }
                return; // Skip regular enemy spawning in boss rooms
            }
            
            // Miniboss room logic
            // Only host spawns miniboss (clients receive via spawn_entity messages)
            if (isMinibossRoom && !minibossSpawned && (!isMultiplayerActive() || isHost())) {
                // Spawn miniboss after a short delay
                if (k.time() - roomStartTime >= 1.0) {
                    minibossSpawned = true;
                    const minibossType = getRandomMinibossType(currentFloor, roomRng);

                    // Use seeded RNG for miniboss spawn position in multiplayer
                    const minibossRng = partySize > 1 ? getRoomRNG() : null;

                    // Spawn miniboss at a random door (avoid entrance door)
                    const availableDoors = spawnDoors.filter(d => d.direction !== gameState.entryDirection);
                    const doorsToUse = availableDoors.length > 0 ? availableDoors : spawnDoors;
                    const doorIndex = minibossRng
                        ? minibossRng.range(0, doorsToUse.length)
                        : Math.floor(Math.random() * doorsToUse.length);
                    const randomDoor = doorsToUse[doorIndex];

                    const minibossX = randomDoor.pos.x;
                    const minibossY = randomDoor.pos.y;
                    const miniboss = createMiniboss(k, minibossX, minibossY, minibossType, currentFloor);

                    // Register miniboss for multiplayer sync (only if host)
                    if (isMultiplayerActive() && isHost()) {
                        registerEnemy(miniboss, { type: minibossType, floor: currentFloor });
                    }

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

            // Only host checks for room completion in multiplayer
            if (allDefeated && !roomCompleted && (!isMultiplayerActive() || isHost())) {
                roomCompleted = true;
                handleRoomCompletion();
            }
            
            // Spawn enemies if we haven't reached the limit
            // Only host spawns enemies (clients receive via spawn_entity messages)
            if (enemiesSpawned < enemiesToSpawn && (!isMultiplayerActive() || isHost())) {
                enemySpawnTimer += k.dt();
                
                // Initial delay before first spawn
                if (enemiesSpawned === 0 && enemySpawnTimer < initialSpawnDelay) {
                    return;
                }
                
                if (enemySpawnTimer >= enemySpawnInterval) {
                    enemySpawnTimer = 0;
                    enemiesSpawned++;

                    // Get spawn RNG (seeded by room + spawn wave number for multiplayer sync)
                    const spawnRng = partySize > 1 ? getRoomRNG() : null;

                    // Use consistent seed for this specific spawn
                    if (spawnRng) {
                        // Advance RNG state based on spawn number for unique but deterministic spawns
                        for (let i = 0; i < enemiesSpawned - 1; i++) {
                            spawnRng.next(); // Consume RNG state to make each spawn unique
                        }
                    }

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

                        // Use seeded RNG for door selection in multiplayer
                        const doorIndex = spawnRng
                            ? spawnRng.range(0, doorsToUse.length)
                            : Math.floor(Math.random() * doorsToUse.length);
                        const randomDoor = doorsToUse[doorIndex];
                        const spawnX = randomDoor.pos.x;
                        const spawnY = randomDoor.pos.y;

                        // Add slight random offset to avoid stacking (seeded in multiplayer)
                        const offset = 15;
                        const offsetX = spawnX + (spawnRng ? (spawnRng.next() - 0.5) : (Math.random() - 0.5)) * offset;
                        const offsetY = spawnY + (spawnRng ? (spawnRng.next() - 0.5) : (Math.random() - 0.5)) * offset;

                        // Spawn random enemy type based on floor (host will broadcast this)
                        // Use seeded RNG in multiplayer to ensure consistent enemy types
                        const enemyType = getRandomEnemyType(currentFloor, spawnRng);
                        const enemy = createEnemy(k, offsetX, offsetY, enemyType, currentFloor);

                        // Register enemy for multiplayer sync (only if host)
                        if (isMultiplayerActive() && isHost()) {
                            registerEnemy(enemy, { type: enemyType, floor: currentFloor });
                        }
                    } else {
                        // Fallback to edge spawning if no doors (shouldn't happen)
                        // Use seeded RNG in multiplayer
                        const side = spawnRng ? spawnRng.range(0, 4) : Math.floor(k.rand(0, 4));
                        let x, y;

                        switch (side) {
                            case 0: // Top
                                x = spawnRng ? spawnRng.rangeFloat(margin, k.width() - margin) : k.rand(margin, k.width() - margin);
                                y = margin;
                                break;
                            case 1: // Right
                                x = k.width() - margin;
                                y = spawnRng ? spawnRng.rangeFloat(margin, k.height() - margin) : k.rand(margin, k.height() - margin);
                                break;
                            case 2: // Bottom
                                x = spawnRng ? spawnRng.rangeFloat(margin, k.width() - margin) : k.rand(margin, k.width() - margin);
                                y = k.height() - margin;
                                break;
                            case 3: // Left
                                x = margin;
                                y = spawnRng ? spawnRng.rangeFloat(margin, k.height() - margin) : k.rand(margin, k.height() - margin);
                                break;
                        }

                        // Use seeded RNG in multiplayer to ensure consistent enemy types
                        const enemyType = getRandomEnemyType(currentFloor, spawnRng);
                        const enemy = createEnemy(k, x, y, enemyType, currentFloor);

                        // Register enemy for multiplayer sync (only if host)
                        if (isMultiplayerActive() && isHost()) {
                            registerEnemy(enemy, { type: enemyType, floor: currentFloor });
                        }
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

                    // Clean up health bars before destroying enemy
                    if (enemy.cleanupHealthBars && typeof enemy.cleanupHealthBars === 'function') {
                        enemy.cleanupHealthBars();
                    }

                    // Broadcast enemy death to clients (if host)
                    if (isMultiplayerActive() && isHost() && enemy.mpEntityId) {
                        broadcastDeathEvent({
                            entityId: enemy.mpEntityId,
                            entityType: 'enemy',
                            x: posX,
                            y: posY
                        });
                    }

                    k.destroy(enemy);

                    // Play enemy death sound
                    playEnemyDeath();

                    // Track enemy kill
                    runStats.enemiesKilled++;

                    // Only spawn pickups if we're the host (or not in multiplayer)
                    // Pickups will be broadcast to clients via registerPickup()
                    if (!isMultiplayerActive() || isHost()) {
                        // Get loot RNG (seeded for multiplayer to ensure consistent drops)
                        const lootRng = partySize > 1 ? getRoomRNG() : null;

                        // Spawn XP pickup at enemy position
                        // Note: createXPPickup handles multiplayer registration internally
                        const xpPickup = createXPPickup(k, posX, posY, xpValue);

                        // Spawn currency drops (1-3 coins with random currency icons)
                        const currencyDropCount = lootRng ? lootRng.range(1, 4) : Math.floor(Math.random() * 3) + 1;
                        const currencyValue = 1; // Each coin is worth 1 currency
                        for (let i = 0; i < currencyDropCount; i++) {
                            // Spread drops slightly
                            const offsetX = lootRng ? (lootRng.next() - 0.5) * 20 : (Math.random() - 0.5) * 20;
                            const offsetY = lootRng ? (lootRng.next() - 0.5) * 20 : (Math.random() - 0.5) * 20;
                            const icon = getRandomCurrencyIcon();
                            // Note: createCurrencyPickup handles multiplayer registration internally
                            const currencyPickup = createCurrencyPickup(k, posX + offsetX, posY + offsetY, currencyValue, icon);
                        }

                        // Check for powerup weapon drop
                        const powerupDrop = rollPowerupDrop(enemy.type, currentFloor);
                        if (powerupDrop) {
                            // Offset slightly to avoid overlap with other pickups
                            const offsetX = lootRng ? (lootRng.next() - 0.5) * 30 : (Math.random() - 0.5) * 30;
                            const offsetY = lootRng ? (lootRng.next() - 0.5) * 30 : (Math.random() - 0.5) * 30;
                            // Note: createPowerupWeaponPickup handles multiplayer registration internally
                            const powerupPickup = createPowerupWeaponPickup(k, posX + offsetX, posY + offsetY, powerupDrop);
                        }
                    }
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

                    // Only spawn pickups if we're the host (or not in multiplayer)
                    if (!isMultiplayerActive() || isHost()) {
                        // Get loot RNG (seeded for multiplayer)
                        const lootRng = partySize > 1 ? getRoomRNG() : null;

                        // Spawn XP pickup at miniboss position (minibosses give more XP than regular enemies)
                        // Note: createXPPickup handles multiplayer registration internally
                        const xpPickup = createXPPickup(k, posX, posY, xpValue);

                        // Spawn currency drops (10-15 coins with random currency icons)
                        const minibossCurrencyCount = lootRng ? lootRng.range(10, 16) : Math.floor(Math.random() * 6) + 10;
                        const minibossCurrencyValue = 1; // Each coin is worth 1 currency
                        for (let i = 0; i < minibossCurrencyCount; i++) {
                            // Spread drops in a circle
                            const angle = (Math.PI * 2 / minibossCurrencyCount) * i;
                            const radius = lootRng ? (30 + lootRng.next() * 20) : (30 + Math.random() * 20);
                            const offsetX = Math.cos(angle) * radius;
                            const offsetY = Math.sin(angle) * radius;
                            // Note: createCurrencyPickup handles multiplayer registration internally
                            const currencyPickup = createCurrencyPickup(k, posX + offsetX, posY + offsetY, minibossCurrencyValue);
                        }
                    }

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

                    // Only spawn pickups if we're the host (or not in multiplayer)
                    if (!isMultiplayerActive() || isHost()) {
                        // Get loot RNG (seeded for multiplayer)
                        const lootRng = partySize > 1 ? getRoomRNG() : null;

                        // Spawn XP pickup at boss position (bosses give more XP)
                        // Note: createXPPickup handles multiplayer registration internally
                        const xpPickup = createXPPickup(k, posX, posY, xpValue);

                        // Spawn currency drops (20-30 coins with SAME currency icon)
                        const bossCurrencyCount = lootRng ? lootRng.range(20, 31) : Math.floor(Math.random() * 11) + 20;
                        const bossCurrencyValue = 1; // Each coin is worth 1 currency
                        const bossCurrencyIcon = getRandomCurrencyIcon(); // Pick ONE icon for all boss drops
                        for (let i = 0; i < bossCurrencyCount; i++) {
                            // Spread drops in a large circle
                            const angle = (Math.PI * 2 / bossCurrencyCount) * i;
                            const radius = lootRng ? (40 + lootRng.next() * 30) : (40 + Math.random() * 30);
                            const offsetX = Math.cos(angle) * radius;
                            const offsetY = Math.sin(angle) * radius;
                            // Use the same icon for all boss drops
                            // Note: createCurrencyPickup handles multiplayer registration internally
                            const currencyPickup = createCurrencyPickup(k, posX + offsetX, posY + offsetY, bossCurrencyValue, bossCurrencyIcon);
                        }
                    }

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

                // In multiplayer, check distance to ALL players
                // In single player, only check local player
                let closestPlayer = player;
                let closestDistance = k.vec2(
                    player.pos.x - pickup.pos.x,
                    player.pos.y - pickup.pos.y
                ).len();

                if (partySize > 1) {
                    // Check all players to find the closest one
                    players.forEach(p => {
                        if (!p.exists() || p.isDead) return;
                        const dist = k.vec2(
                            p.pos.x - pickup.pos.x,
                            p.pos.y - pickup.pos.y
                        ).len();
                        if (dist < closestDistance) {
                            closestDistance = dist;
                            closestPlayer = p;
                        }
                    });
                }

                // Start magnetizing if within pickup radius (once started, never stops)
                if (!pickup.magnetizing && closestDistance <= closestPlayer.pickupRadius) {
                    pickup.magnetizing = true;
                    pickup.targetPlayer = closestPlayer;
                }

                // Auto-collect if very close (collection radius is smaller than pickup radius)
                // In multiplayer, only the host handles pickup collection to ensure all players get rewards
                if (closestDistance <= PICKUP_CONFIG.COLLECTION_RADIUS && !pickup.collected) {
                    // In multiplayer, only host collects pickups
                    if (isMultiplayerActive() && !isHost()) {
                        return; // Skip on clients - host will handle collection
                    }

                    pickup.collected = true; // Set flag FIRST to prevent race conditions
                    playXPPickup();

                    // In multiplayer, give XP to all players (shared XP)
                    if (partySize > 1) {
                        // Give XP to all players on host
                        players.forEach(p => {
                            if (p.exists() && !p.isDead && p.addXP) {
                                p.addXP(pickup.value);
                            }
                        });

                        // Broadcast XP gain to clients so they get it too
                        if (isHost()) {
                            broadcastXPGain(pickup.value);
                        }
                    } else {
                        // Single player: just give to local player
                        player.addXP(pickup.value);
                    }

                    // Animate pickup flying to XP bar
                    const flyingPickup = k.add([
                        k.text('+', { size: 12 }),
                        k.pos(pickup.pos.x, pickup.pos.y),
                        k.color(100, 200, 255), // Light blue to match XP pickup color
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT + 1)
                    ]);

                    // Target: center of XP bar
                    const targetX = k.width() / 2;
                    const targetY = xpBarY + xpBarHeight / 2;

                    // Animate to target over 0.4 seconds
                    const duration = 0.4;
                    let elapsed = 0;
                    const startX = pickup.pos.x;
                    const startY = pickup.pos.y;

                    flyingPickup.onUpdate(() => {
                        elapsed += k.dt();
                        const progress = Math.min(elapsed / duration, 1);

                        // Ease-in interpolation
                        const eased = progress * progress;
                        flyingPickup.pos.x = startX + (targetX - startX) * eased;
                        flyingPickup.pos.y = startY + (targetY - startY) * eased;

                        // Fade and scale down as it approaches
                        flyingPickup.opacity = 1 - progress * 0.5;
                        flyingPickup.scale = k.vec2(1 - progress * 0.5);

                        if (progress >= 1) {
                            k.destroy(flyingPickup);
                            // Pulse XP bar on pickup collection
                            xpBarFill.color = k.rgb(150, 230, 255); // Bright light blue pulse
                            k.wait(0.1, () => {
                                if (xpBarFill.exists()) {
                                    xpBarFill.color = k.rgb(100, 200, 255); // Return to normal light blue
                                }
                            });
                        }
                    });

                    // Broadcast pickup collection to clients (if host)
                    if (isMultiplayerActive() && isHost() && pickup.mpEntityId) {
                        broadcastDeathEvent({
                            entityId: pickup.mpEntityId,
                            entityType: 'pickup',
                            x: pickup.pos.x,
                            y: pickup.pos.y
                        });
                    }

                    k.destroy(pickup);
                }
            });
        });

        // Handle currency pickup magnetization and collection
        k.onUpdate(() => {
            if (!player.exists() || k.paused) return;

            k.get('currencyPickup').forEach(pickup => {
                if (pickup.collected) return;

                // In multiplayer, check distance to ALL players
                // In single player, only check local player
                let closestPlayer = player;
                let closestDistance = k.vec2(
                    player.pos.x - pickup.pos.x,
                    player.pos.y - pickup.pos.y
                ).len();

                if (partySize > 1) {
                    // Check all players to find the closest one
                    players.forEach(p => {
                        if (!p.exists() || p.isDead) return;
                        const dist = k.vec2(
                            p.pos.x - pickup.pos.x,
                            p.pos.y - pickup.pos.y
                        ).len();
                        if (dist < closestDistance) {
                            closestDistance = dist;
                            closestPlayer = p;
                        }
                    });
                }

                // Start magnetizing if within pickup radius (once started, never stops)
                if (!pickup.magnetizing && closestDistance <= closestPlayer.pickupRadius) {
                    pickup.magnetizing = true;
                    pickup.targetPlayer = closestPlayer;
                }

                // Auto-collect if very close (collection radius is smaller than pickup radius)
                // In multiplayer, only the host handles pickup collection
                if (closestDistance <= PICKUP_CONFIG.COLLECTION_RADIUS && !pickup.collected) {
                    // In multiplayer, only host collects pickups
                    if (isMultiplayerActive() && !isHost()) {
                        return; // Skip on clients - host will handle collection
                    }

                    pickup.collected = true; // Set flag FIRST to prevent race conditions
                    playCurrencyPickup(); // Coin/cash pickup sound

                    // In multiplayer, currency is shared (everyone gets it)
                    // Currency is persistent across the run, so just add once
                    addCurrency(pickup.value); // Add currency to persistent storage

                    // Animate pickup flying to credit counter
                    const flyingCoin = k.add([
                        k.text('$', { size: 10 }),
                        k.pos(pickup.pos.x, pickup.pos.y),
                        k.color(255, 215, 0),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT + 1)
                    ]);

                    // Target: credit icon position
                    const targetX = k.width() - 20;
                    const targetY = 20;

                    // Animate to target over 0.5 seconds
                    const duration = 0.5;
                    let elapsed = 0;
                    const startX = pickup.pos.x;
                    const startY = pickup.pos.y;

                    flyingCoin.onUpdate(() => {
                        elapsed += k.dt();
                        const progress = Math.min(elapsed / duration, 1);

                        // Ease-in interpolation
                        const eased = progress * progress;
                        flyingCoin.pos.x = startX + (targetX - startX) * eased;
                        flyingCoin.pos.y = startY + (targetY - startY) * eased;

                        // Keep visible throughout flight
                        flyingCoin.opacity = 1;

                        if (progress >= 1) {
                            k.destroy(flyingCoin);
                            // Pulse credit counter on collection
                            creditIcon.scale = k.vec2(1.3);
                            creditText.scale = k.vec2(1.2);
                            k.wait(0.15, () => {
                                if (creditIcon.exists()) creditIcon.scale = k.vec2(1);
                                if (creditText.exists()) creditText.scale = k.vec2(1);
                            });
                        }
                    });

                    // Broadcast pickup collection to clients (if host)
                    if (isMultiplayerActive() && isHost() && pickup.mpEntityId) {
                        broadcastDeathEvent({
                            entityId: pickup.mpEntityId,
                            entityType: 'pickup',
                            x: pickup.pos.x,
                            y: pickup.pos.y
                        });
                    }

                    k.destroy(pickup);
                }
            });

            // Handle powerup weapon pickup collection
            k.get('powerupWeaponPickup').forEach(pickup => {
                if (pickup.collected) return;

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
                if (distance <= PICKUP_CONFIG.COLLECTION_RADIUS && !pickup.collected) {
                    // In multiplayer, only host collects pickups
                    if (isMultiplayerActive() && !isHost()) {
                        return; // Skip on clients - host will handle collection
                    }

                    pickup.collected = true; // Set flag FIRST to prevent race conditions
                    playCurrencyPickup(); // Use currency pickup sound for now

                    // Apply powerup weapon to player (in multiplayer, applies to all players)
                    if (isMultiplayerActive() && isHost()) {
                        // Apply powerup to all players in party
                        const allPlayers = k.get('player');
                        allPlayers.forEach(p => {
                            applyPowerupWeapon(p, pickup.powerupKey);
                        });
                    } else {
                        // Singleplayer: apply to local player only
                        applyPowerupWeapon(player, pickup.powerupKey);
                    }

                    // Visual feedback - flash effect
                    const powerup = POWERUP_WEAPONS[pickup.powerupKey];
                    const flash = k.add([
                        k.text(powerup.icon, { size: 32 }),
                        k.pos(player.pos.x, player.pos.y - 30),
                        k.color(...powerup.color),
                        k.anchor('center'),
                        k.z(UI_Z_LAYERS.UI_TEXT + 1),
                        k.opacity(1)
                    ]);

                    // Animate flash fading and rising
                    let flashAge = 0;
                    flash.onUpdate(() => {
                        flashAge += k.dt();
                        flash.pos.y -= 50 * k.dt();
                        flash.opacity = Math.max(0, 1 - flashAge / 0.8);
                        if (flashAge >= 0.8) {
                            k.destroy(flash);
                        }
                    });

                    k.destroy(pickup);
                }
            });
        });

        // Handle door interaction (proximity-based)
        let doorEntered = false;
        k.onUpdate(() => {
            if (!player.exists() || k.paused || doorEntered) return;

            // In multiplayer, only HOST checks for door transitions
            // Clients wait for room_transition broadcast from host
            if (isMultiplayerActive() && !isHost()) {
                return; // Clients don't check doors - wait for host signal
            }

            k.get('door').forEach(door => {
                // Only interact with exit doors (not spawn doors, not blocked doors)
                if (!door.open || doorEntered || door.isSpawnDoor || door.blocked) return;

                // In multiplayer, check if ALL players are within range of ANY open door
                if (partySize > 1) {
                    // Check if all alive players are within range of this door
                    const allPlayersInRange = players.every(p => {
                        if (!p.exists()) return true; // Skip non-existent players
                        if (p.isDead || p.hp() <= 0) return true; // Skip dead players

                        const distance = k.vec2(
                            p.pos.x - door.pos.x,
                            p.pos.y - door.pos.y
                        ).len();

                        return distance <= 40;
                    });

                    // Only allow transition if all players are in range
                    if (allPlayersInRange) {
                        doorEntered = true;
                        playDoorOpen();
                        handleDoorEntry(door.direction);
                    }
                } else {
                    // Single player: check if local player is near door
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
                }
            });
        });

        // Spawn reward pickups when room is cleared
        function spawnRoomClearRewards() {
            if (!player.exists()) return;

            // Determine spawn position (center of room)
            const centerX = k.width() / 2;
            const centerY = k.height() / 2;

            // Calculate rewards based on floor and whether it's a boss room
            const baseXP = 5;
            const baseCurrency = 3;

            // Boss rooms give more rewards
            const xpMultiplier = isBossRoom ? 3 : 1;
            const currencyMultiplier = isBossRoom ? 4 : 1;

            // Floor scaling
            const floorBonus = currentFloor * 0.5;

            const numXPPickups = Math.floor((baseXP + floorBonus) * xpMultiplier);
            const numCurrencyPickups = Math.floor((baseCurrency + floorBonus) * currencyMultiplier);

            // Use seeded RNG for multiplayer consistency
            const rewardRng = partySize > 1 ? getRoomRNG() : null;

            // Spawn XP pickups in a spread pattern
            for (let i = 0; i < numXPPickups; i++) {
                const angle = (Math.PI * 2 * i) / numXPPickups + (rewardRng ? rewardRng.next() : Math.random()) * 0.3;
                const distance = 40 + (rewardRng ? rewardRng.next() : Math.random()) * 60;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;

                // Each XP pickup is worth more on higher floors
                const xpValue = Math.floor(1 + currentFloor * 0.5);
                // Note: createXPPickup handles multiplayer registration internally
                const xpPickup = createXPPickup(k, x, y, xpValue);
            }

            // Spawn currency pickups in a spread pattern
            for (let i = 0; i < numCurrencyPickups; i++) {
                const angle = (Math.PI * 2 * i) / numCurrencyPickups + (rewardRng ? rewardRng.next() : Math.random()) * 0.3 + 0.5;
                const distance = 50 + (rewardRng ? rewardRng.next() : Math.random()) * 70;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;

                // Each currency pickup is worth more on higher floors
                const currencyValue = Math.floor(1 + currentFloor * 0.3);
                const icon = getRandomCurrencyIcon();
                // Note: createCurrencyPickup handles multiplayer registration internally
                const currencyPickup = createCurrencyPickup(k, x, y, currencyValue, icon);
            }

            // Extra bonus for boss rooms - spawn a few powerup weapons
            if (isBossRoom) {
                const powerupKeys = Object.keys(POWERUP_WEAPONS);
                const numPowerups = 1 + Math.floor((rewardRng ? rewardRng.next() : Math.random()) * 2); // 1-2 powerups

                for (let i = 0; i < numPowerups; i++) {
                    const angle = (rewardRng ? rewardRng.next() : Math.random()) * Math.PI * 2;
                    const distance = 80 + (rewardRng ? rewardRng.next() : Math.random()) * 40;
                    const x = centerX + Math.cos(angle) * distance;
                    const y = centerY + Math.sin(angle) * distance;

                    const randomPowerup = powerupKeys[Math.floor((rewardRng ? rewardRng.next() : Math.random()) * powerupKeys.length)];
                    // Note: createPowerupWeaponPickup handles multiplayer registration internally
                    const powerupPickup = createPowerupWeaponPickup(k, x, y, randomPowerup);
                }
            }
        }

        // Process pending level ups for all players sequentially
        function processPendingLevelUps() {
            // Build a queue of all pending level ups from all players
            const levelUpQueue = [];

            players.forEach((p) => {
                if (p.exists() && p.pendingLevelUps && p.pendingLevelUps.length > 0) {
                    p.pendingLevelUps.forEach(level => {
                        levelUpQueue.push({ player: p, level: level });
                    });
                    // Clear the pending level ups now that we've queued them
                    p.pendingLevelUps = [];
                }
            });

            // If no pending level ups, return early
            if (levelUpQueue.length === 0) {
                return;
            }

            console.log('[Game] Processing', levelUpQueue.length, 'pending level ups');

            // Process level ups sequentially
            let currentIndex = 0;

            function showNextLevelUp() {
                if (currentIndex >= levelUpQueue.length) {
                    console.log('[Game] All pending level ups processed');
                    return;
                }

                const { player: levelUpPlayer, level } = levelUpQueue[currentIndex];
                currentIndex++;

                // Determine player name for display
                const playerName = levelUpPlayer.playerName || (levelUpPlayer.isRemote ? `Player ${levelUpPlayer.slotIndex + 1}` : 'You');

                console.log('[Game] Showing level up for', playerName, 'level', level);

                // Show upgrade draft for this player (pass level for proper RNG seeding)
                showUpgradeDraft(k, levelUpPlayer, () => {
                    // Callback when upgrade is selected - show next level up
                    showNextLevelUp();
                }, playerName, level);
            }

            // Start showing level ups
            showNextLevelUp();
        }

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

            // Broadcast room completion to clients in multiplayer
            if (isMultiplayerActive() && isHost()) {
                broadcastRoomCompletion();
            }

            // Revive all dead players in multiplayer
            if (partySize > 1) {
                reviveAllPlayers();
            }

            // Process pending level ups for all players in multiplayer
            if (partySize > 1) {
                processPendingLevelUps();
            }

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

            // Spawn reward pickups (only host spawns in multiplayer)!
            if (!isMultiplayerActive() || isHost()) {
                spawnRoomClearRewards();
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
            // Save ALL players' stats before transitioning (critical for multiplayer)
            gameState.allPlayerStats = players.map((p, index) => {
                if (!p.exists()) return null;

                return {
                    slotIndex: index, // Track which slot this player belongs to
                    playerName: p.playerName,
                    isRemote: p.isRemote || false,
                    isDead: p.isDead || false,
                    level: p.level,
                    xp: p.xp,
                    xpToNext: p.xpToNext,
                    maxHealth: p.maxHealth,
                    currentHP: p.hp(),
                    speed: p.speed,
                    fireRate: p.fireRate,
                    projectileSpeed: p.projectileSpeed,
                    projectileDamage: p.projectileDamage,
                    pickupRadius: p.pickupRadius,
                    xpMultiplier: p.xpMultiplier || 1,
                    // Advanced weapon stats
                    projectileCount: p.projectileCount || 1,
                    piercing: p.piercing || 0,
                    obstaclePiercing: p.obstaclePiercing || 0,
                    critChance: p.critChance || 0,
                    critDamage: p.critDamage || 2.0,
                    spreadAngle: p.spreadAngle || 0,
                    defense: p.defense || 0,
                    weaponRange: p.weaponRange || 600,
                    // Upgrades (CRITICAL: preserve between rooms)
                    weapons: p.weapons || [],
                    passiveUpgrades: p.passiveUpgrades || [],
                    upgradeStacks: p.upgradeStacks || {},
                    // Synergy tracking
                    selectedUpgrades: p.selectedUpgrades ? Array.from(p.selectedUpgrades) : [],
                    activeSynergies: p.activeSynergies ? Array.from(p.activeSynergies) : [],
                    piercingDamageBonus: p.piercingDamageBonus || 1.0,
                    // Character data (needed for recalculating upgrades)
                    characterData: p.characterData,
                    weaponDef: p.weaponDef,
                    baseProjectileDamage: p.baseProjectileDamage,
                    baseFireRate: p.baseFireRate,
                    baseProjectileSpeed: p.baseProjectileSpeed
                };
            }).filter(stats => stats !== null);

            // Also save local player stats for backward compatibility
            const localPlayerStats = gameState.allPlayerStats.find(stats => !stats.isRemote);
            if (localPlayerStats) {
                gameState.playerStats = localPlayerStats;
            }

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

            // In multiplayer, broadcast room transition to sync spawn positions
            if (isMultiplayerActive() && isHost()) {
                broadcastRoomTransition(gameState.entryDirection);
            }

            // Restart game scene with new room/floor
            k.go('game');
        }
        
        // Game over on player death
        player.onDeath(() => {
            // Cleanup orbital weapons if they exist
            if (player.orbitalOrbs) {
                player.orbitalOrbs.forEach(orb => {
                    if (orb.exists()) k.destroy(orb);
                });
                player.orbitalOrbs = [];
            }

            // In multiplayer, don't end the game immediately - only host checks if all players are dead
            if (partySize > 1) {
                player.isDead = true;
                player.canMove = false;
                player.canShoot = false;

                // Visual indication of death (semi-transparent)
                player.opacity = 0.5;
                if (player.outline && player.outline.exists()) {
                    player.outline.opacity = 0.5;
                }

                // Broadcast player death immediately to all clients/host
                if (isMultiplayerActive() && player.slotIndex !== undefined) {
                    broadcastPlayerDeath(player.slotIndex);
                }

                // Only host checks if all players are dead
                if (!isHost()) {
                    console.log('[Multiplayer] Client player died - waiting for host game over event');
                    return; // Clients don't trigger game over, wait for host event
                }

                console.log('[Multiplayer] Host player died - checking if any players are still alive');

                // Check if any other players are still alive (host only)
                const anyPlayerAlive = players.some(p =>
                    p.exists() && p.hp() > 0 && !p.isDead
                );

                if (anyPlayerAlive) {
                    console.log('[Multiplayer] At least one player is still alive - continuing game');
                    return; // Don't go to game over - other players are still alive
                }

                console.log('[Multiplayer] All players are dead - triggering game over');
                // Host continues to trigger game over and broadcast to clients
            }

            // Single player or host: game over as normal
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

            // Broadcast game over to clients (if host in multiplayer)
            if (isMultiplayerActive() && isHost()) {
                broadcastGameOver(runStats, currencyEarned);
            }

            // Cleanup multiplayer
            if (isMultiplayerActive()) {
                cleanupMultiplayer();
            }

            // Pass run stats to game over scene
            k.go('gameOver', {
                runStats: { ...runStats },
                currencyEarned: currencyEarned
            });
        });
        
        // Pause overlay - compact box that fits just the title and buttons
        const pauseOverlay = k.add([
            k.rect(270, 250),
            k.pos(k.width() / 2, k.height() / 2),
            k.anchor('center'),
            k.color(0, 0, 0),
            k.opacity(0.9),
            k.outline(3, k.rgb(200, 200, 200)),
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
            k.text('Resume', { size: 18 }),
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

        // Helper function to update pause UI (used by both local and network pause)
        const updatePauseUI = (paused) => {
            if (paused) {
                playPause();
                // Save tooltip state and hide it
                if (k.gameData && k.gameData.saveTooltipState && k.gameData.hideTooltip) {
                    k.gameData.tooltipSavedState = k.gameData.saveTooltipState();
                    k.gameData.hideTooltip();
                }
                // Save current minimap mode and expand it
                if (k.gameData && k.gameData.minimap) {
                    k.gameData.minimapSavedMode = k.gameData.minimap.mode;
                    if (k.gameData.minimap.mode !== 'maximized') {
                        k.gameData.minimap.mode = 'maximized';
                        k.gameData.minimap.update();
                    }
                }
                // Save weapon detail state before showing it
                if (k.gameData.weaponDetailSavedState === undefined) {
                    k.gameData.weaponDetailSavedState = weaponDetailState;
                }
            } else {
                playUnpause();
                // Restore minimap mode
                if (k.gameData && k.gameData.minimap && k.gameData.minimapSavedMode !== undefined) {
                    k.gameData.minimap.mode = k.gameData.minimapSavedMode;
                    k.gameData.minimap.update();
                    k.gameData.minimapSavedMode = undefined;
                }
                // Restore tooltip state
                if (k.gameData && k.gameData.restoreTooltipState && k.gameData.tooltipSavedState) {
                    k.gameData.restoreTooltipState(k.gameData.tooltipSavedState);
                    k.gameData.tooltipSavedState = undefined;
                }
                // Restore weapon detail state
                if (k.gameData && k.gameData.weaponDetailSavedState !== undefined) {
                    weaponDetailState = k.gameData.weaponDetailSavedState;
                    weaponDetailBg.hidden = !weaponDetailState;
                    weaponDetailIcon.hidden = !weaponDetailState;
                    weaponDetailName.hidden = !weaponDetailState;
                    weaponDetailDamage.hidden = !weaponDetailState;
                    weaponDetailFireRate.hidden = !weaponDetailState;
                    weaponDetailDPS.hidden = !weaponDetailState;
                    k.gameData.weaponDetailSavedState = undefined;
                }
            }

            // Update UI visibility
            pauseOverlay.hidden = !paused;
            pauseText.hidden = !paused;
            k.get('pauseButton').forEach(btn => btn.hidden = !paused);
        };

        // Register pause UI update callback for network synchronization
        k.gameData.updatePauseUI = updatePauseUI;
        
        // Button handlers
        resumeButton.onClick(() => {
            // Only allow clicking when pause menu is visible
            if (!k.paused || resumeButton.hidden) return;

            k.paused = false;
            // Restore minimap mode
            if (k.gameData && k.gameData.minimap && k.gameData.minimapSavedMode !== undefined) {
                k.gameData.minimap.mode = k.gameData.minimapSavedMode;
                k.gameData.minimap.update();
                k.gameData.minimapSavedMode = undefined;
            }
            // Restore tooltip state
            if (k.gameData && k.gameData.restoreTooltipState && k.gameData.tooltipSavedState) {
                k.gameData.restoreTooltipState(k.gameData.tooltipSavedState);
                k.gameData.tooltipSavedState = undefined;
            }
            // Restore weapon detail state
            if (k.gameData && k.gameData.weaponDetailSavedState !== undefined) {
                weaponDetailState = k.gameData.weaponDetailSavedState;
                weaponDetailBg.hidden = !weaponDetailState;
                weaponDetailIcon.hidden = !weaponDetailState;
                weaponDetailName.hidden = !weaponDetailState;
                weaponDetailDamage.hidden = !weaponDetailState;
                weaponDetailFireRate.hidden = !weaponDetailState;
                weaponDetailDPS.hidden = !weaponDetailState;
                k.gameData.weaponDetailSavedState = undefined;
            }
            playUnpause();
            pauseOverlay.hidden = true;
            pauseText.hidden = true;
            k.get('pauseButton').forEach(btn => btn.hidden = true);
        });

        quitButton.onClick(() => {
            // Only allow clicking when pause menu is visible
            if (!k.paused || quitButton.hidden) return;

            // Cleanup multiplayer
            if (isMultiplayerActive()) {
                cleanupMultiplayer();
            }

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

            // Synchronize pause state in multiplayer
            if (isMultiplayerActive()) {
                if (isHost()) {
                    // Host: broadcast pause state to all clients
                    broadcastPauseState(k.paused);
                } else {
                    // Client: send pause request to host
                    sendPauseRequest(k.paused);
                }
            }

            // Update pause UI
            updatePauseUI(k.paused);
        });
    });
}

