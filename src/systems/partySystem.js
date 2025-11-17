/**
 * Party System
 * Manages multiplayer party state and joining
 */

import { getPlayerName, getInviteCode, getSelectedCharacter } from './metaProgression.js';
import {
    initNetwork,
    connectToHost,
    onMessage,
    onConnectionChange,
    broadcast,
    sendToHost,
    sendToPeer,
    getConnectedPeers,
    getNetworkInfo
} from './networkSystem.js';
import { sendInitialGameState } from './multiplayerGame.js';

// Party state
const party = {
    slots: [
        { playerId: 'local', playerName: null, inviteCode: null, selectedCharacter: null, isLocal: true, peerId: null }, // Slot 1: Local player
        { playerId: null, playerName: null, inviteCode: null, selectedCharacter: null, isLocal: false, peerId: null }, // Slot 2: Empty
        { playerId: null, playerName: null, inviteCode: null, selectedCharacter: null, isLocal: false, peerId: null }, // Slot 3: Empty
        { playerId: null, playerName: null, inviteCode: null, selectedCharacter: null, isLocal: false, peerId: null }  // Slot 4: Empty
    ],
    isHost: true, // Local player is always the host for now
    maxSlots: 4,
    peerIdToSlot: new Map(), // Map peer IDs to slot indices
    networkInitialized: false,
    kaplayInstance: null // Reference to kaplay instance for client game start
};

/**
 * Initialize party system
 * @param {Object} k - Kaplay instance (optional, used for client game start)
 */
export async function initParty(k = null) {
    // Store kaplay instance for client game start
    if (k) {
        party.kaplayInstance = k;
    }

    // Set local player info in slot 1
    party.slots[0].playerName = getPlayerName();
    party.slots[0].inviteCode = getInviteCode();
    party.slots[0].selectedCharacter = getSelectedCharacter();

    // Initialize network as host so other players can connect
    // This is needed because we display the invite code in the UI,
    // meaning we're always potentially hosting
    if (!party.networkInitialized) {
        try {
            console.log('[PartySystem] Initializing network as host...');
            const inviteCode = getInviteCode();
            await initNetwork(inviteCode, true);
            party.networkInitialized = true;
            party.isHost = true;
            setupNetworkHandlers();
            console.log('[PartySystem] Network initialized as host - ready to accept connections');
        } catch (err) {
            console.error('[PartySystem] Failed to initialize network as host:', err);
            console.log('[PartySystem] Multiplayer disabled - running in single-player mode');
            // Continue anyway - single-player will still work
        }
    }
}

/**
 * Set up network message handlers (for host)
 */
export function setupNetworkHandlers() {
    // Handle join requests from clients
    onMessage('join_request', (payload, fromPeerId) => {
        console.log('[PartySystem] Join request from:', fromPeerId);
        console.log('[PartySystem] Payload:', {
            playerName: payload.playerName,
            inviteCode: payload.inviteCode,
            selectedCharacter: payload.selectedCharacter
        });

        // Validate payload has required data
        if (!payload.playerName) {
            console.warn('[PartySystem] Join request missing playerName, using default');
        }

        // Add player to party
        const slotIndex = addPlayerToPartyFromNetwork(
            payload.playerName || 'Player',
            payload.inviteCode || '000000',
            payload.selectedCharacter || 'survivor',
            fromPeerId
        );

        if (slotIndex !== null) {
            // Send party sync to the new player
            sendToPeer(fromPeerId, 'party_sync', {
                slots: party.slots.map(slot => ({
                    playerId: slot.playerId,
                    playerName: slot.playerName,
                    inviteCode: slot.inviteCode,
                    selectedCharacter: slot.selectedCharacter,
                    isLocal: false // All remote for the client
                })),
                yourSlotIndex: slotIndex
            });

            // Send immediate game state if in-game (don't wait for next broadcast cycle)
            // This helps clients joining mid-game see entities immediately
            setTimeout(() => {
                sendInitialGameState(fromPeerId);
            }, 100); // Small delay to ensure client is ready to receive

            // Broadcast updated party to all other clients
            broadcastPartyUpdate();
        } else {
            // Party full - send rejection
            sendToPeer(fromPeerId, 'join_rejected', { reason: 'Party full' });
        }
    });

    // Handle player info updates from clients
    onMessage('player_info', (payload, fromPeerId) => {
        const slotIndex = party.peerIdToSlot.get(fromPeerId);
        if (slotIndex !== undefined) {
            if (payload.playerName) {
                party.slots[slotIndex].playerName = payload.playerName;
            }
            broadcastPartyUpdate();
        }
    });

    // Handle character changes from clients
    onMessage('character_change', (payload, fromPeerId) => {
        const slotIndex = party.peerIdToSlot.get(fromPeerId);
        if (slotIndex !== undefined) {
            console.log(`[PartySystem] Player in slot ${slotIndex} changed character to:`, payload.selectedCharacter);
            party.slots[slotIndex].selectedCharacter = payload.selectedCharacter;
            broadcastPartyUpdate();
        }
    });

    // Handle connection changes
    onConnectionChange((event, peerId) => {
        if (event === 'leave') {
            handlePlayerDisconnect(peerId);
        }
    });
}

/**
 * Get party state
 * @returns {object} Party state
 */
export function getParty() {
    return party;
}

/**
 * Get local player
 * @returns {object} Local player slot
 */
export function getLocalPlayer() {
    return party.slots[0];
}

/**
 * Get party size (number of players)
 * @returns {number} Number of players in party
 */
export function getPartySize() {
    return party.slots.filter(slot => slot.playerId !== null).length;
}

/**
 * Check if party is full
 * @returns {boolean} True if all slots filled
 */
export function isPartyFull() {
    return getPartySize() >= party.maxSlots;
}

/**
 * Add player to party (when they join via code) - LEGACY, use joinPartyAsClient
 * @param {string} playerName - Player name
 * @param {string} inviteCode - Player invite code
 * @returns {number|null} Slot index if successful, null if party full
 */
export function addPlayerToParty(playerName, inviteCode) {
    // Find first empty slot
    for (let i = 1; i < party.slots.length; i++) {
        if (party.slots[i].playerId === null) {
            party.slots[i].playerId = `player_${Date.now()}_${i}`;
            party.slots[i].playerName = playerName;
            party.slots[i].inviteCode = inviteCode;
            return i;
        }
    }
    return null; // Party full
}

/**
 * Add player to party from network (host only)
 * @param {string} playerName - Player name
 * @param {string} inviteCode - Player invite code
 * @param {string} selectedCharacter - Player's selected character key
 * @param {string} peerId - Peer ID of the joining player
 * @returns {number|null} Slot index if successful, null if party full
 */
function addPlayerToPartyFromNetwork(playerName, inviteCode, selectedCharacter, peerId) {
    // Find first empty slot
    for (let i = 1; i < party.slots.length; i++) {
        if (party.slots[i].playerId === null) {
            party.slots[i].playerId = `player_${Date.now()}_${i}`;
            party.slots[i].playerName = playerName;
            party.slots[i].inviteCode = inviteCode;
            party.slots[i].selectedCharacter = selectedCharacter;
            party.slots[i].peerId = peerId;
            party.peerIdToSlot.set(peerId, i);
            return i;
        }
    }
    return null; // Party full
}

/**
 * Join a party as a client
 * @param {string} hostInviteCode - Host's 6-digit invite code
 * @returns {Promise<boolean>} True if successfully joined
 */
export async function joinPartyAsClient(hostInviteCode) {
    try {
        // If we were initialized as host, we need to disconnect and re-initialize as client
        if (party.networkInitialized && party.isHost) {
            console.log('[PartySystem] Switching from host to client - disconnecting current peer...');
            const { disconnect: disconnectNetwork } = await import('./networkSystem.js');
            disconnectNetwork();
            party.networkInitialized = false;
            party.isHost = false;

            // Clear party slots - they'll be repopulated by party_sync from the actual host
            for (let i = 0; i < party.slots.length; i++) {
                party.slots[i] = {
                    playerId: null,
                    playerName: null,
                    inviteCode: null,
                    selectedCharacter: null,
                    isLocal: false,
                    peerId: null
                };
            }
        }

        // Initialize network as client
        if (!party.networkInitialized) {
            await initNetwork('client', false);
            party.networkInitialized = true;
            party.isHost = false;
        }

        // Set up client message handlers
        setupClientHandlers();

        // Connect to host
        await connectToHost(hostInviteCode);

        // Send our player info including selected character
        sendToHost('join_request', {
            playerName: getPlayerName(),
            inviteCode: getInviteCode(),
            selectedCharacter: getSelectedCharacter()
        });

        return true;
    } catch (err) {
        console.error('Failed to join party:', err);
        return false;
    }
}

/**
 * Set up network message handlers for client
 */
function setupClientHandlers() {
    // Receive party state from host
    onMessage('party_sync', (payload) => {
        console.log('Received party sync:', payload);

        // Update our party state
        party.slots = payload.slots;

        // Mark our own slot as local
        if (payload.yourSlotIndex !== undefined) {
            party.slots[payload.yourSlotIndex].isLocal = true;
        }

        // Mark host's slot (slot 0) with host name
        party.slots[0].isLocal = false;
    });

    // Handle party updates
    onMessage('party_update', (payload) => {
        console.log('Received party update:', payload);
        party.slots = payload.slots;
    });

    // Handle join rejection
    onMessage('join_rejected', (payload) => {
        console.error('Join rejected:', payload.reason);
        alert(`Failed to join party: ${payload.reason}`);
    });

    // Handle game start from host
    onMessage('game_start', (payload) => {
        console.log('Host started game - joining...');
        // Automatically join the game when host starts
        if (party.kaplayInstance) {
            party.kaplayInstance.go('game', { resetState: true });
        } else {
            console.error('Cannot join game: Kaplay instance not available');
        }
    });

    // Handle host disconnect
    onConnectionChange((event) => {
        if (event === 'host_disconnect') {
            alert('Host disconnected');
            // Reset party state
            clearRemotePlayers();
        }
    });
}

/**
 * Broadcast party update to all clients (host only)
 */
function broadcastPartyUpdate() {
    if (!party.isHost) return;

    broadcast('party_update', {
        slots: party.slots.map(slot => ({
            playerId: slot.playerId,
            playerName: slot.playerName,
            inviteCode: slot.inviteCode,
            selectedCharacter: slot.selectedCharacter,
            isLocal: false // Always false for remote players
        }))
    });
}

/**
 * Broadcast game start to all clients (host only)
 */
export function broadcastGameStart() {
    if (!party.isHost) return;

    console.log('Broadcasting game start to all clients');
    broadcast('game_start', {});
}

/**
 * Handle player disconnect (host only)
 * @param {string} peerId - Peer ID of disconnected player
 */
function handlePlayerDisconnect(peerId) {
    const slotIndex = party.peerIdToSlot.get(peerId);
    if (slotIndex !== undefined) {
        console.log('Player disconnected from slot', slotIndex);
        removePlayerFromParty(slotIndex);
        party.peerIdToSlot.delete(peerId);
        broadcastPartyUpdate();
    }
}

/**
 * Remove player from party
 * @param {number} slotIndex - Slot to clear (1-3, can't remove slot 0)
 * @returns {boolean} True if successful
 */
export function removePlayerFromParty(slotIndex) {
    if (slotIndex > 0 && slotIndex < party.slots.length) {
        // Remove from peer map if present
        const peerId = party.slots[slotIndex].peerId;
        if (peerId) {
            party.peerIdToSlot.delete(peerId);
        }

        party.slots[slotIndex] = {
            playerId: null,
            playerName: null,
            inviteCode: null,
            selectedCharacter: null,
            isLocal: false,
            peerId: null
        };
        return true;
    }
    return false;
}

/**
 * Update local player name
 * @param {string} newName - New player name
 */
export function updateLocalPlayerName(newName) {
    party.slots[0].playerName = newName;
}

/**
 * Clear all remote players (used when disconnecting)
 */
export function clearRemotePlayers() {
    for (let i = 1; i < party.slots.length; i++) {
        removePlayerFromParty(i);
    }
}

/**
 * Get formatted party info for display
 * @returns {Array} Array of slot info for UI
 */
export function getPartyDisplayInfo() {
    return party.slots.map((slot, index) => ({
        slotNumber: index + 1,
        isEmpty: slot.playerId === null,
        playerName: slot.playerName || 'Empty Slot',
        isLocal: slot.isLocal,
        inviteCode: slot.inviteCode,
        selectedCharacter: slot.selectedCharacter || 'survivor'
    }));
}

/**
 * Check if multiplayer is available
 * @returns {boolean} True if multiplayer was successfully initialized
 */
export function isMultiplayerAvailable() {
    return party.networkInitialized;
}

/**
 * Broadcast local player's character change to all party members
 * @param {string} characterKey - The new character key (e.g., 'scout', 'tank')
 */
export function broadcastCharacterChange(characterKey) {
    // Update local slot
    party.slots[0].selectedCharacter = characterKey;

    if (!party.networkInitialized) {
        return; // No network, no need to broadcast
    }

    if (party.isHost) {
        // Host broadcasts to all clients
        broadcastPartyUpdate();
    } else {
        // Client sends to host
        sendToHost('character_change', {
            selectedCharacter: characterKey
        });
    }
}
