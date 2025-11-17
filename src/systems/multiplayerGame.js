/**
 * Multiplayer Game System
 * Handles game state synchronization for multiplayer
 */

import { getParty, getPartySize, getLocalPlayer } from './partySystem.js';
import { broadcast, sendToHost, sendToPeer, onMessage, getNetworkInfo } from './networkSystem.js';
import { createEnemy } from '../entities/enemy.js';
import { createXPPickup, createCurrencyPickup, getRandomCurrencyIcon } from '../entities/pickup.js';

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

                        // Update weapon/upgrade state
                        if (playerState.weapons) {
                            player.weapons = playerState.weapons;
                        }
                        if (playerState.passiveUpgrades) {
                            player.passiveUpgrades = playerState.passiveUpgrades;
                        }
                        if (playerState.upgradeStacks) {
                            player.upgradeStacks = playerState.upgradeStacks;
                        }

                        // Update stats
                        if (playerState.speed !== undefined) player.speed = playerState.speed;
                        if (playerState.damage !== undefined) player.damage = playerState.damage;
                        if (playerState.pickupRadius !== undefined) player.pickupRadius = playerState.pickupRadius;
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
        if (!mpGame.k) return; // Need kaplay instance

        // Host tells clients to spawn a new entity with full creation parameters
        if (payload.entityType === 'enemy') {
            const enemy = createEnemy(
                mpGame.k,
                payload.x,
                payload.y,
                payload.type,
                payload.floor
            );
            enemy.mpEntityId = payload.id;
            mpGame.enemies.set(payload.id, enemy);
            console.log(`Spawned enemy ${payload.id} (${payload.type}) at (${payload.x}, ${payload.y})`);
        } else if (payload.entityType === 'xpPickup') {
            const pickup = createXPPickup(
                mpGame.k,
                payload.x,
                payload.y,
                payload.value
            );
            pickup.mpEntityId = payload.id;
            pickup.pickupType = 'xp';
            mpGame.pickups.set(payload.id, pickup);
            console.log(`Spawned XP pickup ${payload.id} with value ${payload.value}`);
        } else if (payload.entityType === 'currencyPickup') {
            const pickup = createCurrencyPickup(
                mpGame.k,
                payload.x,
                payload.y,
                payload.value,
                payload.icon
            );
            pickup.mpEntityId = payload.id;
            pickup.pickupType = 'currency';
            mpGame.pickups.set(payload.id, pickup);
            console.log(`Spawned currency pickup ${payload.id} with value ${payload.value}`);
        }
    });

    // Handle projectile spawn events
    onMessage('spawn_projectile', (payload) => {
        if (!mpGame.k) return; // Need kaplay instance

        // Import createProjectile dynamically to avoid circular dependency
        import('../entities/projectile.js').then(({ createProjectile }) => {
            // Reconstruct direction vector
            const direction = mpGame.k.vec2(payload.directionX, payload.directionY);

            // Create the projectile with all parameters
            const projectile = createProjectile(
                mpGame.k,
                payload.x,
                payload.y,
                direction,
                payload.speed,
                payload.damage,
                payload.piercing,
                payload.obstaclePiercing,
                payload.isCrit,
                payload.maxRange
            );

            // Apply visual customization if provided
            if (payload.char || payload.color) {
                projectile.text = payload.char;
                if (payload.color) {
                    projectile.color = mpGame.k.rgb(...payload.color);
                }
            }

            // Assign network ID and track
            projectile.mpEntityId = payload.id;
            mpGame.projectiles.set(payload.id, projectile);

            console.log(`Spawned projectile ${payload.id} at (${payload.x}, ${payload.y})`);
        });
    });

    // Handle damage events
    onMessage('damage_dealt', (payload) => {
        if (!mpGame.k) return; // Need kaplay instance

        // Show damage number at the hit location
        const damageText = mpGame.k.add([
            mpGame.k.text(payload.damage.toString(), {
                size: payload.isCrit ? 24 : 18
            }),
            mpGame.k.pos(payload.x, payload.y),
            mpGame.k.anchor('center'),
            mpGame.k.color(payload.isCrit ? 255 : 255, payload.isCrit ? 200 : 255, payload.isCrit ? 0 : 255),
            mpGame.k.lifespan(0.8),
            mpGame.k.z(1000)
        ]);

        // Animate damage number rising and fading
        damageText.onUpdate(() => {
            damageText.pos.y -= 50 * mpGame.k.dt();
            damageText.opacity -= 1.25 * mpGame.k.dt();
        });

        // Flash the target entity if we have it
        const target = mpGame.enemies.get(payload.targetId) || mpGame.players.get(payload.targetId);
        if (target && target.exists()) {
            const originalColor = target.color;
            target.color = mpGame.k.rgb(255, 255, 255); // White flash
            mpGame.k.wait(0.1, () => {
                if (target.exists()) {
                    target.color = originalColor;
                }
            });
        }

        console.log(`Damage: ${payload.damage}${payload.isCrit ? ' CRIT!' : ''} to ${payload.targetType} ${payload.targetId}`);
    });

    // Handle entity death events
    onMessage('entity_destroyed', (payload) => {
        if (!mpGame.k) return; // Need kaplay instance

        console.log(`Entity destroyed: ${payload.entityType} ${payload.entityId} at (${payload.x}, ${payload.y})`);

        // Remove the entity from tracking and destroy it
        const entity = mpGame.enemies.get(payload.entityId) || mpGame.players.get(payload.entityId);
        if (entity && entity.exists()) {
            // Trigger death animation/effects if available
            if (entity.onDeath && typeof entity.onDeath === 'function') {
                entity.onDeath();
            }

            // Destroy the entity
            mpGame.k.destroy(entity);
        }

        // Clean up from tracking maps
        mpGame.enemies.delete(payload.entityId);
        mpGame.projectiles.delete(payload.entityId);
        mpGame.pickups.delete(payload.entityId);

        // Note: XP/currency drops are handled by spawn_entity events from host
        // The host will spawn pickups and broadcast them separately
    });

    // Handle player revival events
    onMessage('players_revived', (payload) => {
        if (!mpGame.k) return; // Need kaplay instance

        console.log('[Multiplayer] Received player revival event - reviving all dead players');

        // Revive all dead players
        mpGame.players.forEach((player, slotIndex) => {
            if (player && player.exists() && (player.hp() <= 0 || player.isDead)) {
                // Revive player
                player.setHP(player.maxHealth);
                player.isDead = false;

                // Re-enable input for local player
                if (!player.isRemote) {
                    player.canMove = true;
                    player.canShoot = true;
                }

                // Show revival effect
                const reviveEffect = mpGame.k.add([
                    mpGame.k.text('★ REVIVED ★', { size: 16 }),
                    mpGame.k.pos(player.pos.x, player.pos.y - 40),
                    mpGame.k.anchor('center'),
                    mpGame.k.color(100, 255, 100),
                    mpGame.k.lifespan(2),
                    mpGame.k.z(1000)
                ]);

                // Animate rising and fading
                reviveEffect.onUpdate(() => {
                    reviveEffect.pos.y -= 30 * mpGame.k.dt();
                    reviveEffect.opacity -= 0.5 * mpGame.k.dt();
                });

                // Restore visual state
                player.opacity = 1;
                if (player.characterData) {
                    player.color = mpGame.k.rgb(...player.characterData.color);
                }
                if (player.outline && player.outline.exists()) {
                    player.outline.opacity = 1;
                }

                console.log(`[Revival] Client: Player slot ${slotIndex} revived`);
            }
        });
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
                slotIndex: Number(slotIndex),
                x: Number(player.pos.x),
                y: Number(player.pos.y),
                angle: Number(player.angle || 0),
                hp: Number(player.hp || player.maxHealth),
                level: Number(player.level || 1),
                xp: Number(player.xp || 0),
                // Weapon and upgrade state
                weapons: player.weapons || [],
                passiveUpgrades: player.passiveUpgrades || [],
                upgradeStacks: player.upgradeStacks || {},
                // Stats that affect gameplay
                speed: Number(player.speed || 0),
                damage: Number(player.damage || 0),
                pickupRadius: Number(player.pickupRadius || 0)
            });
        }
    });

    // Collect enemy states
    mpGame.enemies.forEach((enemy, entityId) => {
        if (enemy.exists()) {
            enemyStates.push({
                id: Number(entityId),
                x: Number(enemy.pos.x),
                y: Number(enemy.pos.y),
                hp: Number(enemy.hp || 0),
                type: String(enemy.enemyType || 'basic')
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
                id: Number(entityId),
                x: Number(projectile.pos.x),
                y: Number(projectile.pos.y),
                angle: Number(projectile.angle || 0)
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
                id: Number(entityId),
                x: Number(pickup.pos.x),
                y: Number(pickup.pos.y),
                type: String(pickup.pickupType || 'xp')
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
 * @param {Object} creationParams - Parameters used to create this enemy { type, floor }
 * @returns {number} Entity ID assigned to this enemy
 */
export function registerEnemy(enemy, creationParams = {}) {
    if (!mpGame.isHost) return null;

    const entityId = mpGame.nextEntityId++;
    enemy.mpEntityId = entityId;
    mpGame.enemies.set(entityId, enemy);

    // Broadcast spawn message to all clients with full creation parameters
    broadcast('spawn_entity', {
        id: entityId,
        entityType: 'enemy',
        x: enemy.pos.x,
        y: enemy.pos.y,
        type: creationParams.type || 'basic',
        floor: creationParams.floor || 1
    });

    return entityId;
}

/**
 * Register a projectile for multiplayer sync (host only)
 * @param {Object} projectile - Projectile entity
 * @param {Object} creationParams - Parameters used to create this projectile
 * @returns {number} Entity ID assigned to this projectile
 */
export function registerProjectile(projectile, creationParams = {}) {
    if (!mpGame.isHost) return null;

    const entityId = mpGame.nextEntityId++;
    projectile.mpEntityId = entityId;
    mpGame.projectiles.set(entityId, projectile);

    // Broadcast projectile spawn to all clients
    broadcast('spawn_projectile', {
        id: Number(entityId),
        x: Number(projectile.pos.x),
        y: Number(projectile.pos.y),
        directionX: Number(projectile.direction.x),
        directionY: Number(projectile.direction.y),
        speed: Number(projectile.speed),
        damage: Number(projectile.damage),
        piercing: Number(projectile.piercing || 0),
        obstaclePiercing: Number(projectile.obstaclePiercing || 0),
        isCrit: Boolean(projectile.isCrit),
        maxRange: Number(projectile.maxRange),
        angle: Number(projectile.angle || 0),
        // Visual properties (if available from creation params)
        char: creationParams.char || '*',
        color: creationParams.color || [255, 255, 100]
    });

    return entityId;
}

/**
 * Register a pickup for multiplayer sync (host only)
 * @param {Object} pickup - Pickup entity
 * @param {Object} creationParams - Parameters used to create this pickup { type, value, icon }
 * @returns {number} Entity ID assigned to this pickup
 */
export function registerPickup(pickup, creationParams = {}) {
    if (!mpGame.isHost) return null;

    const entityId = mpGame.nextEntityId++;
    pickup.mpEntityId = entityId;
    mpGame.pickups.set(entityId, pickup);

    // Broadcast spawn message to all clients with full creation parameters
    const spawnData = {
        id: entityId,
        entityType: creationParams.type || 'xpPickup',
        x: pickup.pos.x,
        y: pickup.pos.y,
        value: creationParams.value || pickup.value || 1
    };

    // Add icon for currency pickups
    if (creationParams.type === 'currencyPickup' && creationParams.icon) {
        spawnData.icon = creationParams.icon;
    }

    broadcast('spawn_entity', spawnData);

    return entityId;
}

/**
 * Check if we're the host
 * @returns {boolean}
 */
export function isHost() {
    return mpGame.isHost;
}

/**
 * Broadcast a damage event to all clients (host only)
 * @param {Object} params - Damage event parameters
 * @param {string|number} params.targetId - Target entity ID
 * @param {string} params.targetType - Type of target ('enemy', 'player', 'boss', 'miniboss')
 * @param {number} params.damage - Damage amount
 * @param {boolean} params.isCrit - Whether this was a critical hit
 * @param {number} params.attackerId - Attacker player slot index (optional)
 * @param {number} params.x - X position for visual effects
 * @param {number} params.y - Y position for visual effects
 */
export function broadcastDamageEvent(params) {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('damage_dealt', {
        targetId: Number(params.targetId),
        targetType: String(params.targetType),
        damage: Number(params.damage),
        isCrit: Boolean(params.isCrit || false),
        attackerId: params.attackerId !== undefined ? Number(params.attackerId) : null,
        x: Number(params.x),
        y: Number(params.y)
    });
}

/**
 * Broadcast an entity death event to all clients (host only)
 * @param {Object} params - Death event parameters
 * @param {string|number} params.entityId - Entity ID that died
 * @param {string} params.entityType - Type of entity ('enemy', 'player', 'boss', 'miniboss')
 * @param {number} params.x - X position
 * @param {number} params.y - Y position
 * @param {number} params.xpDropped - Amount of XP dropped (optional)
 * @param {number} params.currencyDropped - Amount of currency dropped (optional)
 */
export function broadcastDeathEvent(params) {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('entity_destroyed', {
        entityId: Number(params.entityId),
        entityType: String(params.entityType),
        x: Number(params.x),
        y: Number(params.y),
        xpDropped: params.xpDropped !== undefined ? Number(params.xpDropped) : 0,
        currencyDropped: params.currencyDropped !== undefined ? Number(params.currencyDropped) : 0
    });
}

/**
 * Broadcast a player revival event to all clients (host only)
 * Called when a level up triggers revival of all dead players
 */
export function broadcastRevivalEvent() {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('players_revived', {
        timestamp: Date.now()
    });

    console.log('[Multiplayer] Broadcasted player revival event');
}
