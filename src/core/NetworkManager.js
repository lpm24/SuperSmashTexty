/**
 * Network Manager
 *
 * Abstraction layer for multiplayer networking.
 * Currently a placeholder/interface for future implementation.
 *
 * Future implementations could use:
 * - WebRTC (peer-to-peer)
 * - WebSocket (client-server)
 * - Photon, Colyseus, or other game networking libraries
 *
 * For now, this provides the interface and defaults to local-only mode.
 */

/**
 * Network message types
 */
export const MessageType = {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',

    // Game state
    STATE_SYNC: 'state_sync',
    STATE_UPDATE: 'state_update',

    // Player input
    INPUT: 'input',
    INPUT_ACK: 'input_ack',

    // Game events
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    GAME_START: 'game_start',
    GAME_END: 'game_end',

    // Chat (future)
    CHAT_MESSAGE: 'chat_message'
};

/**
 * Network message
 */
export class NetworkMessage {
    constructor(type, data, senderId = null) {
        this.type = type;
        this.data = data;
        this.senderId = senderId;
        this.timestamp = Date.now();
    }

    toJSON() {
        return {
            type: this.type,
            data: this.data,
            senderId: this.senderId,
            timestamp: this.timestamp
        };
    }

    static fromJSON(json) {
        const msg = new NetworkMessage(json.type, json.data, json.senderId);
        msg.timestamp = json.timestamp;
        return msg;
    }
}

/**
 * Network Manager
 * Handles all network communication for multiplayer
 */
export class NetworkManager {
    constructor() {
        // Connection state
        this.isConnected = false;
        this.isHost = false;
        this.localPlayerId = null;
        this.sessionId = null;

        // Connected players
        this.players = new Map(); // playerId -> playerInfo

        // Message queue
        this.messageQueue = [];

        // Event handlers
        this.eventHandlers = new Map();

        // Network mode
        this.mode = 'local'; // 'local' | 'client' | 'host'
    }

    /**
     * Initialize network manager
     */
    init(mode = 'local') {
        this.mode = mode;
        this.localPlayerId = this.generatePlayerId();

        // For local mode, immediately "connect"
        if (mode === 'local') {
            this.isConnected = true;
            this.isHost = true;
            this.sessionId = this.generateSessionId();
            this.addPlayer(this.localPlayerId, { name: 'Player 1', isLocal: true });
        }

        return this.localPlayerId;
    }

    /**
     * Connect to a game session
     * Future: Implement actual WebRTC/WebSocket connection
     */
    async connect(sessionId = null) {
        if (this.mode === 'local') {
            // Already connected in local mode
            return true;
        }

        // TODO: Implement actual network connection
        // For now, just simulate connection
        this.isConnected = true;
        this.sessionId = sessionId || this.generateSessionId();

        this.emit('connected', { sessionId: this.sessionId });
        return true;
    }

    /**
     * Disconnect from game session
     */
    disconnect() {
        if (this.isConnected) {
            this.emit('disconnected');

            // TODO: Close actual network connection

            this.isConnected = false;
            this.players.clear();
            this.messageQueue = [];
        }
    }

    /**
     * Send message to remote players
     * Future: Implement actual network send
     */
    send(type, data) {
        const message = new NetworkMessage(type, data, this.localPlayerId);

        if (this.mode === 'local') {
            // In local mode, no need to send anywhere
            return;
        }

        // TODO: Implement actual network send
        // For now, just log
        console.log('[Network] Send:', message);

        // Simulate message send
        this.messageQueue.push(message);
    }

    /**
     * Broadcast message to all players
     */
    broadcast(type, data) {
        this.send(type, data);
    }

    /**
     * Send message to specific player
     */
    sendTo(playerId, type, data) {
        const message = new NetworkMessage(type, data, this.localPlayerId);
        // TODO: Implement targeted send
        console.log(`[Network] SendTo ${playerId}:`, message);
    }

    /**
     * Receive and process messages
     * Called each frame to process incoming messages
     */
    receive() {
        const messages = [...this.messageQueue];
        this.messageQueue = [];

        for (const message of messages) {
            this.handleMessage(message);
        }

        return messages;
    }

    /**
     * Handle incoming message
     */
    handleMessage(message) {
        // Emit event for message type
        this.emit(message.type, message.data, message.senderId);

        // Handle specific message types
        switch (message.type) {
            case MessageType.PLAYER_JOINED:
                this.addPlayer(message.senderId, message.data);
                break;
            case MessageType.PLAYER_LEFT:
                this.removePlayer(message.senderId);
                break;
            // Add more handlers as needed
        }
    }

    /**
     * Add player to session
     */
    addPlayer(playerId, playerInfo) {
        this.players.set(playerId, {
            id: playerId,
            ...playerInfo,
            joinedAt: Date.now()
        });

        this.emit('playerJoined', { playerId, playerInfo });
    }

    /**
     * Remove player from session
     */
    removePlayer(playerId) {
        const playerInfo = this.players.get(playerId);
        this.players.delete(playerId);

        this.emit('playerLeft', { playerId, playerInfo });
    }

    /**
     * Get all connected players
     */
    getPlayers() {
        return Array.from(this.players.values());
    }

    /**
     * Check if player is connected
     */
    isPlayerConnected(playerId) {
        return this.players.has(playerId);
    }

    /**
     * Register event handler
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    /**
     * Unregister event handler
     */
    off(eventType, handler) {
        if (this.eventHandlers.has(eventType)) {
            const handlers = this.eventHandlers.get(eventType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    emit(eventType, data, senderId = null) {
        if (this.eventHandlers.has(eventType)) {
            const handlers = this.eventHandlers.get(eventType);
            for (const handler of handlers) {
                handler(data, senderId);
            }
        }
    }

    /**
     * Generate unique player ID
     */
    generatePlayerId() {
        return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get latency/ping (future)
     */
    getPing() {
        return 0; // Local mode has no latency
    }

    /**
     * Check if this client is the host
     */
    isHostClient() {
        return this.isHost;
    }

    /**
     * Get local player ID
     */
    getLocalPlayerId() {
        return this.localPlayerId;
    }

    /**
     * Clear network state
     */
    clear() {
        this.disconnect();
        this.eventHandlers.clear();
    }
}

/**
 * Singleton Network Manager
 */
class NetworkManagerSingleton {
    constructor() {
        this.networkManager = null;
    }

    /**
     * Initialize network manager
     */
    init(mode = 'local') {
        this.networkManager = new NetworkManager();
        return this.networkManager.init(mode);
    }

    /**
     * Get current network manager
     */
    getManager() {
        if (!this.networkManager) {
            throw new Error('NetworkManager not initialized! Call NetworkManager.init() first.');
        }
        return this.networkManager;
    }

    /**
     * Clear network manager
     */
    clear() {
        if (this.networkManager) {
            this.networkManager.clear();
        }
        this.networkManager = null;
    }
}

// Export singleton instance
export const networkManager = new NetworkManagerSingleton();
