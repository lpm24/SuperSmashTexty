/**
 * Party System
 * Manages multiplayer party state and joining
 */

import { getPlayerName, getInviteCode, getSelectedCharacter, setInviteCode, getPermanentUpgradeLevel } from './metaProgression.js';
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
import { sendInitialGameState, handlePlayerDisconnect as cleanupDisconnectedPlayer } from './multiplayerGame.js';

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
    kaplayInstance: null, // Reference to kaplay instance for client game start
    hostInviteCode: null // The host's invite code (null if we are the host, or the code we joined if we're a client)
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

    // Only set local player info in slot 0 if we're the host
    // For clients, their slot info is set by party_sync from the host
    if (party.isHost) {
        const playerName = getPlayerName();
        const inviteCode = getInviteCode();
        const selectedCharacter = getSelectedCharacter();

        party.slots[0].playerId = 'local';
        party.slots[0].playerName = playerName || 'Player'; // Fallback if name not set
        party.slots[0].inviteCode = inviteCode || '000000'; // Fallback if code not set
        party.slots[0].selectedCharacter = selectedCharacter || 'survivor'; // Fallback if character not set
        party.slots[0].isLocal = true;
        party.slots[0].permanentUpgradeLevels = {
            startingHealth: getPermanentUpgradeLevel('startingHealth'),
            startingDamage: getPermanentUpgradeLevel('startingDamage'),
            startingSpeed: getPermanentUpgradeLevel('startingSpeed')
        };

        console.log('[PartySystem] Host player initialized in slot 0:', {
            name: party.slots[0].playerName,
            code: party.slots[0].inviteCode,
            character: party.slots[0].selectedCharacter
        });
    } else {
        console.log('[PartySystem] Client mode - preserving existing slot assignments');
    }

    // Initialize network as host so other players can connect
    // This is needed because we display the invite code in the UI,
    // meaning we're always potentially hosting
    if (!party.networkInitialized) {
        try {
            console.log('[PartySystem] Initializing network as host...');
            const inviteCode = getInviteCode();
            const actualCode = await initNetwork(inviteCode, true);

            // If the code changed (because it was taken), update it
            if (actualCode !== inviteCode) {
                console.log(`[PartySystem] Invite code changed: ${inviteCode} -> ${actualCode}`);
                setInviteCode(actualCode);
                party.slots[0].inviteCode = actualCode;
            }

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
            fromPeerId,
            payload.permanentUpgradeLevels || null
        );

        if (slotIndex !== null) {
            // Send party sync to the new player
            const partySyncData = {
                slots: party.slots.map(slot => ({
                    playerId: slot.playerId,
                    playerName: slot.playerName,
                    inviteCode: slot.inviteCode,
                    selectedCharacter: slot.selectedCharacter,
                    permanentUpgradeLevels: slot.permanentUpgradeLevels,
                    isLocal: false // All remote for the client
                })),
                yourSlotIndex: slotIndex
            };

            console.log('[PartySystem] Sending party_sync to new player:', {
                hostName: partySyncData.slots[0].playerName,
                hostCharacter: partySyncData.slots[0].selectedCharacter,
                newPlayerSlot: slotIndex
            });

            sendToPeer(fromPeerId, 'party_sync', partySyncData);

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

// Re-export helper functions from metaProgression for convenience
export { getPlayerName, getInviteCode, getSelectedCharacter };

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
 * Get the invite code to display in UI
 * Returns the host's code if we're a client, or our own code if we're the host
 * @returns {string} Invite code to display
 */
export function getDisplayInviteCode() {
    // If we're a client, show the host's code we joined
    if (!party.isHost && party.hostInviteCode) {
        return party.hostInviteCode;
    }
    // If we're the host, show our own code
    return getInviteCode();
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
function addPlayerToPartyFromNetwork(playerName, inviteCode, selectedCharacter, peerId, permanentUpgradeLevels = null) {
    // Find first empty slot
    for (let i = 1; i < party.slots.length; i++) {
        if (party.slots[i].playerId === null) {
            party.slots[i].playerId = `player_${Date.now()}_${i}`;
            party.slots[i].playerName = playerName;
            party.slots[i].inviteCode = inviteCode;
            party.slots[i].selectedCharacter = selectedCharacter;
            party.slots[i].peerId = peerId;
            party.slots[i].permanentUpgradeLevels = permanentUpgradeLevels;
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
    // Save local player info before clearing (for restoration on failure)
    const savedLocalPlayer = {
        playerName: getPlayerName(),
        inviteCode: getInviteCode(),
        selectedCharacter: getSelectedCharacter()
    };

    try {
        // Always clear party slots when joining as client - they'll be repopulated by party_sync
        console.log('[PartySystem] Joining as client - clearing all party slots');
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

        // If we were initialized as host, disconnect and re-initialize as client
        if (party.networkInitialized && party.isHost) {
            console.log('[PartySystem] Switching from host to client - disconnecting current peer...');
            const { disconnect: disconnectNetwork } = await import('./networkSystem.js');
            disconnectNetwork();
            party.networkInitialized = false;
            party.isHost = false;
        }

        // Initialize network as client
        if (!party.networkInitialized) {
            await initNetwork('client', false);
            party.networkInitialized = true;
            party.isHost = false;
        }

        // Store the host's invite code so we can display it
        party.hostInviteCode = hostInviteCode;

        // Set up client message handlers
        setupClientHandlers();

        // Connect to host
        await connectToHost(hostInviteCode);

        // Send our player info including selected character and permanent upgrades
        sendToHost('join_request', {
            playerName: savedLocalPlayer.playerName,
            inviteCode: savedLocalPlayer.inviteCode,
            selectedCharacter: savedLocalPlayer.selectedCharacter,
            permanentUpgradeLevels: {
                startingHealth: getPermanentUpgradeLevel('startingHealth'),
                startingDamage: getPermanentUpgradeLevel('startingDamage'),
                startingSpeed: getPermanentUpgradeLevel('startingSpeed')
            }
        });

        return true;
    } catch (err) {
        console.error('Failed to join party:', err);

        // Restore local player to solo party state on failure
        console.log('[PartySystem] Restoring local player after join failure');
        restoreLocalPlayerToSoloParty(savedLocalPlayer);

        return false;
    }
}

/**
 * Restore local player to solo party state (after failed/cancelled join)
 * @param {Object} playerInfo - Saved player info {playerName, inviteCode, selectedCharacter}
 */
export function restoreLocalPlayerToSoloParty(playerInfo) {
    // Disconnect network if still trying to connect as client
    if (party.networkInitialized && !party.isHost) {
        import('./networkSystem.js').then(({ disconnect: disconnectNetwork }) => {
            disconnectNetwork();
        });
    }

    // Reset to host state
    party.isHost = true;
    party.hostInviteCode = null;
    party.networkInitialized = false;

    // Clear all slots
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

    // Restore local player in slot 0
    party.slots[0] = {
        playerId: 'local',
        playerName: playerInfo.playerName || getPlayerName(),
        inviteCode: playerInfo.inviteCode || getInviteCode(),
        selectedCharacter: playerInfo.selectedCharacter || getSelectedCharacter(),
        isLocal: true,
        peerId: null
    };

    // Re-initialize as host (will restart network)
    initParty(party.kaplayInstance).catch(err => {
        console.warn('[PartySystem] Failed to re-initialize as host:', err);
    });
}

/**
 * Set up network message handlers for client
 */
function setupClientHandlers() {
    // Receive party state from host
    onMessage('party_sync', (payload) => {
        console.log('[PartySystem] Received party sync:', {
            hostName: payload.slots[0].playerName,
            hostCharacter: payload.slots[0].selectedCharacter,
            yourSlot: payload.yourSlotIndex,
            totalSlots: payload.slots.filter(s => s.playerId !== null).length
        });

        // Update our party state
        party.slots = payload.slots;

        // Mark our own slot as local
        if (payload.yourSlotIndex !== undefined) {
            party.slots[payload.yourSlotIndex].isLocal = true;
            console.log(`[PartySystem] Marked slot ${payload.yourSlotIndex} as local`);
        }

        // Mark host's slot (slot 0) as remote
        party.slots[0].isLocal = false;

        // Debug: log party size and host info after sync
        const partySize = party.slots.filter(s => s.playerId !== null).length;
        console.log(`[PartySystem] Party synced successfully:`, {
            partySize,
            hostInSlot0: party.slots[0].playerName,
            localSlot: payload.yourSlotIndex
        });
    });

    // Handle party updates
    onMessage('party_update', (payload) => {
        console.log('[PartySystem] Received party update:', payload);

        // Find which slot is local before updating
        const localSlotIndex = party.slots.findIndex(slot => slot.isLocal);

        // Update slots
        party.slots = payload.slots;

        // Re-mark local slot (preserve isLocal flag)
        if (localSlotIndex !== -1) {
            party.slots[localSlotIndex].isLocal = true;
            console.log(`[PartySystem] Preserved local flag for slot ${localSlotIndex}`);
        }
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
            console.log('[PartySystem] Host disconnected - returning to solo party');
            alert('Host disconnected - returning to main menu');

            // Restore local player to solo party state
            const savedLocalPlayer = {
                playerName: getPlayerName(),
                inviteCode: getInviteCode(),
                selectedCharacter: getSelectedCharacter()
            };
            restoreLocalPlayerToSoloParty(savedLocalPlayer);

            // Return to main menu
            if (party.kaplayInstance) {
                party.kaplayInstance.go('menu');
            }
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
            permanentUpgradeLevels: slot.permanentUpgradeLevels,
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

        // Clean up player entity from the game (destroys entity, clears pending level-ups, broadcasts to clients)
        cleanupDisconnectedPlayer(slotIndex);

        // Remove from party WITHOUT shifting - shifting during gameplay breaks slot indices
        // Just clear the slot so remaining players keep their original slot indices
        removePlayerFromParty(slotIndex);
        party.peerIdToSlot.delete(peerId);
        broadcastPartyUpdate();
    }
}

/**
 * Remove player from party and shift remaining players up to fill the gap
 * @param {number} slotIndex - Slot to remove (1-3, can't remove slot 0)
 */
function removePlayerFromPartyAndShift(slotIndex) {
    if (slotIndex <= 0 || slotIndex >= party.slots.length) return;

    console.log(`[PartySystem] Removing player from slot ${slotIndex} and shifting remaining players up`);

    // Shift all players above this slot down by one
    for (let i = slotIndex; i < party.slots.length - 1; i++) {
        const nextSlot = party.slots[i + 1];

        // Move next slot to current slot
        party.slots[i] = { ...nextSlot };

        // Update peer ID mapping if this slot has a peer
        if (nextSlot.peerId) {
            party.peerIdToSlot.set(nextSlot.peerId, i);
        }
    }

    // Clear the last slot
    party.slots[party.slots.length - 1] = {
        playerId: null,
        playerName: null,
        inviteCode: null,
        selectedCharacter: null,
        isLocal: false,
        peerId: null
    };

    console.log('[PartySystem] Slots after shift:', party.slots.map((s, i) => `${i}: ${s.playerName || 'empty'}`));
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
