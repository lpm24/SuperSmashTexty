// Meta progression system - handles currency, saves, and unlocks

import { generateRandomName, generateInviteCode } from './nameGenerator.js';
import { getAchievementReward, getAchievementById } from '../data/achievements.js';
import { CHARACTER_UNLOCKS, getUnlockInfo } from '../data/unlocks.js';

const STORAGE_KEY = 'superSmashTexty_save';
const CURRENCY_NAME = 'Credits'; // Full name (rarely used)
const CURRENCY_ICON = '$'; // Icon used for display

// Default save data structure
const DEFAULT_SAVE = {
    version: 1,
    currency: 0,
    playerName: null, // Will be generated on first load
    inviteCode: null, // Will be generated on first load
    // Player XP/Level system (cosmetic prestige)
    totalXP: 0,
    playerLevel: 1,
    selectedPortrait: 'default',
    unlocks: {
        characters: ['survivor'], // Default character is always unlocked
        weapons: ['default'], // Default weapon is always unlocked
        permanentUpgrades: [], // Array of unlock keys
        portraits: ['default'] // Default portrait is always unlocked
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
        totalCurrencyEarned: 0,
        totalPlayTime: 0, // Total play time in seconds
        fastestRunTime: 0 // Fastest run completion time in seconds
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
export function checkFloorUnlocks(floorCompleted) {
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

// Check and unlock characters based on achievement completion
// Call this after unlocking an achievement
export function checkAchievementUnlocks(achievementId) {
    let unlocked = [];

    for (const [key, char] of Object.entries(CHARACTER_UNLOCKS)) {
        if (char.unlockRequirement &&
            char.unlockRequirement.type === 'achievement' &&
            char.unlockRequirement.value === achievementId) {
            if (!isUnlocked('characters', key)) {
                unlockItem('characters', key);
                unlocked.push({ type: 'character', key, name: char.name });
            }
        }
    }

    return unlocked;
}

// Check if a character is unlocked (handles both floor and achievement requirements)
export function isCharacterUnlocked(characterKey) {
    // First check if explicitly unlocked in save data
    if (isUnlocked('characters', characterKey)) {
        return true;
    }

    // Import CHARACTER_UNLOCKS synchronously (already loaded)
    // This is a convenience function - for async contexts use checkAchievementUnlocks
    return false; // If not in save data, it's not unlocked
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

// ============ BOOSTER FUNCTIONS ============

/**
 * Purchase a run booster (consumable)
 * @param {string} boosterKey - The booster to purchase
 * @param {number} cost - The cost of the booster
 * @returns {Object} Result object with success status
 */
export function purchaseBooster(boosterKey, cost) {
    const save = loadSave();

    // Check if player has enough currency
    if (save.currency < cost) {
        return { success: false, reason: 'insufficientCurrency' };
    }

    // Initialize boosters array if needed
    if (!save.activeBoosters) {
        save.activeBoosters = [];
    }

    // Deduct currency
    save.currency -= cost;

    // Track currency spent in stats
    if (save.stats) {
        save.stats.totalCurrencySpent = (save.stats.totalCurrencySpent || 0) + cost;
    }

    // Add booster to active boosters
    save.activeBoosters.push({
        key: boosterKey,
        purchasedAt: Date.now()
    });

    saveGame(save);
    return { success: true, boosterKey };
}

/**
 * Get count of active boosters
 * @returns {number} Number of active boosters ready to use
 */
export function getActiveBoostersCount() {
    const save = loadSave();
    return (save.activeBoosters || []).length;
}

/**
 * Get all active boosters
 * @returns {Array} Array of active booster objects
 */
export function getActiveBoosters() {
    const save = loadSave();
    return save.activeBoosters || [];
}

/**
 * Consume all active boosters for a run
 * @returns {Array} Array of consumed booster effects
 */
export function consumeBoosters() {
    const save = loadSave();
    const boosters = save.activeBoosters || [];

    // Clear boosters
    save.activeBoosters = [];
    saveGame(save);

    return boosters;
}

/**
 * Clear a specific booster (refund not included - just removes it)
 * @param {number} index - Index of booster to clear
 */
export function clearBooster(index) {
    const save = loadSave();
    if (save.activeBoosters && index >= 0 && index < save.activeBoosters.length) {
        save.activeBoosters.splice(index, 1);
        saveGame(save);
        return true;
    }
    return false;
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

        // Award credit reward for the achievement
        const achievement = getAchievementById(achievementId);
        const reward = getAchievementReward(achievement);
        if (reward > 0) {
            save.currency = Math.min(Number.MAX_SAFE_INTEGER, save.currency + reward);
            console.log(`[MetaProgression] Achievement "${achievementId}" awarded ${reward} credits`);
        }

        saveGame(save);

        // Check if this achievement unlocks any characters
        checkAchievementUnlocks(achievementId).then(unlockedChars => {
            if (unlockedChars.length > 0) {
                console.log('[MetaProgression] Achievement unlocked characters:', unlockedChars);
            }
        });

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

    // Boss Bounty upgrade: +15 credits per boss killed per level
    const bossBountyLevel = getPermanentUpgradeLevel('bossBounty');
    if (bossBountyLevel > 0 && runStats.bossesKilled > 0) {
        currency += runStats.bossesKilled * bossBountyLevel * 15;
    }

    // Credit Bonus upgrade: +8% credits per level
    const creditBonusLevel = getPermanentUpgradeLevel('creditBonus');
    if (creditBonusLevel > 0) {
        currency = Math.floor(currency * (1 + creditBonusLevel * 0.08));
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

/**
 * Check if a shop item's achievement requirement is met
 * @param {string} category - Category of the item ('characters', 'weapons', 'permanentUpgrades')
 * @param {string} itemKey - Key of the item to check
 * @returns {boolean} True if achievement requirement is met (or no requirement exists)
 */
export function isShopItemAchievementUnlocked(category, itemKey) {
    const unlockInfo = getUnlockInfo(category, itemKey);

    if (!unlockInfo || !unlockInfo.requiredAchievement) {
        return true; // No achievement requirement
    }

    return isAchievementUnlocked(unlockInfo.requiredAchievement);
}

/**
 * Get the required achievement info for a shop item
 * @param {string} category - Category of the item
 * @param {string} itemKey - Key of the item
 * @returns {Object|null} Achievement info or null if no requirement
 */
export function getRequiredAchievementForItem(category, itemKey) {
    const unlockInfo = getUnlockInfo(category, itemKey);

    if (!unlockInfo || !unlockInfo.requiredAchievement) {
        return null;
    }

    const achievement = getAchievementById(unlockInfo.requiredAchievement);
    return achievement;
}

/**
 * Synchronous version - Check if a shop item's achievement requirement is met
 * Use this when you already have the unlock info
 * @param {Object} unlockInfo - Unlock info object (must have requiredAchievement field if required)
 * @returns {boolean} True if achievement requirement is met (or no requirement exists)
 */
export function isItemAchievementUnlockedSync(unlockInfo) {
    if (!unlockInfo || !unlockInfo.requiredAchievement) {
        return true; // No achievement requirement
    }

    return isAchievementUnlocked(unlockInfo.requiredAchievement);
}

// ============ COSMETIC FUNCTIONS ============

/**
 * Get the equipped cosmetic of a specific type
 * @param {string} type - Type of cosmetic (trail, death, glow)
 * @returns {string} Key of the equipped cosmetic, or default
 */
export function getEquippedCosmetic(type) {
    const save = loadSave();
    if (!save.equippedCosmetics) {
        return type === 'trail' ? 'trailNone' : type === 'death' ? 'deathNone' : 'glowNone';
    }
    return save.equippedCosmetics[type] || (type === 'trail' ? 'trailNone' : type === 'death' ? 'deathNone' : 'glowNone');
}

/**
 * Set the equipped cosmetic of a specific type
 * @param {string} type - Type of cosmetic (trail, death, glow)
 * @param {string} key - Key of the cosmetic to equip
 * @returns {boolean} True if successful
 */
export function setEquippedCosmetic(type, key) {
    const save = loadSave();

    // Initialize cosmetics object if needed
    if (!save.equippedCosmetics) {
        save.equippedCosmetics = {
            trail: 'trailNone',
            death: 'deathNone',
            glow: 'glowNone'
        };
    }

    // Check if the cosmetic is owned (either default or purchased)
    if (!key.includes('None') && !isUnlocked('cosmetics', key)) {
        return false; // Can't equip what you don't own
    }

    save.equippedCosmetics[type] = key;
    saveGame(save);
    return true;
}

/**
 * Get all equipped cosmetics
 * @returns {Object} Object with trail, death, glow keys
 */
export function getEquippedCosmetics() {
    const save = loadSave();
    return save.equippedCosmetics || {
        trail: 'trailNone',
        death: 'deathNone',
        glow: 'glowNone'
    };
}

// ============ PLAYER XP/LEVEL SYSTEM ============

/**
 * Calculate player level from total XP
 * Formula: level = floor(sqrt(totalXP / 100)) + 1
 * - Level 1: 0 XP
 * - Level 2: 100 XP
 * - Level 5: 1,600 XP
 * - Level 10: 8,100 XP
 * - Level 20: 36,100 XP
 * - Level 50: 240,100 XP
 * @param {number} xp - Total XP
 * @returns {number} Player level
 */
export function calculateLevelFromXP(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calculate XP required for a specific level
 * @param {number} level - Target level
 * @returns {number} Total XP required to reach that level
 */
export function getXPRequiredForLevel(level) {
    if (level <= 1) return 0;
    return Math.pow(level - 1, 2) * 100;
}

/**
 * Get current player level
 * @returns {number} Current level
 */
export function getPlayerLevel() {
    const save = loadSave();
    return calculateLevelFromXP(save.totalXP || 0);
}

/**
 * Get total XP earned
 * @returns {number} Total XP
 */
export function getTotalXP() {
    const save = loadSave();
    return save.totalXP || 0;
}

/**
 * Get XP required for next level
 * @returns {number} XP needed for next level
 */
export function getXPForNextLevel() {
    const currentLevel = getPlayerLevel();
    return getXPRequiredForLevel(currentLevel + 1);
}

/**
 * Get XP progress towards next level (0-1)
 * @returns {number} Progress percentage (0-1)
 */
export function getXPProgress() {
    const totalXP = getTotalXP();
    const currentLevel = calculateLevelFromXP(totalXP);
    const currentLevelXP = getXPRequiredForLevel(currentLevel);
    const nextLevelXP = getXPRequiredForLevel(currentLevel + 1);

    if (nextLevelXP === currentLevelXP) return 1;
    return (totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP);
}

/**
 * Add XP to player and check for level ups
 * @param {number} amount - XP to add
 * @returns {Object} Result with newXP, newLevel, levelsGained
 */
export function addXP(amount) {
    const save = loadSave();
    const oldLevel = calculateLevelFromXP(save.totalXP || 0);

    save.totalXP = (save.totalXP || 0) + amount;
    const newLevel = calculateLevelFromXP(save.totalXP);

    // Update stored level
    save.playerLevel = newLevel;

    saveGame(save);

    return {
        newXP: save.totalXP,
        newLevel: newLevel,
        levelsGained: newLevel - oldLevel,
        oldLevel: oldLevel
    };
}

/**
 * Calculate XP earned from a run
 * @param {Object} runStats - Run statistics
 * @returns {number} XP earned
 */
export function calculateRunXP(runStats) {
    let xp = 0;

    // Floors reached: 50 XP per floor
    xp += (runStats.floorsReached || 0) * 50;

    // Enemies killed: 2 XP each
    xp += (runStats.enemiesKilled || 0) * 2;

    // Bosses killed: 100 XP each
    xp += (runStats.bossesKilled || 0) * 100;

    // Run completion bonus (reached floor 5+): 200 XP
    if ((runStats.floorsReached || 0) >= 5) {
        xp += 200;
    }

    // Daily run completion bonus: 500 XP
    if (runStats.isDailyRun) {
        xp += 500;
    }

    return xp;
}

// ============ PORTRAIT SYSTEM ============

/**
 * Get selected portrait ID
 * @returns {string} Portrait ID
 */
export function getSelectedPortrait() {
    const save = loadSave();
    return save.selectedPortrait || 'default';
}

/**
 * Set selected portrait
 * @param {string} portraitId - Portrait ID to select
 * @returns {boolean} True if successful
 * Note: Caller should verify portrait is unlocked before calling this
 */
export function setSelectedPortrait(portraitId) {
    const save = loadSave();
    save.selectedPortrait = portraitId;
    saveGame(save);
    return true;
}

/**
 * Check if a portrait is unlocked
 * @param {string} portraitId - Portrait ID to check
 * @returns {boolean} True if unlocked
 */
export function isPortraitUnlocked(portraitId) {
    const save = loadSave();

    // Default portrait is always unlocked
    if (portraitId === 'default') return true;

    // Check unlocks array
    if (save.unlocks?.portraits?.includes(portraitId)) {
        return true;
    }

    return false;
}

/**
 * Unlock a portrait
 * @param {string} portraitId - Portrait ID to unlock
 * @returns {boolean} True if newly unlocked
 */
export function unlockPortrait(portraitId) {
    const save = loadSave();

    if (!save.unlocks.portraits) {
        save.unlocks.portraits = ['default'];
    }

    if (!save.unlocks.portraits.includes(portraitId)) {
        save.unlocks.portraits.push(portraitId);
        saveGame(save);
        return true;
    }

    return false;
}

/**
 * Get all unlocked portraits
 * @returns {Array} Array of unlocked portrait IDs
 */
export function getUnlockedPortraits() {
    const save = loadSave();
    return save.unlocks?.portraits || ['default'];
}

