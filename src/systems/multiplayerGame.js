/**
 * Multiplayer Game System
 * Handles game state synchronization for multiplayer
 */

import { getParty, getPartySize, getLocalPlayer } from './partySystem.js';
import { broadcast, sendToHost, sendToPeer, onMessage, getNetworkInfo } from './networkSystem.js';

// Multiplayer game state
const mpGame = {
    isActive: false,
    players: new Map(), // Map of slotIndex -> player entity
    localPlayerSlot: 0, // Which slot is the local player
    lastSyncTime: 0,
    syncInterval: 1 / 20, // 20 updates per second
    inputBuffer: [], // Store inputs to send to host
    isHost: false,
    // Entity tracking (host only)
    enemies: new Map(), // Map of entityId -> enemy entity
    projectiles: new Map(), // Map of entityId -> projectile entity
    pickups: new Map(), // Map of entityId -> pickup entity
    nextEntityId: 1, // Auto-incrementing ID for entities
    // Kaplay instance reference
    k: null
};

/**
 * Initialize multiplayer game session
 * @param {boolean} isHost - Whether this client is the host
 * @param {number} localSlot - Local player's slot index
 * @param {Object} kaplayInstance - Kaplay instance for creating entities
 */
export function initMultiplayerGame(isHost, localSlot = 0, kaplayInstance = null) {
    mpGame.isActive = true;
    mpGame.isHost = isHost;
    mpGame.localPlayerSlot = localSlot;
    mpGame.players.clear();
    mpGame.inputBuffer = [];
    mpGame.lastSyncTime = 0;
    mpGame.k = kaplayInstance;

    // Clear entity tracking
    mpGame.enemies.clear();
    mpGame.projectiles.clear();
    mpGame.pickups.clear();
    mpGame.nextEntityId = 1;

    console.log(`Multiplayer initialized - isHost: ${isHost}, localSlot: ${localSlot}`);

    // Set up message handlers
    if (isHost) {
        setupHostHandlers();
    } else {
        setupClientHandlers();
    }
}

/**
 * Set up message handlers for host
 */
function setupHostHandlers() {
    // Handle player input from clients
    onMessage('player_input', (payload, fromPeerId) => {
        // Store input to be processed in game loop
        // Find which player slot this peer belongs to
        const party = getParty();
        const slotIndex = party.slots.findIndex(slot => slot.peerId === fromPeerId);

        if (slotIndex !== -1 && mpGame.players.has(slotIndex)) {
            const player = mpGame.players.get(slotIndex);

            // Apply input to player
            if (payload.move) {
                player.move = payload.move;
            }
            if (payload.shoot) {
                player.isShooting = payload.shoot;
            }
            if (payload.aimAngle !== undefined) {
                player.aimAngle = payload.aimAngle;
            }
        }
    });
}

/**
 * Set up message handlers for client
 */
function setupClientHandlers() {
    // Receive game state updates from host
    onMessage('game_state', (payload) => {
        if (!mpGame.k) return; // Need kaplay instance

        // Update all remote player positions
        if (payload.players) {
            payload.players.forEach(playerState => {
                if (playerState.slotIndex !== mpGame.localPlayerSlot) {
                    const player = mpGame.players.get(playerState.slotIndex);
                    if (player && player.exists()) {
                        // Smoothly interpolate position
                        player.pos.x = playerState.x;
                        player.pos.y = playerState.y;
                        player.angle = playerState.angle || 0;

                        // Update health
                        if (playerState.hp !== undefined && player.setHP) {
                            player.setHP(playerState.hp);
                        }
                    }
                }
            });
        }

        // Update enemies
        if (payload.enemies) {
            const receivedIds = new Set();

            payload.enemies.forEach(enemyState => {
                receivedIds.add(enemyState.id);

                const existingEnemy = mpGame.enemies.get(enemyState.id);
                if (existingEnemy && existingEnemy.exists()) {
                    // Update existing enemy
                    existingEnemy.pos.x = enemyState.x;
                    existingEnemy.pos.y = enemyState.y;
                    if (existingEnemy.setHP && enemyState.hp !== undefined) {
                        existingEnemy.setHP(enemyState.hp);
                    }
                } else {
                    // TODO: Mid-game join limitation
                    // Enemy doesn't exist on client yet. To fully recreate it, we'd need:
                    // - Enemy type, difficulty level, modifiers
                    // - Full creation parameters from createEnemy()
                    //
                    // Current behavior: Entities appear when they move into view or are destroyed
                    // Future improvement: Send full entity creation data via 'spawn_entity' messages
                    //
                    // For now, clients joining mid-game will see entity positions update
                    // but won't have visual representations until next spawn/despawn cycle
                }
            });

            // Remove enemies that no longer exist on host
            mpGame.enemies.forEach((enemy, id) => {
                if (!receivedIds.has(id) && enemy.exists()) {
                    enemy.destroy();
                    mpGame.enemies.delete(id);
                }
            });
        }

        // Update projectiles (visual only for clients)
        if (payload.projectiles) {
            const receivedIds = new Set();

            payload.projectiles.forEach(projState => {
                receivedIds.add(projState.id);

                const existing = mpGame.projectiles.get(projState.id);
                if (existing && existing.exists()) {
                    // Update position
                    existing.pos.x = projState.x;
                    existing.pos.y = projState.y;
                    existing.angle = projState.angle || 0;
                }
                // Note: Creating new projectiles dynamically is complex
                // For MVP, clients see host-spawned projectiles
            });

            // Clean up projectiles that don't exist anymore
            mpGame.projectiles.forEach((proj, id) => {
                if (!receivedIds.has(id) && proj.exists()) {
                    proj.destroy();
                    mpGame.projectiles.delete(id);
                }
            });
        }

        // Update pickups
        if (payload.pickups) {
            const receivedIds = new Set();

            payload.pickups.forEach(pickupState => {
                receivedIds.add(pickupState.id);

                const existing = mpGame.pickups.get(pickupState.id);
                if (existing && existing.exists()) {
                    // Update position
                    existing.pos.x = pickupState.x;
                    existing.pos.y = pickupState.y;
                }
            });

            // Remove collected pickups
            mpGame.pickups.forEach((pickup, id) => {
                if (!receivedIds.has(id) && pickup.exists()) {
                    pickup.destroy();
                    mpGame.pickups.delete(id);
                }
            });
        }
    });

    // Handle entity spawn events
    onMessage('spawn_entity', (payload) => {
        // Host tells clients to spawn a new entity
        // This allows proper entity creation with full parameters
        if (payload.type === 'enemy') {
            // Would need to call createEnemy with proper params
            // Store in mpGame.enemies with payload.id
        }
    });
}

/**
 * Register a player entity for multiplayer
 * @param {number} slotIndex - Party slot index (0-3)
 * @param {Object} playerEntity - Kaplay player entity
 */
export function registerPlayer(slotIndex, playerEntity) {
    mpGame.players.set(slotIndex, playerEntity);
    playerEntity.mpSlotIndex = slotIndex; // Store slot index on entity
    console.log(`Registered player for slot ${slotIndex}`);
}

/**
 * Update multiplayer state - call this every frame
 * @param {number} dt - Delta time
 */
export function updateMultiplayer(dt) {
    if (!mpGame.isActive) return;

    mpGame.lastSyncTime += dt;

    if (mpGame.isHost) {
        // Host: broadcast game state periodically
        if (mpGame.lastSyncTime >= mpGame.syncInterval) {
            broadcastGameState();
            mpGame.lastSyncTime = 0;
        }
    } else {
        // Client: send input state periodically
        if (mpGame.lastSyncTime >= mpGame.syncInterval) {
            sendInputState();
            mpGame.lastSyncTime = 0;
        }
    }
}

/**
 * Collect current game state (helper function)
 * @returns {Object} Game state object
 */
function collectGameState() {
    const playerStates = [];
    const enemyStates = [];
    const projectileStates = [];
    const pickupStates = [];

    // Collect player states
    mpGame.players.forEach((player, slotIndex) => {
        if (player.exists()) {
            playerStates.push({
                slotIndex,
                x: player.pos.x,
                y: player.pos.y,
                angle: player.angle || 0,
                hp: player.hp || player.maxHealth,
                level: player.level || 1,
                xp: player.xp || 0
            });
        }
    });

    // Collect enemy states
    mpGame.enemies.forEach((enemy, entityId) => {
        if (enemy.exists()) {
            enemyStates.push({
                id: entityId,
                x: enemy.pos.x,
                y: enemy.pos.y,
                hp: enemy.hp || 0,
                type: enemy.enemyType || 'basic'
            });
        } else {
            // Enemy destroyed - remove from tracking
            mpGame.enemies.delete(entityId);
        }
    });

    // Collect projectile states
    mpGame.projectiles.forEach((projectile, entityId) => {
        if (projectile.exists()) {
            projectileStates.push({
                id: entityId,
                x: projectile.pos.x,
                y: projectile.pos.y,
                angle: projectile.angle || 0
            });
        } else {
            // Projectile destroyed - remove from tracking
            mpGame.projectiles.delete(entityId);
        }
    });

    // Collect pickup states
    mpGame.pickups.forEach((pickup, entityId) => {
        if (pickup.exists()) {
            pickupStates.push({
                id: entityId,
                x: pickup.pos.x,
                y: pickup.pos.y,
                type: pickup.pickupType || 'xp'
            });
        } else {
            // Pickup collected - remove from tracking
            mpGame.pickups.delete(entityId);
        }
    });

    return {
        players: playerStates,
        enemies: enemyStates,
        projectiles: projectileStates,
        pickups: pickupStates
    };
}

/**
 * Broadcast current game state to all clients (host only)
 */
function broadcastGameState() {
    if (!mpGame.isHost) return;
    broadcast('game_state', collectGameState());
}

/**
 * Send initial game state to a specific peer (host only)
 * Called when a new client joins mid-game
 * @param {string} peerId - Peer ID to send state to
 */
export function sendInitialGameState(peerId) {
    if (!mpGame.isHost || !mpGame.isActive) return;

    console.log('Sending initial game state to new joiner:', peerId);
    sendToPeer(peerId, 'game_state', collectGameState());
}

/**
 * Send local player input to host (client only)
 */
function sendInputState() {
    if (mpGame.isHost) return;

    const localPlayer = mpGame.players.get(mpGame.localPlayerSlot);
    if (!localPlayer || !localPlayer.exists()) return;

    sendToHost('player_input', {
        slotIndex: mpGame.localPlayerSlot,
        move: localPlayer.move || { x: 0, y: 0 },
        shoot: localPlayer.isShooting || false,
        aimAngle: localPlayer.aimAngle || 0
    });
}

/**
 * Get local player entity
 * @returns {Object|null} Local player entity
 */
export function getLocalPlayerEntity() {
    return mpGame.players.get(mpGame.localPlayerSlot);
}

/**
 * Check if multiplayer is active
 * @returns {boolean}
 */
export function isMultiplayerActive() {
    return mpGame.isActive;
}

/**
 * Get multiplayer player count
 * @returns {number}
 */
export function getPlayerCount() {
    return mpGame.players.size;
}

/**
 * Cleanup multiplayer session
 */
export function cleanupMultiplayer() {
    mpGame.isActive = false;
    mpGame.players.clear();
    mpGame.inputBuffer = [];

    // Clear entity tracking to prevent memory leaks
    mpGame.enemies.clear();
    mpGame.projectiles.clear();
    mpGame.pickups.clear();

    // Reset entity ID counter
    mpGame.nextEntityId = 1;

    console.log('Multiplayer session cleaned up');
}

/**
 * Check if this is the local player
 * @param {Object} player - Player entity to check
 * @returns {boolean}
 */
export function isLocalPlayer(player) {
    return player.mpSlotIndex === mpGame.localPlayerSlot;
}

/**
 * Register an enemy for multiplayer sync (host only)
 * @param {Object} enemy - Enemy entity
 * @returns {number} Entity ID assigned to this enemy
 */
export function registerEnemy(enemy) {
    if (!mpGame.isHost) return null;

    const entityId = mpGame.nextEntityId++;
    enemy.mpEntityId = entityId;
    mpGame.enemies.set(entityId, enemy);

    return entityId;
}

/**
 * Register a projectile for multiplayer sync (host only)
 * @param {Object} projectile - Projectile entity
 * @returns {number} Entity ID assigned to this projectile
 */
export function registerProjectile(projectile) {
    if (!mpGame.isHost) return null;

    const entityId = mpGame.nextEntityId++;
    projectile.mpEntityId = entityId;
    mpGame.projectiles.set(entityId, projectile);

    return entityId;
}

/**
 * Register a pickup for multiplayer sync (host only)
 * @param {Object} pickup - Pickup entity
 * @returns {number} Entity ID assigned to this pickup
 */
export function registerPickup(pickup) {
    if (!mpGame.isHost) return null;

    const entityId = mpGame.nextEntityId++;
    pickup.mpEntityId = entityId;
    mpGame.pickups.set(entityId, pickup);

    return entityId;
}

/**
 * Check if we're the host
 * @returns {boolean}
 */
export function isHost() {
    return mpGame.isHost;
}
