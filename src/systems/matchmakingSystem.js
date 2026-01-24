/**
 * Matchmaking System
 * Handles automatic party matching using Firebase Realtime Database
 */

import { initializeApp } from 'firebase/app';
import {
    getDatabase,
    ref,
    push,
    set,
    remove,
    onValue,
    off,
    serverTimestamp,
    onDisconnect,
    query,
    orderByChild
} from 'firebase/database';
import { getPlayerName, getInviteCode } from './metaProgression.js';
import { joinPartyAsClient, getParty, getPartySize, isPartyFull } from './partySystem.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCiodw7WUk-nxFoTDUpCVFF7hA9RUObQj4",
    authDomain: "supersmashtexty.firebaseapp.com",
    databaseURL: "https://supersmashtexty-default-rtdb.firebaseio.com",
    projectId: "supersmashtexty",
    storageBucket: "supersmashtexty.firebasestorage.app",
    messagingSenderId: "212983770797",
    appId: "1:212983770797:web:000257ef09b3b68fb3e024"
};

// Firebase state
let app = null;
let database = null;
let isInitialized = false;

// Matchmaking state
let isSearching = false;
let queueEntryRef = null;
let queueListenerRef = null;  // The actual ref we subscribed to
let kaplayInstance = null;
let matchmakingCallbacks = null;
let isStoppingMatchmaking = false;  // Prevent re-entrant calls

/**
 * Initialize Firebase (lazy initialization)
 */
function initFirebase() {
    if (isInitialized) return true;

    try {
        // Check if config has been set up
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn('[Matchmaking] Firebase not configured. Please update firebaseConfig in matchmakingSystem.js');
            return false;
        }

        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        isInitialized = true;
        console.log('[Matchmaking] Firebase initialized');
        return true;
    } catch (err) {
        console.error('[Matchmaking] Failed to initialize Firebase:', err);
        return false;
    }
}

/**
 * Store Kaplay reference for scene navigation
 * @param {Object} k - Kaplay instance
 */
export function setupGlobalMatchHandler(k) {
    kaplayInstance = k;
    console.log('[Matchmaking] Global match handler set up');
}

/**
 * Check if currently searching for a match
 * @returns {boolean} True if searching
 */
export function isMatchmaking() {
    return isSearching;
}

/**
 * Start matchmaking - add to queue and listen for matches
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onSearchStart - Called when search starts
 * @param {Function} callbacks.onMatchFound - Called when match is found (receives hostInviteCode or null if we're host)
 * @param {Function} callbacks.onError - Called on error
 * @param {Function} callbacks.onSearchEnd - Called when search ends (success or cancel)
 * @returns {boolean} True if search started successfully
 */
export async function startMatchmaking(callbacks = {}) {
    if (isSearching) {
        console.log('[Matchmaking] Already searching');
        return false;
    }

    if (!initFirebase()) {
        callbacks.onError?.('Firebase not configured');
        return false;
    }

    // Check if party is full
    if (isPartyFull()) {
        console.log('[Matchmaking] Party is full, cannot search');
        callbacks.onError?.('Party is full');
        return false;
    }

    matchmakingCallbacks = callbacks;
    isSearching = true;
    callbacks.onSearchStart?.();

    try {
        const playerName = getPlayerName();
        const inviteCode = getInviteCode();

        // Add ourselves to the queue
        const queueRef = ref(database, 'matchmaking/queue');
        queueEntryRef = push(queueRef);

        await set(queueEntryRef, {
            inviteCode: inviteCode,
            playerName: playerName,
            timestamp: Date.now() // Use client timestamp for consistent stale checking
        });

        // Set up auto-remove on disconnect
        onDisconnect(queueEntryRef).remove();

        console.log('[Matchmaking] Added to queue:', inviteCode);

        // Listen for changes in the queue
        queueListenerRef = query(queueRef, orderByChild('timestamp'));
        onValue(queueListenerRef, async (snapshot) => {
            if (!isSearching) return;

            const queueData = snapshot.val();
            if (!queueData) return;

            // Convert to array and sort by timestamp
            // Filter out stale entries (older than 60 seconds)
            const now = Date.now();
            const STALE_THRESHOLD_MS = 60000; // 60 seconds

            const players = Object.entries(queueData)
                .map(([key, value]) => ({ key, ...value }))
                .filter(p => p.timestamp) // Filter out entries without timestamp yet
                .filter(p => (now - p.timestamp) < STALE_THRESHOLD_MS) // Filter out stale entries
                .sort((a, b) => a.timestamp - b.timestamp);

            console.log('[Matchmaking] Queue updated:', players.length, 'active players');

            if (players.length >= 2) {
                // Find our entry
                const ourEntry = players.find(p => p.inviteCode === inviteCode);
                if (!ourEntry) return;

                // The earliest player becomes the host
                const hostEntry = players[0];

                if (hostEntry.inviteCode === inviteCode) {
                    // We are the host - wait for others to join us
                    console.log('[Matchmaking] We are the host, waiting for players to join...');
                    // Don't do anything yet - other players will join us
                    // We'll be removed from queue when someone joins our party
                } else {
                    // We should join the host
                    console.log('[Matchmaking] Found host:', hostEntry.inviteCode, '- attempting to join');

                    // Stop listening before attempting to join (don't notify yet)
                    stopMatchmaking(false);

                    // Small delay to ensure host's peer is fully registered with PeerJS cloud
                    await new Promise(resolve => setTimeout(resolve, 500));

                    try {
                        const success = await joinPartyAsClient(hostEntry.inviteCode);
                        if (success) {
                            console.log('[Matchmaking] Successfully joined host');
                            callbacks.onMatchFound?.(hostEntry.inviteCode);

                            // Navigate to menu if in a different scene
                            if (kaplayInstance) {
                                kaplayInstance.go('menu');
                            }
                        } else {
                            console.log('[Matchmaking] Failed to join host, restarting search');
                            // Failed to join - restart search
                            callbacks.onError?.('Failed to connect to host');
                            // Could restart search here if desired
                        }
                    } catch (err) {
                        console.error('[Matchmaking] Error joining host:', err);
                        callbacks.onError?.('Connection error');
                    }

                    // Now notify search ended
                    callbacks.onSearchEnd?.();
                }
            }
        });

        return true;
    } catch (err) {
        console.error('[Matchmaking] Failed to start matchmaking:', err);
        isSearching = false;
        callbacks.onError?.(err.message);
        callbacks.onSearchEnd?.();
        return false;
    }
}

/**
 * Stop matchmaking - remove from queue and cancel listener
 * @param {boolean} notifyEnd - Whether to call onSearchEnd callback (default true)
 */
export function stopMatchmaking(notifyEnd = true) {
    // Prevent re-entrant calls
    if (isStoppingMatchmaking) {
        return;
    }

    if (!isSearching && !queueEntryRef && !queueListenerRef) {
        return;
    }

    isStoppingMatchmaking = true;
    console.log('[Matchmaking] Stopping matchmaking');
    isSearching = false;

    // Remove queue listener using the correct reference
    if (queueListenerRef) {
        off(queueListenerRef);
        queueListenerRef = null;
    }

    // Clear the queue entry reference
    if (queueEntryRef) {
        queueEntryRef = null;
    }

    // Save and clear callbacks before calling them
    const callbacks = matchmakingCallbacks;
    matchmakingCallbacks = null;

    if (notifyEnd && callbacks?.onSearchEnd) {
        callbacks.onSearchEnd();
    }

    isStoppingMatchmaking = false;
}

/**
 * Called by partySystem when a player joins the party
 * If we're the host and were matchmaking, remove ourselves from queue
 */
export function onPlayerJoinedParty() {
    const party = getParty();

    // Only hosts need to handle this
    if (!party.isHost) return;

    // If we were matchmaking, stop and notify
    if (isSearching || queueEntryRef) {
        console.log('[Matchmaking] Player joined our party - stopping matchmaking');

        // Save callbacks before stopMatchmaking clears them
        const callbacks = matchmakingCallbacks;

        // Stop matchmaking but don't call onSearchEnd yet (we'll call onMatchFound instead)
        stopMatchmaking(false);

        // Notify that we found a match (we're the host, so hostCode is null)
        callbacks?.onMatchFound?.(null);
        callbacks?.onSearchEnd?.();

        // Navigate to menu if in a different scene
        if (kaplayInstance) {
            kaplayInstance.go('menu');
        }
    }
}

/**
 * Check if Firebase is configured
 * @returns {boolean} True if Firebase config is set up
 */
export function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY";
}
