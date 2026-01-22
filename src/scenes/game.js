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
import { createBarrel, clearAllBarrels, handleProjectileBarrelCollision, findBarrelByPosition, getAllBarrels } from '../entities/barrel.js';

// System imports
import { SpatialGrid } from '../systems/spatialGrid.js';
import { initObjectPools, clearAllPools } from '../systems/objectPool.js';
import { setupCombatSystem } from '../systems/combat.js';
import { setupProgressionSystem } from '../systems/progression.js';
import { getRandomEnemyType } from '../systems/enemySpawn.js';
import { tryMakeElite } from '../systems/eliteSystem.js';
import { showMovementHint, showLevelUpHint } from '../systems/tutorial.js';
import { SeededRandom } from '../utils/seededRandom.js';
import { getWeightedRoomTemplate, getFloorColors, constrainObstacleToRoom, resetRoomTemplateHistory, getRoomTemplateByKey, getBarrelPositions } from '../systems/roomGeneration.js';
import { checkAndApplySynergies, trackUpgrade, reapplySynergies } from '../systems/synergies.js';
import { UPGRADES, recalculateAllUpgrades, applyUpgrade } from '../systems/upgrades.js';
import { updateRunStats, calculateCurrencyEarned, addCurrency, getCurrency, getPermanentUpgradeLevel, checkFloorUnlocks, recordRun, consumeBoosters, getEquippedCosmetics, trackCharacterPlay, trackDailyChallengeAttempt, trackDailyChallengeCompletion, getSelectedCharacter } from '../systems/metaProgression.js';
import { RUN_BOOSTER_UNLOCKS, COSMETIC_UNLOCKS } from '../data/unlocks.js';
import { checkAchievements, initAchievementChecker } from '../systems/achievementChecker.js';
import { isUpgradeDraftActive, showUpgradeDraft } from './upgradeDraft.js';
import { updateParticles, spawnBloodSplatter, spawnHitImpact, spawnDeathExplosion, spawnTrailParticle, createGlowEffect, updateGlowEffect, spawnCosmeticDeath } from '../systems/particleSystem.js';
import { playXPPickup, playCurrencyPickup, playDoorOpen, playBossSpawn, playBossDeath, playEnemyDeath, playPause, playUnpause, initAudio, playCombatMusic } from '../systems/sounds.js';
import { initVisualEffects, updateScreenShake, resetVisualEffects, EffectPresets, isInHitFreeze } from '../systems/visualEffects.js';
import { getSetting } from '../systems/settings.js';
import { generateFloorMap } from '../systems/floorMap.js';
import { createMinimap } from '../systems/minimap.js';
import { renderFloorDecorations, getFloorTheme } from '../systems/floorTheming.js';
import { POWERUP_WEAPONS, rollPowerupDrop, applyPowerupWeapon, getPowerupDisplay, updatePowerupWeapon, restoreOriginalWeapon } from '../systems/powerupWeapons.js';
import { getParty, getPartySize } from '../systems/partySystem.js';
import { initMultiplayerGame, registerPlayer, registerEnemy, updateMultiplayer, isMultiplayerActive, cleanupMultiplayer, getPlayerCount, getRoomRNG, getFloorRNG, setCurrentFloor, setCurrentRoom, broadcastGameSeed, isHost, broadcastPauseState, sendPauseRequest, broadcastDeathEvent, broadcastRoomCompletion, broadcastGameOver, broadcastXPGain, broadcastCurrencyGain, broadcastPlayerDeath, broadcastRoomTransition, sendEnemyDeath, broadcastPowerupWeaponApplied, broadcastLevelUpQueued, broadcastHostQuit, getAndClearPendingXP, broadcastEmote, getFirstRoomTemplateKey, hasGameSeed, onGameSeedReceived, broadcastObstacles, broadcastHealEvent, broadcastRevivalEvent } from '../systems/multiplayerGame.js';
import { onMessage, offMessage, getNetworkInfo, broadcast } from '../systems/networkSystem.js';
import { initInputSystem, initTouchControls } from '../systems/inputSystem.js';

// Data imports
import { BOSS_TYPES, getBossDefinition } from '../data/bosses.js';
import { MINIBOSS_TYPES, getMinibossDefinition } from '../data/minibosses.js';

// Config imports
import { PICKUP_CONFIG } from '../config/constants.js';
import {
    UI_SIZES,
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
    minimap: null, // NEW: Minimap UI instance
    rerollsRemaining: 0, // Per-run rerolls from Mulligan upgrade
    playersRevivedThisRun: new Set(), // Track which players have been revived (one revival per player per run)
    // Daily run state
    isDailyRun: false,
    dailyCharacter: null,
    dailySeed: null,
    dailyRNG: null // Seeded RNG for daily run
};

// Run statistics (reset on new game)
let runStats = {
    floorsReached: 1,
    roomsCleared: 0,
    enemiesKilled: 0,
    bossesKilled: 0
};

// Flag to prevent duplicate client message handler registration (memory leak fix)
let gameSceneMessageHandlersRegistered = false;

// Apply permanent upgrades to player
// If upgradeLevels is provided, use those; otherwise use local storage (for local player)
function applyPermanentUpgrades(k, player, upgradeLevels = null) {
    // For remote players (upgradeLevels provided), use 0 as fallback to avoid using wrong player's data
    // For local player (upgradeLevels null), read from local storage
    const useLocalStorage = upgradeLevels === null;

    // Apply starting health upgrades
    const healthLevel = useLocalStorage
        ? getPermanentUpgradeLevel('startingHealth')
        : (upgradeLevels?.startingHealth || 0);
    if (healthLevel > 0) {
        player.maxHealth += healthLevel * 10;
        player.setHP(player.maxHealth); // Full health
    }

    // Apply starting damage upgrades
    const damageLevel = useLocalStorage
        ? getPermanentUpgradeLevel('startingDamage')
        : (upgradeLevels?.startingDamage || 0);
    if (damageLevel > 0) {
        player.projectileDamage += damageLevel;
    }

    // Apply starting speed upgrades
    const speedLevel = useLocalStorage
        ? getPermanentUpgradeLevel('startingSpeed')
        : (upgradeLevels?.startingSpeed || 0);
    if (speedLevel > 0) {
        player.speed += speedLevel * 10;
    }
}

/**
 * Apply purchased run boosters to player at game start
 * Boosters are consumed when the run starts
 * @param {Object} k - Kaplay instance
 * @param {Object} player - Player entity
 * @param {Object} gameState - Game state to track active booster effects
 */
function applyRunBoosters(k, player, gameState) {
    // Consume all purchased boosters
    const boosters = consumeBoosters();
    if (boosters.length === 0) return;

    // Initialize booster tracking
    gameState.activeBoosters = [];
    gameState.creditMultiplier = 1.0;

    boosters.forEach(booster => {
        const boosterDef = RUN_BOOSTER_UNLOCKS[booster.key];
        if (!boosterDef || !boosterDef.effect) return;

        const effect = boosterDef.effect;

        switch (effect.type) {
            case 'startingHealth':
                // Health Pack: Add bonus HP
                player.maxHealth += effect.value;
                player.setHP(player.hp() + effect.value);
                break;

            case 'tempDamage':
                // Damage Amp: +X% damage for first floor
                player.projectileDamage = Math.floor(player.projectileDamage * (1 + effect.value));
                gameState.activeBoosters.push({ type: 'tempDamage', value: effect.value, duration: effect.duration });
                break;

            case 'tempSpeed':
                // Speed Serum: +X% speed for first floor
                player.speed = Math.floor(player.speed * (1 + effect.value));
                player.originalSpeed = player.speed;
                gameState.activeBoosters.push({ type: 'tempSpeed', value: effect.value, duration: effect.duration });
                break;

            case 'creditMultiplier':
                // Wealth Charm: +X% credits for run
                gameState.creditMultiplier = (gameState.creditMultiplier || 1) + effect.value;
                break;

            case 'tempCrit':
                // Lucky Coin: +X% crit chance for first floor
                player.critChance = (player.critChance || 0) + effect.value;
                gameState.activeBoosters.push({ type: 'tempCrit', value: effect.value, duration: effect.duration });
                break;

            case 'tempDefense':
                // Armor Plating: +X% damage reduction for first floor
                player.damageReduction = (player.damageReduction || 0) + effect.value;
                gameState.activeBoosters.push({ type: 'tempDefense', value: effect.value, duration: effect.duration });
                break;

            case 'tempXP':
                // XP Booster: +X% XP for first floor
                player.xpMultiplier = (player.xpMultiplier || 1) * (1 + effect.value);
                gameState.activeBoosters.push({ type: 'tempXP', value: effect.value, duration: effect.duration });
                break;

            case 'autoRevive':
                // Emergency Revive: Auto-revive once at X% HP
                player.autoRevive = { health: effect.value, uses: effect.uses };
                break;
        }
    });

    // Show notification if boosters were applied
    if (boosters.length > 0) {
        const boosterText = k.add([
            k.text(`${boosters.length} Booster${boosters.length > 1 ? 's' : ''} Active!`, { size: 18 }),
            k.pos(k.width() / 2, 100),
            k.anchor('center'),
            k.color(100, 255, 150),
            k.fixed(),
            k.z(2000),
            k.opacity(1)
        ]);

        // Fade out after 2 seconds
        k.wait(2, () => {
            if (boosterText.exists()) {
                k.tween(boosterText.opacity, 0, 0.5, (val) => boosterText.opacity = val, k.easings.easeOutQuad).onEnd(() => {
                    if (boosterText.exists()) k.destroy(boosterText);
                });
            }
        });
    }
}

export function setupGameScene(k) {
    k.scene('game', (args) => {
        // Start combat music
        playCombatMusic();

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
        }

        // Get current game state (for both new and continuing games)
        const state = stateManager.getState();

        // ==========================================
        // GAMEPAD & TOUCH CONTROLS
        // ==========================================
        // Initialize gamepad polling and touch controls for mobile/controller support
        initInputSystem(k);
        initTouchControls(k);

        // ==========================================
        // LEGACY STATE (keeping for now)
        // ==========================================

        // Clear barrels from previous room/run
        clearAllBarrels();

        // Always ensure game starts unpaused (fixes freeze when quitting from pause menu)
        k.paused = false;

        // Reset game state on new game (when coming from menu)
        if (args?.resetState) {
            gameState.currentFloor = 1;
            gameState.currentRoom = 1;
            gameState.playerStats = null;
            gameState.allPlayerStats = null; // Clear multiplayer stats
            gameState.entryDirection = null;
            gameState.floorMap = null; // Clear old floor map
            gameState.playersRevivedThisRun = new Set(); // Reset revival tracking
            resetRoomTemplateHistory(); // Reset room template variation

            // Handle daily run state
            gameState.isDailyRun = args?.isDailyRun || false;
            gameState.dailyCharacter = args?.dailyCharacter || null;
            gameState.dailySeed = args?.dailySeed || null;
            gameState.dailyRNG = gameState.isDailyRun && gameState.dailySeed
                ? new SeededRandom(gameState.dailySeed)
                : null;

            if (gameState.isDailyRun) {
                console.log('[DailyRun] Starting daily run with character:', gameState.dailyCharacter, 'seed:', gameState.dailySeed);
                // Track daily challenge attempt for achievements
                trackDailyChallengeAttempt();
            }

            // Track character play for achievements
            const characterToTrack = gameState.isDailyRun ? gameState.dailyCharacter : getSelectedCharacter();
            trackCharacterPlay(characterToTrack);

            // Reset run statistics
            runStats = {
                floorsReached: 1,
                roomsCleared: 0,
                enemiesKilled: 0,
                bossesKilled: 0,
                killsByType: {},
                startTime: Date.now() // Track run start time
            };

            // Initialize achievement checker for new run (clears previous run's achievements)
            initAchievementChecker(k);

            // Initialize per-run rerolls from Mulligan permanent upgrade
            const mulliganLevel = getPermanentUpgradeLevel('mulligan');
            gameState.rerollsRemaining = mulliganLevel;
            // Reset client message handler registration flag (allows re-registration on new game)
            gameSceneMessageHandlersRegistered = false;

            // Show tutorial movement hint for new players
            k.wait(1.0, () => showMovementHint(k));
            // Reset weapon detail saved state
            if (k.gameData) {
                k.gameData.weaponDetailSavedState = undefined;
            }
        }

        // Use persistent game state
        let currentFloor = gameState.currentFloor;
        let currentRoom = gameState.currentRoom;

        // Track event handlers for cleanup (memory leak fix)
        const eventHandlers = {
            updates: [],
            keyPresses: []
        };

        // Flag to prevent duplicate door transitions (used in message handler and update loop)
        let doorEntered = false;

        // Room state variables (declared early for use in onMessage callbacks)
        let roomCompleted = false;
        const spawnDoors = [];
        let reviveAllPlayers = null; // Function defined later, but declared early for callbacks

        // Initialize spatial grids for performance optimization (see src/systems/spatialGrid.js)
        const spatialGrids = {
            enemies: new SpatialGrid(128),    // Grid for enemies, bosses, minibosses
            obstacles: new SpatialGrid(128),  // Grid for obstacles (walls, decorations)
            pickups: new SpatialGrid(128)     // Grid for pickups (XP, currency, powerups)
        };

        // Initialize visual effects system
        initVisualEffects(k);
        resetVisualEffects();

        // Get party size early for multiplayer checks throughout the scene
        const partySize = getPartySize();

        // Helper function to get seeded RNG for the current room
        // Priority: daily run > multiplayer > random (for single player consistency)
        function getSeededRoomRNG() {
            if (gameState.isDailyRun && gameState.dailySeed) {
                // Create room-specific seed for daily runs
                const roomSeed = gameState.dailySeed + currentFloor * 10000 + currentRoom * 100;
                return new SeededRandom(roomSeed);
            } else if (partySize > 1) {
                return getRoomRNG();
            }
            return null; // Single player non-daily: use Math.random()
        }

        // Helper function to generate floor map and minimap
        const generateFloorMapAndMinimap = () => {
            // Set current floor for seeded RNG in multiplayer
            if (partySize > 1) {
                setCurrentFloor(currentFloor);
                console.log('[Multiplayer] Generating floor map with seed:', hasGameSeed() ? 'valid' : 'invalid (0)');
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
        };

        // Generate floor map if starting new floor or no map exists
        // For multiplayer clients, this will be regenerated when game_seed arrives
        if (!gameState.floorMap || gameState.floorMap.floor !== currentFloor) {
            // For single player or if we're host, generate immediately
            // For clients, generate with placeholder (will be regenerated when seed arrives)
            generateFloorMapAndMinimap();
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

        // Floor names (TV station tiers)
        const floorNames = {
            1: 'Public Access',
            2: 'Local Affiliate',
            3: 'Cable Network',
            4: 'Premium Channel',
            5: 'Streaming Giant',
            6: 'Global Broadcast',
            7: 'Galactic Signal'
        };
        const getFloorName = (floor) => floorNames[floor] || `Network ${floor}`;

        // Show floor title when entering a new floor (room 1)
        // Skip if setting is enabled
        const skipIntroAnimation = getSetting('gameplay', 'skipIntroAnimation');
        if (currentRoom === 1 && !skipIntroAnimation) {
            const floorTitle = k.add([
                k.text(`Floor ${currentFloor}`, { size: 32 }),
                k.pos(k.width() / 2, k.height() / 3),
                k.anchor('center'),
                k.color(255, 255, 255),
                k.opacity(1),
                k.fixed(),
                k.z(3000)
            ]);

            const floorSubtitle = k.add([
                k.text(getFloorName(currentFloor), { size: 20 }),
                k.pos(k.width() / 2, k.height() / 3 + 40),
                k.anchor('center'),
                k.color(200, 200, 255),
                k.opacity(1),
                k.fixed(),
                k.z(3000)
            ]);

            // Fade out after delay
            k.wait(2, () => {
                if (floorTitle.exists()) {
                    floorTitle.onUpdate(() => {
                        floorTitle.opacity -= 0.02;
                        if (floorTitle.opacity <= 0) k.destroy(floorTitle);
                    });
                }
                if (floorSubtitle.exists()) {
                    floorSubtitle.onUpdate(() => {
                        floorSubtitle.opacity -= 0.02;
                        if (floorSubtitle.opacity <= 0) k.destroy(floorSubtitle);
                    });
                }
            });
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
        // For daily runs, always use the daily character (even on room transitions)
        const characterOverride = gameState.isDailyRun ? gameState.dailyCharacter : null;
        if (gameState.playerStats) {
            // Restore player with previous stats
            player = createPlayer(k, playerSpawnX, playerSpawnY, characterOverride);
            // Restore stats
            Object.assign(player, gameState.playerStats);
            // CRITICAL: Local player is NEVER remote - host's saved stats may have isRemote: true
            const wasRemote = player.isRemote;
            player.isRemote = false;
            if (wasRemote) {
                console.log('[Room Transition] Fixed isRemote flag - local player was incorrectly marked as remote');
            }
            // Restore health to current HP (not max)
            player.setHP(gameState.playerStats.currentHP || player.maxHealth);
            // Restore synergy tracking
            if (gameState.playerStats.selectedUpgrades) {
                player.selectedUpgrades = new Set(gameState.playerStats.selectedUpgrades);
            }
            if (gameState.playerStats.activeSynergies) {
                player.activeSynergies = new Set(gameState.playerStats.activeSynergies);
            }
            // Restore pending level ups
            if (gameState.playerStats.pendingLevelUps) {
                player.pendingLevelUps = [...gameState.playerStats.pendingLevelUps];
            }
            // CRITICAL: Recalculate all upgrades to ensure they're properly applied
            if (player.upgradeStacks && Object.keys(player.upgradeStacks).length > 0) {
                recalculateAllUpgrades(player);
            }

            // CRITICAL: Reapply synergies after upgrade recalculation
            // Synergy bonuses are multiplicative and get overwritten by recalculateAllUpgrades
            if (player.activeSynergies && player.activeSynergies.size > 0) {
                reapplySynergies(player);
                // CRITICAL: Restore HP after synergy reapplication
                // Some synergies (Tank, Glass Cannon) modify HP when applied, but we want
                // to preserve the player's saved HP, not re-apply the HP modification
                const savedHP = gameState.playerStats.currentHP || player.maxHealth;
                player.setHP(Math.min(savedHP, player.maxHealth));
            }

            // CRITICAL: Reinitialize orbital weapons if player has them
            // Orbital orbs are entities that get destroyed on room transition
            if (player.powerupWeapon === 'orbital' || player.weaponKey === 'orbital') {
                player.orbitalOrbs = [];
                player.orbitalAngles = [];
                player.orbitalNeedsReinit = true;
            }

            // Reset slow debuff state (enemies don't persist across rooms)
            player.slowed = false;

            // CRITICAL: Reset control flags after room transition
            // If player is alive, ensure they can move and shoot
            if (!player.isDead) {
                player.canMove = true;
                player.canShoot = true;
                player.opacity = 1;
                if (player.outline && player.outline.exists()) {
                    player.outline.opacity = 1;
                }
            } else {
                // Player is dead - set death visual state
                player.canMove = false;
                player.canShoot = false;
                player.opacity = 0.5;
                if (player.outline && player.outline.exists()) {
                    player.outline.opacity = 0.5;
                }
            }

            // Recreate cosmetic effects on room transition (glow entity was destroyed)
            if (gameState.equippedCosmetics) {
                // Recreate glow effect
                if (gameState.equippedCosmetics.glow && gameState.equippedCosmetics.glow !== 'glowNone' && !player.isDead) {
                    const glowDef = COSMETIC_UNLOCKS[gameState.equippedCosmetics.glow];
                    if (glowDef && glowDef.color) {
                        player.glowEffect = createGlowEffect(k, player, gameState.equippedCosmetics.glow, glowDef.color);
                    }
                }
                // Restore trail info (properties persist on player object)
                if (gameState.equippedCosmetics.trail && gameState.equippedCosmetics.trail !== 'trailNone') {
                    const trailDef = COSMETIC_UNLOCKS[gameState.equippedCosmetics.trail];
                    if (trailDef) {
                        player.trailType = gameState.equippedCosmetics.trail;
                        player.trailColor = trailDef.color;
                        player.trailTimer = 0;
                        player.lastTrailPos = { x: player.pos.x, y: player.pos.y };
                    }
                }
            }
        } else {
            // New game - create fresh player
            // For daily runs, use the locked daily character
            const characterOverride = gameState.isDailyRun ? gameState.dailyCharacter : null;
            player = createPlayer(k, playerSpawnX, playerSpawnY, characterOverride);

            // Apply permanent upgrades
            applyPermanentUpgrades(k, player);

            // Apply run boosters (consumables purchased in shop)
            applyRunBoosters(k, player, gameState);

            // Setup cosmetic effects (trails, glows, death effects)
            const equippedCosmetics = getEquippedCosmetics();
            gameState.equippedCosmetics = equippedCosmetics;

            // Create glow effect if one is equipped
            if (equippedCosmetics.glow && equippedCosmetics.glow !== 'glowNone') {
                const glowDef = COSMETIC_UNLOCKS[equippedCosmetics.glow];
                if (glowDef && glowDef.color) {
                    player.glowEffect = createGlowEffect(k, player, equippedCosmetics.glow, glowDef.color);
                }
            }

            // Store trail info on player for update loop
            if (equippedCosmetics.trail && equippedCosmetics.trail !== 'trailNone') {
                const trailDef = COSMETIC_UNLOCKS[equippedCosmetics.trail];
                if (trailDef) {
                    player.trailType = equippedCosmetics.trail;
                    player.trailColor = trailDef.color;
                    player.trailTimer = 0;
                    player.lastTrailPos = { x: player.pos.x, y: player.pos.y };
                }
            }

            // Initialize per-player run stats
            player.runStats = {
                kills: 0,
                deaths: 0,
                revives: 0,
                damageTaken: 0,
                damageDealt: 0,
                creditsPickedUp: 0,
                xpPickedUp: 0,
                bossesKilled: 0
            };
        }
        
        // ==========================================
        // MULTIPLAYER: Initialize multiplayer game if party has multiple players
        // ==========================================
        const party = getParty();
        const networkInfo = getNetworkInfo();
        // Initialize players array indexed by slot (not by push order)
        let players = new Array(party.maxSlots || 4).fill(null);

        if (partySize > 1 && networkInfo.isInitialized) {
            // Find local player slot
            const localSlot = party.slots.findIndex(slot => slot.isLocal);

            // Initialize multiplayer system with kaplay instance
            initMultiplayerGame(party.isHost, localSlot, k);

            // Broadcast game seed to clients (host only) to ensure synchronized RNG
            if (party.isHost) {
                // Select first room template and include it with game seed
                const roomRng = getRoomRNG();
                const firstRoomTemplate = getWeightedRoomTemplate(currentFloor, roomRng);
                gameState.roomTemplateKey = firstRoomTemplate.key;
                console.log('[Multiplayer] Host selected first room template:', firstRoomTemplate.key);
                broadcastGameSeed(firstRoomTemplate.key);
            }

            // Regenerate floor map with correct seed for multiplayer
            if (party.isHost) {
                // Host: regenerate with the newly created seed
                generateFloorMapAndMinimap();
            } else {
                // Client: regenerate when game_seed arrives
                // For now, generate with current seed (will be 0)
                // Then regenerate when we receive the actual seed
                onGameSeedReceived(() => {
                    console.log('[Multiplayer] Client received seed, regenerating floor map');
                    generateFloorMapAndMinimap();
                });
            }

            // Set slot index and name on local player
            player.slotIndex = localSlot;
            player.playerName = party.slots[localSlot].playerName;

            // Adjust local player position to match slot index (for consistent multiplayer positioning)
            const localOffsetX = localSlot * 30;
            player.pos.x = playerSpawnX + localOffsetX;

            // Register local player at their slot index
            registerPlayer(localSlot, player);
            players[localSlot] = player;

            // Spawn additional players for other party members
            party.slots.forEach((slot, index) => {
                if (index !== localSlot && slot.playerId !== null) {
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
                            Object.assign(remotePlayer, savedStats);
                            
                            // IMPORTANT: Re-affirm isRemote after restoring stats, as host's isRemote status (false)
                            // can overwrite the client's setting for the remote player object.
                            remotePlayer.isRemote = true; 
                            
                            remotePlayer.setHP(savedStats.currentHP || remotePlayer.maxHealth);

                            // Restore synergy tracking
                            if (savedStats.selectedUpgrades) {
                                remotePlayer.selectedUpgrades = new Set(savedStats.selectedUpgrades);
                            }
                            if (savedStats.activeSynergies) {
                                remotePlayer.activeSynergies = new Set(savedStats.activeSynergies);
                            }
                            // Restore pending level ups
                            if (savedStats.pendingLevelUps) {
                                remotePlayer.pendingLevelUps = [...savedStats.pendingLevelUps];
                            }

                            // Recalculate upgrades
                            if (remotePlayer.upgradeStacks && Object.keys(remotePlayer.upgradeStacks).length > 0) {
                                recalculateAllUpgrades(remotePlayer);
                            }

                            // Reapply synergies after upgrade recalculation
                            if (remotePlayer.activeSynergies && remotePlayer.activeSynergies.size > 0) {
                                reapplySynergies(remotePlayer);
                                // Restore HP after synergy reapplication
                                const savedHP = savedStats.currentHP || remotePlayer.maxHealth;
                                remotePlayer.setHP(Math.min(savedHP, remotePlayer.maxHealth));
                            }

                            // Reinitialize orbital weapons if player has them
                            if (remotePlayer.powerupWeapon === 'orbital' || remotePlayer.weaponKey === 'orbital') {
                                remotePlayer.orbitalOrbs = [];
                                remotePlayer.orbitalAngles = [];
                                remotePlayer.orbitalNeedsReinit = true;
                            }

                            // Reset slow debuff state
                            remotePlayer.slowed = false;

                            // CRITICAL: Reset control flags after room transition
                            // If player is alive, ensure they can move and shoot
                            if (!remotePlayer.isDead) {
                                remotePlayer.canMove = true;
                                remotePlayer.canShoot = true;
                                remotePlayer.opacity = 1;
                                if (remotePlayer.outline && remotePlayer.outline.exists()) {
                                    remotePlayer.outline.opacity = 1;
                                }
                            } else {
                                // Player is dead - set death visual state
                                remotePlayer.canMove = false;
                                remotePlayer.canShoot = false;
                                remotePlayer.opacity = 0.5;
                                if (remotePlayer.outline && remotePlayer.outline.exists()) {
                                    remotePlayer.outline.opacity = 0.5;
                                }
                            }
                        }
                    } else {
                        // No saved stats - apply permanent upgrades to new remote player
                        // Use the slot's permanent upgrade levels (from their save data)
                        applyPermanentUpgrades(k, remotePlayer, slot.permanentUpgradeLevels);
                    }

                    // Setup combat system for remote player (uses network input)
                    setupCombatSystem(k, remotePlayer);

                    // Setup progression system for remote player (for XP/level ups)
                    // Note: reviveAllPlayers callback is passed as null here, will be handled globally
                    setupProgressionSystem(k, remotePlayer, null, true);

                    // Register remote player at their slot index
                    registerPlayer(index, remotePlayer);
                    players[index] = remotePlayer;

                    // Add onDeath callback for remote players (host only) to check game over
                    if (party.isHost) {
                        remotePlayer.onDeath(() => {
                            // Set death state
                            remotePlayer.isDead = true;
                            remotePlayer.canMove = false;
                            remotePlayer.canShoot = false;
                            remotePlayer.opacity = 0.5;
                            if (remotePlayer.outline && remotePlayer.outline.exists()) {
                                remotePlayer.outline.opacity = 0.5;
                            }

                            // Check if all players are dead
                            const anyPlayerAlive = players.some(p =>
                                p && p.exists() && p.hp() > 0 && !p.isDead
                            );

                            if (!anyPlayerAlive) {
                                // All players dead - trigger game over
                                const currencyEarned = calculateCurrencyEarned(runStats);
                                const fullRunStats = {
                                    ...runStats,
                                    level: player.level,
                                    currencyEarned: currencyEarned
                                };
                                updateRunStats(fullRunStats);
                                addCurrency(currencyEarned);
                                checkAchievements(k);

                                // Gather party stats for game over screen
                                const partyStats = players.filter(p => p && p.exists()).map(p => ({
                                    name: p.playerName || 'Player',
                                    level: p.level || 1,
                                    characterData: p.characterData,
                                    kills: p.runStats?.kills || 0,
                                    deaths: p.runStats?.deaths || 0,
                                    revives: p.runStats?.revives || 0,
                                    damageTaken: p.runStats?.damageTaken || 0,
                                    damageDealt: p.runStats?.damageDealt || 0,
                                    xpCollected: p.runStats?.xpPickedUp || 0,
                                    creditsPickedUp: p.runStats?.creditsPickedUp || 0,
                                    bossesKilled: p.runStats?.bossesKilled || 0
                                }));

                                if (isMultiplayerActive()) {
                                    broadcastGameOver(runStats, currencyEarned, partyStats);
                                    cleanupMultiplayer();
                                }

                                k.go('gameOver', {
                                    runStats: { ...runStats },
                                    currencyEarned: currencyEarned,
                                    partyStats: partyStats,
                                    isDailyRun: gameState.isDailyRun,
                                    dailyCharacter: gameState.dailyCharacter
                                });
                            }
                        });
                    }

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

                                // Update health bar width - use k.use() to replace the rect component
                                const barWidth = Math.max(1, healthBarWidth * healthPercent);
                                healthBar.use(k.rect(barWidth, healthBarHeight));
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

            // Listen for room transition from host (client only)
            if (!isHost()) {
                // Prevent duplicate handler registration (memory leak fix)
                if (!gameSceneMessageHandlersRegistered) {
                    gameSceneMessageHandlersRegistered = true;

                onMessage('room_transition', (data) => {

                    // Update gameState to match host's entry direction for consistent spawn positions
                    gameState.entryDirection = data.entryDirection;

                    // Save player stats to gameState so they persist across scene reload
                    if (data.allPlayerStats) {
                        gameState.allPlayerStats = data.allPlayerStats;
                        // Find local player stats by matching slot index (not by isRemote flag!)
                        // Recalculate localSlot from party to ensure it's current
                        const currentParty = getParty();
                        const currentLocalSlot = currentParty.slots.findIndex(slot => slot.isLocal);
                        // Filter out null entries first to avoid errors
                        const localPlayerStats = data.allPlayerStats.find(stats => stats && stats.slotIndex === currentLocalSlot);
                        if (localPlayerStats) {
                            gameState.playerStats = localPlayerStats;
                            console.log('[Multiplayer] Client restored stats for slot', currentLocalSlot, 'level:', localPlayerStats.level);
                        } else {
                            console.warn('[Multiplayer] Client could not find stats for local slot', currentLocalSlot, 'in', data.allPlayerStats);
                        }
                    }

                    // Sync room template key from host
                    if (data.roomTemplateKey) {
                        gameState.roomTemplateKey = data.roomTemplateKey;
                        console.log('[Multiplayer] Client received room template:', data.roomTemplateKey);
                    }

                    // Sync floor number - check if we're advancing to a new floor
                    if (data.currentFloor && data.currentFloor !== gameState.currentFloor) {
                        console.log(`[Multiplayer] Floor advancement: ${gameState.currentFloor} -> ${data.currentFloor}`);
                        gameState.currentFloor = data.currentFloor;
                        // Clear floor map so it regenerates for the new floor
                        gameState.floorMap = null;
                        gameState.entryDirection = null; // Start from center on new floor
                    } else if (data.gridDirection && gameState.floorMap) {
                        // Sync floor map position with host (normal room transition)
                        gameState.floorMap.moveToRoom(data.gridDirection);
                    }

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
                    roomCompleted = true;

                    // Revive all dead players (same as host)
                    reviveAllPlayers();

                    // Update doors to show they're open
                    spawnDoors.forEach(door => {
                        if (door.exists() && !door.blocked) {
                            door.open = true;
                            door.isSpawnDoor = false;
                            door.updateVisual();
                        }
                    });

                    // Special handling for boss rooms: unblock the north door
                    if (isBossRoom) {
                        const northDoor = spawnDoors.find(d => d.direction === 'north');
                        if (northDoor && northDoor.exists()) {
                            northDoor.blocked = false;
                            northDoor.open = true;
                            northDoor.isSpawnDoor = false;
                            northDoor.isFloorExit = true;
                            northDoor.updateVisual();
                        }
                    }

                    // Update minimap to reflect room clear
                    if (gameState.minimap) {
                        gameState.minimap.update();
                    }

                    // Show completion message (same as host)
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

                    k.wait(5, () => {
                        if (completionMsg.exists()) {
                            k.destroy(completionMsg);
                        }
                    });

                    // Note: Level ups are now manually triggered via button, not auto-shown
                    // processPendingLevelUps();
                });

                // Listen for obstacle data from host
                onMessage('obstacle_data', (data) => {
                    console.log('[Multiplayer] Client received obstacle data:', data.obstacles.length, 'obstacles');

                    // Clear any existing obstacles (in case of resync)
                    k.get('obstacle').forEach(obj => k.destroy(obj));

                    // Create obstacles from host data
                    data.obstacles.forEach(obsData => {
                        // Color comes as array, convert to k.rgb()
                        const color = Array.isArray(obsData.color)
                            ? k.rgb(obsData.color[0], obsData.color[1], obsData.color[2])
                            : obsData.color;
                        createObstacle(
                            k,
                            obsData.x,
                            obsData.y,
                            obsData.width,
                            obsData.height,
                            obsData.type,
                            obsData.char,
                            color
                        );
                    });
                });

                // Listen for door states from host
                onMessage('door_states', (doorStates) => {
                    console.log('[Multiplayer] Client received door states:', doorStates);

                    // Update door blocked states (spawnDoors is defined later in scene)
                    if (typeof spawnDoors !== 'undefined' && spawnDoors.length > 0) {
                        spawnDoors.forEach(door => {
                            if (doorStates.hasOwnProperty(door.direction)) {
                                door.blocked = doorStates[door.direction];
                                door.updateVisual();
                            }
                        });
                    }
                });

                // Listen for game over event from host
                onMessage('game_over', (data) => {
                    // Calculate currency earned (use host's value if provided)
                    const currencyEarned = data.currencyEarned || calculateCurrencyEarned(data.runStats || runStats);

                    // Update persistent stats and add currency
                    // Use runStats from host (data.runStats) instead of local runStats (which is empty for clients)
                    const fullRunStats = {
                        ...(data.runStats || runStats),
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
                        runStats: { ...(data.runStats || runStats) },
                        currencyEarned: currencyEarned,
                        partyStats: data.partyStats || [],
                        isDailyRun: gameState.isDailyRun,
                        dailyCharacter: gameState.dailyCharacter
                    });
                });

                // Listen for powerup weapon application from host
                onMessage('powerup_weapon_applied', (data) => {
                    // Apply powerup to all players (client-side visual update)
                    // The actual weapon stats will be synced via game_state
                    players.forEach(p => {
                        if (!p || !p.exists()) return;
                        applyPowerupWeapon(p, data.powerupKey);
                    });
                });

                // Listen for upgrade selection from host/clients
                onMessage('upgrade_selected', (data) => {
                    // Skip if this is our own upgrade - we already applied it locally in upgradeDraft
                    if (data.slotIndex === localSlot) {
                        return;
                    }
                    // Find the player who selected the upgrade (remote player)
                    const upgradingPlayer = players.find(p => p.slotIndex === data.slotIndex);
                    if (upgradingPlayer && upgradingPlayer.exists()) {
                        // Apply upgrade locally (stats will sync via game_state but this is immediate)
                        applyUpgrade(upgradingPlayer, data.upgradeKey);
                        trackUpgrade(upgradingPlayer, data.upgradeKey);
                        checkAndApplySynergies(k, upgradingPlayer);
                    }
                });

                // Listen for level up queued events
                onMessage('level_up_queued', (data) => {
                    // Skip if this is our own level up - we already queued it locally
                    if (data.slotIndex === localSlot) {
                        return;
                    }
                    // Find the player who leveled up (remote player)
                    const leveledPlayer = players.find(p => p.slotIndex === data.slotIndex);
                    if (leveledPlayer && leveledPlayer.exists()) {
                        // Update the player's level to match (critical for saving stats)
                        leveledPlayer.level = data.level;

                        // Initialize pendingLevelUps if needed
                        if (!leveledPlayer.pendingLevelUps) {
                            leveledPlayer.pendingLevelUps = [];
                        }
                        // Queue the level up
                        if (!leveledPlayer.pendingLevelUps.includes(data.level)) {
                            leveledPlayer.pendingLevelUps.push(data.level);
                        }
                    }
                });

                // Listen for synergy activation
                onMessage('synergy_activated', (data) => {
                    // Skip if this is our own synergy - we already applied it locally
                    if (data.slotIndex === localSlot) {
                        return;
                    }
                    // Find the player who activated synergies (remote player)
                    const synergyPlayer = players.find(p => p.slotIndex === data.slotIndex);
                    if (synergyPlayer && synergyPlayer.exists()) {
                        // Apply synergies immediately
                        checkAndApplySynergies(k, synergyPlayer);
                    }
                });

                // Listen for powerup weapon expiration
                onMessage('powerup_expired', (data) => {
                    // Find the player whose powerup expired
                    const expiringPlayer = players.find(p => p.slotIndex === data.slotIndex);
                    if (expiringPlayer && expiringPlayer.exists()) {
                        // Restore original weapon
                        restoreOriginalWeapon(expiringPlayer);
                    }
                });

                // Handle player heal events from host (lifesteal, regen, etc.)
                onMessage('player_healed', (data) => {
                    const healedPlayer = players.find(p => p.slotIndex === data.slotIndex);
                    if (healedPlayer && healedPlayer.exists()) {
                        healedPlayer.setHP(data.newHP);
                    }
                });

                // Handle player dodge events from host
                onMessage('player_dodged', (data) => {
                    const dodgingPlayer = players.find(p => p.slotIndex === data.slotIndex);
                    if (dodgingPlayer && dodgingPlayer.exists()) {
                        // Show dodge visual feedback
                        const dodgeText = k.add([
                            k.text('DODGE!', { size: 14 }),
                            k.pos(data.x, data.y - 30),
                            k.anchor('center'),
                            k.color(100, 200, 255),
                            k.opacity(1),
                            k.z(500)
                        ]);

                        // Fade out and destroy
                        let elapsed = 0;
                        dodgeText.onUpdate(() => {
                            elapsed += k.dt();
                            dodgeText.pos.y -= 30 * k.dt();
                            dodgeText.opacity = Math.max(0, 1 - elapsed / 0.8);
                            if (elapsed >= 0.8) {
                                k.destroy(dodgeText);
                            }
                        });
                    }
                });
                } // End of handler registration guard
            }
        } else {
            // Single player mode - add player at slot 0
            player.slotIndex = 0;
            players[0] = player;
        }

        // Filter out null entries from players array for iteration
        // But keep the array slot-indexed for direct access
        const activePlayers = players.filter(p => p !== null);

        // ==========================================
        // EMOTES: Display emotes above player heads
        // ==========================================

        // Function to show emote above a player
        function showEmote(targetPlayer, emoteType) {
            if (!targetPlayer || !targetPlayer.exists()) return;

            const emoteChar = emoteType === 'exclamation' ? '!' : '♥';
            const emoteColor = emoteType === 'exclamation' ? [255, 255, 0] : [255, 100, 150];

            // Create emote text
            const emote = k.add([
                k.text(emoteChar, { size: 24 }),
                k.pos(targetPlayer.pos.x, targetPlayer.pos.y - 50),
                k.anchor('center'),
                k.color(...emoteColor),
                k.opacity(1),
                k.scale(1),
                k.z(1000),
                'emote'
            ]);

            // Animate: float up and fade out
            let elapsed = 0;
            const duration = 1.5;

            emote.onUpdate(() => {
                elapsed += k.dt();

                // Follow player horizontally, float up
                emote.pos.x = targetPlayer.pos.x;
                emote.pos.y = targetPlayer.pos.y - 50 - (elapsed * 30);

                // Scale animation (pop in, then shrink)
                if (elapsed < 0.2) {
                    emote.scale = k.vec2(1 + elapsed * 2);
                } else {
                    emote.scale = k.vec2(1.4 - (elapsed - 0.2) * 0.3);
                }

                // Fade out in last portion
                if (elapsed > duration * 0.6) {
                    emote.opacity = 1 - ((elapsed - duration * 0.6) / (duration * 0.4));
                }

                // Remove when done
                if (elapsed >= duration) {
                    k.destroy(emote);
                }
            });
        }

        // Key handlers for emotes (local player only)
        let lastEmoteTime = 0;
        const EMOTE_COOLDOWN = 0.1; // seconds

        k.onKeyPress('q', () => {
            if (player.isDead) return;

            // Check cooldown
            const now = k.time();
            if (now - lastEmoteTime < EMOTE_COOLDOWN) return;
            lastEmoteTime = now;

            // Show locally
            showEmote(player, 'exclamation');

            // Broadcast to others in multiplayer
            if (isMultiplayerActive()) {
                broadcastEmote(player.slotIndex, 'exclamation');
            }
        });

        k.onKeyPress('e', () => {
            if (player.isDead) return;

            // Check cooldown
            const now = k.time();
            if (now - lastEmoteTime < EMOTE_COOLDOWN) return;
            lastEmoteTime = now;

            // Show locally
            showEmote(player, 'heart');

            // Broadcast to others in multiplayer
            if (isMultiplayerActive()) {
                broadcastEmote(player.slotIndex, 'heart');
            }
        });

        // Handle emotes from other players in multiplayer
        if (partySize > 1) {
            onMessage('player_emote', (data) => {
                // Find the player who sent the emote
                const emotingPlayer = players[data.slotIndex];
                if (emotingPlayer && emotingPlayer.exists()) {
                    showEmote(emotingPlayer, data.emoteType);
                }
            });
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
        }

        // ==========================================
        // MULTIPLAYER: Revival system - revive all dead players on level up
        // ==========================================
        reviveAllPlayers = () => {
            // Only in multiplayer with multiple players
            if (partySize <= 1) return;

            // Check if Second Wind is purchased (required for revivals)
            const secondWindLevel = getPermanentUpgradeLevel('secondWind');
            if (secondWindLevel <= 0) return; // No Second Wind = no revivals

            let revivedCount = 0;
            players.forEach((p, index) => {
                if (!p) return; // Skip null entries

                // Check if player is dead (hp <= 0 or destroyed)
                if ((p.exists() && p.hp() <= 0) || (p.exists() && p.isDead)) {
                    // One revival per player per run - check if already revived
                    const playerKey = `player_${index}`;
                    if (gameState.playersRevivedThisRun.has(playerKey)) {
                        return; // Already revived this run, skip
                    }

                    // Mark as revived for this run
                    gameState.playersRevivedThisRun.add(playerKey);

                    // Revive player at 5% health + 5% per Second Wind level
                    const revivePercent = 0.05 + (secondWindLevel * 0.05);
                    const reviveHealth = Math.max(1, Math.floor(p.maxHealth * revivePercent));
                    p.setHP(reviveHealth);
                    p.isDead = false;

                    // Re-enable movement and shooting (for all players, including remote ones on host)
                    p.canMove = true;
                    p.canShoot = true;

                    // Show revival effect with HP percentage
                    const reviveHealthPercent = Math.round(revivePercent * 100);
                    const reviveEffect = k.add([
                        k.text(`★ REVIVED (${reviveHealthPercent}% HP) ★`, { size: 16 }),
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
                }
            });

            // Clear all enemy projectiles when revival happens to prevent instant re-death
            if (revivedCount > 0) {
                k.get('projectile').forEach(proj => {
                    if (proj.isEnemyProjectile || proj.isBossProjectile) {
                        k.destroy(proj);
                    }
                });
            }

            // Broadcast revival event in multiplayer
            if (revivedCount > 0 && isMultiplayerActive() && isHost()) {
                broadcastRevivalEvent();
            }
        };

        // Setup systems
        setupCombatSystem(k, player);
        const progressionSystem = setupProgressionSystem(k, player, reviveAllPlayers, partySize > 1);

        // CRITICAL: Final safety check - ensure local player has controls enabled if alive
        // This runs after all initialization to guarantee player can move and shoot
        if (!player.isDead) {
            player.canMove = true;
            player.canShoot = true;
        }

        // Apply any pending XP accumulated while in upgrade draft screen (multiplayer)
        if (partySize > 1) {
            const pendingXP = getAndClearPendingXP();
            if (pendingXP > 0 && player.addXP) {
                console.log('[Multiplayer] Applying pending XP:', pendingXP);
                player.addXP(pendingXP);
            }
        }

        // Re-apply synergies if loading from saved state
        if (gameState.playerStats && gameState.playerStats.selectedUpgrades) {
            // Wait a frame to ensure player is fully initialized
            k.wait(0.1, () => {
                checkAndApplySynergies(k, player);
            });
        }
        
        // Get room template from floor map (or fallback to weighted generation)
        const currentRoomNode = gameState.floorMap.getCurrentRoom();
        const isBossRoom = currentRoomNode ? currentRoomNode.isBossRoom : (currentRoom === 3);
        let roomTemplate;

        if (partySize > 1 && gameState.roomTemplateKey) {
            // Multiplayer: use the stored template key (synced from host transition)
            // This takes priority over floor map template for subsequent rooms
            roomTemplate = getRoomTemplateByKey(gameState.roomTemplateKey);
            console.log('[Multiplayer] Using synced template:', gameState.roomTemplateKey);
            // Clear the key after use so next room gets a fresh selection
            gameState.roomTemplateKey = null;
        } else if (partySize > 1 && !hasGameSeed()) {
            // Multiplayer client before seed arrived: use firstRoomTemplateKey or fallback
            const firstRoomKey = getFirstRoomTemplateKey();
            if (firstRoomKey) {
                roomTemplate = getRoomTemplateByKey(firstRoomKey);
                console.log('[Multiplayer] Client using first room template:', firstRoomKey);
            } else {
                // Fallback - shouldn't normally happen since scene reloads when seed arrives
                console.warn('[Multiplayer] No seed or template key available, using fallback');
                const roomRng = getRoomRNG();
                roomTemplate = getWeightedRoomTemplate(currentFloor, roomRng);
            }
        } else if (currentRoomNode && currentRoomNode.template) {
            // Use floor map template (for single player or multiplayer with correct seed)
            roomTemplate = currentRoomNode.template;
        } else {
            // Fallback to weighted generation
            roomTemplate = getWeightedRoomTemplate(currentFloor, getSeededRoomRNG());
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
        const obstacleDataForBroadcast = [];

        // Only create obstacles on host (or single player) - clients receive from host
        const shouldCreateObstacles = partySize <= 1 || isHost();

        if (!isFirstRoom && shouldCreateObstacles) {
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

            // Collect data for broadcast to clients
            if (partySize > 1 && isHost()) {
                // Convert color to array for network serialization
                let colorArray = null;
                if (obstacleColor) {
                    if (Array.isArray(obstacleColor)) {
                        colorArray = obstacleColor;
                    } else if (obstacleColor.r !== undefined) {
                        colorArray = [obstacleColor.r, obstacleColor.g, obstacleColor.b];
                    }
                }
                obstacleDataForBroadcast.push({
                    x: constrainedPos.x,
                    y: constrainedPos.y,
                    width: obs.width,
                    height: obs.height,
                    type: obs.type,
                    char: obs.char || '#',
                    color: colorArray
                });
            }
            });

            // Broadcast obstacles to clients (with small delay to ensure client has loaded)
            if (partySize > 1 && isHost()) {
                k.wait(0.1, () => {
                    broadcastObstacles(obstacleDataForBroadcast);
                });
            }
        }

        // Spawn explosive barrels (not in first room or boss rooms)
        if (!isFirstRoom && !isBossRoom && shouldCreateObstacles) {
            const barrelPositions = getBarrelPositions(roomTemplate.key, getSeededRoomRNG(), currentFloor);

            barrelPositions.forEach(pos => {
                // Check if barrel would overlap with player spawn or entrance
                const distToSpawn = Math.sqrt(
                    Math.pow(pos.x - playerSpawnX, 2) +
                    Math.pow(pos.y - playerSpawnY, 2)
                );
                const distToEntrance = Math.sqrt(
                    Math.pow(pos.x - entranceDoorX, 2) +
                    Math.pow(pos.y - entranceDoorY, 2)
                );

                // Skip if too close to spawn or entrance
                if (distToSpawn < safeZoneRadius + 25 || distToEntrance < safeZoneRadius + 25) {
                    return;
                }

                // Check for overlap with obstacles
                let overlapsObstacle = false;
                obstacles.forEach(obs => {
                    if (!obs.exists()) return;
                    const dist = Math.sqrt(
                        Math.pow(pos.x - obs.pos.x, 2) +
                        Math.pow(pos.y - obs.pos.y, 2)
                    );
                    if (dist < 50) overlapsObstacle = true;
                });

                if (!overlapsObstacle) {
                    createBarrel(k, pos.x, pos.y);
                }
            });
        }

        // HUD
        // Top-left panel background (outside room boundary)
        const topLeftPanelBg = k.add([
            k.rect(82, 22),
            k.pos(8, 2),
            k.color(0, 0, 0),
            k.opacity(0.6),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG)
        ]);

        // Enemy counter with skull icon (top left - outside room)
        const enemyIcon = k.add([
            k.text('☠', { size: UI_TEXT_SIZES.HUD }),
            k.pos(20, 6),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const enemiesCounter = k.add([
            k.text('0/0', { size: UI_TEXT_SIZES.HUD }),
            k.pos(40, 6),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Top-right panel background (outside room boundary)
        const topRightPanelBg = k.add([
            k.rect(85, 22),
            k.pos(k.width() - 10, 2),
            k.anchor('topright'),
            k.color(0, 0, 0),
            k.opacity(0.6),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG - 1)
        ]);

        // Credit counter (top right - outside room) - z-layer 950 to appear above minimap
        const creditIcon = k.add([
            k.text('$', { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() - 20, 6),
            k.anchor('topright'),
            k.color(255, 215, 0), // Gold color
            k.fixed(),
            k.z(950)
        ]);

        const creditText = k.add([
            k.text('0', { size: UI_TEXT_SIZES.HUD }),
            k.pos(k.width() - 40, 6),
            k.anchor('topright'),
            k.color(255, 215, 0), // Gold color to match icon
            k.fixed(),
            k.z(950)
        ]);

        // ==========================================
        // RUN TIMER (Below credits, if enabled)
        // ==========================================
        let runTimer = null;
        let runTimerText = null;
        let runElapsedTime = 0;

        if (getSetting('visual', 'showTimer') !== false) {
            runTimer = k.add([
                k.rect(60, 18),
                k.pos(k.width() - 10, 28),
                k.anchor('topright'),
                k.color(0, 0, 0),
                k.opacity(0.6),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_BG)
            ]);

            runTimerText = k.add([
                k.text('0:00', { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(k.width() - 15, 30),
                k.anchor('topright'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        }

        // ==========================================
        // FPS COUNTER (Top center, if enabled)
        // ==========================================
        let fpsCounter = null;
        let fpsUpdateInterval = 0;
        let frameCount = 0;
        let lastFps = 60;

        if (getSetting('visual', 'showFPS')) {
            fpsCounter = k.add([
                k.text('60 FPS', { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(k.width() / 2, 6),
                k.anchor('top'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        }

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

        // XP Bar (bottom of screen, below room boundary)
        const xpBarWidth = k.width() - 40;
        const xpBarHeight = 15; // Reduced by 25% from 20
        const xpBarY = k.height() - 18;

        const xpBarBg = k.add([
            k.rect(xpBarWidth, xpBarHeight),
            k.pos(20, xpBarY),
            k.color(...UI_COLORS.BG_DARK),
            k.outline(2, k.rgb(...UI_COLORS.TEXT_DISABLED)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG)
        ]);

        // Initialize XP bar with player's current progress
        const initialXpProgress = player.xpToNext > 0 ? player.xp / player.xpToNext : 0;
        const initialXpWidth = Math.max(0, (xpBarWidth - 34) * initialXpProgress);

        const xpBarFill = k.add([
            k.rect(initialXpWidth, xpBarHeight - 4),
            k.pos(58, xpBarY + 2), // Start after level badge (adjusted for larger badge)
            k.color(100, 200, 255), // Light blue XP color (matches pickup)
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BG + 1)
        ]);

        const xpBarText = k.add([
            k.text(formatXP(player.xp || 0, player.xpToNext || 10), { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(k.width() / 2, xpBarY + xpBarHeight / 2),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Level badge (circular frame on left end of XP bar)
        const levelBadgeSize = 36; // 30% bigger (was 28)
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
            k.text(`${player.level || 1}`, { size: UI_TEXT_SIZES.BODY }), // 30% bigger (was SMALL)
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
            k.anchor('center'), // Use center anchor for proper width updates
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
        const weaponIconX = 25;
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
        // LEVEL UP BUTTON (Bottom Right)
        // ==========================================
        const levelUpButtonSize = 50;
        const levelUpButtonX = k.width() - levelUpButtonSize - 25;
        const levelUpButtonY = k.height() - levelUpButtonSize - 25;

        const levelUpButtonBg = k.add([
            k.rect(levelUpButtonSize, levelUpButtonSize),
            k.pos(levelUpButtonX, levelUpButtonY),
            k.color(100, 200, 255), // Light blue background
            k.opacity(0.9),
            k.outline(3, k.rgb(255, 255, 255)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 5)
        ]);

        const levelUpButtonText = k.add([
            k.text('+', { size: 36 }),
            k.pos(levelUpButtonX + levelUpButtonSize / 2, levelUpButtonY + levelUpButtonSize / 2),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 6)
        ]);

        // Badge for showing count > 1 (top-right corner of button)
        const levelUpCountBadgeSize = 20;
        const levelUpCountBadgeX = levelUpButtonX + levelUpButtonSize - levelUpCountBadgeSize / 2;
        const levelUpCountBadgeY = levelUpButtonY - levelUpCountBadgeSize / 2;

        const levelUpCountBadge = k.add([
            k.circle(levelUpCountBadgeSize / 2),
            k.pos(levelUpCountBadgeX, levelUpCountBadgeY),
            k.anchor('center'),
            k.color(255, 50, 50), // Red badge
            k.outline(2, k.rgb(255, 255, 255)),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 7)
        ]);

        const levelUpCountText = k.add([
            k.text('2', { size: 12 }),
            k.pos(levelUpCountBadgeX, levelUpCountBadgeY),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY + 8)
        ]);

        // Initially hide level up button (only show when player has pending level ups)
        levelUpButtonBg.hidden = true;
        levelUpButtonText.hidden = true;
        levelUpCountBadge.hidden = true;
        levelUpCountText.hidden = true;

        // Click handler for level up button
        levelUpButtonBg.onClick(() => {
            if (progressionSystem && player.pendingLevelUps && player.pendingLevelUps.length > 0) {
                progressionSystem.processPendingLevelUp();
            }
        });

        // Pulsing glow effect for level up button
        let levelUpGlowTime = 0;
        levelUpButtonBg.onUpdate(() => {
            if (levelUpButtonBg.hidden) return;

            levelUpGlowTime += k.dt() * 4; // Speed of pulse
            const pulse = (Math.sin(levelUpGlowTime) + 1) / 2; // 0 to 1

            // Pulse the outline thickness and brightness
            const outlineSize = 3 + pulse * 3; // 3 to 6
            const brightness = 200 + pulse * 55; // 200 to 255
            levelUpButtonBg.outline.width = outlineSize;
            levelUpButtonBg.outline.color = k.rgb(brightness, brightness, 100 + pulse * 155);

            // Subtle scale pulse
            const scale = 1 + pulse * 0.05;
            levelUpButtonBg.scale = k.vec2(scale, scale);
            levelUpButtonText.scale = k.vec2(scale, scale);
        });

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

        // Initialize object pools for performance optimization
        initObjectPools(k);

        // Export spatial grids for global access (used by combat.js for optimized queries)
        k.gameData.spatialGrids = spatialGrids;

        // Cache alive players for optimized enemy targeting (updated each frame)
        k.gameData.alivePlayers = [];

        // Track split enemies for accurate counter
        k.gameData.additionalEnemiesFromSplits = 0;
        k.gameData.incrementSplitEnemies = (count) => {
            additionalEnemiesFromSplits += count;
            k.gameData.additionalEnemiesFromSplits = additionalEnemiesFromSplits;
        };
        k.gameData.minimapSavedMode = undefined;
        k.gameData.tooltipSavedState = undefined;

        // Rebuild spatial grids each frame for fast spatial queries
        // Note: Rebuilding is O(n), but enables O(1) queries instead of O(n) per query
        // With multiple queries per frame (collision, explosions, pickups), this is a net win
        eventHandlers.updates.push(k.onUpdate(() => {
            // Cache alive players for optimized enemy targeting
            k.gameData.alivePlayers = k.get('player').filter(p => !p.isDead && p.exists());

            // Rebuild enemy grid (includes enemies, bosses, minibosses)
            spatialGrids.enemies.clear();
            k.get('enemy').forEach(e => spatialGrids.enemies.insert(e));
            k.get('boss').forEach(b => spatialGrids.enemies.insert(b));
            k.get('miniboss').forEach(m => spatialGrids.enemies.insert(m));

            // Rebuild pickup grid (includes XP, currency, powerup weapons)
            spatialGrids.pickups.clear();
            k.get('xpPickup').forEach(p => spatialGrids.pickups.insert(p));
            k.get('currencyPickup').forEach(p => spatialGrids.pickups.insert(p));
            k.get('powerupWeaponPickup').forEach(p => spatialGrids.pickups.insert(p));

            // Obstacles are static, so we only rebuild when entering a new room
            // (We'll add obstacle insertion in room generation code later)
        }));

        // Update screen shake effect
        eventHandlers.updates.push(k.onUpdate(() => {
            updateScreenShake(k.dt());
        }));

        // Update run timer and FPS counter
        eventHandlers.updates.push(k.onUpdate(() => {
            const dt = k.dt();

            // Update run timer (only when not paused)
            if (runTimerText && runTimerText.exists() && !k.paused) {
                runElapsedTime += dt;
                const minutes = Math.floor(runElapsedTime / 60);
                const seconds = Math.floor(runElapsedTime % 60);
                runTimerText.text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Update FPS counter (update every 0.5 seconds)
            if (fpsCounter && fpsCounter.exists()) {
                frameCount++;
                fpsUpdateInterval += dt;
                if (fpsUpdateInterval >= 0.5) {
                    lastFps = Math.round(frameCount / fpsUpdateInterval);
                    fpsCounter.text = `${lastFps} FPS`;
                    // Color based on FPS (green > 50, yellow 30-50, red < 30)
                    if (lastFps >= 50) {
                        fpsCounter.color = k.rgb(100, 255, 100);
                    } else if (lastFps >= 30) {
                        fpsCounter.color = k.rgb(255, 255, 100);
                    } else {
                        fpsCounter.color = k.rgb(255, 100, 100);
                    }
                    frameCount = 0;
                    fpsUpdateInterval = 0;
                }
            }
        }));

        // Update synergy effects (berserker, survivalist)
        eventHandlers.updates.push(k.onUpdate(() => {
            if (k.paused || !player.exists() || player.isDead) return;

            const dt = k.dt();

            // Berserker synergy: +50% damage/speed below 30% HP
            // Uses multiplier approach to avoid issues with upgrades changing base stats
            if (player.berserkerEnabled) {
                const hpPercent = player.hp() / player.maxHealth;
                const isBelowThreshold = hpPercent < (player.berserkerThreshold || 0.3);
                const speedMultiplier = 1 + (player.berserkerSpeedBonus || 0.5);
                const damageMultiplier = 1 + (player.berserkerDamageBonus || 0.5);

                if (isBelowThreshold && !player.berserkerActive) {
                    // Activate berserker mode - apply multiplier to current stats
                    player.berserkerActive = true;
                    player.speed = Math.floor(player.speed * speedMultiplier);
                    player.projectileDamage = Math.floor(player.projectileDamage * damageMultiplier);
                } else if (!isBelowThreshold && player.berserkerActive) {
                    // Deactivate berserker mode - remove multiplier from current stats
                    player.berserkerActive = false;
                    player.speed = Math.floor(player.speed / speedMultiplier);
                    player.projectileDamage = Math.floor(player.projectileDamage / damageMultiplier);
                }
            }

            // Survivalist synergy: regen 1% HP/sec when out of combat
            if (player.survivalistEnabled) {
                // Update last combat time when player takes damage or deals damage
                // (This is set in combat.js when player takes damage)

                const timeSinceCombat = k.time() - (player.survivalistLastCombatTime || 0);
                const cooldown = player.survivalistCombatCooldown || 3.0;

                if (timeSinceCombat >= cooldown && player.hp() < player.maxHealth) {
                    // Out of combat long enough - regenerate
                    const regenPercent = player.survivalistRegenPercent || 0.01;
                    const regenAmount = player.maxHealth * regenPercent * dt;

                    // Accumulate fractional regen
                    player.survivalistRegenAccum = (player.survivalistRegenAccum || 0) + regenAmount;

                    if (player.survivalistRegenAccum >= 1) {
                        const healAmount = Math.floor(player.survivalistRegenAccum);
                        player.survivalistRegenAccum -= healAmount;
                        const newHP = Math.min(player.maxHealth, player.hp() + healAmount);
                        player.setHP(newHP);

                        // Broadcast heal for multiplayer sync
                        if (isMultiplayerActive() && isHost()) {
                            broadcastHealEvent({
                                slotIndex: player.slotIndex,
                                healAmount: healAmount,
                                newHP: newHP,
                                source: 'survivalist'
                            });
                        }
                    }
                }
            }
        }));

        // Update cosmetic effects (trails, glows)
        eventHandlers.updates.push(k.onUpdate(() => {
            if (k.paused || !player.exists() || player.isDead) return;

            const dt = k.dt();

            // Update glow effect
            if (player.glowEffect) {
                updateGlowEffect(k, player.glowEffect);
            }

            // Spawn trail particles when player moves
            if (player.trailType && player.trailColor) {
                player.trailTimer = (player.trailTimer || 0) + dt;
                const trailInterval = 0.05; // Spawn trail every 50ms

                // Check if player has moved
                const dx = player.pos.x - (player.lastTrailPos?.x || player.pos.x);
                const dy = player.pos.y - (player.lastTrailPos?.y || player.pos.y);
                const distMoved = Math.sqrt(dx * dx + dy * dy);

                if (player.trailTimer >= trailInterval && distMoved > 2) {
                    spawnTrailParticle(k, player.pos.x, player.pos.y, player.trailType, player.trailColor);
                    player.trailTimer = 0;
                    player.lastTrailPos = { x: player.pos.x, y: player.pos.y };
                }
            }
        }));

        // Hover detection for tooltips
        eventHandlers.updates.push(k.onUpdate(() => {
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
        }));

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
        eventHandlers.updates.push(k.onUpdate(() => {
            if (k.paused) return;
            updateParticles(k);
        }));

        // Update multiplayer system
        eventHandlers.updates.push(k.onUpdate(() => {
            if (k.paused) return;
            if (isMultiplayerActive()) {
                updateMultiplayer(k.dt());
            }
        }));

        // Update HUD
        eventHandlers.updates.push(k.onUpdate(() => {
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

                // Update health bar width - use k.use() to replace the rect component
                const fillWidth = Math.max(1, (playerHealthBarWidth - 2) * healthPercent);
                playerHealthBarFill.use(k.rect(fillWidth, playerHealthBarHeight - 2));

                // Position fill aligned to left edge of background
                const fillBarX = healthBarX - (playerHealthBarWidth / 2) + 1 + (fillWidth / 2);
                playerHealthBarFill.pos = k.vec2(fillBarX, healthBarY);

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
                // But NOT during hit freeze - only show on actual user pause
                if (k.paused && !isInHitFreeze()) {
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

            // Update level up button visibility and count
            if (player.exists() && player.pendingLevelUps && player.pendingLevelUps.length > 0) {
                // Show button
                levelUpButtonBg.hidden = false;
                levelUpButtonText.hidden = false;

                // Show/hide count badge based on pending level ups
                const pendingCount = player.pendingLevelUps.length;
                if (pendingCount > 1) {
                    levelUpCountBadge.hidden = false;
                    levelUpCountText.hidden = false;
                    levelUpCountText.text = pendingCount.toString();
                } else {
                    levelUpCountBadge.hidden = true;
                    levelUpCountText.hidden = true;
                }
            } else {
                // Hide button when no pending level ups
                levelUpButtonBg.hidden = true;
                levelUpButtonText.hidden = true;
                levelUpCountBadge.hidden = true;
                levelUpCountText.hidden = true;
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
                    bossNameText.text = 'THE CO-HOSTS';
                    
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
                        bossNameText.text = remainingBoss.enraged ? 'THE CO-HOSTS (ENRAGED)' : 'THE CO-HOSTS';
                        
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
                
                // Get boss name from data files
                let bossName = 'BOSS';
                if (boss.type === 'twinGuardianMelee' || boss.type === 'twinGuardianRanged') {
                    bossName = 'THE CO-HOSTS';
                } else if (BOSS_TYPES[boss.type]?.name) {
                    bossName = `THE ${BOSS_TYPES[boss.type].name.toUpperCase()}`;
                }
                
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
        }));

        // ==========================================
        // NEW ARCHITECTURE: Continuous sync of player entity to PlayerState
        // ==========================================
        eventHandlers.updates.push(k.onUpdate(() => {
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
        }));

        // ==========================================
        // NEW ARCHITECTURE: Sync room/floor state
        // ==========================================
        // Sync legacy gameState to new state system
        state.currentFloor = currentFloor;
        state.currentRoom = currentRoom;
        state.roomCleared = false;

        // ==========================================
        // NEW ARCHITECTURE: InputManager integration
        // ==========================================
        // Start collecting inputs for the local player each frame
        // (Running in parallel with legacy input for now)
        eventHandlers.updates.push(k.onUpdate(() => {
            if (k.paused) return;

            // Get input manager
            const inputMgr = inputManager.getManager();

            // Collect inputs for this frame
            const inputs = inputMgr.getInputsForFrame([localPlayerId]);

            // Get input for local player
            const playerInput = inputs.get(localPlayerId);
        }));

        // ==========================================
        // LEGACY STATE (keeping for now)
        // ==========================================

        // Room state (roomCompleted declared early for onMessage callbacks)
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
        // Use seeded RNG for multiplayer consistency, daily runs, or single player
        const roomRng = getSeededRoomRNG() || new SeededRandom(Date.now());
        if (!isBossRoom && currentRoom !== 1) { // Don't spawn miniboss in first room or boss room
            const minibossChance = 0.15 + (currentFloor - 1) * 0.05; // 15% base, +5% per floor
            isMinibossRoom = roomRng.next() < minibossChance;
        }

        // If miniboss room, reduce normal enemy count
        if (isMinibossRoom) {
            enemiesToSpawn = Math.floor(enemiesToSpawn * 0.5); // Half normal enemies
        }

        // Get random miniboss type for floor
        // Use seeded RNG for multiplayer consistency
        function getRandomMinibossType(floor, rng) {
            const minibossTypes = ['brute', 'sentinel', 'berserker', 'guardian', 'warlock'];
            // Weight certain types by floor
            if (floor >= 3) {
                // Higher floors get more variety
                return minibossTypes[rng.range(0, minibossTypes.length)];
            } else {
                // Lower floors get simpler types
                const simpleTypes = ['brute', 'berserker', 'guardian'];
                return simpleTypes[rng.range(0, simpleTypes.length)];
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
        
        // Spawn doors - create at room start for enemy spawning (spawnDoors declared early for onMessage callbacks)
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

        // Broadcast door states to clients (with small delay to ensure client has loaded)
        if (partySize > 1 && isHost()) {
            k.wait(0.1, () => {
                const doorStates = {};
                spawnDoors.forEach(door => {
                    doorStates[door.direction] = door.blocked;
                });
                broadcast('door_states', doorStates);
            });
        }

        // Spawn enemies periodically
        let enemySpawnTimer = 0;
        const enemySpawnInterval = 0.33; // seconds between spawns (3x faster spawn rate)
        
        // Track room start time for entrance door exclusion (after first frame)
        let roomStartTimeSet = false;

        eventHandlers.updates.push(k.onUpdate(() => {
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
                    const bossRng = getSeededRoomRNG();

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
                            k.text('THE CO-HOSTS', { size: 32 }),
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
                            registerEnemy(boss, { type: bossType, floor: currentFloor, isBoss: true });
                        }

                        // Play boss spawn sound
                        playBossSpawn();

                        // Show boss announcement
                        let bossName = 'BOSS';
                        if (bossType === 'twinGuardian') {
                            bossName = 'THE CO-HOSTS';
                        } else if (BOSS_TYPES[bossType]?.name) {
                            bossName = `THE ${BOSS_TYPES[bossType].name.toUpperCase()}`;
                        }
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
                    const minibossRng = getSeededRoomRNG();

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
                    const minibossName = MINIBOSS_TYPES[minibossType]?.name || 'MINIBOSS';
                    const announcement = k.add([
                        k.text(`MINIBOSS: ${minibossName.toUpperCase()}`, { size: 24 }),
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
                    const spawnRng = getSeededRoomRNG();

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
                        const enemy = createEnemy(k, offsetX, offsetY, enemyType, currentFloor, spawnRng);

                        // Try to make elite (10-15% chance on floor 2+)
                        tryMakeElite(k, enemy, currentFloor, spawnRng);

                        // Register enemy for multiplayer sync (only if host)
                        if (isMultiplayerActive() && isHost()) {
                            registerEnemy(enemy, { type: enemyType, floor: currentFloor, isElite: enemy.isElite, eliteModifier: enemy.eliteModifier });
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
                        const enemy = createEnemy(k, x, y, enemyType, currentFloor, spawnRng);

                        // Try to make elite (10-15% chance on floor 2+)
                        tryMakeElite(k, enemy, currentFloor, spawnRng);

                        // Register enemy for multiplayer sync (only if host)
                        if (isMultiplayerActive() && isHost()) {
                            registerEnemy(enemy, { type: enemyType, floor: currentFloor, isElite: enemy.isElite, eliteModifier: enemy.eliteModifier });
                        }
                    }
                }
            }
        }));

        // Update enemy death handling
        eventHandlers.updates.push(k.onUpdate(() => {
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

                        // Damage other enemies in range (optimized with spatial grid)
                        // OLD: k.get('enemy').forEach() - checks ALL enemies (O(n))
                        // NEW: getNearby() - only checks enemies in nearby grid cells (O(1))
                        const nearbyEnemies = spatialGrids.enemies.getNearby(posX, posY, explosionRadius);
                        nearbyEnemies.forEach(other => {
                            if (other === enemy || !other.exists()) return;
                            // Use squared distance to avoid expensive sqrt
                            const dx = other.pos.x - posX;
                            const dy = other.pos.y - posY;
                            const distSq = dx * dx + dy * dy;
                            if (distSq <= explosionRadius * explosionRadius) {
                                other.hurt(explosionDamage);
                            }
                        });

                        // Spawn larger explosion particle for exploding enemies
                        spawnDeathExplosion(k, posX, posY, {
                            color: [255, 150, 50],
                            scale: 1.5
                        });
                    } else {
                        // Use cosmetic death effect if equipped, otherwise default
                        const deathEffect = gameState.equippedCosmetics?.death;
                        const enemyColor = enemy.originalColor || [255, 100, 100];
                        if (deathEffect && deathEffect !== 'deathNone') {
                            spawnCosmeticDeath(k, posX, posY, deathEffect, enemyColor);
                        } else {
                            spawnDeathExplosion(k, posX, posY, { color: enemyColor });
                        }
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

                    // Broadcast enemy death to all players (host broadcasts to clients, client sends to host)
                    if (isMultiplayerActive() && enemy.mpEntityId) {
                        if (isHost()) {
                            // Host broadcasts death to all clients
                            broadcastDeathEvent({
                                entityId: enemy.mpEntityId,
                                entityType: 'enemy',
                                x: posX,
                                y: posY
                            });
                        } else {
                            // Client sends death notification to host
                            // The host will then broadcast to all clients
                            sendEnemyDeath({
                                entityId: enemy.mpEntityId,
                                entityType: 'enemy',
                                x: posX,
                                y: posY
                            });
                        }
                    }

                    k.destroy(enemy);

                    // Play enemy death sound
                    playEnemyDeath();

                    // Track enemy kill by type
                    runStats.enemiesKilled++;
                    const enemyType = enemy.type || enemy.enemyType || 'basic';
                    runStats.killsByType[enemyType] = (runStats.killsByType[enemyType] || 0) + 1;

                    // Track kill for the player who last hit this enemy
                    const killerSlot = enemy.lastHitBySlot;
                    if (killerSlot !== undefined && players[killerSlot] && players[killerSlot].runStats) {
                        players[killerSlot].runStats.kills++;
                    } else if (player.runStats) {
                        // Fallback to local player if no killer tracked
                        player.runStats.kills++;
                    }

                    // Only spawn pickups if we're the host (or not in multiplayer)
                    // Pickups will be broadcast to clients via registerPickup()
                    if (!isMultiplayerActive() || isHost()) {
                        // Get loot RNG (seeded for multiplayer to ensure consistent drops)
                        const lootRng = getSeededRoomRNG();

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

                    // Track miniboss kill by type (counts as enemy too)
                    runStats.enemiesKilled++;
                    const minibossType = miniboss.type || 'miniboss';
                    runStats.killsByType[minibossType] = (runStats.killsByType[minibossType] || 0) + 1;

                    // Track kill for the player who last hit this miniboss
                    const minibossKillerSlot = miniboss.lastHitBySlot;
                    if (minibossKillerSlot !== undefined && players[minibossKillerSlot] && players[minibossKillerSlot].runStats) {
                        players[minibossKillerSlot].runStats.kills++;
                    } else if (player.runStats) {
                        // Fallback to local player if no killer tracked
                        player.runStats.kills++;
                    }

                    // Only spawn pickups if we're the host (or not in multiplayer)
                    if (!isMultiplayerActive() || isHost()) {
                        // Get loot RNG (seeded for multiplayer)
                        const lootRng = getSeededRoomRNG();

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

                    // Track boss kill by type (counts as enemy too)
                    runStats.enemiesKilled++;
                    runStats.bossesKilled++;
                    const bossType = boss.type || 'boss';
                    runStats.killsByType[bossType] = (runStats.killsByType[bossType] || 0) + 1;

                    // Track kill for the player who last hit this boss
                    const bossKillerSlot = boss.lastHitBySlot;
                    if (bossKillerSlot !== undefined && players[bossKillerSlot] && players[bossKillerSlot].runStats) {
                        players[bossKillerSlot].runStats.kills++;
                        players[bossKillerSlot].runStats.bossesKilled++;
                    } else if (player.runStats) {
                        // Fallback to local player if no killer tracked
                        player.runStats.kills++;
                        player.runStats.bossesKilled++;
                    }

                    // Only spawn pickups if we're the host (or not in multiplayer)
                    if (!isMultiplayerActive() || isHost()) {
                        // Get loot RNG (seeded for multiplayer)
                        const lootRng = getSeededRoomRNG();

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
        }));

        // Handle XP pickup magnetization and collection
        eventHandlers.updates.push(k.onUpdate(() => {
            if (!player.exists() || k.paused) return;

            // Auto-pickup XP: use screen-wide radius if enabled
            const autoPickupXP = getSetting('gameplay', 'autoPickupXP');
            const effectiveXPRadius = autoPickupXP ? 2000 : player.pickupRadius;

            // OPTIMIZATION: Instead of checking ALL pickups, only check pickups near players
            // Get nearby pickups using spatial grid (much faster than k.get('xpPickup'))
            const pickupCheckRadius = effectiveXPRadius * 1.5; // Add buffer for safety
            const nearbyPickups = new Set(); // Use Set to avoid duplicates in multiplayer

            // In single player, only check near the player
            if (partySize === 1) {
                spatialGrids.pickups.getNearby(player.pos.x, player.pos.y, pickupCheckRadius).forEach(p => {
                    if (p.is && p.is('xpPickup')) nearbyPickups.add(p);
                });
            } else {
                // In multiplayer, check near ALL players
                players.forEach(p => {
                    if (!p || !p.exists() || p.isDead) return;
                    spatialGrids.pickups.getNearby(p.pos.x, p.pos.y, pickupCheckRadius).forEach(pickup => {
                        if (pickup.is && pickup.is('xpPickup')) nearbyPickups.add(pickup);
                    });
                });
            }

            nearbyPickups.forEach(pickup => {
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
                        if (!p || !p.exists() || p.isDead) return;
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
                // Use effective radius for auto-pickup setting
                const magnetRadius = autoPickupXP ? effectiveXPRadius : closestPlayer.pickupRadius;
                if (!pickup.magnetizing && closestDistance <= magnetRadius) {
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
                        // HOST: Give XP to local host player and broadcast to clients
                        if (isHost()) {
                            // Give XP to local player
                            if (player.exists() && !player.isDead && player.addXP) {
                                player.addXP(pickup.value);
                            }
                            // Broadcast XP gain to clients
                            broadcastXPGain(pickup.value);
                        } else {
                            // CLIENT: Give XP to local client player (handled by xp_gain broadcast)
                            // Don't add XP here - will be added when receiving broadcast
                        }
                    } else {
                        // Single player: just give to local player
                        player.addXP(pickup.value);
                    }

                    pickup.isFlyingToUI = true;
                }
            });
        }));

        // Handle currency pickup magnetization and collection
        eventHandlers.updates.push(k.onUpdate(() => {
            if (!player.exists() || k.paused) return;

            // Auto-pickup currency: use screen-wide radius if enabled
            const autoPickupCurrency = getSetting('gameplay', 'autoPickupCurrency');
            const effectiveCurrencyRadius = autoPickupCurrency ? 2000 : player.pickupRadius;

            // OPTIMIZATION: Only check pickups near players (using spatial grid)
            const pickupCheckRadius = effectiveCurrencyRadius * 1.5;
            const nearbyPickups = new Set();

            if (partySize === 1) {
                spatialGrids.pickups.getNearby(player.pos.x, player.pos.y, pickupCheckRadius).forEach(p => {
                    if (p.is && p.is('currencyPickup')) nearbyPickups.add(p);
                });
            } else {
                players.forEach(p => {
                    if (!p || !p.exists() || p.isDead) return;
                    spatialGrids.pickups.getNearby(p.pos.x, p.pos.y, pickupCheckRadius).forEach(pickup => {
                        if (pickup.is && pickup.is('currencyPickup')) nearbyPickups.add(pickup);
                    });
                });
            }

            nearbyPickups.forEach(pickup => {
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
                        if (!p || !p.exists() || p.isDead) return;
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
                // Use effective radius for auto-pickup setting
                const magnetRadius = autoPickupCurrency ? effectiveCurrencyRadius : closestPlayer.pickupRadius;
                if (!pickup.magnetizing && closestDistance <= magnetRadius) {
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

                    // Track credits picked up for the player who collected it
                    if (closestPlayer && closestPlayer.runStats) {
                        closestPlayer.runStats.creditsPickedUp += pickup.value;
                    }

                    // Broadcast currency gain to clients
                    if (isMultiplayerActive()) {
                        broadcastCurrencyGain(pickup.value);
                    }

                    pickup.isFlyingToUI = true;
                }
            });

            // Handle powerup weapon pickup collection (optimized with spatial grid)
            const nearbyPowerups = spatialGrids.pickups.getNearby(player.pos.x, player.pos.y, player.pickupRadius * 1.5);
            nearbyPowerups.forEach(pickup => {
                if (!pickup.is || !pickup.is('powerupWeaponPickup')) return;
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
                        // Broadcast powerup application to all clients
                        broadcastPowerupWeaponApplied(pickup.powerupKey);
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
        }));

        // Track door progress circle for multiplayer
        let doorProgressCircle = null;
        let doorProgressBg = null;
        let doorProgressTime = 0;
        let doorProgressDoor = null;
        let doorProgressIsForced = false;
        const DOOR_PROGRESS_DURATION = 0.5; // seconds when all players present
        const DOOR_FORCE_DURATION = 10; // seconds when only host (force advance)

        // Client-side: listen for door progress updates from host
        if (isMultiplayerActive() && !isHost()) {
            onMessage('door_progress', (data) => {
                if (data.clear) {
                    // Clear progress UI
                    if (doorProgressBg && doorProgressBg.exists()) k.destroy(doorProgressBg);
                    if (doorProgressCircle && doorProgressCircle.exists()) k.destroy(doorProgressCircle);
                    doorProgressBg = null;
                    doorProgressCircle = null;
                    return;
                }

                // Create UI if it doesn't exist
                if (!doorProgressBg || !doorProgressBg.exists()) {
                    doorProgressBg = k.add([
                        k.circle(20),
                        k.pos(data.doorX, data.doorY),
                        k.anchor('center'),
                        k.color(80, 80, 80),
                        k.opacity(0.8),
                        k.z(200),
                        'doorProgress'
                    ]);

                    doorProgressCircle = k.add([
                        k.circle(18),
                        k.pos(data.doorX, data.doorY),
                        k.anchor('center'),
                        k.color(data.isForced ? 255 : 100, data.isForced ? 200 : 255, data.isForced ? 0 : 100),
                        k.opacity(0),
                        k.z(201),
                        'doorProgress'
                    ]);
                }

                // Update progress visual
                if (doorProgressCircle && doorProgressCircle.exists()) {
                    doorProgressCircle.opacity = data.progress;
                    doorProgressCircle.scale = k.vec2(data.progress, data.progress);
                    // Update color if mode changed
                    doorProgressCircle.color = k.rgb(
                        data.isForced ? 255 : 100,
                        data.isForced ? 200 : 255,
                        data.isForced ? 0 : 100
                    );
                }
            });

            // Client-side: listen for barrel damage from host
            onMessage('barrel_damage', (data) => {
                const barrel = findBarrelByPosition(data.x, data.y);
                if (barrel && barrel.exists() && !barrel.isExploding) {
                    // Sync health directly (more reliable than applying damage)
                    barrel.currentHealth = data.currentHealth;
                    barrel.updateHealthBar();
                }
            });

            // Client-side: listen for barrel explosions from host
            onMessage('barrel_explode', (data) => {
                const barrel = findBarrelByPosition(data.x, data.y);
                if (barrel && barrel.exists() && !barrel.isExploding) {
                    // Trigger local explosion (won't broadcast since we're not host)
                    barrel.explode();
                }
            });
        }

        // Handle door interaction (proximity-based)
        eventHandlers.updates.push(k.onUpdate(() => {
            if (!player.exists() || k.paused || doorEntered || isUpgradeDraftActive()) return;

            // In multiplayer, only HOST checks for door transitions
            // Clients wait for room_transition broadcast from host
            if (isMultiplayerActive() && !isHost()) {
                return; // Clients don't check doors - wait for host signal
            }

            k.get('door').forEach(door => {
                // Only interact with exit doors (not spawn doors, not blocked doors)
                if (!door.open || doorEntered || door.isSpawnDoor || door.blocked) return;

                // In multiplayer, check player positions
                if (partySize > 1) {
                    let hostInRange = false;
                    let allPlayersInRange = true;

                    players.forEach((p, index) => {
                        if (!p || !p.exists()) return;
                        if (p.isDead || p.hp() <= 0) return;

                        const distance = k.vec2(
                            p.pos.x - door.pos.x,
                            p.pos.y - door.pos.y
                        ).len();

                        const inRange = distance <= 40;
                        if (index === 0) hostInRange = inRange;
                        if (!inRange) allPlayersInRange = false;
                    });

                    const shouldShowProgress = allPlayersInRange || hostInRange;
                    const isForced = hostInRange && !allPlayersInRange;
                    const duration = isForced ? DOOR_FORCE_DURATION : DOOR_PROGRESS_DURATION;

                    if (shouldShowProgress) {
                        // Reset if new door or mode changed
                        if (doorProgressDoor !== door || doorProgressIsForced !== isForced) {
                            doorProgressTime = 0;
                            doorProgressDoor = door;
                            doorProgressIsForced = isForced;

                            if (doorProgressBg && doorProgressBg.exists()) k.destroy(doorProgressBg);
                            if (doorProgressCircle && doorProgressCircle.exists()) k.destroy(doorProgressCircle);

                            doorProgressBg = k.add([
                                k.circle(20),
                                k.pos(door.pos.x, door.pos.y),
                                k.anchor('center'),
                                k.color(80, 80, 80),
                                k.opacity(0.8),
                                k.z(200),
                                'doorProgress'
                            ]);

                            doorProgressCircle = k.add([
                                k.circle(18),
                                k.pos(door.pos.x, door.pos.y),
                                k.anchor('center'),
                                k.color(isForced ? 255 : 100, isForced ? 200 : 255, isForced ? 0 : 100),
                                k.opacity(0),
                                k.z(201),
                                'doorProgress'
                            ]);
                        }

                        doorProgressTime += k.dt();
                        const progress = Math.min(doorProgressTime / duration, 1);

                        if (doorProgressCircle && doorProgressCircle.exists()) {
                            doorProgressCircle.opacity = progress;
                            doorProgressCircle.scale = k.vec2(progress, progress);
                        }

                        // Broadcast to clients
                        if (isMultiplayerActive()) {
                            broadcast('door_progress', {
                                doorX: door.pos.x,
                                doorY: door.pos.y,
                                progress: progress,
                                isForced: isForced
                            });
                        }

                        if (progress >= 1) {
                            doorEntered = true;
                            playDoorOpen();
                            if (doorProgressBg && doorProgressBg.exists()) k.destroy(doorProgressBg);
                            if (doorProgressCircle && doorProgressCircle.exists()) k.destroy(doorProgressCircle);
                            doorProgressDoor = null;
                            if (isMultiplayerActive()) {
                                broadcast('door_progress', { progress: 0, clear: true });
                            }
                            handleDoorEntry(door.direction);
                        }
                    } else if (doorProgressDoor === door) {
                        doorProgressTime = 0;
                        doorProgressDoor = null;
                        doorProgressIsForced = false;
                        if (doorProgressBg && doorProgressBg.exists()) k.destroy(doorProgressBg);
                        if (doorProgressCircle && doorProgressCircle.exists()) k.destroy(doorProgressCircle);
                        if (isMultiplayerActive()) {
                            broadcast('door_progress', { progress: 0, clear: true });
                        }
                    }
                } else {
                    // Single player: use progress bar like multiplayer
                    // Skip if player is dead (prevent race condition with game over)
                    if (player.isDead || player.hp() <= 0) return;

                    const distance = k.vec2(
                        player.pos.x - door.pos.x,
                        player.pos.y - door.pos.y
                    ).len();

                    const inRange = distance <= 40;

                    if (inRange) {
                        // Initialize progress bar if new door
                        if (doorProgressDoor !== door) {
                            doorProgressTime = 0;
                            doorProgressDoor = door;
                            doorProgressIsForced = false;

                            if (doorProgressBg && doorProgressBg.exists()) k.destroy(doorProgressBg);
                            if (doorProgressCircle && doorProgressCircle.exists()) k.destroy(doorProgressCircle);

                            doorProgressBg = k.add([
                                k.circle(20),
                                k.pos(door.pos.x, door.pos.y),
                                k.anchor('center'),
                                k.color(80, 80, 80),
                                k.opacity(0.8),
                                k.z(200),
                                'doorProgress'
                            ]);

                            doorProgressCircle = k.add([
                                k.circle(18),
                                k.pos(door.pos.x, door.pos.y),
                                k.anchor('center'),
                                k.color(100, 255, 100), // Green for single player
                                k.opacity(0),
                                k.z(201),
                                'doorProgress'
                            ]);
                        }

                        doorProgressTime += k.dt();
                        const progress = Math.min(doorProgressTime / DOOR_PROGRESS_DURATION, 1);

                        if (doorProgressCircle && doorProgressCircle.exists()) {
                            doorProgressCircle.opacity = progress;
                            doorProgressCircle.scale = k.vec2(progress, progress);
                        }

                        if (progress >= 1) {
                            doorEntered = true;
                            playDoorOpen();
                            if (doorProgressBg && doorProgressBg.exists()) k.destroy(doorProgressBg);
                            if (doorProgressCircle && doorProgressCircle.exists()) k.destroy(doorProgressCircle);
                            doorProgressDoor = null;
                            handleDoorEntry(door.direction);
                        }
                    } else if (doorProgressDoor === door) {
                        // Player left door range - reset progress
                        doorProgressTime = 0;
                        doorProgressDoor = null;
                        doorProgressIsForced = false;
                        if (doorProgressBg && doorProgressBg.exists()) k.destroy(doorProgressBg);
                        if (doorProgressCircle && doorProgressCircle.exists()) k.destroy(doorProgressCircle);
                    }
                }
            });

            if (!doorProgressDoor && doorProgressBg && doorProgressBg.exists()) {
                k.destroy(doorProgressBg);
                k.destroy(doorProgressCircle);
            }
        }));

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
            const rewardRng = getSeededRoomRNG();

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
                if (!p) return; // Skip null entries
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

            // Process level ups sequentially
            let currentIndex = 0;

            function showNextLevelUp() {
                if (currentIndex >= levelUpQueue.length) {
                    return;
                }

                const { player: levelUpPlayer, level } = levelUpQueue[currentIndex];
                currentIndex++;

                // Determine player name for display
                const playerName = levelUpPlayer.playerName || (levelUpPlayer.isRemote ? `Player ${levelUpPlayer.slotIndex + 1}` : 'You');

                // Show tutorial hint for level up
                showLevelUpHint(k);

                // Show upgrade draft for this player (pass level for proper RNG seeding)
                // Pass per-run rerolls remaining from gameState
                showUpgradeDraft(k, levelUpPlayer, (selected, remainingRerolls) => {
                    // Update gameState with remaining rerolls for per-run persistence
                    if (remainingRerolls !== undefined) {
                        gameState.rerollsRemaining = remainingRerolls;
                    }
                    // Callback when upgrade is selected - show next level up
                    showNextLevelUp();
                }, playerName, level, gameState.rerollsRemaining);
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

            // Broadcast room completion to clients in multiplayer
            if (isMultiplayerActive() && isHost()) {
                broadcastRoomCompletion();
            }

            // Revive all dead players in multiplayer
            if (partySize > 1) {
                reviveAllPlayers();
            }

            // Note: Level ups are now manually triggered via button, not auto-shown
            // if (partySize > 1) {
            //     processPendingLevelUps();
            // }

            // ==========================================
            // LEGACY STATE
            // ==========================================
            // Track room cleared
            runStats.roomsCleared++;

            // Check achievements with current run stats (for in-game toasts)
            const playerLevel = player.exists() ? player.level : 1;
            checkAchievements(k, {
                floor: gameState.currentFloor,
                enemiesKilled: runStats.enemiesKilled,
                bossesKilled: runStats.bossesKilled,
                level: playerLevel,
                currencyEarned: 0 // Currency is calculated at game over
            });

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

            // Special handling for boss rooms: unblock the north door for floor advancement
            // Boss rooms have all doors blocked initially since there are no unvisited rooms
            if (isBossRoom) {
                const northDoor = spawnDoors.find(d => d.direction === 'north');
                if (northDoor && northDoor.exists()) {
                    northDoor.blocked = false;
                    northDoor.open = true;
                    northDoor.isSpawnDoor = false;
                    northDoor.isFloorExit = true; // Mark as floor exit for visual distinction
                    northDoor.updateVisual();
                }
            }

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
                if (!p || !p.exists()) return null;

                return {
                    slotIndex: p.slotIndex !== undefined ? p.slotIndex : index, // Use player's actual slot
                    playerName: p.playerName,
                    isRemote: p.isRemote || false,
                    isDead: p.isDead || false,
                    level: p.level,
                    xp: p.xp,
                    xpToNext: p.xpToNext,
                    maxHealth: p.maxHealth,
                    currentHP: p.hp(),
                    speed: p.slowed ? p.originalSpeed : p.speed, // Save unslowed speed
                    originalSpeed: p.originalSpeed || p.speed,
                    slowed: false, // Always reset slow state on room transition
                    fireRate: p.fireRate,
                    projectileSpeed: p.projectileSpeed,
                    projectileDamage: p.projectileDamage,
                    pickupRadius: p.pickupRadius,
                    xpMultiplier: p.xpMultiplier || 1,
                    // Character key (needed for daily runs and character-specific logic)
                    characterKey: p.characterKey,
                    // Character abilities
                    dodgeChance: p.dodgeChance || 0,
                    damageReduction: p.damageReduction || 0,
                    fireDotMultiplier: p.fireDotMultiplier || 1,
                    invulnerableDuration: p.invulnerableDuration || 1.0,
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
                    baseProjectileSpeed: p.baseProjectileSpeed,
                    // Pending level ups (preserve across room transitions)
                    pendingLevelUps: p.pendingLevelUps || [],
                    // Powerup weapon state
                    powerupWeapon: p.powerupWeapon || null,
                    powerupAmmo: p.powerupAmmo !== undefined ? p.powerupAmmo : null,
                    powerupDuration: p.powerupDuration !== undefined ? p.powerupDuration : null,
                    originalWeapon: p.originalWeapon || null,
                    weaponKey: p.weaponKey,
                    weaponCategory: p.weaponCategory,
                    // Weapon-specific properties (for orbital, explosive, chain weapons)
                    orbitRadius: p.orbitRadius,
                    rotationSpeed: p.rotationSpeed,
                    explosionRadius: p.explosionRadius,
                    explosionDamage: p.explosionDamage,
                    chainRange: p.chainRange,
                    maxJumps: p.maxJumps,
                    chainDamageReduction: p.chainDamageReduction,
                    // Synergy-specific properties
                    thornsPercent: p.thornsPercent || 0,
                    thornsIgnoreArmor: p.thornsIgnoreArmor || false,
                    // Per-player run stats for game over screen
                    runStats: p.runStats || {
                        kills: 0,
                        deaths: 0,
                        revives: 0,
                        damageTaken: 0,
                        damageDealt: 0,
                        creditsPickedUp: 0,
                        xpPickedUp: 0,
                        bossesKilled: 0
                    }
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
            // Map door direction to grid direction (needed for broadcast)
            const doorToGridDirection = {
                'north': 'up',
                'south': 'down',
                'east': 'right'
            };
            const gridDirection = doorToGridDirection[direction];

            if (gameState.floorMap) {
                // Check if we need to advance to next floor (boss defeated)
                // This must be checked BEFORE trying to move, since boss room north door
                // is used for floor advancement and doesn't have a floor map connection
                const isFloorAdvancement = currentRoomNode && currentRoomNode.isBossRoom && currentRoomNode.cleared;

                if (isFloorAdvancement) {
                    // Floor advancement - going through north door after defeating boss
                    currentFloor++;

                    // Check for character unlocks based on floor completion
                    const unlocked = checkFloorUnlocks(currentFloor - 1);
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

                    // Reset floor map and room counter for new floor
                    gameState.floorMap = null;
                    gameState.entryDirection = null; // Start from center on new floor
                    currentRoom = 1; // Reset room counter for new floor

                    // Update new state system for floor transition
                    state.nextFloor();
                } else {
                    // Normal room movement within the floor
                    if (gridDirection) {
                        // Try to move in the floor map
                        const moved = gameState.floorMap.moveToRoom(gridDirection);
                        if (!moved) {
                            console.error('[Game] Failed to move in floor map - should not happen!');
                            // Fallback to old room increment
                            currentRoom++;
                        } else {
                            // Successfully moved
                            currentRoom = gameState.floorMap.getVisitedCount();
                        }
                    } else {
                        console.warn('[Game] Invalid door direction:', direction);
                        currentRoom++;
                    }

                    // Update new state system for room transition
                    state.nextRoom();
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
                    const unlocked = checkFloorUnlocks(currentFloor - 1);
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
                    currentRoom = 1;
                    // Reset entry direction when starting new floor (player enters from center on floor start)
                    gameState.entryDirection = null;

                    // Update new state system for floor transition
                    state.nextFloor();
                } else {
                    // Just advancing to next room
                    state.nextRoom();
                }
            }

            // ==========================================
            // LEGACY STATE (keeping for now)
            // ==========================================
            // Update persistent state
            gameState.currentFloor = currentFloor;
            gameState.currentRoom = currentRoom;

            // In multiplayer, broadcast room transition to sync spawn positions and player stats
            if (isMultiplayerActive() && isHost()) {
                // Preselect next room template so we can send it to clients
                const roomRng = getRoomRNG();
                const nextTemplate = getWeightedRoomTemplate(currentFloor, roomRng);
                gameState.roomTemplateKey = nextTemplate.key;
                console.log('[Multiplayer] Host selected next room template:', nextTemplate.key);

                broadcastRoomTransition(gameState.entryDirection, gameState.allPlayerStats, gridDirection, currentFloor, gameState.roomTemplateKey);
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

            // Cleanup glow effect
            if (player.glowEffect && player.glowEffect.exists()) {
                k.destroy(player.glowEffect);
                player.glowEffect = null;
            }

            // In multiplayer, don't end the game immediately - only host checks if all players are dead
            if (partySize > 1) {
                // Broadcast player death FIRST to prevent race conditions
                if (isMultiplayerActive() && player.slotIndex !== undefined) {
                    broadcastPlayerDeath(player.slotIndex);
                }

                // Then set death state locally
                player.isDead = true;
                player.canMove = false;
                player.canShoot = false;

                // Visual indication of death (semi-transparent)
                player.opacity = 0.5;
                if (player.outline && player.outline.exists()) {
                    player.outline.opacity = 0.5;
                }

                // Only host checks if all players are dead
                if (!isHost()) {
                    return; // Clients don't trigger game over, wait for host event
                }

                // Check if any other players are still alive (host only)
                const anyPlayerAlive = players.some(p =>
                    p && p.exists() && p.hp() > 0 && !p.isDead
                );

                if (anyPlayerAlive) {
                    return; // Don't go to game over - other players are still alive
                }
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

            // Record run to history
            const runDuration = runStats.startTime ? Math.floor((Date.now() - runStats.startTime) / 1000) : 0;
            recordRun({
                character: player.characterData?.key || 'survivor',
                weapon: player.weaponKey || 'pistol',
                floorsReached: runStats.floorsReached,
                roomsCleared: runStats.roomsCleared,
                enemiesKilled: runStats.enemiesKilled,
                bossesKilled: runStats.bossesKilled,
                level: player.level || 1,
                currencyEarned: currencyEarned,
                duration: runDuration,
                deathCause: 'Enemy',
                upgrades: player.selectedUpgrades ? Array.from(player.selectedUpgrades) : [],
                synergies: player.activeSynergies ? Array.from(player.activeSynergies) : []
            });

            // Check for achievements
            checkAchievements(k);

            // Gather party stats for game over screen
            const partyStats = players.filter(p => p && p.exists()).map(p => ({
                name: p.playerName || 'Player',
                level: p.level || 1,
                characterData: p.characterData,
                kills: p.runStats?.kills || 0,
                deaths: p.runStats?.deaths || 0,
                revives: p.runStats?.revives || 0,
                damageTaken: p.runStats?.damageTaken || 0,
                damageDealt: p.runStats?.damageDealt || 0,
                xpCollected: p.runStats?.xpPickedUp || 0,
                creditsPickedUp: p.runStats?.creditsPickedUp || 0,
                bossesKilled: p.runStats?.bossesKilled || 0
            }));

            // Broadcast game over to clients (if host in multiplayer)
            if (isMultiplayerActive() && isHost()) {
                broadcastGameOver(runStats, currencyEarned, partyStats);
            }

            // Cleanup multiplayer
            if (isMultiplayerActive()) {
                cleanupMultiplayer();
            }

            // Pass run stats to game over scene
            k.go('gameOver', {
                runStats: { ...runStats },
                currencyEarned: currencyEarned,
                partyStats: partyStats,
                isDailyRun: gameState.isDailyRun,
                dailyCharacter: gameState.dailyCharacter
            });
        });
        
        // Pause overlay - styled modal backdrop
        const pauseOverlay = k.add([
            k.rect(300, 260),
            k.pos(k.width() / 2, k.height() / 2),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_DARK),
            k.opacity(0.95),
            k.outline(3, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(2000),
            'pauseOverlay'
        ]);

        // Paused title with H1 styling
        const pauseText = k.add([
            k.text('PAUSED', { size: UI_TEXT_SIZES.H1 * 2 }),
            k.pos(k.width() / 2, k.height() / 2 - 95),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(2001),
            'pauseText'
        ]);

        // Pause menu buttons using standardized sizes
        const pauseCenterY = k.height() / 2;
        const pauseButtonSpacing = 55;
        const { LG, SM } = UI_SIZES.BUTTON;

        // Resume button (LG size - primary CTA)
        const resumeButton = k.add([
            k.rect(LG.width, LG.height),
            k.pos(k.width() / 2, pauseCenterY - 20),
            k.anchor('center'),
            k.color(...UI_COLORS.SUCCESS),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(2001),
            'pauseButton'
        ]);

        const resumeText = k.add([
            k.text('RESUME', { size: UI_TEXT_SIZES.H2 }),
            k.pos(k.width() / 2, pauseCenterY - 20),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(2002),
            'pauseButton'
        ]);

        // Quit to Menu button (SM size - danger action)
        const quitButton = k.add([
            k.rect(SM.width, SM.height),
            k.pos(k.width() / 2, pauseCenterY + 45),
            k.anchor('center'),
            k.color(...UI_COLORS.DANGER),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(2001),
            'pauseButton'
        ]);

        const quitText = k.add([
            k.text('QUIT', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, pauseCenterY + 45),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
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

            // Handle multiplayer quit logic
            if (isMultiplayerActive()) {
                if (isHost()) {
                    // Host: broadcast quit to all clients, then quit
                    broadcastHostQuit();
                    cleanupMultiplayer();
                    gameState.currentFloor = 1;
                    gameState.currentRoom = 1;
                    gameState.playerStats = null;
                    k.go('menu');
                } else {
                    // Client: show confirmation dialog
                    const confirmOverlay = k.add([
                        k.rect(k.width(), k.height()),
                        k.pos(0, 0),
                        k.color(0, 0, 0),
                        k.opacity(0.8),
                        k.fixed(),
                        k.z(3000),
                        'confirmDialog'
                    ]);

                    const confirmText = k.add([
                        k.text('Leave party and return to menu?', { size: 20 }),
                        k.pos(k.width() / 2, k.height() / 2 - 50),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(3001),
                        'confirmDialog'
                    ]);

                    const yesButton = k.add([
                        k.rect(100, 40),
                        k.pos(k.width() / 2 - 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(50, 150, 50),
                        k.outline(2, k.rgb(100, 200, 100)),
                        k.area(),
                        k.fixed(),
                        k.z(3001),
                        'confirmDialog'
                    ]);

                    k.add([
                        k.text('Yes', { size: 16 }),
                        k.pos(k.width() / 2 - 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(3002),
                        'confirmDialog'
                    ]);

                    const noButton = k.add([
                        k.rect(100, 40),
                        k.pos(k.width() / 2 + 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(150, 50, 50),
                        k.outline(2, k.rgb(200, 100, 100)),
                        k.area(),
                        k.fixed(),
                        k.z(3001),
                        'confirmDialog'
                    ]);

                    k.add([
                        k.text('No', { size: 16 }),
                        k.pos(k.width() / 2 + 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(3002),
                        'confirmDialog'
                    ]);

                    // Keyboard handler cleanup list
                    const dialogKeyHandlers = [];

                    const confirmYes = () => {
                        dialogKeyHandlers.forEach(h => h.cancel());
                        k.get('confirmDialog').forEach(e => k.destroy(e));
                        cleanupMultiplayer();
                        gameState.currentFloor = 1;
                        gameState.currentRoom = 1;
                        gameState.playerStats = null;
                        k.go('menu');
                    };

                    const confirmNo = () => {
                        dialogKeyHandlers.forEach(h => h.cancel());
                        k.get('confirmDialog').forEach(e => k.destroy(e));
                    };

                    yesButton.onClick(confirmYes);
                    noButton.onClick(confirmNo);

                    // Keyboard support: Y/Enter to confirm, N/Escape to cancel
                    dialogKeyHandlers.push(k.onKeyPress('y', confirmYes));
                    dialogKeyHandlers.push(k.onKeyPress('enter', confirmYes));
                    dialogKeyHandlers.push(k.onKeyPress('n', confirmNo));
                    dialogKeyHandlers.push(k.onKeyPress('escape', confirmNo));
                }
            } else {
                // Single player: check if confirmation is required
                const confirmBeforeQuit = getSetting('gameplay', 'confirmBeforeQuit') !== false;

                if (confirmBeforeQuit) {
                    // Show confirmation dialog
                    const confirmOverlay = k.add([
                        k.rect(k.width(), k.height()),
                        k.pos(0, 0),
                        k.color(0, 0, 0),
                        k.opacity(0.8),
                        k.fixed(),
                        k.z(3000),
                        'confirmDialog'
                    ]);

                    const confirmText = k.add([
                        k.text('Abandon run and return to menu?', { size: 20 }),
                        k.pos(k.width() / 2, k.height() / 2 - 50),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(3001),
                        'confirmDialog'
                    ]);

                    const yesButton = k.add([
                        k.rect(100, 40),
                        k.pos(k.width() / 2 - 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(150, 50, 50),
                        k.outline(2, k.rgb(200, 100, 100)),
                        k.area(),
                        k.fixed(),
                        k.z(3001),
                        'confirmDialog'
                    ]);

                    k.add([
                        k.text('Yes', { size: 16 }),
                        k.pos(k.width() / 2 - 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(3002),
                        'confirmDialog'
                    ]);

                    const noButton = k.add([
                        k.rect(100, 40),
                        k.pos(k.width() / 2 + 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(50, 100, 50),
                        k.outline(2, k.rgb(100, 150, 100)),
                        k.area(),
                        k.fixed(),
                        k.z(3001),
                        'confirmDialog'
                    ]);

                    k.add([
                        k.text('No', { size: 16 }),
                        k.pos(k.width() / 2 + 60, k.height() / 2 + 10),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(3002),
                        'confirmDialog'
                    ]);

                    // Keyboard handler cleanup list
                    const dialogKeyHandlers = [];

                    const confirmYes = () => {
                        dialogKeyHandlers.forEach(h => h.cancel());
                        k.get('confirmDialog').forEach(e => k.destroy(e));
                        gameState.currentFloor = 1;
                        gameState.currentRoom = 1;
                        gameState.playerStats = null;
                        k.go('menu');
                    };

                    const confirmNo = () => {
                        dialogKeyHandlers.forEach(h => h.cancel());
                        k.get('confirmDialog').forEach(e => k.destroy(e));
                    };

                    yesButton.onClick(confirmYes);
                    noButton.onClick(confirmNo);

                    // Keyboard support: Y/Enter to confirm, N/Escape to cancel
                    dialogKeyHandlers.push(k.onKeyPress('y', confirmYes));
                    dialogKeyHandlers.push(k.onKeyPress('enter', confirmYes));
                    dialogKeyHandlers.push(k.onKeyPress('n', confirmNo));
                    dialogKeyHandlers.push(k.onKeyPress('escape', confirmNo));
                } else {
                    // No confirmation required, just quit
                    gameState.currentFloor = 1;
                    gameState.currentRoom = 1;
                    gameState.playerStats = null;
                    k.go('menu');
                }
            }
        });
        
        // Toggle minimap with 'M' key
        eventHandlers.keyPresses.push(k.onKeyPress('m', () => {
            if (gameState.minimap && !k.paused) {
                gameState.minimap.toggle();
            }
        }));

        // Pause
        eventHandlers.keyPresses.push(k.onKeyPress('escape', () => {
            // Don't allow pause menu if upgrade draft is showing
            if (isUpgradeDraftActive()) {
                return; // Prevent escape key from interfering with upgrade selection
            }

            // In multiplayer, only host changes pause state locally
            // Clients send request and wait for host response
            if (isMultiplayerActive()) {
                if (isHost()) {
                    // Host: change pause state and broadcast to all clients
                    k.paused = !k.paused;
                    broadcastPauseState(k.paused);
                    updatePauseUI(k.paused);
                } else {
                    // Client: send pause request to host (don't change local state yet)
                    // The pause_state message from host will update our state
                    sendPauseRequest(!k.paused);
                }
            } else {
                // Single-player: change pause state directly
                k.paused = !k.paused;
                updatePauseUI(k.paused);
            }
        }));

        // Auto-pause on window blur (solo mode only)
        const handleGameBlur = () => {
            // Only auto-pause in solo mode
            if (isMultiplayerActive()) return;
            // Don't pause if already paused or upgrade draft is showing
            if (k.paused || isUpgradeDraftActive()) return;

            k.paused = true;
            updatePauseUI(true);
        };
        window.addEventListener('blur', handleGameBlur);

        // Clean up blur listener on scene leave
        k.onSceneLeave(() => {
            window.removeEventListener('blur', handleGameBlur);
        });

        // Cleanup event handlers on scene leave (memory leak fix)
        k.onSceneLeave(() => {
            // Cancel all update handlers with error protection
            eventHandlers.updates.forEach(handler => {
                try {
                    if (handler && handler.cancel) handler.cancel();
                } catch (err) {
                    console.warn('[Game] Error canceling update handler:', err);
                }
            });

            // Cancel all keypress handlers with error protection
            eventHandlers.keyPresses.forEach(handler => {
                try {
                    if (handler && handler.cancel) handler.cancel();
                } catch (err) {
                    console.warn('[Game] Error canceling keypress handler:', err);
                }
            });

            // Unregister network message handlers (if client)
            if (!isHost() && isMultiplayerActive()) {
                try {
                    offMessage('room_transition');
                    offMessage('room_completed');
                    offMessage('game_over');
                } catch (err) {
                    console.warn('[Game] Error unregistering message handlers:', err);
                }
                // Reset the flag to allow re-registration
                gameSceneMessageHandlersRegistered = false;
            }

            // Destroy minimap on scene leave to prevent lingering elements
            if (gameState.minimap) {
                gameState.minimap.destroy();
                gameState.minimap = null;
            }

            // Clear object pools on scene leave
            clearAllPools();
        });
    });
}

