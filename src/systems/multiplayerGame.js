/**
 * Multiplayer Game System
 * Handles game state synchronization for multiplayer
 */

import { getParty, getPartySize, getLocalPlayer } from './partySystem.js';
import { broadcast, sendToHost, sendToPeer, onMessage, getNetworkInfo } from './networkSystem.js';
import { createEnemy } from '../entities/enemy.js';
import { createXPPickup, createCurrencyPickup, getRandomCurrencyIcon } from '../entities/pickup.js';
import { SeededRandom, createSeed } from '../utils/seededRandom.js';

// Multiplayer game state
const mpGame = {
    isActive: false,
    players: new Map(), // Map of slotIndex -> player entity
    localPlayerSlot: 0, // Which slot is the local player
    lastSyncTime: 0,
    syncInterval: 1 / 15, // 15 updates per second (reduced from 20 for better performance)
    lastResyncTime: 0,
    resyncInterval: 5.0, // Re-sync check every 5 seconds (desync detection)
    inputBuffer: [], // Store inputs to send to host
    isHost: false,
    // Entity tracking (host only)
    enemies: new Map(), // Map of entityId -> enemy entity
    projectiles: new Map(), // Map of entityId -> projectile entity
    pickups: new Map(), // Map of entityId -> pickup entity
    nextEntityId: 1, // Auto-incrementing ID for entities
    // Kaplay instance reference
    k: null,
    // Seeded RNG for deterministic world generation
    gameSeed: 0, // Base seed for this game session
    floorRng: null, // SeededRandom instance for floor generation
    roomRng: null, // SeededRandom instance for room generation
    currentFloor: 1, // Track current floor for seed generation
    currentRoom: { x: 0, y: 0 } // Track current room for seed generation
};

/**
 * Initialize multiplayer game session
 * @param {boolean} isHost - Whether this client is the host
 * @param {number} localSlot - Local player's slot index
 * @param {Object} kaplayInstance - Kaplay instance for creating entities
 * @param {number} gameSeed - Optional seed for deterministic generation (host generates, broadcasts to clients)
 */
export function initMultiplayerGame(isHost, localSlot = 0, kaplayInstance = null, gameSeed = null) {
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

    // Initialize seeded RNG
    if (gameSeed !== null) {
        // Client: use seed from host
        mpGame.gameSeed = gameSeed;
    } else if (isHost) {
        // Host: generate new game seed
        mpGame.gameSeed = Math.floor(Math.random() * 0xFFFFFFFF);
        console.log(`[Multiplayer] Generated game seed: ${mpGame.gameSeed}`);
    }

    // Initialize floor RNG (will be reset when floor changes)
    mpGame.floorRng = new SeededRandom(mpGame.gameSeed);
    mpGame.currentFloor = 1;
    mpGame.currentRoom = { x: 0, y: 0 };

    console.log(`Multiplayer initialized - isHost: ${isHost}, localSlot: ${localSlot}, seed: ${mpGame.gameSeed}`);

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

        console.log('[Multiplayer] Received input from peer:', fromPeerId, 'slot:', slotIndex, 'payload:', payload);

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
            console.log('[Multiplayer] Applied input to player at slot', slotIndex);
        } else {
            console.warn('[Multiplayer] Could not find player for peer:', fromPeerId, 'slot:', slotIndex);
            console.warn('[Multiplayer] Party slots:', party.slots);
            console.warn('[Multiplayer] Registered players:', Array.from(mpGame.players.keys()));
        }
    });

    // Handle pause requests from clients
    onMessage('pause_request', (payload, fromPeerId) => {
        console.log('[Multiplayer] Pause request from peer:', fromPeerId, 'paused:', payload.paused);

        // Host applies the pause state and broadcasts to all clients
        if (mpGame.k) {
            mpGame.k.paused = payload.paused;

            // Update host's pause UI
            if (mpGame.k.gameData && mpGame.k.gameData.updatePauseUI) {
                mpGame.k.gameData.updatePauseUI(payload.paused);
            }

            // Broadcast to all clients (including the requester for confirmation)
            broadcast('pause_state', { paused: payload.paused });

            console.log('[Multiplayer] Host set pause state to:', payload.paused);
        }
    });

    // Handle player death notifications from clients
    onMessage('player_death', (payload, fromPeerId) => {
        console.log('[Multiplayer] Received player death from client:', fromPeerId, 'slot:', payload.slotIndex);

        // Mark player as dead on host
        const player = mpGame.players.get(payload.slotIndex);
        if (player && player.exists()) {
            player.isDead = true;
            player.canMove = false;
            player.canShoot = false;
            player.isShooting = false;

            // Visual indication of death
            player.opacity = 0.5;
            if (player.outline && player.outline.exists()) {
                player.outline.opacity = 0.5;
            }

            console.log('[Multiplayer] Host marked player at slot', payload.slotIndex, 'as dead');

            // Broadcast to all other clients
            broadcast('player_death', { slotIndex: payload.slotIndex }, [fromPeerId]);
        }
    });

    // Handle re-sync requests from clients
    onMessage('resync_request', (payload, fromPeerId) => {
        console.log('[Multiplayer] Re-sync requested by client:', fromPeerId);

        // Send full game state to requesting client immediately
        sendToPeer(fromPeerId, 'game_state', collectGameState());

        console.log('[Multiplayer] Sent full game state re-sync to client:', fromPeerId);
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
                        // Store target position for smooth interpolation
                        if (!player.netTarget) {
                            player.netTarget = { x: playerState.x, y: playerState.y };
                        } else {
                            player.netTarget.x = playerState.x;
                            player.netTarget.y = playerState.y;
                        }
                        player.angle = playerState.angle || 0;

                        // Update health and maxHealth
                        if (playerState.maxHealth !== undefined) {
                            player.maxHealth = playerState.maxHealth;
                        }
                        if (playerState.hp !== undefined && player.setHP) {
                            player.setHP(playerState.hp);
                        }

                        // Update invulnerability state
                        if (playerState.invulnerable !== undefined) {
                            player.invulnerable = playerState.invulnerable;
                        }
                        if (playerState.invulnerableTime !== undefined) {
                            player.invulnerableTime = playerState.invulnerableTime;
                        }

                        // Update death state
                        if (playerState.isDead !== undefined) {
                            player.isDead = playerState.isDead;
                            // Disable shooting and movement for dead players
                            if (player.isDead) {
                                player.canShoot = false;
                                player.canMove = false;
                                player.isShooting = false;
                            } else {
                                // Re-enable for alive players (if not remote controlled)
                                if (!player.isRemote) {
                                    player.canShoot = true;
                                    player.canMove = true;
                                }
                            }
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
                    // Update existing enemy with interpolation for smooth movement
                    // Store target position for interpolation
                    if (!existingEnemy.netTarget) {
                        existingEnemy.netTarget = { x: enemyState.x, y: enemyState.y };
                    } else {
                        existingEnemy.netTarget.x = enemyState.x;
                        existingEnemy.netTarget.y = enemyState.y;
                    }

                    // Update health immediately (no interpolation for discrete values)
                    if (enemyState.maxHealth !== undefined) {
                        existingEnemy.maxHealth = enemyState.maxHealth;
                    }
                    if (existingEnemy.setHP && enemyState.hp !== undefined) {
                        existingEnemy.setHP(enemyState.hp);
                    }

                    // Update shield and armor state for visual sync
                    if (enemyState.shieldHealth !== undefined) {
                        existingEnemy.shieldHealth = enemyState.shieldHealth;
                    }
                    if (enemyState.armorHealth !== undefined) {
                        existingEnemy.armorHealth = enemyState.armorHealth;
                    }
                    // Update visual if shield/armor changed
                    if (existingEnemy.updateVisual) {
                        existingEnemy.updateVisual();
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
                    // Clean up health bars before destroying
                    if (enemy.cleanupHealthBars && typeof enemy.cleanupHealthBars === 'function') {
                        enemy.cleanupHealthBars();
                    }
                    mpGame.k.destroy(enemy); // Use Kaplay's destroy method
                    mpGame.enemies.delete(id);
                }
            });
        }

        // NOTE: Projectiles are no longer synced via game_state
        // They are spawned via spawn_projectile messages and move autonomously
        // This significantly reduces network bandwidth and improves performance

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

                    // Update magnetization state
                    if (pickupState.magnetizing !== undefined) {
                        existing.magnetizing = pickupState.magnetizing;

                        // Set target player if specified
                        if (pickupState.magnetizing && pickupState.targetPlayerSlot !== undefined) {
                            const targetPlayer = mpGame.players.get(pickupState.targetPlayerSlot);
                            if (targetPlayer && targetPlayer.exists()) {
                                existing.targetPlayer = targetPlayer;
                            }
                        }
                    }
                }
            });

            // Remove collected pickups
            mpGame.pickups.forEach((pickup, id) => {
                if (!receivedIds.has(id) && pickup.exists()) {
                    mpGame.k.destroy(pickup); // Use Kaplay's destroy method
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
            // Removed console.log for performance
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
            // Removed console.log for performance
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
            // Removed console.log for performance
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

            // Removed console.log for performance
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
            mpGame.k.opacity(1), // Required for lifespan component
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
        // Check all entity types: enemies, players, and pickups
        const entity = mpGame.enemies.get(payload.entityId) ||
                      mpGame.players.get(payload.entityId) ||
                      mpGame.pickups.get(payload.entityId);

        if (entity && entity.exists()) {
            // Clean up health bars before destroying entity
            if (entity.cleanupHealthBars && typeof entity.cleanupHealthBars === 'function') {
                entity.cleanupHealthBars();
            }

            // Don't trigger onDeath for network-destroyed entities
            // The host already handled death effects (splitting, explosions, etc.)
            // and will broadcast any spawned entities separately
            // This prevents errors from death handlers trying to spawn entities on clients

            // Destroy the entity
            mpGame.k.destroy(entity);

            // Remove from appropriate tracking map
            if (payload.entityType === 'pickup' || payload.entityType === 'xpPickup' || payload.entityType === 'currencyPickup') {
                mpGame.pickups.delete(payload.entityId);
            }
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
                    mpGame.k.opacity(1), // Required for lifespan component
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

    // Handle game seed broadcast from host
    onMessage('game_seed', (payload) => {
        console.log(`[Multiplayer] Received game seed from host: ${payload.seed}`);

        // Initialize RNG with seed from host
        mpGame.gameSeed = payload.seed;
        mpGame.floorRng = new SeededRandom(mpGame.gameSeed);

        console.log('[Multiplayer] Synchronized RNG with host');
    });

    // Receive pause state updates from host
    onMessage('pause_state', (payload) => {
        console.log('[Multiplayer] Received pause state from host:', payload.paused);

        // Apply pause state locally
        if (mpGame.k) {
            mpGame.k.paused = payload.paused;

            // Update pause UI if callback is registered
            if (mpGame.k.gameData && mpGame.k.gameData.updatePauseUI) {
                mpGame.k.gameData.updatePauseUI(payload.paused);
            }

            console.log('[Multiplayer] Client set pause state to:', payload.paused);
        }
    });

    // Receive XP gain from host
    onMessage('xp_gain', (payload) => {
        console.log('[Multiplayer] Received XP gain from host:', payload.value);

        // Give XP to all local players
        if (mpGame.players) {
            mpGame.players.forEach((p, slot) => {
                if (p && p.exists() && !p.isDead && p.addXP) {
                    p.addXP(payload.value);
                }
            });
        }
    });

    // Receive enemy split events from host
    onMessage('enemy_split', (payload) => {
        console.log('[Multiplayer] Received enemy split event:', payload.count);

        // Update split enemy counter
        if (mpGame.k && mpGame.k.gameData && mpGame.k.gameData.incrementSplitEnemies) {
            mpGame.k.gameData.incrementSplitEnemies(payload.count);
        }
    });

    // Receive player death events from host
    onMessage('player_death', (payload) => {
        console.log('[Multiplayer] Received player death event for slot:', payload.slotIndex);

        // Mark player as dead immediately
        const player = mpGame.players.get(payload.slotIndex);
        if (player && player.exists()) {
            player.isDead = true;
            player.canMove = false;
            player.canShoot = false;
            player.isShooting = false;

            // Visual indication of death
            player.opacity = 0.5;
            if (player.outline && player.outline.exists()) {
                player.outline.opacity = 0.5;
            }

            console.log('[Multiplayer] Marked player at slot', payload.slotIndex, 'as dead');
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
    mpGame.lastResyncTime += dt;

    if (mpGame.isHost) {
        // Host: broadcast game state periodically
        if (mpGame.lastSyncTime >= mpGame.syncInterval) {
            broadcastGameState();
            mpGame.lastSyncTime = 0;
        }

        // Host: periodic desync check (verify critical state)
        if (mpGame.lastResyncTime >= mpGame.resyncInterval) {
            // Check if any players have inconsistent state
            mpGame.players.forEach((player, slotIndex) => {
                if (player && player.exists()) {
                    // Check for critical desyncs (e.g., dead but still has HP)
                    if (player.isDead && player.hp() > 0) {
                        console.warn('[Multiplayer] Desync detected: Player', slotIndex, 'is marked dead but has HP. Correcting...');
                        player.setHP(0);
                    }
                    if (!player.isDead && player.hp() <= 0) {
                        console.warn('[Multiplayer] Desync detected: Player', slotIndex, 'has no HP but not marked dead. Correcting...');
                        player.isDead = true;
                        player.canMove = false;
                        player.canShoot = false;
                    }
                }
            });
            mpGame.lastResyncTime = 0;
        }
    } else {
        // Client: send input state periodically
        if (mpGame.lastSyncTime >= mpGame.syncInterval) {
            sendInputState();
            mpGame.lastSyncTime = 0;
        }

        // Client: periodic desync check and auto-resync request
        if (mpGame.lastResyncTime >= mpGame.resyncInterval) {
            // Check for desyncs on client
            let desyncDetected = false;

            mpGame.players.forEach((player, slotIndex) => {
                if (player && player.exists()) {
                    // Check for critical desyncs
                    if (player.isDead && player.hp() > 0) {
                        console.warn('[Multiplayer] Client desync: Player', slotIndex, 'is dead but has HP');
                        desyncDetected = true;
                    }
                    if (!player.isDead && player.hp() <= 0) {
                        console.warn('[Multiplayer] Client desync: Player', slotIndex, 'has no HP but not dead');
                        desyncDetected = true;
                    }
                }
            });

            if (desyncDetected) {
                console.log('[Multiplayer] Desync detected - requesting full re-sync from host');
                requestResync();
            }

            mpGame.lastResyncTime = 0;
        }

        // Client: interpolate entity positions for smooth movement
        const lerpFactor = Math.min(dt * 10, 1); // Lerp 10x per second, cap at 1

        // Interpolate remote players
        mpGame.players.forEach(player => {
            if (player.exists() && player.isRemote && player.netTarget) {
                player.pos.x += (player.netTarget.x - player.pos.x) * lerpFactor;
                player.pos.y += (player.netTarget.y - player.pos.y) * lerpFactor;
            }
        });

        // Interpolate enemies
        mpGame.enemies.forEach(enemy => {
            if (enemy.exists() && enemy.netTarget) {
                enemy.pos.x += (enemy.netTarget.x - enemy.pos.x) * lerpFactor;
                enemy.pos.y += (enemy.netTarget.y - enemy.pos.y) * lerpFactor;
            }
        });
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
            // Ensure weapons and upgrades are serializable using JSON round-trip to strip functions
            let weaponsArray = [];
            let upgradesArray = [];
            let stacksObj = {};

            try {
                // Deep clone to remove functions and non-serializable data
                if (player.weapons) {
                    weaponsArray = JSON.parse(JSON.stringify(player.weapons));
                }
                if (player.passiveUpgrades) {
                    upgradesArray = JSON.parse(JSON.stringify(player.passiveUpgrades));
                }
                if (player.upgradeStacks) {
                    stacksObj = JSON.parse(JSON.stringify(player.upgradeStacks));
                }
            } catch (e) {
                console.warn('Failed to serialize player upgrades:', e);
                // Fallback to empty arrays/objects
            }

            // Get current HP safely - if player has hp() method, use it, otherwise use maxHealth
            let currentHP = player.maxHealth;
            if (player.hp && typeof player.hp === 'function') {
                currentHP = player.hp();
            } else if (typeof player.hp === 'number') {
                currentHP = player.hp;
            }

            playerStates.push({
                slotIndex: Number(slotIndex),
                x: Number(player.pos.x),
                y: Number(player.pos.y),
                angle: Number(player.angle || 0),
                hp: Number(currentHP),
                maxHealth: Number(player.maxHealth || 100),
                level: Number(player.level || 1),
                xp: Number(player.xp || 0),
                isDead: Boolean(player.isDead || false), // Track death state
                // Weapon and upgrade state (ensure plain data)
                weapons: weaponsArray,
                passiveUpgrades: upgradesArray,
                upgradeStacks: stacksObj,
                // Stats that affect gameplay
                speed: Number(player.speed || 0),
                damage: Number(player.damage || 0),
                pickupRadius: Number(player.pickupRadius || 0),
                // Visual state for color sync
                invulnerable: Boolean(player.invulnerable || false),
                invulnerableTime: Number(player.invulnerableTime || 0)
            });
        }
    });

    // Collect enemy states
    mpGame.enemies.forEach((enemy, entityId) => {
        if (enemy.exists()) {
            // Get current HP safely
            let currentHP = 0;
            if (enemy.hp && typeof enemy.hp === 'function') {
                currentHP = enemy.hp();
            } else if (typeof enemy.hp === 'number') {
                currentHP = enemy.hp;
            }

            enemyStates.push({
                id: Number(entityId),
                x: Number(enemy.pos.x),
                y: Number(enemy.pos.y),
                hp: Number(currentHP),
                maxHealth: Number(enemy.maxHealth || 0),
                type: String(enemy.enemyType || 'basic'),
                // Shield and armor state for visual sync
                shieldHealth: Number(enemy.shieldHealth || 0),
                armorHealth: Number(enemy.armorHealth || 0)
            });
        } else {
            // Enemy destroyed - remove from tracking
            mpGame.enemies.delete(entityId);
        }
    });

    // NOTE: Projectiles are NOT synced via game_state anymore
    // They are spawned via spawn_projectile messages and then move autonomously
    // This significantly reduces network traffic (projectiles change every frame)
    // Just clean up destroyed projectiles from tracking
    mpGame.projectiles.forEach((projectile, entityId) => {
        if (!projectile.exists()) {
            mpGame.projectiles.delete(entityId);
        }
    });

    // Collect pickup states
    mpGame.pickups.forEach((pickup, entityId) => {
        if (pickup.exists()) {
            const pickupState = {
                id: Number(entityId),
                x: Number(pickup.pos.x),
                y: Number(pickup.pos.y),
                type: String(pickup.pickupType || 'xp'),
                magnetizing: Boolean(pickup.magnetizing || false)
            };

            // Include target player slot if magnetizing
            if (pickup.magnetizing && pickup.targetPlayer && pickup.targetPlayer.slotIndex !== undefined) {
                pickupState.targetPlayerSlot = Number(pickup.targetPlayer.slotIndex);
            }

            pickupStates.push(pickupState);
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

    // Extract move as plain object (Vec2 has functions that can't be serialized)
    // Read from moveDir (local keyboard input) not move (remote network input)
    const move = localPlayer.moveDir
        ? { x: Number(localPlayer.moveDir.x || 0), y: Number(localPlayer.moveDir.y || 0) }
        : { x: 0, y: 0 };

    sendToHost('player_input', {
        slotIndex: Number(mpGame.localPlayerSlot),
        move: move,
        shoot: Boolean(localPlayer.isShooting || false),
        aimAngle: Number(localPlayer.aimAngle || 0)
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

    // Extract color from projectile entity
    let colorArray = [255, 255, 100]; // Default yellow
    if (projectile.color && projectile.color.r !== undefined) {
        colorArray = [
            Math.round(projectile.color.r),
            Math.round(projectile.color.g),
            Math.round(projectile.color.b)
        ];
    }

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
        // Visual properties from projectile entity
        char: projectile.text || creationParams.char || '*',
        color: colorArray
    });

    return entityId;
}

/**
 * Unregister a projectile from multiplayer tracking (client and host)
 * Called when a projectile is destroyed to prevent memory leaks
 * @param {Object} projectile - Projectile entity to unregister
 */
export function unregisterProjectile(projectile) {
    if (!mpGame.isActive) return;

    // Remove from tracking map using the entity's network ID
    if (projectile.mpEntityId !== undefined) {
        mpGame.projectiles.delete(projectile.mpEntityId);
    }
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
 * Unregister a pickup from multiplayer tracking (client and host)
 * Called when a pickup is destroyed to prevent memory leaks
 * @param {Object} pickup - Pickup entity to unregister
 */
export function unregisterPickup(pickup) {
    if (!mpGame.isActive) return;

    // Remove from tracking map using the entity's network ID
    if (pickup.mpEntityId !== undefined) {
        mpGame.pickups.delete(pickup.mpEntityId);
    }
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

/**
 * Broadcast game over event to all clients (host only)
 * Called when all players are dead
 * @param {Object} runStats - Run statistics
 * @param {number} currencyEarned - Currency earned this run
 */
export function broadcastGameOver(runStats, currencyEarned) {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('game_over', {
        runStats: runStats,
        currencyEarned: currencyEarned,
        timestamp: Date.now()
    });

    console.log('[Multiplayer] Broadcasted game over event');
}

/**
 * Get the game seed (for synchronized random generation)
 * @returns {number} Game seed
 */
export function getGameSeed() {
    return mpGame.gameSeed;
}

/**
 * Set current floor for seeded RNG
 * @param {number} floor - Floor number
 */
export function setCurrentFloor(floor) {
    mpGame.currentFloor = floor;
    // Reset floor RNG with new seed based on floor
    const floorSeed = createSeed(mpGame.gameSeed, floor);
    mpGame.floorRng = new SeededRandom(floorSeed);
    console.log(`[Multiplayer] Set floor ${floor}, seed: ${floorSeed}`);
}

/**
 * Set current room for seeded RNG
 * @param {number} roomX - Room X coordinate
 * @param {number} roomY - Room Y coordinate
 */
export function setCurrentRoom(roomX, roomY) {
    mpGame.currentRoom = { x: roomX, y: roomY };
}

/**
 * Get a seeded RNG for the current room
 * Creates a deterministic RNG based on floor and room coordinates
 * @returns {SeededRandom} Seeded random number generator for this room
 */
export function getRoomRNG() {
    const seed = createSeed(mpGame.gameSeed, mpGame.currentFloor, mpGame.currentRoom.x, mpGame.currentRoom.y);
    return new SeededRandom(seed);
}

/**
 * Get the floor RNG (for floor-wide generation like floor maps)
 * @returns {SeededRandom} Seeded random number generator for this floor
 */
export function getFloorRNG() {
    return mpGame.floorRng;
}

/**
 * Get a seeded RNG for upgrade selection
 * Creates a deterministic RNG based on player index and level
 * @param {number} playerIndex - Player index (0 for host, 1+ for clients)
 * @param {number} playerLevel - Current player level
 * @returns {SeededRandom} Seeded random number generator for this upgrade draft
 */
export function getUpgradeRNG(playerIndex, playerLevel) {
    const seed = createSeed(mpGame.gameSeed, playerIndex, playerLevel);
    return new SeededRandom(seed);
}

/**
 * Broadcast game seed to all clients (host only)
 * Called when game starts to sync RNG
 */
export function broadcastGameSeed() {
    if (!mpGame.isHost) return;

    broadcast('game_seed', {
        seed: mpGame.gameSeed
    });

    console.log(`[Multiplayer] Broadcasted game seed: ${mpGame.gameSeed}`);
}

/**
 * Broadcast pause state to all clients (host only)
 * @param {boolean} paused - Whether the game should be paused
 */
export function broadcastPauseState(paused) {
    if (!mpGame.isHost) return;

    broadcast('pause_state', { paused });

    console.log(`[Multiplayer] Broadcasted pause state: ${paused}`);
}

/**
 * Send pause request to host (client only)
 * @param {boolean} paused - Whether the game should be paused
 */
export function sendPauseRequest(paused) {
    if (mpGame.isHost) return; // Host doesn't send requests to itself

    sendToHost('pause_request', { paused });

    console.log(`[Multiplayer] Sent pause request to host: ${paused}`);
}

/**
 * Broadcast room completion to all clients (host only)
 * Called when the host detects all enemies are defeated
 */
export function broadcastRoomCompletion() {
    if (!mpGame.isHost) return;

    broadcast('room_completed', {});

    console.log('[Multiplayer] Broadcasted room completion');
}

/**
 * Broadcast XP gain to all clients (host only)
 * Called when XP is collected so all players gain XP
 */
export function broadcastXPGain(xpValue) {
    if (!mpGame.isHost) return;

    broadcast('xp_gain', { value: xpValue });

    console.log('[Multiplayer] Broadcasted XP gain:', xpValue);
}

/**
 * Broadcast room transition to all clients (host only)
 * Called when transitioning to a new room to sync spawn positions
 * @param {string} entryDirection - Direction players will enter from ('north', 'south', 'east', 'west', or null)
 */
export function broadcastRoomTransition(entryDirection) {
    if (!mpGame.isHost) return;

    broadcast('room_transition', { entryDirection: entryDirection });

    console.log('[Multiplayer] Broadcasted room transition with entry direction:', entryDirection);
}

/**
 * Broadcast enemy split event to all clients (host only)
 * Called when an enemy splits (e.g., slimes) to update the total enemy count
 * @param {number} splitCount - Number of enemies created by splitting
 */
export function broadcastEnemySplit(splitCount) {
    if (!mpGame.isHost) return;

    broadcast('enemy_split', { count: splitCount });

    console.log('[Multiplayer] Broadcasted enemy split:', splitCount);
}

/**
 * Broadcast player death event (both host and client)
 * Called immediately when a player dies to ensure all clients are synced
 * @param {number} slotIndex - Player slot that died
 */
export function broadcastPlayerDeath(slotIndex) {
    if (!mpGame.isActive) return;

    if (mpGame.isHost) {
        // Host broadcasts to all clients
        broadcast('player_death', { slotIndex });
        console.log('[Multiplayer] Host broadcasted player death for slot:', slotIndex);
    } else {
        // Client sends to host
        sendToHost('player_death', { slotIndex });
        console.log('[Multiplayer] Client sent player death to host for slot:', slotIndex);
    }
}

/**
 * Request full game state re-sync from host (client only)
 * Called when client detects desynchronization
 */
export function requestResync() {
    if (mpGame.isHost) return; // Host doesn't request resyncs

    sendToHost('resync_request', { timestamp: Date.now() });
    console.log('[Multiplayer] Client requested full game state re-sync');
}
