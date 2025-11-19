/**
 * Progression System
 *
 * Handles player progression mechanics:
 * - XP gain and multipliers
 * - Level up calculations and scaling
 * - Upgrade draft triggering on level up
 * - Visual feedback for level ups
 * - XP scaling per level
 */

// Scene imports
import { showUpgradeDraft } from '../scenes/upgradeDraft.js';

// Configuration imports
import { PROGRESSION_CONFIG } from '../config/constants.js';

// Sound system imports
import { playLevelUp } from './sounds.js';

// Multiplayer imports
import { broadcastLevelUpQueued } from './multiplayerGame.js';

export function setupProgressionSystem(k, player, reviveAllPlayersCallback = null, isMultiplayer = false) {
    let levelUpInProgress = false;

    // Track pending level ups for multiplayer (queue them for after room clear)
    player.pendingLevelUps = player.pendingLevelUps || [];

    // Add XP to player
    player.addXP = function(amount) {
        if (k.paused || levelUpInProgress) return; // Don't add XP while paused or leveling up

        // Apply XP multiplier if it exists
        const multiplier = player.xpMultiplier || 1;
        const adjustedAmount = Math.floor(amount * multiplier);

        player.xp += adjustedAmount;

        // Check for level up (with safety bounds to prevent infinite loops)
        while (player.xp >= player.xpToNext && !levelUpInProgress && player.xpToNext > 0) {
            levelUpInProgress = true;
            player.xp -= player.xpToNext;
            player.level++;
            const newLevel = player.level;
            // Safety clamp: ensure xpToNext is always at least 1
            player.xpToNext = Math.max(1, Math.floor(player.xpToNext * PROGRESSION_CONFIG.XP_SCALING_FACTOR));

            // Show level up notification and draft directly
            handleLevelUp(k, player, newLevel);
        }
    };

    // Handle level up
    function handleLevelUp(k, player, level) {
        // Don't show if already paused (prevents double prompts)
        if (k.paused && !isMultiplayer) {
            levelUpInProgress = false;
            return;
        }

        // Play level up sound
        playLevelUp();

        // Revive all dead players (multiplayer feature)
        if (reviveAllPlayersCallback) {
            reviveAllPlayersCallback();
        }

        // Show level up notification
        const notification = k.add([
            k.text(`Level ${level}!`, { size: 24 }),
            k.pos(k.width() / 2, PROGRESSION_CONFIG.LEVEL_UP_NOTIFICATION_Y),
            k.anchor('center'),
            k.color(255, 255, 100),
            k.fixed(),
            k.z(1000) // High z-index to show above other UI
        ]);

        // In multiplayer, check if room is safe (no enemies)
        if (isMultiplayer) {
            const enemies = k.get('enemy');
            const bosses = k.get('boss');
            const isSafe = enemies.length === 0 && bosses.length === 0;

            if (isSafe) {
                // Safe! Show upgrade draft immediately
                k.wait(PROGRESSION_CONFIG.LEVEL_UP_NOTIFICATION_DURATION, () => {
                    k.destroy(notification);
                    // Show upgrade draft (pass level for proper RNG seeding)
                    const playerName = player.playerName || (player.isRemote ? `Player ${player.slotIndex + 1}` : 'You');
                    showUpgradeDraft(k, player, () => {
                        // Callback when upgrade is selected
                        levelUpInProgress = false;
                    }, playerName, level);
                });
            } else {
                // Not safe - queue level up for after room clear
                player.pendingLevelUps.push(level);

                // Broadcast level up queued event in multiplayer
                if (isMultiplayer && player.slotIndex !== undefined) {
                    broadcastLevelUpQueued(player.slotIndex, level);
                }

                k.wait(PROGRESSION_CONFIG.LEVEL_UP_NOTIFICATION_DURATION * 2, () => {
                    if (notification.exists()) k.destroy(notification);
                    levelUpInProgress = false;
                });
            }
        } else {
            // Single player: show upgrade draft after notification
            k.wait(PROGRESSION_CONFIG.LEVEL_UP_NOTIFICATION_DURATION, () => {
                k.destroy(notification);
                // Show upgrade draft (pass level for proper RNG seeding)
                showUpgradeDraft(k, player, () => {
                    // Callback when upgrade is selected
                    levelUpInProgress = false;
                }, null, level);
            });
        }
    }
}

