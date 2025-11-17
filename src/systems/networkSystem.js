/**
 * Network System - P2P Multiplayer using PeerJS
 * Handles connections, message passing, and state synchronization
 */

// Network state
const network = {
    peer: null,              // Our Peer instance
    connections: new Map(),  // Map of peerId -> DataConnection
    isHost: true,            // Are we the host?
    hostId: null,            // Host's peer ID (null if we're host)
    hostConnection: null,    // Connection to host (null if we're host)
    messageHandlers: new Map(), // Message type -> handler function
    connectionCallbacks: [], // Callbacks for when someone joins/leaves
    isInitialized: false,
    peerId: null            // Our peer ID (same as invite code for host)
};

/**
 * Initialize the network system
 * @param {string} inviteCode - Our invite code (will be our Peer ID if host)
 * @param {boolean} isHost - Whether we're the host
 * @returns {Promise} Resolves when peer is ready
 */
export function initNetwork(inviteCode, isHost = true) {
    return new Promise((resolve, reject) => {
        if (network.isInitialized) {
            console.warn('Network already initialized');
            resolve();
            return;
        }

        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            disconnect();
        });

        // Check if PeerJS is available
        if (typeof Peer === 'undefined') {
            console.error('PeerJS library not loaded');
            reject(new Error('PeerJS library not available'));
            return;
        }

        network.isHost = isHost;

        // Create peer with invite code as ID (for host) or random ID (for client)
        const peerId = isHost ? `smash-${inviteCode}` : undefined;

        try {
            network.peer = new Peer(peerId, {
                debug: 0, // Disable verbose logging
                config: {
                    iceServers: [
                        // STUN servers - help discover public IP addresses
                        { urls: 'stun:stun.l.google.com:19302' },

                        // TURN servers - relay traffic when direct P2P fails (critical for NAT traversal)
                        // Using free public TURN servers from OpenRelay (Metered)
                        // NOTE: For production, consider setting up your own TURN server or using a paid service
                        // Free public servers may have rate limits and reliability issues
                        {
                            urls: 'turn:openrelay.metered.ca:80',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                    ]
                }
            });

            network.peer.on('open', (id) => {
                console.log('Peer initialized with ID:', id);
                network.peerId = id;
                network.isInitialized = true;
                resolve(id);
            });

            network.peer.on('error', (err) => {
                console.error('Peer error:', err);

                // Handle unavailable-id error (peer ID already taken)
                if (err.type === 'unavailable-id') {
                    console.warn('Peer ID already taken - attempting cleanup and retry...');
                    // Destroy the peer and retry after a short delay
                    if (network.peer) {
                        network.peer.destroy();
                    }
                    setTimeout(() => {
                        console.log('Retrying peer initialization...');
                        initNetwork(inviteCode, isHost).then(resolve).catch(reject);
                    }, 1000);
                    return;
                }

                // Provide user-friendly error messages
                if (err.type === 'network') {
                    console.warn('PeerJS server unavailable - multiplayer disabled');
                } else if (err.type === 'peer-unavailable') {
                    console.warn('Host not found - check invite code');
                } else if (err.type === 'server-error') {
                    console.warn('PeerJS server error - multiplayer may be unavailable');
                }

                if (!network.isInitialized) {
                    reject(new Error(`Multiplayer unavailable: ${err.type || 'connection failed'}`));
                }
            });

            // Host listens for incoming connections
            if (isHost) {
                network.peer.on('connection', (conn) => {
                    console.log('Incoming connection from:', conn.peer);
                    handleIncomingConnection(conn);
                });
            }

        } catch (err) {
            console.error('Failed to create peer:', err);
            reject(err);
        }
    });
}

/**
 * Handle an incoming connection (host only)
 */
function handleIncomingConnection(conn) {
    if (!network.isHost) return;

    conn.on('open', () => {
        console.log('Connection opened with:', conn.peer);
        network.connections.set(conn.peer, conn);

        // Notify callbacks
        network.connectionCallbacks.forEach(cb => cb('join', conn.peer));
    });

    conn.on('data', (data) => {
        handleMessage(data, conn.peer);
    });

    conn.on('close', () => {
        console.log('Connection closed with:', conn.peer);
        network.connections.delete(conn.peer);

        // Notify callbacks
        network.connectionCallbacks.forEach(cb => cb('leave', conn.peer));
    });

    conn.on('error', (err) => {
        console.error('Connection error with', conn.peer, ':', err);
    });
}

/**
 * Connect to a host as a client
 * @param {string} hostInviteCode - The host's 6-digit invite code
 * @returns {Promise} Resolves when connected
 */
export function connectToHost(hostInviteCode) {
    return new Promise((resolve, reject) => {
        if (network.isHost) {
            reject(new Error('Host cannot connect to another host'));
            return;
        }

        if (!network.isInitialized) {
            reject(new Error('Network not initialized'));
            return;
        }

        const hostPeerId = `smash-${hostInviteCode}`;
        console.log('[NetworkSystem] Attempting to connect to host:', hostPeerId);
        console.log('[NetworkSystem] Using STUN/TURN servers for NAT traversal...');

        // Add connection timeout
        let connectionTimeout;
        let isResolved = false;

        const conn = network.peer.connect(hostPeerId, {
            reliable: true
        });

        // Set timeout for connection attempt (30 seconds)
        connectionTimeout = setTimeout(() => {
            if (!isResolved) {
                console.error('[NetworkSystem] Connection timeout - host may be offline or unreachable');
                console.error('[NetworkSystem] This could be due to:');
                console.error('  - Host not found (wrong code or host offline)');
                console.error('  - Firewall blocking connection');
                console.error('  - NAT traversal failure (TURN servers may be overloaded)');
                conn.close();
                reject(new Error('Connection timeout - could not reach host'));
            }
        }, 30000);

        conn.on('open', () => {
            isResolved = true;
            clearTimeout(connectionTimeout);
            console.log('[NetworkSystem] Successfully connected to host!');
            network.hostConnection = conn;
            network.hostId = hostPeerId;

            // Don't send join_request here - partySystem.js will send it with full player info
            resolve();
        });

        conn.on('data', (data) => {
            handleMessage(data, hostPeerId);
        });

        conn.on('close', () => {
            console.log('[NetworkSystem] Disconnected from host');
            network.hostConnection = null;
            network.hostId = null;

            // Notify callbacks
            network.connectionCallbacks.forEach(cb => cb('host_disconnect'));
        });

        conn.on('error', (err) => {
            isResolved = true;
            clearTimeout(connectionTimeout);
            console.error('[NetworkSystem] Connection error:', err);
            console.error('[NetworkSystem] Error type:', err.type || 'unknown');
            reject(err);
        });
    });
}

/**
 * Handle incoming message
 */
function handleMessage(data, fromPeerId) {
    if (!data || !data.type) {
        console.warn('Invalid message:', data);
        return;
    }

    const handler = network.messageHandlers.get(data.type);
    if (handler) {
        handler(data.payload, fromPeerId);
    } else {
        console.warn('No handler for message type:', data.type);
    }
}

/**
 * Register a message handler
 * @param {string} messageType - Type of message to handle
 * @param {Function} handler - Handler function (payload, fromPeerId) => void
 */
export function onMessage(messageType, handler) {
    network.messageHandlers.set(messageType, handler);
}

/**
 * Register a connection callback
 * @param {Function} callback - Callback function (event, peerId) => void
 *                              event can be 'join', 'leave', 'host_disconnect'
 */
export function onConnectionChange(callback) {
    // Prevent duplicate callbacks
    if (!network.connectionCallbacks.includes(callback)) {
        network.connectionCallbacks.push(callback);
    }
}

/**
 * Send message to host (client only)
 * @param {string} type - Message type
 * @param {any} payload - Message payload
 */
export function sendToHost(type, payload) {
    if (network.isHost) {
        console.warn('Host cannot send to itself');
        return;
    }

    if (!network.hostConnection) {
        console.warn('Not connected to host');
        return;
    }

    network.hostConnection.send({ type, payload });
}

/**
 * Send message to specific peer (host only)
 * @param {string} peerId - Target peer ID
 * @param {string} type - Message type
 * @param {any} payload - Message payload
 */
export function sendToPeer(peerId, type, payload) {
    if (!network.isHost) {
        console.warn('Only host can send to specific peers');
        return;
    }

    const conn = network.connections.get(peerId);
    if (conn) {
        conn.send({ type, payload });
    } else {
        console.warn('No connection to peer:', peerId);
    }
}

/**
 * Broadcast message to all connected peers (host only)
 * @param {string} type - Message type
 * @param {any} payload - Message payload
 * @param {string[]} excludePeerIds - Peer IDs to exclude from broadcast
 */
export function broadcast(type, payload, excludePeerIds = []) {
    if (!network.isHost) {
        console.warn('Only host can broadcast');
        return;
    }

    network.connections.forEach((conn, peerId) => {
        if (!excludePeerIds.includes(peerId)) {
            conn.send({ type, payload });
        }
    });
}

/**
 * Disconnect from network
 */
export function disconnect() {
    // Close all connections
    if (network.isHost) {
        network.connections.forEach(conn => conn.close());
        network.connections.clear();
    } else if (network.hostConnection) {
        network.hostConnection.close();
        network.hostConnection = null;
        network.hostId = null;
    }

    // Destroy peer
    if (network.peer) {
        network.peer.destroy();
        network.peer = null;
    }

    // Clear handlers and callbacks to prevent memory leaks
    network.messageHandlers.clear();
    network.connectionCallbacks = [];

    network.isInitialized = false;
    network.peerId = null;
}

/**
 * Get network state info
 */
export function getNetworkInfo() {
    return {
        isInitialized: network.isInitialized,
        isHost: network.isHost,
        peerId: network.peerId,
        hostId: network.hostId,
        connectedPeers: Array.from(network.connections.keys()),
        peerCount: network.connections.size
    };
}

/**
 * Check if we're connected to the network
 */
export function isConnected() {
    if (network.isHost) {
        return network.isInitialized;
    } else {
        return network.hostConnection !== null;
    }
}

/**
 * Get all connected peer IDs (host only)
 */
export function getConnectedPeers() {
    if (!network.isHost) return [];
    return Array.from(network.connections.keys());
}
