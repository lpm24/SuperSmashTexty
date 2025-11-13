// Progression system - handles XP, leveling, and upgrades
import { showUpgradeDraft } from '../scenes/upgradeDraft.js';

export function setupProgressionSystem(k, player) {
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
            player.xpToNext = Math.floor(player.xpToNext * 1.5);
            
            // Show level up notification and draft directly
            handleLevelUp(k, player, newLevel);
        }
    };
    
    // Handle level up
    function handleLevelUp(k, player, level) {
        // Don't show if already paused (prevents double prompts)
        if (k.paused) {
            levelUpInProgress = false;
            return;
        }
        
        // Show level up notification
        const notification = k.add([
            k.text(`Level ${level}!`, { size: 24 }),
            k.pos(k.width() / 2, 100),
            k.anchor('center'),
            k.color(255, 255, 100),
            k.fixed()
        ]);
        
        k.wait(0.5, () => {
            k.destroy(notification);
            // Show upgrade draft
            showUpgradeDraft(k, player, () => {
                // Callback when upgrade is selected
                levelUpInProgress = false;
            });
        });
    }
}

