/**
 * Multiplayer Game System
 * Handles game state synchronization for multiplayer
 */

import { getParty, getPartySize, getLocalPlayer } from './partySystem.js';
import { broadcast, sendToHost, sendToPeer, onMessage, getNetworkInfo } from './networkSystem.js';
import { createEnemy } from '../entities/enemy.js';
import { createBoss } from '../entities/boss.js';
import { createXPPickup, createCurrencyPickup, getRandomCurrencyIcon } from '../entities/pickup.js';
import { SeededRandom, createSeed } from '../utils/seededRandom.js';

// Debug flag - set to true to enable verbose multiplayer logging
const MP_DEBUG = false;

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
    currentRoom: { x: 0, y: 0 }, // Track current room for seed generation
    pendingXP: 0 // XP accumulated while player was in upgrade draft screen
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
    }

    // Initialize floor RNG (will be reset when floor changes)
    mpGame.floorRng = new SeededRandom(mpGame.gameSeed);
    mpGame.currentFloor = 1;
    mpGame.currentRoom = { x: 0, y: 0 };

    // Set up message handlers
    if (isHost) {
        setupHostHandlers();
    } else {
        // Reset handler registration flag to allow re-registration on reconnect
        multiplayerClientHandlersRegistered = false;
        setupClientHandlers();
    }
}

/**
 * Set up message handlers for host
 */
function setupHostHandlers() {
    // Prevent duplicate handler registration
    if (multiplayerHostHandlersRegistered) {
        return;
    }
    multiplayerHostHandlersRegistered = true;

    // Handle player input from clients
    onMessage('player_input', (payload, fromPeerId) => {
        // Store input to be processed in game loop
        // Find which player slot this peer belongs to
        const party = getParty();
        const slotIndex = party.slots.findIndex(slot => slot.peerId === fromPeerId);

        if (MP_DEBUG) console.log('[Multiplayer] Received input from peer:', fromPeerId, 'slot:', slotIndex);

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
            if (MP_DEBUG) console.log('[Multiplayer] Applied input to player at slot', slotIndex);
        } else {
            console.warn('[Multiplayer] Could not find player for peer:', fromPeerId, 'slot:', slotIndex);
            console.warn('[Multiplayer] Party slots:', party.slots);
            console.warn('[Multiplayer] Registered players:', Array.from(mpGame.players.keys()));
        }
    });

    // Handle pause requests from clients
    onMessage('pause_request', (payload, fromPeerId) => {
        if (MP_DEBUG) console.log('[Multiplayer] Pause request from peer:', fromPeerId, 'paused:', payload.paused);

        // Host applies the pause state and broadcasts to all clients
        if (mpGame.k) {
            mpGame.k.paused = payload.paused;

            // Update host's pause UI
            if (mpGame.k.gameData && mpGame.k.gameData.updatePauseUI) {
                mpGame.k.gameData.updatePauseUI(payload.paused);
            }

            // Broadcast to all clients (including the requester for confirmation)
            broadcast('pause_state', { paused: payload.paused });

            if (MP_DEBUG) console.log('[Multiplayer] Host set pause state to:', payload.paused);
        }
    });

    // Handle player death notifications from clients
    onMessage('player_death', (payload, fromPeerId) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received player death from client:', fromPeerId, 'slot:', payload.slotIndex);

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

            if (MP_DEBUG) console.log('[Multiplayer] Host marked player at slot', payload.slotIndex, 'as dead');

            // Broadcast to all other clients
            broadcast('player_death', { slotIndex: payload.slotIndex }, [fromPeerId]);
        }
    });

    // Handle enemy death notifications from clients
    onMessage('enemy_death', (payload, fromPeerId) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received enemy death from client:', fromPeerId, 'entity:', payload.entityId);

        // Broadcast the death to all clients (including back to the sender for confirmation)
        broadcast('entity_destroyed', {
            entityId: payload.entityId,
            entityType: payload.entityType,
            x: payload.x,
            y: payload.y
        });

    });

    // Handle re-sync requests from clients
    onMessage('resync_request', (payload, fromPeerId) => {
        // Send full game state to requesting client immediately
        sendToPeer(fromPeerId, 'game_state', collectGameState());
    });

    // Handle level up queued from clients
    onMessage('level_up_queued', (payload, fromPeerId) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received level up queued from client:', fromPeerId, 'slot:', payload.slotIndex, 'level:', payload.level);

        // Broadcast to ALL clients so everyone knows about the level up
        broadcast('level_up_queued', {
            slotIndex: payload.slotIndex,
            level: payload.level,
            timestamp: Date.now()
        });

        if (MP_DEBUG) console.log('[Multiplayer] Host broadcasted level up queued for slot:', payload.slotIndex);
    });

    // Handle upgrade selection from clients
    onMessage('upgrade_selected', (payload, fromPeerId) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received upgrade selection from client:', fromPeerId, 'slot:', payload.slotIndex, 'upgrade:', payload.upgradeKey);

        // Apply upgrade to the player on host side
        const player = mpGame.players.get(payload.slotIndex);
        if (player && player.exists()) {
            // Import applyUpgrade dynamically to avoid circular dependency
            import('../systems/upgrades.js').then(({ applyUpgrade, recalculateAllUpgrades }) => {
                applyUpgrade(player, payload.upgradeKey);
                // Track the upgrade in upgradeStacks for proper persistence
                if (!player.upgradeStacks) player.upgradeStacks = {};
                player.upgradeStacks[payload.upgradeKey] = (player.upgradeStacks[payload.upgradeKey] || 0) + 1;
                // Track in selectedUpgrades for synergy detection
                if (!player.selectedUpgrades) player.selectedUpgrades = new Set();
                player.selectedUpgrades.add(payload.upgradeKey);
                recalculateAllUpgrades(player);
            });
        }

        // Broadcast to ALL clients (including back to sender) so everyone can apply the upgrade
        broadcast('upgrade_selected', {
            slotIndex: payload.slotIndex,
            upgradeKey: payload.upgradeKey,
            timestamp: Date.now()
        });

        if (MP_DEBUG) console.log('[Multiplayer] Host broadcasted upgrade selection for slot:', payload.slotIndex);
    });

    // Handle synergy activation from clients
    onMessage('synergy_activated', (payload, fromPeerId) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received synergy activation from client:', fromPeerId, 'slot:', payload.slotIndex);

        // Broadcast to ALL clients so everyone can apply the synergies
        broadcast('synergy_activated', {
            slotIndex: payload.slotIndex,
            synergies: payload.synergies,
            timestamp: Date.now()
        });

        if (MP_DEBUG) console.log('[Multiplayer] Host broadcasted synergy activation for slot:', payload.slotIndex);
    });
}

// Flags to prevent duplicate handler registration
let multiplayerClientHandlersRegistered = false;
let multiplayerHostHandlersRegistered = false;

/**
 * Set up message handlers for client
 */
function setupClientHandlers() {
    // Prevent duplicate handler registration (memory leak fix)
    if (multiplayerClientHandlersRegistered) {
        return;
    }
    multiplayerClientHandlersRegistered = true;

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
                        // Also rotate the outline
                        if (player.outline && player.outline.exists()) {
                            player.outline.angle = player.angle;
                        }

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
                            // Set state based on alive/dead
                            if (player.isDead) {
                                player.canShoot = false;
                                player.canMove = false;
                                player.isShooting = false;
                                // Death visual state
                                player.opacity = 0.5;
                                if (player.outline && player.outline.exists()) {
                                    player.outline.opacity = 0.5;
                                }
                            } else {
                                // Re-enable for alive players
                                player.canShoot = true;
                                player.canMove = true;
                                // Alive visual state
                                player.opacity = 1;
                                if (player.outline && player.outline.exists()) {
                                    player.outline.opacity = 1;
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
                } else {
                    // Update local player's HP from host (damage is host-authoritative)
                    const localPlayer = mpGame.players.get(mpGame.localPlayerSlot);
                    if (localPlayer && localPlayer.exists()) {
                        // Sync HP (host is authoritative for damage)
                        if (playerState.hp !== undefined && localPlayer.setHP) {
                            localPlayer.setHP(playerState.hp);
                        }
                        if (playerState.maxHealth !== undefined) {
                            localPlayer.maxHealth = playerState.maxHealth;
                        }

                        // Sync invulnerability state
                        if (playerState.invulnerable !== undefined) {
                            localPlayer.invulnerable = playerState.invulnerable;
                        }
                        if (playerState.invulnerableTime !== undefined) {
                            localPlayer.invulnerableTime = playerState.invulnerableTime;
                        }

                        // Sync death state
                        if (playerState.isDead !== undefined) {
                            localPlayer.isDead = playerState.isDead;
                            if (localPlayer.isDead) {
                                localPlayer.canShoot = false;
                                localPlayer.canMove = false;
                                localPlayer.isShooting = false;
                                // Death visual state
                                localPlayer.opacity = 0.5;
                                if (localPlayer.outline && localPlayer.outline.exists()) {
                                    localPlayer.outline.opacity = 0.5;
                                }
                            } else {
                                localPlayer.canShoot = true;
                                localPlayer.canMove = true;
                                // Alive visual state - restore full opacity
                                localPlayer.opacity = 1;
                                if (localPlayer.outline && localPlayer.outline.exists()) {
                                    localPlayer.outline.opacity = 1;
                                }
                            }
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

                    // Update isFlyingToUI state
                    if (pickupState.isFlyingToUI !== undefined) {
                        existing.isFlyingToUI = pickupState.isFlyingToUI;
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
            let enemy;
            if (payload.isBoss) {
                // Create boss entity
                enemy = createBoss(
                    mpGame.k,
                    payload.x,
                    payload.y,
                    payload.type,
                    payload.floor
                );
            } else {
                // Create regular enemy
                enemy = createEnemy(
                    mpGame.k,
                    payload.x,
                    payload.y,
                    payload.type,
                    payload.floor
                );
            }
            enemy.mpEntityId = payload.id;
            if (payload.isBossMinion) {
                enemy.isBossMinion = true;
            }
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

        // Flash the target entity if we have it (enemies only - players keyed by slotIndex)
        const target = mpGame.enemies.get(payload.targetId);
        if (target && target.exists()) {
            const originalColor = target.color;
            target.color = mpGame.k.rgb(255, 255, 255); // White flash
            mpGame.k.wait(0.1, () => {
                if (target.exists()) {
                    target.color = originalColor;
                }
            });
        }
    });

    // Handle entity death events
    onMessage('entity_destroyed', (payload) => {
        if (!mpGame.k) return; // Need kaplay instance

        // Remove the entity from tracking and destroy it
        // Check enemies and pickups only - players have separate death handling
        // NOTE: Do NOT check mpGame.players here as it's keyed by slotIndex, not entityId
        const entity = mpGame.enemies.get(payload.entityId) ||
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

    // Handle boss enrage events
    onMessage('boss_enrage', (payload) => {
        if (!mpGame.k) return;
        const boss = mpGame.enemies.get(payload.networkId);
        if (boss && boss.exists() && boss.enrage) {
            boss.enrage();
        }
    });

    // Handle player revival events
    onMessage('players_revived', (payload) => {
        if (!mpGame.k) return; // Need kaplay instance

        // Revive all dead players
        mpGame.players.forEach((player, slotIndex) => {
            if (player && player.exists() && (player.hp() <= 0 || player.isDead)) {
                // Revive player at 5% health (can be upgraded later)
                const reviveHealth = Math.max(1, Math.floor(player.maxHealth * 0.05));
                player.setHP(reviveHealth);
                player.isDead = false;

                // Re-enable movement and shooting only for the local player
                if (slotIndex === mpGame.localPlayerSlot) {
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
            }
        });
    });

    // Handle game seed broadcast from host
    onMessage('game_seed', (payload) => {
        // Initialize RNG with seed from host
        mpGame.gameSeed = payload.seed;
        mpGame.floorRng = new SeededRandom(mpGame.gameSeed);
    });

    // Receive pause state updates from host
    onMessage('pause_state', (payload) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received pause state from host:', payload.paused);

        // Apply pause state locally
        if (mpGame.k) {
            mpGame.k.paused = payload.paused;

            // Update pause UI if callback is registered
            if (mpGame.k.gameData && mpGame.k.gameData.updatePauseUI) {
                mpGame.k.gameData.updatePauseUI(payload.paused);
            }

            if (MP_DEBUG) console.log('[Multiplayer] Client set pause state to:', payload.paused);
        }
    });

    // Receive XP gain from host
    onMessage('xp_gain', (payload) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received XP gain from host:', payload.value);

        // Give XP to local player
        const localPlayer = mpGame.players.get(mpGame.localPlayerSlot);
        if (localPlayer && localPlayer.exists() && !localPlayer.isDead && localPlayer.addXP) {
            localPlayer.addXP(payload.value);
        } else {
            // Player doesn't exist (in upgrade draft screen) - accumulate pending XP
            mpGame.pendingXP += payload.value;
            if (MP_DEBUG) console.log('[Multiplayer] Accumulated pending XP:', mpGame.pendingXP);
        }
    });

    // Receive currency gain from host
    onMessage('currency_gain', (payload) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received currency gain from host:', payload.value);

        // Import addCurrency dynamically to avoid circular dependency
        import('../systems/metaProgression.js').then(({ addCurrency }) => {
            addCurrency(payload.value);
        });
    });

    // Receive enemy split events from host
    onMessage('enemy_split', (payload) => {

        // Update split enemy counter
        if (mpGame.k && mpGame.k.gameData && mpGame.k.gameData.incrementSplitEnemies) {
            mpGame.k.gameData.incrementSplitEnemies(payload.count);
        }
    });

    // Receive player death events from host
    onMessage('player_death', (payload) => {
        if (MP_DEBUG) console.log('[Multiplayer] Received player death event for slot:', payload.slotIndex);

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

            if (MP_DEBUG) console.log('[Multiplayer] Marked player at slot', payload.slotIndex, 'as dead');
        }
    });

    // Receive player disconnect events from host
    onMessage('player_disconnected', (payload) => {
        // Clean up the disconnected player's entity on this client
        const player = mpGame.players.get(payload.slotIndex);
        if (player && player.exists()) {
            // Clear pending level-ups
            if (player.pendingLevelUps) {
                player.pendingLevelUps = [];
            }

            // Clean up health bars before destroying
            if (player.cleanupHealthBars && typeof player.cleanupHealthBars === 'function') {
                player.cleanupHealthBars();
            }

            // Destroy player entity
            mpGame.k.destroy(player);

            // Remove from tracking
            mpGame.players.delete(payload.slotIndex);
        }
    });

    // Receive host quit event - return to menu
    onMessage('host_quit', (payload) => {
        if (MP_DEBUG) console.log('[Multiplayer] Host quit to menu, returning to menu');

        // Cleanup multiplayer state
        cleanupMultiplayer();

        // Reset game state and return to menu
        if (mpGame.k) {
            mpGame.k.go('menu');
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
}

/**
 * Handle player disconnect (cleanup entity and state)
 * @param {number} slotIndex - Party slot index (0-3)
 */
export function handlePlayerDisconnect(slotIndex) {
    const player = mpGame.players.get(slotIndex);
    if (player && player.exists()) {

        // Clear pending level-ups
        if (player.pendingLevelUps) {
            player.pendingLevelUps = [];
        }

        // Clean up health bars before destroying
        if (player.cleanupHealthBars && typeof player.cleanupHealthBars === 'function') {
            player.cleanupHealthBars();
        }

        // Destroy player entity
        if (mpGame.k) {
            mpGame.k.destroy(player);
        }

        // Remove from tracking
        mpGame.players.delete(slotIndex);

        // Broadcast disconnect to other clients (host only)
        if (mpGame.isHost) {
            broadcastPlayerDisconnect(slotIndex);
        }
    }
}

/**
 * Broadcast player disconnect event to all clients
 * @param {number} slotIndex - Slot index of disconnected player
 */
export function broadcastPlayerDisconnect(slotIndex) {
    if (!mpGame.isHost) return;

    broadcast('player_disconnected', { slotIndex });
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
                magnetizing: Boolean(pickup.magnetizing || false),
                isFlyingToUI: Boolean(pickup.isFlyingToUI || false)
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

    // Reset handler registration flags (allows re-registration on reconnect)
    multiplayerClientHandlersRegistered = false;
    multiplayerHostHandlersRegistered = false;
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
        floor: creationParams.floor || 1,
        isBoss: creationParams.isBoss || false,
        isBossMinion: creationParams.isBossMinion || false
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
 * Broadcast a boss enrage event to all clients (host only)
 * @param {string|number} bossNetworkId - The network ID of the boss that is enraged
 */
export function broadcastBossEnrage(bossNetworkId) {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('boss_enrage', {
        networkId: bossNetworkId,
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
}

/**
 * Broadcast host quit to menu to all clients (host only)
 * All clients should return to menu when host quits
 */
export function broadcastHostQuit() {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('host_quit', {
        timestamp: Date.now()
    });
}

/**
 * Broadcast powerup weapon application to all clients (host only)
 * Called when a powerup weapon is picked up
 * @param {string} powerupKey - Powerup weapon key
 */
export function broadcastPowerupWeaponApplied(powerupKey) {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('powerup_weapon_applied', {
        powerupKey: powerupKey,
        timestamp: Date.now()
    });
}

/**
 * Broadcast upgrade selection (both host and client)
 * Called when a player selects an upgrade
 * @param {number} slotIndex - Player slot index
 * @param {string} upgradeKey - Selected upgrade key
 */
export function broadcastUpgradeSelected(slotIndex, upgradeKey) {
    if (!mpGame.isActive) return;

    if (mpGame.isHost) {
        broadcast('upgrade_selected', {
            slotIndex: slotIndex,
            upgradeKey: upgradeKey,
            timestamp: Date.now()
        });
    } else {
        sendToHost('upgrade_selected', {
            slotIndex: slotIndex,
            upgradeKey: upgradeKey
        });
    }
}

/**
 * Broadcast level up queued event (both host and client)
 * Called when a player levels up during combat
 * @param {number} slotIndex - Player slot index
 * @param {number} level - New level
 */
export function broadcastLevelUpQueued(slotIndex, level) {
    if (!mpGame.isActive) return;

    if (mpGame.isHost) {
        broadcast('level_up_queued', {
            slotIndex: slotIndex,
            level: level,
            timestamp: Date.now()
        });
    } else {
        sendToHost('level_up_queued', {
            slotIndex: slotIndex,
            level: level
        });
    }
}

/**
 * Broadcast synergy activation (both host and client)
 * Called when synergies are activated
 * @param {number} slotIndex - Player slot index
 * @param {Array<string>} synergyKeys - Activated synergy keys
 */
export function broadcastSynergyActivated(slotIndex, synergyKeys) {
    if (!mpGame.isActive) return;

    if (mpGame.isHost) {
        broadcast('synergy_activated', {
            slotIndex: slotIndex,
            synergies: synergyKeys,
            timestamp: Date.now()
        });
    } else {
        sendToHost('synergy_activated', {
            slotIndex: slotIndex,
            synergies: synergyKeys
        });
    }
}

/**
 * Broadcast powerup weapon expiration (host only)
 * Called when powerup weapon expires (ammo or time)
 * @param {number} slotIndex - Player slot index
 * @param {string} powerupKey - Expired powerup key
 */
export function broadcastPowerupExpired(slotIndex, powerupKey) {
    if (!mpGame.isHost || !mpGame.isActive) return;

    broadcast('powerup_expired', {
        slotIndex: slotIndex,
        powerupKey: powerupKey,
        timestamp: Date.now()
    });
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
}

/**
 * Broadcast pause state to all clients (host only)
 * @param {boolean} paused - Whether the game should be paused
 */
export function broadcastPauseState(paused) {
    if (!mpGame.isHost) return;

    broadcast('pause_state', { paused });
}

/**
 * Send pause request to host (client only)
 * @param {boolean} paused - Whether the game should be paused
 */
export function sendPauseRequest(paused) {
    if (mpGame.isHost) return; // Host doesn't send requests to itself

    sendToHost('pause_request', { paused });
}

/**
 * Send enemy death notification to host (client only)
 * Called when a client kills an enemy to notify host and sync state
 * @param {Object} deathData - Enemy death data { entityId, entityType, x, y }
 */
export function sendEnemyDeath(deathData) {
    if (mpGame.isHost) return; // Host doesn't send to itself

    sendToHost('enemy_death', deathData);
}

/**
 * Broadcast room completion to all clients (host only)
 * Called when the host detects all enemies are defeated
 */
export function broadcastRoomCompletion() {
    if (!mpGame.isHost) return;

    broadcast('room_completed', {});
}

/**
 * Broadcast XP gain to all clients (host only)
 * Called when XP is collected so all players gain XP
 */
export function broadcastXPGain(xpValue) {
    if (!mpGame.isHost) return;

    broadcast('xp_gain', { value: xpValue });
}

/**
 * Broadcast currency gain to all clients (host only)
 * Called when currency is collected so all players gain currency
 */
export function broadcastCurrencyGain(currencyValue) {
    if (!mpGame.isHost) return;

    broadcast('currency_gain', { value: currencyValue });
}

/**
 * Get and clear any pending XP accumulated while player was in upgrade draft
 * @returns {number} Pending XP amount (0 if none)
 */
export function getAndClearPendingXP() {
    const pending = mpGame.pendingXP;
    mpGame.pendingXP = 0;
    return pending;
}

/**
 * Broadcast room transition to all clients (host only)
 * Called when transitioning to a new room to sync spawn positions and player stats
 * @param {string} entryDirection - Direction players will enter from ('north', 'south', 'east', 'west', or null)
 * @param {Array} allPlayerStats - Stats for all players to restore after transition
 */
export function broadcastRoomTransition(entryDirection, allPlayerStats = null, gridDirection = null, currentFloor = null) {
    if (!mpGame.isHost) return;

    broadcast('room_transition', {
        entryDirection: entryDirection,
        allPlayerStats: allPlayerStats,
        gridDirection: gridDirection,
        currentFloor: currentFloor
    });
}

/**
 * Broadcast enemy split event to all clients (host only)
 * Called when an enemy splits (e.g., slimes) to update the total enemy count
 * @param {number} splitCount - Number of enemies created by splitting
 */
export function broadcastEnemySplit(splitCount) {
    if (!mpGame.isHost) return;

    broadcast('enemy_split', { count: splitCount });
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
    } else {
        // Client sends to host
        sendToHost('player_death', { slotIndex });
    }
}

/**
 * Request full game state re-sync from host (client only)
 * Called when client detects desynchronization
 */
export function requestResync() {
    if (mpGame.isHost) return; // Host doesn't request resyncs

    sendToHost('resync_request', { timestamp: Date.now() });
}
