// Meta progression system - handles currency, saves, and unlocks

import { generateRandomName, generateInviteCode } from './nameGenerator.js';

const STORAGE_KEY = 'superSmashTexty_save';
const CURRENCY_NAME = 'Credits'; // Full name (rarely used)
const CURRENCY_ICON = '$'; // Icon used for display

// Default save data structure
const DEFAULT_SAVE = {
    version: 1,
    currency: 0,
    playerName: null, // Will be generated on first load
    inviteCode: null, // Will be generated on first load
    unlocks: {
        characters: ['survivor'], // Default character is always unlocked
        weapons: ['default'], // Default weapon is always unlocked
        permanentUpgrades: [] // Array of unlock keys
    },
    permanentUpgradeLevels: {}, // Track levels for permanent upgrades: { upgradeKey: level }
    permanentUpgradePurchaseHistory: {}, // Track purchase costs: { upgradeKey: [cost1, cost2, ...] }
    stats: {
        totalRuns: 0,
        totalFloorsReached: 0,
        totalRoomsCleared: 0,
        totalEnemiesKilled: 0,
        totalBossesKilled: 0,
        bestFloor: 1,
        bestRoom: 1,
        bestLevel: 1,
        totalCurrencyEarned: 0
    },
    achievements: [], // Array of unlocked achievement IDs
    runHistory: [] // Array of last 20 run records
};

// Maximum number of runs to store in history
const MAX_RUN_HISTORY = 20;

// Load save data from localStorage
export function loadSave() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            // Merge with default to handle missing fields
            const mergedData = { ...DEFAULT_SAVE, ...data };

            // Generate player name if not set
            if (!mergedData.playerName) {
                mergedData.playerName = generateRandomName();
                saveGame(mergedData);
            }

            // Generate invite code if not set
            if (!mergedData.inviteCode) {
                mergedData.inviteCode = generateInviteCode();
                saveGame(mergedData);
            }

            return mergedData;
        }
    } catch (e) {
        console.error('Error loading save:', e);
    }

    // First time load - generate name and code
    const newSave = { ...DEFAULT_SAVE };
    newSave.playerName = generateRandomName();
    newSave.inviteCode = generateInviteCode();
    saveGame(newSave);
    return newSave;
}

// Save data to localStorage
export function saveGame(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Error saving game:', e);
        return false;
    }
}

// Get current save data
export function getSaveData() {
    return loadSave();
}

// Add currency to save
export function addCurrency(amount) {
    const save = loadSave();
    // Cap currency at Number.MAX_SAFE_INTEGER to prevent overflow
    save.currency = Math.min(Number.MAX_SAFE_INTEGER, save.currency + amount);
    saveGame(save);
    return save.currency;
}

// Get current currency
export function getCurrency() {
    return loadSave().currency;
}

// Check if something is unlocked
export function isUnlocked(category, item) {
    const save = loadSave();
    return save.unlocks[category] && save.unlocks[category].includes(item);
}

// Unlock an item
export function unlockItem(category, item) {
    const save = loadSave();
    if (!save.unlocks[category]) {
        save.unlocks[category] = [];
    }
    if (!save.unlocks[category].includes(item)) {
        save.unlocks[category].push(item);
        saveGame(save);
        return true;
    }
    return false;
}

// Check and unlock characters based on floor completion
// Note: This function is async to avoid circular dependency issues
export async function checkFloorUnlocks(floorCompleted) {
    // Dynamic import to avoid circular dependency
    const { CHARACTER_UNLOCKS } = await import('../data/unlocks.js');
    const save = loadSave();
    let unlocked = false;
    
    for (const [key, char] of Object.entries(CHARACTER_UNLOCKS)) {
        if (char.unlockRequirement && 
            char.unlockRequirement.type === 'floor' && 
            floorCompleted >= char.unlockRequirement.value) {
            if (!isUnlocked('characters', key)) {
                unlockItem('characters', key);
                unlocked = true;
            }
        }
    }
    
    return unlocked;
}

// Get selected character (stored in save)
export function getSelectedCharacter() {
    const save = loadSave();
    return save.selectedCharacter || 'survivor';
}

// Set selected character
export function setSelectedCharacter(characterKey) {
    const save = loadSave();
    save.selectedCharacter = characterKey;
    saveGame(save);
}

// Get permanent upgrade level
export function getPermanentUpgradeLevel(upgradeKey) {
    const save = loadSave();
    if (!save.permanentUpgradeLevels) {
        save.permanentUpgradeLevels = {};
    }
    return save.permanentUpgradeLevels[upgradeKey] || 0;
}

// Purchase an unlock with currency
export function purchaseUnlock(category, item, cost) {
    const save = loadSave();
    if (save.currency >= cost) {
        save.currency -= cost;
        // Unlock the item
        if (!save.unlocks[category]) {
            save.unlocks[category] = [];
        }
        if (!save.unlocks[category].includes(item)) {
            save.unlocks[category].push(item);
        }
        saveGame(save);
        return true;
    }
    return false;
}

// Calculate escalating price for permanent upgrades (same as shop.js)
function getUpgradePrice(level) {
    // Level 1 = $50, Level 2 = $65, Level 3 = $90, Level 4 = $115, Level 5 = $160
    const prices = [50, 65, 90, 115, 160];
    if (level < prices.length) {
        return prices[level];
    }
    // For levels beyond 5, increase by 50 each level
    return 160 + (level - 4) * 50;
}

// Purchase a permanent upgrade (handles level tracking)
export function purchasePermanentUpgrade(upgradeKey, cost, maxLevel) {
    const save = loadSave();
    const currentLevel = getPermanentUpgradeLevel(upgradeKey);
    
    // Check if already at max level
    if (maxLevel && currentLevel >= maxLevel) {
        return { success: false, reason: 'maxLevel' };
    }
    
    // Check if enough currency
    if (save.currency < cost) {
        return { success: false, reason: 'insufficientCurrency' };
    }
    
    // Purchase
    save.currency -= cost;
    if (!save.permanentUpgradeLevels) {
        save.permanentUpgradeLevels = {};
    }
    save.permanentUpgradeLevels[upgradeKey] = (currentLevel || 0) + 1;
    
    // Track purchase cost for refund purposes
    if (!save.permanentUpgradePurchaseHistory) {
        save.permanentUpgradePurchaseHistory = {};
    }
    if (!save.permanentUpgradePurchaseHistory[upgradeKey]) {
        save.permanentUpgradePurchaseHistory[upgradeKey] = [];
    }
    save.permanentUpgradePurchaseHistory[upgradeKey].push(cost);
    
    // Also add to unlocks if first purchase
    if (!save.unlocks.permanentUpgrades) {
        save.unlocks.permanentUpgrades = [];
    }
    if (!save.unlocks.permanentUpgrades.includes(upgradeKey)) {
        save.unlocks.permanentUpgrades.push(upgradeKey);
    }
    
    saveGame(save);
    return { success: true, newLevel: save.permanentUpgradeLevels[upgradeKey] };
}

// Calculate total refundable credits for all permanent upgrades
export function getTotalRefundableCredits() {
    const save = loadSave();
    
    // If purchase history exists, use it (most accurate)
    if (save.permanentUpgradePurchaseHistory && Object.keys(save.permanentUpgradePurchaseHistory).length > 0) {
        let total = 0;
        Object.keys(save.permanentUpgradePurchaseHistory).forEach(upgradeKey => {
            const purchaseHistory = save.permanentUpgradePurchaseHistory[upgradeKey];
            if (purchaseHistory && Array.isArray(purchaseHistory)) {
                purchaseHistory.forEach(cost => {
                    total += cost;
                });
            }
        });
        return total;
    }
    
    // Fallback: Calculate retroactively from current levels (for existing saves)
    if (save.permanentUpgradeLevels && Object.keys(save.permanentUpgradeLevels).length > 0) {
        let total = 0;
        Object.keys(save.permanentUpgradeLevels).forEach(upgradeKey => {
            const level = save.permanentUpgradeLevels[upgradeKey] || 0;
            // Calculate what was paid for each level (0 to level-1)
            for (let i = 0; i < level; i++) {
                total += getUpgradePrice(i);
            }
        });
        return total;
    }
    
    return 0;
}

// Refund a single level of a specific permanent upgrade
export function refundSinglePermanentUpgrade(upgradeKey) {
    const save = loadSave();
    const currentLevel = getPermanentUpgradeLevel(upgradeKey);
    
    // Check if upgrade has any levels to refund
    if (currentLevel === 0) {
        return { success: false, reason: 'noLevels' };
    }
    
    // Get refund amount from purchase history (most accurate)
    let refundAmount = 0;
    if (save.permanentUpgradePurchaseHistory && 
        save.permanentUpgradePurchaseHistory[upgradeKey] && 
        save.permanentUpgradePurchaseHistory[upgradeKey].length > 0) {
        // Refund the last purchase (most recent level)
        const purchaseHistory = save.permanentUpgradePurchaseHistory[upgradeKey];
        refundAmount = purchaseHistory[purchaseHistory.length - 1];
        // Remove the last entry
        purchaseHistory.pop();
        if (purchaseHistory.length === 0) {
            delete save.permanentUpgradePurchaseHistory[upgradeKey];
        }
    } else {
        // Fallback: Calculate price for the level being refunded (level-1 to level-2)
        refundAmount = getUpgradePrice(currentLevel - 1);
    }
    
    // Return credits
    save.currency += refundAmount;
    
    // Decrease level by 1
    save.permanentUpgradeLevels[upgradeKey] = currentLevel - 1;
    
    // If level becomes 0, remove from unlocks
    if (save.permanentUpgradeLevels[upgradeKey] === 0) {
        delete save.permanentUpgradeLevels[upgradeKey];
        if (save.unlocks.permanentUpgrades) {
            const index = save.unlocks.permanentUpgrades.indexOf(upgradeKey);
            if (index > -1) {
                save.unlocks.permanentUpgrades.splice(index, 1);
            }
        }
    }
    
    saveGame(save);
    return { success: true, refundAmount, newLevel: save.permanentUpgradeLevels[upgradeKey] || 0 };
}

// Refund all permanent upgrades (returns credits and resets levels)
export function refundAllPermanentUpgrades() {
    const save = loadSave();
    const refundAmount = getTotalRefundableCredits();
    
    if (refundAmount === 0) {
        return { success: false, reason: 'noUpgrades' };
    }
    
    // Return credits
    save.currency += refundAmount;
    
    // Reset upgrade levels
    save.permanentUpgradeLevels = {};
    
    // Clear purchase history
    save.permanentUpgradePurchaseHistory = {};
    
    // Remove from unlocks (but keep the array structure)
    if (save.unlocks.permanentUpgrades) {
        save.unlocks.permanentUpgrades = [];
    }
    
    saveGame(save);
    return { success: true, refundAmount };
}

// Update run statistics
export function updateRunStats(runStats) {
    const save = loadSave();
    save.stats.totalRuns++;
    save.stats.totalFloorsReached += runStats.floorsReached || 0;
    save.stats.totalRoomsCleared += runStats.roomsCleared || 0;
    save.stats.totalEnemiesKilled += runStats.enemiesKilled || 0;
    save.stats.totalBossesKilled += runStats.bossesKilled || 0;
    save.stats.totalCurrencyEarned += runStats.currencyEarned || 0;
    
    if (runStats.floorsReached > save.stats.bestFloor) {
        save.stats.bestFloor = runStats.floorsReached;
    }
    if (runStats.roomsCleared > save.stats.bestRoom) {
        save.stats.bestRoom = runStats.roomsCleared;
    }
    if (runStats.level > save.stats.bestLevel) {
        save.stats.bestLevel = runStats.level || 1;
    }
    
    saveGame(save);
}

// Check if achievement is unlocked
export function isAchievementUnlocked(achievementId) {
    const save = loadSave();
    if (!save.achievements) {
        save.achievements = [];
    }
    return save.achievements.includes(achievementId);
}

// Unlock an achievement
export function unlockAchievement(achievementId) {
    const save = loadSave();
    if (!save.achievements) {
        save.achievements = [];
    }
    if (!save.achievements.includes(achievementId)) {
        save.achievements.push(achievementId);
        saveGame(save);
        return true; // Newly unlocked
    }
    return false; // Already unlocked
}

// Get all unlocked achievements
export function getUnlockedAchievements() {
    const save = loadSave();
    return save.achievements || [];
}

// Get save statistics
export function getSaveStats() {
    const save = loadSave();
    return save.stats || DEFAULT_SAVE.stats;
}

// Calculate currency earned from a run
export function calculateCurrencyEarned(runStats) {
    let currency = 0;
    
    // Base currency per floor reached
    currency += runStats.floorsReached * 10;
    
    // Currency per room cleared
    currency += runStats.roomsCleared * 5;
    
    // Currency per enemy killed (small amount)
    currency += Math.floor(runStats.enemiesKilled * 0.5);
    
    // Bonus for reaching higher floors
    if (runStats.floorsReached >= 2) {
        currency += 10; // Floor 2 bonus
    }
    if (runStats.floorsReached >= 3) {
        currency += 20; // Floor 3 bonus
    }
    if (runStats.floorsReached >= 4) {
        currency += 30; // Floor 4+ bonus
    }
    
    // Performance bonus: more enemies killed = bonus
    if (runStats.enemiesKilled >= 50) {
        currency += 10;
    }
    if (runStats.enemiesKilled >= 100) {
        currency += 20;
    }
    if (runStats.enemiesKilled >= 200) {
        currency += 30;
    }
    
    return Math.floor(currency);
}

// Get currency name (returns icon for display)
export function getCurrencyName() {
    return CURRENCY_ICON;
}

// Get currency icon (same as getCurrencyName for backward compatibility)
export function getCurrencyIcon() {
    return CURRENCY_ICON;
}

// Get player name
export function getPlayerName() {
    const save = loadSave();
    return save.playerName || 'Player';
}

// Set player name
export function setPlayerName(name) {
    const save = loadSave();
    save.playerName = name;
    saveGame(save);
    return save.playerName;
}

// Get invite code
export function getInviteCode() {
    const save = loadSave();
    return save.inviteCode || '000000';
}

// Set invite code
export function setInviteCode(code) {
    const save = loadSave();
    save.inviteCode = code;
    saveGame(save);
    return save.inviteCode;
}

// Reset save (for testing/debugging)
export function resetSave() {
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULT_SAVE };
}

/**
 * Record a completed run to history
 * @param {Object} runData - Run data to record
 * @param {string} runData.character - Character used
 * @param {string} runData.weapon - Weapon used
 * @param {number} runData.floorsReached - Floors reached
 * @param {number} runData.roomsCleared - Rooms cleared
 * @param {number} runData.enemiesKilled - Enemies killed
 * @param {number} runData.bossesKilled - Bosses killed
 * @param {number} runData.level - Final player level
 * @param {number} runData.currencyEarned - Currency earned
 * @param {number} runData.duration - Run duration in seconds
 * @param {string} runData.deathCause - What killed the player
 * @param {Array} runData.upgrades - Upgrades collected
 * @param {Array} runData.synergies - Synergies activated
 */
export function recordRun(runData) {
    const save = loadSave();

    // Ensure runHistory array exists
    if (!save.runHistory) {
        save.runHistory = [];
    }

    // Create run record
    const runRecord = {
        timestamp: Date.now(),
        character: runData.character || 'survivor',
        weapon: runData.weapon || 'pistol',
        floorsReached: runData.floorsReached || 1,
        roomsCleared: runData.roomsCleared || 0,
        enemiesKilled: runData.enemiesKilled || 0,
        bossesKilled: runData.bossesKilled || 0,
        level: runData.level || 1,
        currencyEarned: runData.currencyEarned || 0,
        duration: runData.duration || 0,
        deathCause: runData.deathCause || 'Unknown',
        upgrades: runData.upgrades || [],
        synergies: runData.synergies || []
    };

    // Add to history (most recent first)
    save.runHistory.unshift(runRecord);

    // Keep only last MAX_RUN_HISTORY runs
    if (save.runHistory.length > MAX_RUN_HISTORY) {
        save.runHistory = save.runHistory.slice(0, MAX_RUN_HISTORY);
    }

    saveGame(save);
    return runRecord;
}

/**
 * Get run history
 * @returns {Array} Array of run records (most recent first)
 */
export function getRunHistory() {
    const save = loadSave();
    return save.runHistory || [];
}

