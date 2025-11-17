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

export function setupProgressionSystem(k, player, reviveAllPlayersCallback = null, isMultiplayer = false) {
    let levelUpInProgress = false;

    // Add XP to player
    player.addXP = function(amount) {
        if (k.paused || levelUpInProgress) return; // Don't add XP while paused or leveling up

        // Apply XP multiplier if it exists
        const multiplier = player.xpMultiplier || 1;
        const adjustedAmount = Math.floor(amount * multiplier);

        player.xp += adjustedAmount;

        // Check for level up
        while (player.xp >= player.xpToNext && !levelUpInProgress) {
            levelUpInProgress = true;
            player.xp -= player.xpToNext;
            player.level++;
            const newLevel = player.level;
            player.xpToNext = Math.floor(player.xpToNext * PROGRESSION_CONFIG.XP_SCALING_FACTOR);

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

        // In multiplayer, don't show upgrade draft - just show notification and continue
        if (isMultiplayer) {
            k.wait(PROGRESSION_CONFIG.LEVEL_UP_NOTIFICATION_DURATION * 2, () => {
                if (notification.exists()) k.destroy(notification);
                levelUpInProgress = false;
            });
        } else {
            // Single player: show upgrade draft after notification
            k.wait(PROGRESSION_CONFIG.LEVEL_UP_NOTIFICATION_DURATION, () => {
                k.destroy(notification);
                // Show upgrade draft
                showUpgradeDraft(k, player, () => {
                    // Callback when upgrade is selected
                    levelUpInProgress = false;
                });
            });
        }
    }
}

