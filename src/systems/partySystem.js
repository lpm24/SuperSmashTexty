/**
 * Party System
 * Manages multiplayer party state and joining
 */

import { getPlayerName, getInviteCode, getSelectedCharacter, setInviteCode, getPermanentUpgradeLevel, getSelectedPortrait, getPlayerLevel, getTotalXP, getSaveStats, getUnlockedAchievements, getUnlockedPortraits } from './metaProgression.js';
import {
    initNetwork,
    connectToHost,
    onMessage,
    onConnectionChange,
    broadcast,
    sendToHost,
    sendToPeer,
    getConnectedPeers,
    getNetworkInfo,
    disconnect
} from './networkSystem.js';
import { sendInitialGameState, handlePlayerDisconnect as cleanupDisconnectedPlayer } from './multiplayerGame.js';

// Party state
const party = {
    slots: [
        { playerId: 'local', playerName: null, inviteCode: null, selectedCharacter: null, selectedPortrait: null, isLocal: true, peerId: null, isReady: false }, // Slot 1: Local player
        { playerId: null, playerName: null, inviteCode: null, selectedCharacter: null, selectedPortrait: null, isLocal: false, peerId: null, isReady: false }, // Slot 2: Empty
        { playerId: null, playerName: null, inviteCode: null, selectedCharacter: null, selectedPortrait: null, isLocal: false, peerId: null, isReady: false }, // Slot 3: Empty
        { playerId: null, playerName: null, inviteCode: null, selectedCharacter: null, selectedPortrait: null, isLocal: false, peerId: null, isReady: false }  // Slot 4: Empty
    ],
    isHost: true, // Local player is always the host for now
    maxSlots: 4,
    peerIdToSlot: new Map(), // Map peer IDs to slot indices
    networkInitialized: false,
    kaplayInstance: null, // Reference to kaplay instance for client game start
    hostInviteCode: null, // The host's invite code (null if we are the host, or the code we joined if we're a client)
    // Disconnect handling
    disconnectedPlayers: new Map(), // Map slotIndex -> { disconnectTime, playerData }
    reconnectWindow: 15000, // 15 seconds to reconnect
    // Ready-up and countdown
    countdownActive: false,
    countdownStartTime: 0,
    countdownDuration: 3000, // 3 seconds countdown
    // Party emotes
    activeEmotes: new Map(), // Map slotIndex -> { emoteType, startTime }
    emoteCallbacks: [] // Callbacks to notify when emotes are received
};

// Flags to prevent duplicate handler registration (memory leak/freeze prevention)
let partyHostHandlersRegistered = false;
let partyClientHandlersRegistered = false;

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
        const selectedPortrait = getSelectedPortrait();

        party.slots[0].playerId = 'local';
        party.slots[0].playerName = playerName || 'Player'; // Fallback if name not set
        party.slots[0].inviteCode = inviteCode || '000000'; // Fallback if code not set
        party.slots[0].selectedCharacter = selectedCharacter || 'survivor'; // Fallback if character not set
        party.slots[0].selectedPortrait = selectedPortrait || 'default'; // Fallback if portrait not set
        party.slots[0].isLocal = true;
        party.slots[0].permanentUpgradeLevels = {
            startingHealth: getPermanentUpgradeLevel('startingHealth'),
            startingDamage: getPermanentUpgradeLevel('startingDamage'),
            startingSpeed: getPermanentUpgradeLevel('startingSpeed'),
            propDurability: getPermanentUpgradeLevel('propDurability'),
            propDropChance: getPermanentUpgradeLevel('propDropChance')
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
    // Prevent duplicate handler registration (causes memory leaks and freezes)
    if (partyHostHandlersRegistered) {
        return;
    }
    partyHostHandlersRegistered = true;

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
            payload.selectedPortrait || 'default',
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
                    selectedPortrait: slot.selectedPortrait,
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
            // Use a slightly longer delay to ensure client has processed party_sync
            // and initialized their game scene handlers
            setTimeout(() => {
                sendInitialGameState(fromPeerId);
            }, 250); // Increased delay for slower connections

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

    // Handle ready state changes from clients
    onMessage('ready_change', (payload, fromPeerId) => {
        const slotIndex = party.peerIdToSlot.get(fromPeerId);
        if (slotIndex !== undefined) {
            console.log(`[PartySystem] Player in slot ${slotIndex} ready state:`, payload.isReady);
            party.slots[slotIndex].isReady = payload.isReady;
            broadcastPartyUpdate();
            // Check if all players are ready
            checkAllReady();
        }
    });

    // Handle party emotes from clients - rebroadcast to all
    onMessage('party_emote', (payload, fromPeerId) => {
        const slotIndex = party.peerIdToSlot.get(fromPeerId);
        if (slotIndex !== undefined) {
            // Set the slot index from the verified peer
            payload.slotIndex = slotIndex;
            // Store emote and notify callbacks
            handlePartyEmote(payload);
            // Rebroadcast to all clients
            broadcast('party_emote', payload);
        }
    });

    // Handle profile requests from clients
    onMessage('profile_request', (payload, fromPeerId) => {
        const targetSlot = payload.targetSlot;
        if (targetSlot === 0) {
            // Client wants host's profile
            handleProfileRequest(payload, fromPeerId);
        } else {
            // Client wants another client's profile - forward the request
            const targetPeerId = party.slots[targetSlot]?.peerId;
            if (targetPeerId) {
                sendToPeer(targetPeerId, 'profile_request', {
                    requestingSlot: party.peerIdToSlot.get(fromPeerId),
                    forwardTo: fromPeerId
                });
            }
        }
    });

    // Handle profile responses from clients
    onMessage('profile_response', (payload, fromPeerId) => {
        const slotIndex = party.peerIdToSlot.get(fromPeerId);
        if (slotIndex !== undefined) {
            payload.slotIndex = slotIndex;
            // Check if this is a forwarded response
            if (payload.forwardTo) {
                sendToPeer(payload.forwardTo, 'profile_response', payload);
            } else {
                // This is for the host
                handleProfileResponse(payload);
            }
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
function addPlayerToPartyFromNetwork(playerName, inviteCode, selectedCharacter, selectedPortrait, peerId, permanentUpgradeLevels = null) {
    // Find first empty slot
    for (let i = 1; i < party.slots.length; i++) {
        if (party.slots[i].playerId === null) {
            party.slots[i].playerId = `player_${Date.now()}_${i}`;
            party.slots[i].playerName = playerName;
            party.slots[i].inviteCode = inviteCode;
            party.slots[i].selectedCharacter = selectedCharacter;
            party.slots[i].selectedPortrait = selectedPortrait;
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
                selectedPortrait: null,
                isLocal: false,
                peerId: null
            };
        }

        // If we were initialized as host, disconnect and re-initialize as client
        if (party.networkInitialized && party.isHost) {
            console.log('[PartySystem] Switching from host to client - disconnecting current peer...');
            disconnect();
            party.networkInitialized = false;
            party.isHost = false;
            // Reset handler flags to allow client handler registration
            partyHostHandlersRegistered = false;
            partyClientHandlersRegistered = false;
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

        // Send our player info including selected character, portrait, and permanent upgrades
        sendToHost('join_request', {
            playerName: savedLocalPlayer.playerName,
            inviteCode: savedLocalPlayer.inviteCode,
            selectedCharacter: savedLocalPlayer.selectedCharacter,
            selectedPortrait: getSelectedPortrait() || 'default',
            permanentUpgradeLevels: {
                startingHealth: getPermanentUpgradeLevel('startingHealth'),
                startingDamage: getPermanentUpgradeLevel('startingDamage'),
                startingSpeed: getPermanentUpgradeLevel('startingSpeed'),
                propDurability: getPermanentUpgradeLevel('propDurability'),
                propDropChance: getPermanentUpgradeLevel('propDropChance')
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
        disconnect();
    }

    // Reset to host state
    party.isHost = true;
    party.hostInviteCode = null;
    party.networkInitialized = false;

    // Reset handler registration flags to allow re-registration
    partyHostHandlersRegistered = false;
    partyClientHandlersRegistered = false;

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
    // Prevent duplicate handler registration (causes memory leaks and freezes)
    if (partyClientHandlersRegistered) {
        return;
    }
    partyClientHandlersRegistered = true;

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

    // Handle countdown start from host
    onMessage('countdown_start', (payload) => {
        console.log('[PartySystem] Countdown started by host:', payload.duration);
        party.countdownActive = true;
        party.countdownStartTime = Date.now();
        party.countdownDuration = payload.duration || 3000;
    });

    // Handle countdown cancel from host
    onMessage('countdown_cancel', () => {
        console.log('[PartySystem] Countdown cancelled by host');
        party.countdownActive = false;
        party.countdownStartTime = 0;
    });

    // Handle party update with ready states
    onMessage('party_update', (payload) => {
        // Find which slot is local before updating
        const localSlotIndex = party.slots.findIndex(slot => slot.isLocal);

        // Update slots (includes ready states)
        party.slots = payload.slots;

        // Re-mark local slot (preserve isLocal flag)
        if (localSlotIndex !== -1) {
            party.slots[localSlotIndex].isLocal = true;
        }
    });

    // Handle party emotes from host
    onMessage('party_emote', (payload) => {
        handlePartyEmote(payload);
    });

    // Handle profile request (forwarded from host or direct from host)
    onMessage('profile_request', (payload) => {
        handleProfileRequest(payload);
    });

    // Handle profile response
    onMessage('profile_response', (payload) => {
        handleProfileResponse(payload);
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
            selectedPortrait: slot.selectedPortrait,
            permanentUpgradeLevels: slot.permanentUpgradeLevels,
            isLocal: false, // Always false for remote players
            isReady: slot.isReady || false,
            isDisconnected: slot.isDisconnected || false
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
 * Starts a reconnection window instead of immediately removing
 * @param {string} peerId - Peer ID of disconnected player
 */
function handlePlayerDisconnect(peerId) {
    const slotIndex = party.peerIdToSlot.get(peerId);
    if (slotIndex !== undefined) {
        console.log('[PartySystem] Player disconnected from slot', slotIndex, '- starting reconnection window');

        // Store player data for potential reconnection
        const playerData = { ...party.slots[slotIndex] };

        // Mark player as disconnected (but don't remove yet)
        party.disconnectedPlayers.set(slotIndex, {
            disconnectTime: Date.now(),
            playerData: playerData,
            peerId: peerId
        });

        // Mark the slot as disconnected (but keep the player info)
        party.slots[slotIndex].isDisconnected = true;

        // Broadcast disconnect status to all clients
        broadcast('player_disconnected', {
            slotIndex: slotIndex,
            reconnectWindow: party.reconnectWindow
        });

        party.peerIdToSlot.delete(peerId);

        // Set timeout to fully remove player if they don't reconnect
        setTimeout(() => {
            finalizeDisconnect(slotIndex);
        }, party.reconnectWindow);
    }
}

/**
 * Finalize player disconnect after reconnection window expires
 * @param {number} slotIndex - Slot index of the disconnected player
 */
function finalizeDisconnect(slotIndex) {
    const disconnectData = party.disconnectedPlayers.get(slotIndex);
    if (!disconnectData) return; // Player already reconnected or was removed

    console.log('[PartySystem] Reconnection window expired for slot', slotIndex, '- removing player');

    // Clean up player entity from the game
    cleanupDisconnectedPlayer(slotIndex);

    // Remove from party
    removePlayerFromParty(slotIndex);
    party.disconnectedPlayers.delete(slotIndex);

    // Broadcast final removal
    broadcast('player_removed', { slotIndex: slotIndex });
    broadcastPartyUpdate();
}

/**
 * Attempt to reconnect a player to their previous slot
 * @param {string} peerId - New peer ID of reconnecting player
 * @param {string} playerName - Player name for verification
 * @returns {number|null} - Slot index if reconnected, null if not found
 */
export function attemptReconnect(peerId, playerName) {
    // Check if there's a disconnected player with this name
    for (const [slotIndex, data] of party.disconnectedPlayers) {
        if (data.playerData.playerName === playerName) {
            console.log('[PartySystem] Player', playerName, 'reconnected to slot', slotIndex);

            // Restore player to their slot
            party.slots[slotIndex] = { ...data.playerData };
            party.slots[slotIndex].peerId = peerId;
            party.slots[slotIndex].isDisconnected = false;
            party.peerIdToSlot.set(peerId, slotIndex);

            // Clear disconnect data
            party.disconnectedPlayers.delete(slotIndex);

            // Broadcast reconnection
            broadcast('player_reconnected', { slotIndex: slotIndex });
            broadcastPartyUpdate();

            return slotIndex;
        }
    }
    return null;
}

/**
 * Check if a player slot is disconnected
 * @param {number} slotIndex - Slot index to check
 * @returns {boolean} - True if player is disconnected
 */
export function isPlayerDisconnected(slotIndex) {
    return party.slots[slotIndex]?.isDisconnected || false;
}

/**
 * Get time remaining for reconnection window
 * @param {number} slotIndex - Slot index to check
 * @returns {number} - Milliseconds remaining, 0 if not disconnected
 */
export function getReconnectTimeRemaining(slotIndex) {
    const data = party.disconnectedPlayers.get(slotIndex);
    if (!data) return 0;

    const elapsed = Date.now() - data.disconnectTime;
    return Math.max(0, party.reconnectWindow - elapsed);
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
            peerId: null,
            isReady: false
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
        selectedCharacter: slot.selectedCharacter || 'survivor',
        selectedPortrait: slot.selectedPortrait || 'default',
        isReady: slot.isReady || false,
        isDisconnected: slot.isDisconnected || false
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

// ==========================================
// Ready-up System
// ==========================================

/**
 * Toggle ready state for local player
 * @returns {boolean} - New ready state
 */
export function toggleReady() {
    const localSlot = getLocalPlayerSlot();
    if (localSlot === null) return false;

    party.slots[localSlot].isReady = !party.slots[localSlot].isReady;

    // Broadcast ready state change
    if (party.networkInitialized) {
        if (party.isHost) {
            broadcastPartyUpdate();
            // Check if all players are ready
            checkAllReady();
        } else {
            sendToHost('ready_change', {
                isReady: party.slots[localSlot].isReady
            });
        }
    }

    return party.slots[localSlot].isReady;
}

/**
 * Get local player slot index
 * @returns {number|null} - Local player slot index, or null if not found
 */
export function getLocalPlayerSlot() {
    const index = party.slots.findIndex(s => s.isLocal);
    return index >= 0 ? index : null;
}

/**
 * Check if local player is ready
 * @returns {boolean} - True if ready
 */
export function isLocalPlayerReady() {
    const localSlot = getLocalPlayerSlot();
    return localSlot !== null && party.slots[localSlot].isReady;
}

/**
 * Check if all players are ready (host only)
 * @returns {boolean} - True if all ready
 */
export function areAllPlayersReady() {
    const occupiedSlots = party.slots.filter(s => s.playerId !== null);
    if (occupiedSlots.length < 2) return false; // Need at least 2 players

    return occupiedSlots.every(s => s.isReady);
}

/**
 * Check if all players are ready and start countdown (host only)
 */
function checkAllReady() {
    if (!party.isHost) return;

    if (areAllPlayersReady() && !party.countdownActive) {
        startCountdown();
    } else if (!areAllPlayersReady() && party.countdownActive) {
        cancelCountdown();
    }
}

/**
 * Start the game countdown (host only)
 */
function startCountdown() {
    if (!party.isHost) return;

    party.countdownActive = true;
    party.countdownStartTime = Date.now();

    // Broadcast countdown start
    broadcast('countdown_start', {
        duration: party.countdownDuration
    });

    console.log('[PartySystem] Countdown started');
}

/**
 * Cancel the game countdown (host only)
 */
function cancelCountdown() {
    if (!party.isHost) return;

    party.countdownActive = false;
    party.countdownStartTime = 0;

    // Broadcast countdown cancel
    broadcast('countdown_cancel', {});

    console.log('[PartySystem] Countdown cancelled');
}

/**
 * Get countdown state
 * @returns {Object} - { active, timeRemaining }
 */
export function getCountdownState() {
    if (!party.countdownActive) {
        return { active: false, timeRemaining: 0 };
    }

    const elapsed = Date.now() - party.countdownStartTime;
    const remaining = Math.max(0, party.countdownDuration - elapsed);

    return {
        active: true,
        timeRemaining: remaining
    };
}

/**
 * Reset all ready states (called after game ends)
 */
export function resetAllReadyStates() {
    party.slots.forEach(slot => {
        slot.isReady = false;
    });
    party.countdownActive = false;
    party.countdownStartTime = 0;
}

// ==========================================
// Party Emotes System
// ==========================================

/**
 * Handle incoming party emote (store and notify callbacks)
 * @param {Object} payload - { slotIndex, emoteType }
 */
function handlePartyEmote(payload) {
    const { slotIndex, emoteType } = payload;

    // Store the emote with timestamp
    party.activeEmotes.set(slotIndex, {
        emoteType,
        startTime: Date.now()
    });

    // Notify all registered callbacks
    party.emoteCallbacks.forEach(callback => {
        try {
            callback(slotIndex, emoteType);
        } catch (err) {
            console.error('[PartySystem] Emote callback error:', err);
        }
    });
}

/**
 * Broadcast an emote from the local player
 * @param {string} emoteType - 'exclamation' or 'heart'
 */
export function broadcastPartyEmote(emoteType) {
    const localSlot = getLocalPlayerSlot();
    if (localSlot === null) return;

    const payload = { slotIndex: localSlot, emoteType };

    // Handle locally first
    handlePartyEmote(payload);

    // Send to network if available
    if (party.networkInitialized) {
        if (party.isHost) {
            // Host broadcasts directly to all clients
            broadcast('party_emote', payload);
        } else {
            // Client sends to host (who will rebroadcast)
            sendToHost('party_emote', payload);
        }
    }
}

/**
 * Register a callback to be notified when emotes are received
 * @param {Function} callback - (slotIndex, emoteType) => void
 */
export function onPartyEmote(callback) {
    party.emoteCallbacks.push(callback);
}

/**
 * Unregister an emote callback
 * @param {Function} callback - The callback to remove
 */
export function offPartyEmote(callback) {
    const index = party.emoteCallbacks.indexOf(callback);
    if (index !== -1) {
        party.emoteCallbacks.splice(index, 1);
    }
}

/**
 * Get active emote for a slot (if still valid)
 * @param {number} slotIndex - Slot to check
 * @param {number} maxAge - Max age in ms (default 2000ms)
 * @returns {string|null} - Emote type or null if no active emote
 */
export function getActiveEmote(slotIndex, maxAge = 2000) {
    const emote = party.activeEmotes.get(slotIndex);
    if (!emote) return null;

    const age = Date.now() - emote.startTime;
    if (age > maxAge) {
        party.activeEmotes.delete(slotIndex);
        return null;
    }

    return emote.emoteType;
}

/**
 * Clear all active emotes
 */
export function clearActiveEmotes() {
    party.activeEmotes.clear();
}

/**
 * Clear all party callbacks to prevent memory leaks
 * Call this when cleaning up multiplayer session
 */
export function clearPartyCallbacks() {
    party.emoteCallbacks = [];
    party.activeEmotes.clear();
    // Reset handler registration flags to allow re-registration on next session
    partyHostHandlersRegistered = false;
    partyClientHandlersRegistered = false;
}

// ==========================================
// Profile Request System
// ==========================================

// Store pending profile request callbacks
const profileRequestCallbacks = new Map();

/**
 * Get local player's profile data for sharing
 * @returns {Object} Profile data object
 */
export function getLocalProfileData() {
    return {
        playerName: getPlayerName(),
        selectedPortrait: getSelectedPortrait(),
        playerLevel: getPlayerLevel(),
        totalXP: getTotalXP(),
        stats: getSaveStats(),
        achievements: getUnlockedAchievements(),
        unlockedPortraits: getUnlockedPortraits()
    };
}

/**
 * Request another player's profile data
 * @param {number} slotIndex - The slot index of the player to request
 * @param {Function} callback - Callback function (profileData) => void
 */
export function requestPlayerProfile(slotIndex, callback) {
    const slot = party.slots[slotIndex];
    if (!slot || slot.playerId === null) {
        console.warn('[PartySystem] Cannot request profile for empty slot:', slotIndex);
        callback(null);
        return;
    }

    // If requesting our own profile, return local data
    if (slot.isLocal) {
        callback(getLocalProfileData());
        return;
    }

    // Store the callback
    profileRequestCallbacks.set(slotIndex, callback);

    // Send the request
    if (party.isHost) {
        // Host sends directly to the peer
        const peerId = slot.peerId;
        if (peerId) {
            sendToPeer(peerId, 'profile_request', { requestingSlot: getLocalPlayerSlot() });
        } else {
            console.warn('[PartySystem] No peerId for slot:', slotIndex);
            callback(null);
            profileRequestCallbacks.delete(slotIndex);
        }
    } else {
        // Client sends request through host
        sendToHost('profile_request', { targetSlot: slotIndex });
    }

    // Timeout after 5 seconds
    setTimeout(() => {
        if (profileRequestCallbacks.has(slotIndex)) {
            console.warn('[PartySystem] Profile request timed out for slot:', slotIndex);
            const cb = profileRequestCallbacks.get(slotIndex);
            profileRequestCallbacks.delete(slotIndex);
            cb(null);
        }
    }, 5000);
}

/**
 * Handle incoming profile request (called by message handlers)
 * @param {Object} payload - Request payload
 * @param {string} fromPeerId - Peer ID of requester (for host)
 */
function handleProfileRequest(payload, fromPeerId = null) {
    const profileData = getLocalProfileData();

    if (party.isHost && fromPeerId) {
        // Host responding to client request
        sendToPeer(fromPeerId, 'profile_response', {
            slotIndex: getLocalPlayerSlot(),
            profileData
        });
    } else {
        // Client responding to host
        sendToHost('profile_response', {
            slotIndex: getLocalPlayerSlot(),
            profileData
        });
    }
}

/**
 * Handle incoming profile response
 * @param {Object} payload - Response payload with slotIndex and profileData
 */
function handleProfileResponse(payload) {
    const { slotIndex, profileData } = payload;

    const callback = profileRequestCallbacks.get(slotIndex);
    if (callback) {
        profileRequestCallbacks.delete(slotIndex);
        callback(profileData);
    }
}
