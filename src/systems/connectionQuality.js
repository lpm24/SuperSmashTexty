/**
 * Connection Quality Indicator System
 *
 * Measures and displays latency/ping for multiplayer connections.
 * Provides visual feedback on connection quality.
 */

import { onMessage, sendToPeer, sendToHost, getNetworkInfo } from './networkSystem.js';
import { isHost, isMultiplayerActive } from './multiplayerGame.js';

// Connection quality state
const connectionState = {
    // Map of peerId -> { latency, lastPingTime, pingId }
    peers: new Map(),
    localLatency: 0,
    pingInterval: 2000, // Ping every 2 seconds
    pingTimeout: 5000, // Consider disconnected after 5s without response
    lastPingId: 0,
    lastPingSentTime: 0,
    handlersRegistered: false
};

// Quality thresholds (in ms)
const QUALITY_THRESHOLDS = {
    GOOD: 100,      // < 100ms = green
    MEDIUM: 200,    // 100-200ms = yellow
    POOR: 500       // > 200ms = red, > 500ms = critical
};

/**
 * Initialize connection quality monitoring
 * Call this when multiplayer starts
 */
export function initConnectionQuality() {
    if (connectionState.handlersRegistered) return;
    connectionState.handlersRegistered = true;

    // Handle ping requests (respond with pong)
    onMessage('ping', (payload, fromPeerId) => {
        // Respond immediately with the same ping ID
        if (isHost()) {
            sendToPeer(fromPeerId, 'pong', { pingId: payload.pingId, serverTime: Date.now() });
        } else {
            sendToHost('pong', { pingId: payload.pingId, serverTime: Date.now() });
        }
    });

    // Handle pong responses (calculate latency)
    onMessage('pong', (payload, fromPeerId) => {
        const now = Date.now();
        const pingId = payload.pingId;

        if (isHost()) {
            // Host received pong from a client
            const peerState = connectionState.peers.get(fromPeerId);
            if (peerState && peerState.pingId === pingId) {
                const latency = now - peerState.lastPingTime;
                peerState.latency = latency;
            }
        } else {
            // Client received pong from host
            if (connectionState.lastPingId === pingId) {
                connectionState.localLatency = now - connectionState.lastPingSentTime;
            }
        }
    });
}

/**
 * Send a ping to measure latency
 * Call this periodically (e.g., every 2 seconds)
 * @param {string} peerId - Peer ID to ping (host only, for clients leave empty)
 */
export function sendPing(peerId = null) {
    const pingId = Date.now();

    if (isHost() && peerId) {
        // Host pinging a specific client
        let peerState = connectionState.peers.get(peerId);
        if (!peerState) {
            peerState = { latency: 0, lastPingTime: 0, pingId: 0 };
            connectionState.peers.set(peerId, peerState);
        }
        peerState.pingId = pingId;
        peerState.lastPingTime = Date.now();
        sendToPeer(peerId, 'ping', { pingId });
    } else if (!isHost()) {
        // Client pinging host
        connectionState.lastPingId = pingId;
        connectionState.lastPingSentTime = Date.now();
        sendToHost('ping', { pingId });
    }
}

/**
 * Get latency for a specific peer (host only)
 * @param {string} peerId - Peer ID
 * @returns {number} - Latency in ms (0 if unknown)
 */
export function getPeerLatency(peerId) {
    const peerState = connectionState.peers.get(peerId);
    return peerState ? peerState.latency : 0;
}

/**
 * Get local latency to host (client only)
 * @returns {number} - Latency in ms
 */
export function getLocalLatency() {
    return connectionState.localLatency;
}

/**
 * Get quality level from latency
 * @param {number} latencyMs - Latency in milliseconds
 * @returns {string} - 'good', 'medium', 'poor', or 'critical'
 */
export function getQualityLevel(latencyMs) {
    if (latencyMs < QUALITY_THRESHOLDS.GOOD) return 'good';
    if (latencyMs < QUALITY_THRESHOLDS.MEDIUM) return 'medium';
    if (latencyMs < QUALITY_THRESHOLDS.POOR) return 'poor';
    return 'critical';
}

/**
 * Get quality icon based on latency
 * @param {number} latencyMs - Latency in milliseconds
 * @returns {Object} - { icon: string, color: number[] }
 */
export function getQualityIcon(latencyMs) {
    const quality = getQualityLevel(latencyMs);

    switch (quality) {
        case 'good':
            return { icon: '●', color: [100, 255, 100] }; // Green
        case 'medium':
            return { icon: '●', color: [255, 255, 100] }; // Yellow
        case 'poor':
            return { icon: '●', color: [255, 150, 100] }; // Orange
        case 'critical':
            return { icon: '●', color: [255, 100, 100] }; // Red
        default:
            return { icon: '○', color: [150, 150, 150] }; // Gray (unknown)
    }
}

/**
 * Get formatted latency string
 * @param {number} latencyMs - Latency in milliseconds
 * @returns {string} - Formatted latency (e.g., "45ms")
 */
export function formatLatency(latencyMs) {
    if (latencyMs <= 0) return '?ms';
    return `${Math.round(latencyMs)}ms`;
}

/**
 * Get all peer latencies (host only)
 * @returns {Map<string, number>} - Map of peerId -> latency
 */
export function getAllPeerLatencies() {
    const latencies = new Map();
    connectionState.peers.forEach((state, peerId) => {
        latencies.set(peerId, state.latency);
    });
    return latencies;
}

/**
 * Clear connection state for a peer
 * @param {string} peerId - Peer ID to clear
 */
export function clearPeerConnection(peerId) {
    connectionState.peers.delete(peerId);
}

/**
 * Reset all connection quality state
 */
export function resetConnectionQuality() {
    connectionState.peers.clear();
    connectionState.localLatency = 0;
    connectionState.lastPingId = 0;
    connectionState.lastPingSentTime = 0;
}

/**
 * Update connection quality display for all players
 * Should be called in the game's update loop
 * @param {Object} k - Kaplay instance
 * @param {Function} getConnectedPeers - Function to get connected peer IDs
 */
export function updateConnectionQuality(k, getConnectedPeers) {
    if (!isMultiplayerActive()) return;

    const now = Date.now();

    // Only ping every interval
    if (now - connectionState.lastPingSentTime < connectionState.pingInterval) {
        return;
    }

    if (isHost()) {
        // Host: ping all connected clients
        const peers = getConnectedPeers();
        peers.forEach(peerId => {
            sendPing(peerId);
        });
    } else {
        // Client: ping host
        sendPing();
    }
}
