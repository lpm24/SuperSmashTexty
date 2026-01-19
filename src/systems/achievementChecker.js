// Achievement checking system - checks and unlocks achievements based on stats

import { getSaveStats, unlockAchievement, isAchievementUnlocked, getUnlockedAchievements, getSaveData } from './metaProgression.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { playAchievement } from './sounds.js';
import { showAchievementToast, initToastSystem } from './toastNotifications.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { isMultiplayerActive, getLocalPlayerSlot, broadcastAchievementUnlocked } from './multiplayerGame.js';

// Track achievements unlocked during the current run
let runUnlockedAchievements = [];

// Track run-specific data for challenge achievements
let runChallengeData = {
    floorDamageTaken: {},    // Tracks damage taken per floor
    runStartTime: 0,         // When the run started
    bossesKilledThisRun: 0,  // Bosses killed in current run
    currentBossNoDamage: true, // Did we take damage during current boss fight
    bossStartHP: 0           // HP at start of boss fight
};

/**
 * Initialize achievement checker for a new run
 * @param {Object} k - Kaplay instance for toast notifications
 */
export function initAchievementChecker(k) {
    runUnlockedAchievements = [];
    runChallengeData = {
        floorDamageTaken: {},
        runStartTime: Date.now(),
        bossesKilledThisRun: 0,
        currentBossNoDamage: true,
        bossStartHP: 0
    };

    // Initialize toast system
    if (k) {
        initToastSystem(k);
    }
}

/**
 * Get achievements unlocked during the current run
 * @returns {Array} Array of achievement IDs unlocked this run
 */
export function getRunUnlockedAchievements() {
    return [...runUnlockedAchievements];
}

/**
 * Clear run-unlocked achievements (call when starting new run)
 */
export function clearRunUnlockedAchievements() {
    runUnlockedAchievements = [];
}

/**
 * Track damage taken on a floor (for perfectFloor achievement)
 * @param {number} floor - Current floor number
 * @param {number} damage - Damage taken
 */
export function trackFloorDamage(floor, damage) {
    if (!runChallengeData.floorDamageTaken[floor]) {
        runChallengeData.floorDamageTaken[floor] = 0;
    }
    runChallengeData.floorDamageTaken[floor] += damage;
}

/**
 * Check if a floor was completed without taking damage
 * @param {number} floor - Floor number that was completed
 * @returns {boolean} True if no damage was taken
 */
export function wasFloorPerfect(floor) {
    return !runChallengeData.floorDamageTaken[floor] || runChallengeData.floorDamageTaken[floor] === 0;
}

/**
 * Start tracking a boss fight (for noHitBoss achievement)
 * @param {number} playerHP - Player's HP at boss fight start
 */
export function startBossFight(playerHP) {
    runChallengeData.currentBossNoDamage = true;
    runChallengeData.bossStartHP = playerHP;
}

/**
 * Track damage during boss fight
 */
export function trackBossDamage() {
    runChallengeData.currentBossNoDamage = false;
}

/**
 * Called when a boss is defeated
 * @param {number} playerCurrentHP - Player's current HP when boss died
 * @param {number} playerMaxHP - Player's max HP
 */
export function onBossDefeated(playerCurrentHP, playerMaxHP) {
    runChallengeData.bossesKilledThisRun++;

    // Check noHitBoss achievement
    if (runChallengeData.currentBossNoDamage && !isAchievementUnlocked('noHitBoss')) {
        if (unlockAchievement('noHitBoss')) {
            runUnlockedAchievements.push('noHitBoss');
        }
    }

    // Check glassCannonWin achievement (below 25% HP)
    const hpPercent = playerCurrentHP / playerMaxHP;
    if (hpPercent < 0.25 && !isAchievementUnlocked('glassCannonWin')) {
        if (unlockAchievement('glassCannonWin')) {
            runUnlockedAchievements.push('glassCannonWin');
        }
    }

    // Check bossRush achievement (3 bosses in one run)
    if (runChallengeData.bossesKilledThisRun >= 3 && !isAchievementUnlocked('bossRush')) {
        if (unlockAchievement('bossRush')) {
            runUnlockedAchievements.push('bossRush');
        }
    }

    // Reset boss tracking for next boss
    runChallengeData.currentBossNoDamage = true;
    runChallengeData.bossStartHP = playerCurrentHP;
}

/**
 * Called when a floor is completed
 * @param {number} floor - Floor that was completed
 */
export function onFloorCompleted(floor) {
    // Check perfectFloor achievement
    if (wasFloorPerfect(floor) && !isAchievementUnlocked('perfectFloor')) {
        if (unlockAchievement('perfectFloor')) {
            runUnlockedAchievements.push('perfectFloor');
        }
    }

    // Check speedRunner achievement (Floor 3 in under 5 minutes)
    if (floor >= 3) {
        const runDuration = (Date.now() - runChallengeData.runStartTime) / 1000;
        if (runDuration < 300 && !isAchievementUnlocked('speedRunner')) { // 5 minutes = 300 seconds
            if (unlockAchievement('speedRunner')) {
                runUnlockedAchievements.push('speedRunner');
            }
        }
    }

    // Initialize damage tracking for next floor
    runChallengeData.floorDamageTaken[floor + 1] = 0;
}

/**
 * Called when a synergy is activated (for firstSynergy achievement)
 */
export function onSynergyActivated() {
    if (!isAchievementUnlocked('firstSynergy')) {
        if (unlockAchievement('firstSynergy')) {
            runUnlockedAchievements.push('firstSynergy');
        }
    }
}

/**
 * Check if all characters are unlocked (for allCharacters achievement)
 */
export function checkAllCharactersUnlocked() {
    const saveData = getSaveData();
    const unlockedCharacters = saveData.unlocks?.characters || ['survivor'];
    const totalCharacters = Object.keys(CHARACTER_UNLOCKS).length;

    if (unlockedCharacters.length >= totalCharacters && !isAchievementUnlocked('allCharacters')) {
        if (unlockAchievement('allCharacters')) {
            runUnlockedAchievements.push('allCharacters');
        }
    }
}

/**
 * Check if any permanent upgrade is maxed (for maxUpgrade achievement)
 */
export function checkMaxUpgrade() {
    const saveData = getSaveData();
    const upgradeLevels = saveData.permanentUpgradeLevels || {};

    // Import PERMANENT_UPGRADE_UNLOCKS to check max levels
    import('../data/unlocks.js').then(({ PERMANENT_UPGRADE_UNLOCKS }) => {
        for (const [key, upgrade] of Object.entries(PERMANENT_UPGRADE_UNLOCKS)) {
            const currentLevel = upgradeLevels[key] || 0;
            const maxLevel = upgrade.maxLevel || 1;

            if (currentLevel >= maxLevel && !isAchievementUnlocked('maxUpgrade')) {
                if (unlockAchievement('maxUpgrade')) {
                    runUnlockedAchievements.push('maxUpgrade');
                }
                break;
            }
        }
    });
}

// Check all achievements based on current stats
export function checkAchievements(k) {
    const stats = getSaveStats();
    const newlyUnlocked = [];

    // Floor progression achievements
    if (stats.bestFloor >= 2 && !isAchievementUnlocked('floor2')) {
        if (unlockAchievement('floor2')) newlyUnlocked.push('floor2');
    }
    if (stats.bestFloor >= 3 && !isAchievementUnlocked('floor3')) {
        if (unlockAchievement('floor3')) newlyUnlocked.push('floor3');
    }
    if (stats.bestFloor >= 5 && !isAchievementUnlocked('floor5')) {
        if (unlockAchievement('floor5')) newlyUnlocked.push('floor5');
    }
    if (stats.bestFloor >= 10 && !isAchievementUnlocked('floor10')) {
        if (unlockAchievement('floor10')) newlyUnlocked.push('floor10');
    }
    if (stats.bestFloor >= 15 && !isAchievementUnlocked('floor15')) {
        if (unlockAchievement('floor15')) newlyUnlocked.push('floor15');
    }
    if (stats.bestFloor >= 20 && !isAchievementUnlocked('floor20')) {
        if (unlockAchievement('floor20')) newlyUnlocked.push('floor20');
    }

    // Combat achievements
    if (stats.totalEnemiesKilled >= 1 && !isAchievementUnlocked('firstKill')) {
        if (unlockAchievement('firstKill')) newlyUnlocked.push('firstKill');
    }
    if (stats.totalEnemiesKilled >= 100 && !isAchievementUnlocked('kill100')) {
        if (unlockAchievement('kill100')) newlyUnlocked.push('kill100');
    }
    if (stats.totalEnemiesKilled >= 500 && !isAchievementUnlocked('kill500')) {
        if (unlockAchievement('kill500')) newlyUnlocked.push('kill500');
    }
    if (stats.totalEnemiesKilled >= 1000 && !isAchievementUnlocked('kill1000')) {
        if (unlockAchievement('kill1000')) newlyUnlocked.push('kill1000');
    }
    if (stats.totalEnemiesKilled >= 5000 && !isAchievementUnlocked('kill5000')) {
        if (unlockAchievement('kill5000')) newlyUnlocked.push('kill5000');
    }
    if (stats.totalEnemiesKilled >= 10000 && !isAchievementUnlocked('kill10000')) {
        if (unlockAchievement('kill10000')) newlyUnlocked.push('kill10000');
    }

    // Boss achievements
    if (stats.totalBossesKilled >= 1 && !isAchievementUnlocked('firstBoss')) {
        if (unlockAchievement('firstBoss')) newlyUnlocked.push('firstBoss');
    }
    if (stats.totalBossesKilled >= 5 && !isAchievementUnlocked('boss5')) {
        if (unlockAchievement('boss5')) newlyUnlocked.push('boss5');
    }
    if (stats.totalBossesKilled >= 10 && !isAchievementUnlocked('boss10')) {
        if (unlockAchievement('boss10')) newlyUnlocked.push('boss10');
    }
    if (stats.totalBossesKilled >= 25 && !isAchievementUnlocked('boss25')) {
        if (unlockAchievement('boss25')) newlyUnlocked.push('boss25');
    }
    if (stats.totalBossesKilled >= 50 && !isAchievementUnlocked('boss50')) {
        if (unlockAchievement('boss50')) newlyUnlocked.push('boss50');
    }

    // Run achievements
    if (stats.totalRuns >= 1 && !isAchievementUnlocked('firstRun')) {
        if (unlockAchievement('firstRun')) newlyUnlocked.push('firstRun');
    }
    if (stats.totalRuns >= 10 && !isAchievementUnlocked('run10')) {
        if (unlockAchievement('run10')) newlyUnlocked.push('run10');
    }
    if (stats.totalRuns >= 50 && !isAchievementUnlocked('run50')) {
        if (unlockAchievement('run50')) newlyUnlocked.push('run50');
    }
    if (stats.totalRuns >= 100 && !isAchievementUnlocked('run100')) {
        if (unlockAchievement('run100')) newlyUnlocked.push('run100');
    }

    // Upgrade achievements (best level in a run)
    if (stats.bestLevel >= 10 && !isAchievementUnlocked('level10')) {
        if (unlockAchievement('level10')) newlyUnlocked.push('level10');
    }
    if (stats.bestLevel >= 20 && !isAchievementUnlocked('level20')) {
        if (unlockAchievement('level20')) newlyUnlocked.push('level20');
    }
    if (stats.bestLevel >= 30 && !isAchievementUnlocked('level30')) {
        if (unlockAchievement('level30')) newlyUnlocked.push('level30');
    }
    if (stats.bestLevel >= 50 && !isAchievementUnlocked('level50')) {
        if (unlockAchievement('level50')) newlyUnlocked.push('level50');
    }

    // Currency achievements
    if (stats.totalCurrencyEarned >= 100 && !isAchievementUnlocked('earn100')) {
        if (unlockAchievement('earn100')) newlyUnlocked.push('earn100');
    }
    if (stats.totalCurrencyEarned >= 500 && !isAchievementUnlocked('earn500')) {
        if (unlockAchievement('earn500')) newlyUnlocked.push('earn500');
    }
    if (stats.totalCurrencyEarned >= 1000 && !isAchievementUnlocked('earn1000')) {
        if (unlockAchievement('earn1000')) newlyUnlocked.push('earn1000');
    }
    if (stats.totalCurrencyEarned >= 5000 && !isAchievementUnlocked('earn5000')) {
        if (unlockAchievement('earn5000')) newlyUnlocked.push('earn5000');
    }
    if (stats.totalCurrencyEarned >= 10000 && !isAchievementUnlocked('earn10000')) {
        if (unlockAchievement('earn10000')) newlyUnlocked.push('earn10000');
    }

    // Track run unlocks
    newlyUnlocked.forEach(id => {
        if (!runUnlockedAchievements.includes(id)) {
            runUnlockedAchievements.push(id);
        }
    });

    // Show toast notifications for newly unlocked achievements
    if (newlyUnlocked.length > 0 && k) {
        // Make sure toast system is initialized
        initToastSystem(k);

        // Check if we're in multiplayer to broadcast achievements
        const inMultiplayer = isMultiplayerActive();
        const localSlot = inMultiplayer ? getLocalPlayerSlot() : 0;

        newlyUnlocked.forEach((achId, index) => {
            const achievement = ACHIEVEMENTS[achId];
            if (achievement) {
                // Play sound for first achievement
                if (index === 0) {
                    playAchievement();
                }

                // Stagger toasts slightly
                k.wait(index * 0.5, () => {
                    showAchievementToast(achievement);
                });

                // Broadcast to other players in multiplayer
                if (inMultiplayer) {
                    broadcastAchievementUnlocked(achId, localSlot);
                }
            }
        });
    }

    return newlyUnlocked;
}

/**
 * Get all achievement info with unlock status for display
 * @returns {Array} Array of achievement objects with unlocked status
 */
export function getAllAchievementsWithStatus() {
    const unlockedIds = getUnlockedAchievements();

    return Object.values(ACHIEVEMENTS).map(achievement => ({
        ...achievement,
        isUnlocked: unlockedIds.includes(achievement.id)
    }));
}
