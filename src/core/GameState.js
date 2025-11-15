/**
 * Game State Manager
 *
 * Centralized, serializable game state for single and multiplayer support.
 * All game state is stored here and can be synchronized across clients.
 *
 * Design Philosophy:
 * - Single source of truth
 * - Fully serializable (JSON.stringify-able)
 * - No KAPLAY objects in state (pure data only)
 * - Support for multiple players
 * - Deterministic updates
 */

import { PROGRESSION_CONFIG } from '../config/constants.js';

/**
 * Player state for a single player
 */
export class PlayerState {
    constructor(playerId, characterKey) {
        this.playerId = playerId; // Unique player ID
        this.characterKey = characterKey; // Character type key

        // Position & movement
        this.x = 400;
        this.y = 300;
        this.velocityX = 0;
        this.velocityY = 0;

        // Stats (will be initialized from character data)
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 150;

        // Progression
        this.level = PROGRESSION_CONFIG.STARTING_LEVEL;
        this.xp = PROGRESSION_CONFIG.STARTING_XP;
        this.xpToNext = PROGRESSION_CONFIG.BASE_XP_TO_NEXT_LEVEL;
        this.xpMultiplier = 1.0;

        // Weapon & Combat
        this.weaponKey = 'pistol';
        this.fireRate = 1.5;
        this.projectileSpeed = 300;
        this.projectileDamage = 10;
        this.projectileCount = 1;
        this.piercing = 0;
        this.obstaclePiercing = 0;
        this.critChance = 0.05;
        this.critDamage = 2.0;
        this.spreadAngle = 0;
        this.weaponRange = 600;

        // Passive stats
        this.pickupRadius = 30;
        this.defense = 0;
        this.damageReduction = 0;
        this.dodgeChance = 0;

        // State flags
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.slowed = false;
        this.isDead = false;

        // Upgrades
        this.weapons = []; // Array of equipped weapon keys
        this.passiveUpgrades = []; // Array of passive upgrade keys
        this.upgradeStacks = {}; // { upgradeKey: count }

        // Input state (for this player)
        this.input = {
            moveX: 0, // -1, 0, 1
            moveY: 0, // -1, 0, 1
            aimX: 0, // Mouse position X
            aimY: 0, // Mouse position Y
            firing: false
        };
    }

    /**
     * Serialize player state to JSON
     */
    toJSON() {
        return {
            playerId: this.playerId,
            characterKey: this.characterKey,
            x: this.x,
            y: this.y,
            health: this.health,
            maxHealth: this.maxHealth,
            level: this.level,
            xp: this.xp,
            xpToNext: this.xpToNext,
            weaponKey: this.weaponKey,
            isDead: this.isDead,
            // Include other relevant fields
        };
    }

    /**
     * Create PlayerState from JSON
     */
    static fromJSON(json) {
        const player = new PlayerState(json.playerId, json.characterKey);
        Object.assign(player, json);
        return player;
    }
}

/**
 * Entity state (enemies, projectiles, pickups)
 */
export class EntityState {
    constructor(id, type, x, y, data = {}) {
        this.id = id; // Unique entity ID
        this.type = type; // 'enemy', 'boss', 'miniboss', 'projectile', 'pickup', 'door', 'obstacle'
        this.x = x;
        this.y = y;
        this.data = data; // Type-specific data
        this.removed = false; // Mark for removal
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            data: this.data,
            removed: this.removed
        };
    }

    static fromJSON(json) {
        return new EntityState(json.id, json.type, json.x, json.y, json.data);
    }
}

/**
 * Main Game State
 * Contains all game state for single or multiplayer
 */
export class GameState {
    constructor() {
        // Game session info
        this.sessionId = this.generateId();
        this.gameMode = 'singleplayer'; // 'singleplayer' | 'coop'
        this.isPaused = false;

        // World state
        this.currentFloor = 1;
        this.currentRoom = 1;
        this.roomCleared = false;
        this.floorComplete = false;

        // Players (supports 1-4 players)
        this.players = new Map(); // playerId -> PlayerState
        this.localPlayerId = null; // Which player is controlled locally

        // Entities
        this.entities = new Map(); // entityId -> EntityState
        this.nextEntityId = 1;

        // Room state
        this.doors = []; // Door positions and states
        this.obstacles = []; // Obstacle positions

        // Meta progression (persistent across runs)
        this.credits = 0;
        this.totalCreditsEarned = 0;

        // Game time
        this.gameTime = 0; // Total game time in seconds
        this.deltaTime = 0; // Time since last frame
    }

    /**
     * Add a player to the game
     */
    addPlayer(playerId, characterKey) {
        const player = new PlayerState(playerId, characterKey);
        this.players.set(playerId, player);

        // Set as local player if first player
        if (this.localPlayerId === null) {
            this.localPlayerId = playerId;
        }

        return player;
    }

    /**
     * Get player by ID
     */
    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    /**
     * Get local player (the player controlled by this client)
     */
    getLocalPlayer() {
        return this.players.get(this.localPlayerId);
    }

    /**
     * Get all players
     */
    getAllPlayers() {
        return Array.from(this.players.values());
    }

    /**
     * Add an entity to the game
     */
    addEntity(type, x, y, data = {}) {
        const id = this.generateEntityId();
        const entity = new EntityState(id, type, x, y, data);
        this.entities.set(id, entity);
        return entity;
    }

    /**
     * Get entity by ID
     */
    getEntity(id) {
        return this.entities.get(id);
    }

    /**
     * Get all entities of a specific type
     */
    getEntitiesByType(type) {
        return Array.from(this.entities.values()).filter(e => e.type === type && !e.removed);
    }

    /**
     * Remove entity
     */
    removeEntity(id) {
        const entity = this.entities.get(id);
        if (entity) {
            entity.removed = true;
        }
    }

    /**
     * Clean up removed entities
     */
    cleanupRemovedEntities() {
        for (const [id, entity] of this.entities.entries()) {
            if (entity.removed) {
                this.entities.delete(id);
            }
        }
    }

    /**
     * Update game time
     */
    updateTime(dt) {
        this.deltaTime = dt;
        this.gameTime += dt;
    }

    /**
     * Progress to next room
     */
    nextRoom() {
        this.currentRoom++;
        this.roomCleared = false;
    }

    /**
     * Progress to next floor
     */
    nextFloor() {
        this.currentFloor++;
        this.currentRoom = 1;
        this.floorComplete = false;
        this.roomCleared = false;
    }

    /**
     * Mark current room as cleared
     */
    clearRoom() {
        this.roomCleared = true;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique entity ID
     */
    generateEntityId() {
        return this.nextEntityId++;
    }

    /**
     * Serialize entire game state to JSON
     * This can be sent over network or saved to disk
     */
    toJSON() {
        return {
            sessionId: this.sessionId,
            gameMode: this.gameMode,
            isPaused: this.isPaused,
            currentFloor: this.currentFloor,
            currentRoom: this.currentRoom,
            roomCleared: this.roomCleared,
            players: Array.from(this.players.entries()).map(([id, player]) => [id, player.toJSON()]),
            entities: Array.from(this.entities.entries()).map(([id, entity]) => [id, entity.toJSON()]),
            doors: this.doors,
            obstacles: this.obstacles,
            gameTime: this.gameTime,
            localPlayerId: this.localPlayerId,
            nextEntityId: this.nextEntityId
        };
    }

    /**
     * Create GameState from JSON
     * Used for loading saves or receiving state from server
     */
    static fromJSON(json) {
        const state = new GameState();
        state.sessionId = json.sessionId;
        state.gameMode = json.gameMode;
        state.isPaused = json.isPaused;
        state.currentFloor = json.currentFloor;
        state.currentRoom = json.currentRoom;
        state.roomCleared = json.roomCleared;
        state.gameTime = json.gameTime;
        state.localPlayerId = json.localPlayerId;
        state.nextEntityId = json.nextEntityId;

        // Restore players
        state.players = new Map(json.players.map(([id, playerJson]) =>
            [id, PlayerState.fromJSON(playerJson)]
        ));

        // Restore entities
        state.entities = new Map(json.entities.map(([id, entityJson]) =>
            [id, EntityState.fromJSON(entityJson)]
        ));

        state.doors = json.doors;
        state.obstacles = json.obstacles;

        return state;
    }

    /**
     * Create a snapshot of current state (for rollback/replay)
     */
    snapshot() {
        return JSON.parse(JSON.stringify(this.toJSON()));
    }

    /**
     * Reset state for new game
     */
    reset() {
        this.currentFloor = 1;
        this.currentRoom = 1;
        this.roomCleared = false;
        this.floorComplete = false;
        this.players.clear();
        this.entities.clear();
        this.doors = [];
        this.obstacles = [];
        this.gameTime = 0;
        this.nextEntityId = 1;
    }
}

/**
 * Singleton State Manager
 * Provides global access to game state
 */
class StateManager {
    constructor() {
        this.gameState = null;
    }

    /**
     * Initialize new game state
     */
    init(gameMode = 'singleplayer') {
        this.gameState = new GameState();
        this.gameState.gameMode = gameMode;
        return this.gameState;
    }

    /**
     * Get current game state
     */
    getState() {
        if (!this.gameState) {
            throw new Error('GameState not initialized! Call StateManager.init() first.');
        }
        return this.gameState;
    }

    /**
     * Load state from JSON
     */
    loadState(json) {
        this.gameState = GameState.fromJSON(json);
        return this.gameState;
    }

    /**
     * Clear state
     */
    clear() {
        this.gameState = null;
    }
}

// Export singleton instance
export const stateManager = new StateManager();
