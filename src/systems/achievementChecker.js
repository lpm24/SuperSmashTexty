// Achievement checking system - checks and unlocks achievements based on stats

import { getSaveStats, unlockAchievement, isAchievementUnlocked, getUnlockedAchievements, getSaveData } from './metaProgression.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { playAchievement } from './sounds.js';
import { showAchievementToast, initToastSystem } from './toastNotifications.js';
import { CHARACTER_UNLOCKS, PERMANENT_UPGRADE_UNLOCKS } from '../data/unlocks.js';
import { isMultiplayerActive, getLocalPlayerSlot, broadcastAchievementUnlocked } from './multiplayerGame.js';

// Track achievements unlocked during the current run
let runUnlockedAchievements = [];

// Track run-specific data for challenge achievements
let runChallengeData = {
    floorDamageTaken: {},    // Tracks damage taken per floor
    runStartTime: 0,         // When the run started
    bossesKilledThisRun: 0,  // Bosses killed in current run
    currentBossNoDamage: true, // Did we take damage during current boss fight
    bossStartHP: 0,          // HP at start of boss fight
    damageTakenThisRun: 0,   // Total damage the local player has taken this run (for flawless_run)
    enemyKillTimes: [],      // Timestamps of recent kills (for killStreak10)
    synergyCount: 0          // Synergies activated this run (for synergyMaster)
};

// Store kaplay instance for showing toasts from event functions
let kInstance = null;

/**
 * Helper function to unlock an achievement and show toast immediately
 * @param {string} achievementId - Achievement ID to unlock
 * @returns {boolean} True if newly unlocked
 */
function unlockAndNotify(achievementId) {
    if (isAchievementUnlocked(achievementId)) return false;

    if (unlockAchievement(achievementId)) {
        runUnlockedAchievements.push(achievementId);

        // Show toast immediately if we have a kaplay instance
        if (kInstance) {
            const achievement = ACHIEVEMENTS[achievementId];
            if (achievement) {
                playAchievement();
                showAchievementToast(achievement);

                // Broadcast in multiplayer
                if (isMultiplayerActive()) {
                    broadcastAchievementUnlocked(achievementId, getLocalPlayerSlot());
                }
            }
        }
        return true;
    }
    return false;
}

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
        bossStartHP: 0,
        damageTakenThisRun: 0,
        enemyKillTimes: [],
        synergyCount: 0
    };

    // Store kaplay instance for showing toasts from event functions
    kInstance = k;

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
 * Track damage taken by the local player this run (for the flawless_run achievement).
 * Hooked to the local player's health "hurt" event in game.js.
 * @param {number} damage - Amount of damage taken
 */
export function trackPlayerDamage(damage = 0) {
    if (damage > 0) {
        runChallengeData.damageTakenThisRun += damage;
    }
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
    if (runChallengeData.currentBossNoDamage) {
        unlockAndNotify('noHitBoss');
    }

    // Check glassCannonWin achievement (below 25% HP)
    const hpPercent = playerCurrentHP / playerMaxHP;
    if (hpPercent < 0.25) {
        unlockAndNotify('glassCannonWin');
    }

    // Check bossRush achievement (3 bosses in one run)
    if (runChallengeData.bossesKilledThisRun >= 3) {
        unlockAndNotify('bossRush');
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
    if (wasFloorPerfect(floor)) {
        unlockAndNotify('perfectFloor');
    }

    // Check speedRunner achievement (Floor 3 in under 5 minutes)
    if (floor >= 3) {
        const runDuration = (Date.now() - runChallengeData.runStartTime) / 1000;
        if (runDuration < 300) { // 5 minutes = 300 seconds
            unlockAndNotify('speedRunner');
        }
    }

    // Initialize damage tracking for next floor
    runChallengeData.floorDamageTaken[floor + 1] = 0;
}

/**
 * Called when a synergy is activated (for firstSynergy achievement)
 */
export function onSynergyActivated() {
    runChallengeData.synergyCount = (runChallengeData.synergyCount || 0) + 1;
    unlockAndNotify('firstSynergy');
    if (runChallengeData.synergyCount >= 3) {
        unlockAndNotify('synergyMaster');
    }
}

/**
 * Called when any enemy/miniboss/boss is killed (for killStreak10).
 * Awards when 10 kills land within a 5-second window.
 */
export function trackEnemyKill() {
    const now = Date.now();
    runChallengeData.enemyKillTimes.push(now);
    runChallengeData.enemyKillTimes = runChallengeData.enemyKillTimes.filter(t => now - t <= 5000);
    if (runChallengeData.enemyKillTimes.length >= 10) {
        unlockAndNotify('killStreak10');
    }
}

/**
 * Called when the local player collects any pickup (for firstPickup).
 */
export function trackPickup() {
    unlockAndNotify('firstPickup');
}

/**
 * Called from the player onHurt hook when a hit leaves the player at exactly 1 HP (for closeCall).
 */
export function trackCloseCall() {
    unlockAndNotify('closeCall');
}

/**
 * Check if all characters are unlocked (for allCharacters achievement)
 */
export function checkAllCharactersUnlocked() {
    const saveData = getSaveData();
    const unlockedCharacters = saveData.unlocks?.characters || ['survivor'];
    const totalCharacters = Object.keys(CHARACTER_UNLOCKS).length;

    if (unlockedCharacters.length >= totalCharacters) {
        unlockAndNotify('allCharacters');
    }
}

/**
 * Check if any permanent upgrade is maxed (for maxUpgrade achievement)
 */
export function checkMaxUpgrade() {
    const saveData = getSaveData();
    const upgradeLevels = saveData.permanentUpgradeLevels || {};

    for (const [key, upgrade] of Object.entries(PERMANENT_UPGRADE_UNLOCKS)) {
        const currentLevel = upgradeLevels[key] || 0;
        const maxLevel = upgrade.maxLevel || 1;

        if (currentLevel >= maxLevel) {
            unlockAndNotify('maxUpgrade');
            break;
        }
    }
}

// Check all achievements based on current stats
// Can be called during gameplay or at game over
// @param {Object} k - Kaplay instance (optional, uses stored instance if not provided)
// @param {Object} currentRunStats - Optional current run stats to augment saved stats
//   { floor, enemiesKilled, bossesKilled, level, currencyEarned }
export function checkAchievements(k, currentRunStats = null) {
    // Update kInstance if provided (for showing toasts)
    if (k) {
        kInstance = k;
        initToastSystem(k);
    }

    const savedStats = getSaveStats();

    // Merge saved stats with current run stats if provided
    const stats = {
        bestFloor: Math.max(savedStats.bestFloor || 0, currentRunStats?.floor || 0),
        totalEnemiesKilled: (savedStats.totalEnemiesKilled || 0) + (currentRunStats?.enemiesKilled || 0),
        totalBossesKilled: (savedStats.totalBossesKilled || 0) + (currentRunStats?.bossesKilled || 0),
        totalRuns: savedStats.totalRuns || 0,
        bestLevel: Math.max(savedStats.bestLevel || 0, currentRunStats?.level || 0),
        totalCurrencyEarned: (savedStats.totalCurrencyEarned || 0) + (currentRunStats?.currencyEarned || 0),
        totalRoomsCleared: savedStats.totalRoomsCleared || 0,
        totalCurrencySpent: savedStats.totalCurrencySpent || 0,
        totalMinibossesKilled: savedStats.totalMinibossesKilled || 0,
        totalXpOrbs: savedStats.totalXpOrbs || 0
    };

    const newlyUnlocked = [];

    // Helper to check and unlock with notification
    const check = (condition, achievementId) => {
        if (condition && unlockAndNotify(achievementId)) {
            newlyUnlocked.push(achievementId);
        }
    };

    // Floor progression achievements
    check(stats.bestFloor >= 2, 'floor2');
    check(stats.bestFloor >= 3, 'floor3');
    check(stats.bestFloor >= 5, 'floor5');
    check(stats.bestFloor >= 10, 'floor10');
    check(stats.bestFloor >= 15, 'floor15');
    check(stats.bestFloor >= 20, 'floor20');

    // Combat achievements
    check(stats.totalEnemiesKilled >= 1, 'firstKill');
    check(stats.totalEnemiesKilled >= 100, 'kill100');
    check(stats.totalEnemiesKilled >= 500, 'kill500');
    check(stats.totalEnemiesKilled >= 1000, 'kill1000');
    check(stats.totalEnemiesKilled >= 5000, 'kill5000');
    check(stats.totalEnemiesKilled >= 10000, 'kill10000');

    // Boss achievements
    check(stats.totalBossesKilled >= 1, 'firstBoss');
    check(stats.totalBossesKilled >= 5, 'boss5');
    check(stats.totalBossesKilled >= 10, 'boss10');
    check(stats.totalBossesKilled >= 25, 'boss25');
    check(stats.totalBossesKilled >= 50, 'boss50');

    // Run achievements
    check(stats.totalRuns >= 1, 'firstRun');
    check(stats.totalRuns >= 10, 'run10');
    check(stats.totalRuns >= 50, 'run50');
    check(stats.totalRuns >= 100, 'run100');

    // Upgrade achievements (best level in a run)
    check(stats.bestLevel >= 10, 'level10');
    check(stats.bestLevel >= 20, 'level20');
    check(stats.bestLevel >= 30, 'level30');
    check(stats.bestLevel >= 50, 'level50');

    // Currency achievements
    check(stats.totalCurrencyEarned >= 100, 'earn100');
    check(stats.totalCurrencyEarned >= 500, 'earn500');
    check(stats.totalCurrencyEarned >= 1000, 'earn1000');
    check(stats.totalCurrencyEarned >= 5000, 'earn5000');
    check(stats.totalCurrencyEarned >= 10000, 'earn10000');
    check(stats.totalCurrencySpent >= 1000, 'bigSpender');

    // Rooms-cleared achievements (these thresholds existed but were never checked)
    check(stats.totalRoomsCleared >= 100, 'rooms100');
    check(stats.totalRoomsCleared >= 500, 'rooms500');

    // Miniboss and XP-orb cumulative achievements (stats now tracked per run)
    check(stats.totalMinibossesKilled >= 10, 'minibossSlayer');
    check(stats.totalXpOrbs >= 1000, 'xpHoarder');

    // Run-duration achievements (runStartTime is set in initAchievementChecker)
    const runDuration = (Date.now() - runChallengeData.runStartTime) / 1000;
    check(runDuration >= 1800, 'longRun'); // Survive 30 minutes
    // quickDeath only applies at run end (checkAchievements is called with no run stats then)
    check(!currentRunStats && runDuration < 30, 'quickDeath');

    // Self-contained checks that read save data directly (no run stats needed)
    checkMaxUpgrade();
    checkAllCharactersUnlocked();

    // Run-specific challenge: flawless run (defeat a boss having taken zero
    // damage the entire run). bossesKilled here is the current run's count.
    check(
        currentRunStats &&
        (currentRunStats.bossesKilled || 0) >= 1 &&
        runChallengeData.damageTakenThisRun === 0,
        'flawless_run'
    );

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
