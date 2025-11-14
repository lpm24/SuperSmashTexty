// Meta progression system - handles currency, saves, and unlocks

const STORAGE_KEY = 'superSmashTexty_save';
const CURRENCY_NAME = 'Credits'; // Can be changed later

// Default save data structure
const DEFAULT_SAVE = {
    version: 1,
    currency: 0,
    unlocks: {
        characters: ['survivor'], // Default character is always unlocked
        weapons: ['default'], // Default weapon is always unlocked
        permanentUpgrades: [] // Array of unlock keys
    },
    permanentUpgradeLevels: {}, // Track levels for permanent upgrades: { upgradeKey: level }
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
    achievements: [] // Array of unlocked achievement IDs
};

// Load save data from localStorage
export function loadSave() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            // Merge with default to handle missing fields
            return { ...DEFAULT_SAVE, ...data };
        }
    } catch (e) {
        console.error('Error loading save:', e);
    }
    return { ...DEFAULT_SAVE };
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
    save.currency += amount;
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

// Get currency name
export function getCurrencyName() {
    return CURRENCY_NAME;
}

// Reset save (for testing/debugging)
export function resetSave() {
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULT_SAVE };
}

