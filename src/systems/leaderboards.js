/**
 * Leaderboard System
 *
 * Manages local leaderboards for:
 * - Daily runs (per date)
 * - All-time high scores
 * - Personal bests (per character)
 *
 * All data persisted to localStorage.
 */

import { getTodayDateString } from './dailyRuns.js';
import { getPlayerName } from './metaProgression.js';
import { submitOnlineScore } from './onlineLeaderboards.js';

const STORAGE_KEY = 'superSmashTextyLeaderboards';
const MAX_DAILY_ENTRIES = 100;
const MAX_ALLTIME_ENTRIES = 100;

/**
 * Get all leaderboard data
 * @returns {Object} - Leaderboard data structure
 */
export function getLeaderboards() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const parsed = data ? JSON.parse(data) : null;

        // Ensure proper structure
        return {
            daily: parsed?.daily || {},      // { "2026-01-18": [{ name, score, floor, character, time }] }
            allTime: parsed?.allTime || [],  // [{ name, score, floor, character, date }]
            personal: parsed?.personal || {} // { character: { bestFloor, bestScore, bestTime } }
        };
    } catch (e) {
        console.warn('[Leaderboards] Failed to load leaderboards:', e);
        return { daily: {}, allTime: [], personal: {} };
    }
}

/**
 * Save leaderboard data
 * @param {Object} data - Data to save
 */
function saveLeaderboards(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('[Leaderboards] Failed to save leaderboards:', e);
    }
}

/**
 * Calculate score from run stats
 * @param {Object} stats - Run statistics
 * @param {number} stats.floorsReached - Number of floors cleared
 * @param {number} stats.enemiesKilled - Total enemies killed
 * @param {number} stats.bossesKilled - Total bosses killed
 * @param {number} stats.duration - Run duration in seconds
 * @returns {number} - Calculated score
 */
export function calculateScore(stats) {
    const floorScore = (stats.floorsReached || 1) * 1000;
    const enemyScore = (stats.enemiesKilled || 0) * 10;
    const bossScore = (stats.bossesKilled || 0) * 500;

    // Time bonus: Max 30000 points, decreases by 50 per second
    const duration = stats.duration || 0;
    const timeBonus = Math.max(0, 30000 - Math.floor(duration * 50));

    return floorScore + enemyScore + bossScore + timeBonus;
}

/**
 * Submit a score to leaderboards
 * @param {Object} runData - Run data to submit
 * @param {number} runData.score - Final score
 * @param {number} runData.floor - Floor reached
 * @param {string} runData.character - Character used
 * @param {number} runData.time - Run duration in seconds
 * @param {boolean} runData.isDaily - Whether this is a daily run
 * @param {string} runData.date - Date of the run (YYYY-MM-DD)
 * @returns {Object} - Result { rank, isNewBest, dailyRank }
 */
export function submitScore(runData) {
    const data = getLeaderboards();
    const playerName = getPlayerName() || 'Anonymous';
    const date = runData.date || getTodayDateString();

    const entry = {
        name: playerName,
        score: runData.score || 0,
        floor: runData.floor || 1,
        character: runData.character || 'survivor',
        time: runData.time || 0,
        date: date,
        timestamp: Date.now()
    };

    let result = {
        rank: null,
        isNewBest: false,
        dailyRank: null,
        isNewPersonalBest: false
    };

    // Add to daily leaderboard if it's a daily run
    if (runData.isDaily) {
        if (!data.daily[date]) {
            data.daily[date] = [];
        }

        data.daily[date].push(entry);
        data.daily[date].sort((a, b) => b.score - a.score);

        // Trim to max entries
        if (data.daily[date].length > MAX_DAILY_ENTRIES) {
            data.daily[date] = data.daily[date].slice(0, MAX_DAILY_ENTRIES);
        }

        // Find rank (1-indexed)
        result.dailyRank = data.daily[date].findIndex(e =>
            e.timestamp === entry.timestamp && e.name === entry.name
        ) + 1;

        if (result.dailyRank === 0 || result.dailyRank > MAX_DAILY_ENTRIES) {
            result.dailyRank = null;
        }
    }

    // Add to all-time leaderboard
    data.allTime.push(entry);
    data.allTime.sort((a, b) => b.score - a.score);

    // Trim to max entries
    if (data.allTime.length > MAX_ALLTIME_ENTRIES) {
        data.allTime = data.allTime.slice(0, MAX_ALLTIME_ENTRIES);
    }

    // Find all-time rank (1-indexed)
    result.rank = data.allTime.findIndex(e =>
        e.timestamp === entry.timestamp && e.name === entry.name
    ) + 1;

    if (result.rank === 0 || result.rank > MAX_ALLTIME_ENTRIES) {
        result.rank = null;
    }

    // Update personal bests
    const char = entry.character;
    if (!data.personal[char]) {
        data.personal[char] = {
            bestScore: 0,
            bestFloor: 0,
            bestTime: Infinity
        };
    }

    const personal = data.personal[char];

    if (entry.score > personal.bestScore) {
        personal.bestScore = entry.score;
        result.isNewBest = true;
        result.isNewPersonalBest = true;
    }

    if (entry.floor > personal.bestFloor) {
        personal.bestFloor = entry.floor;
        result.isNewPersonalBest = true;
    }

    // Best time only counts if they reached a minimum floor
    if (entry.floor >= 3 && entry.time < personal.bestTime) {
        personal.bestTime = entry.time;
        result.isNewPersonalBest = true;
    }

    saveLeaderboards(data);

    console.log('[Leaderboards] Score submitted:', entry, 'Result:', result);

    // Submit to online leaderboard (non-blocking, fire and forget)
    submitOnlineScore(entry).catch(err => {
        console.warn('[Leaderboards] Online submission failed:', err);
    });

    return result;
}

/**
 * Get daily leaderboard for a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {number} limit - Max entries to return
 * @returns {Array} - Sorted leaderboard entries
 */
export function getDailyLeaderboard(date = null, limit = 10) {
    const data = getLeaderboards();
    const targetDate = date || getTodayDateString();
    const entries = data.daily[targetDate] || [];

    return entries.slice(0, limit);
}

/**
 * Get all-time leaderboard
 * @param {number} limit - Max entries to return
 * @returns {Array} - Sorted leaderboard entries
 */
export function getAllTimeLeaderboard(limit = 10) {
    const data = getLeaderboards();
    return data.allTime.slice(0, limit);
}

/**
 * Get personal bests
 * @returns {Object} - Personal bests by character
 */
export function getPersonalBests() {
    const data = getLeaderboards();
    return data.personal;
}

/**
 * Get personal best for a specific character
 * @param {string} character - Character key
 * @returns {Object|null} - Personal best data or null
 */
export function getCharacterPersonalBest(character) {
    const data = getLeaderboards();
    return data.personal[character] || null;
}

/**
 * Get player's rank in a daily leaderboard
 * @param {string} date - Date string
 * @returns {number|null} - Player's rank or null if not found
 */
export function getPlayerDailyRank(date = null) {
    const targetDate = date || getTodayDateString();
    const playerName = getPlayerName() || 'Anonymous';
    const leaderboard = getDailyLeaderboard(targetDate, 100);

    const index = leaderboard.findIndex(e => e.name === playerName);
    return index >= 0 ? index + 1 : null;
}

/**
 * Get player's all-time rank
 * @returns {number|null} - Player's rank or null if not found
 */
export function getPlayerAllTimeRank() {
    const playerName = getPlayerName() || 'Anonymous';
    const leaderboard = getAllTimeLeaderboard(100);

    const index = leaderboard.findIndex(e => e.name === playerName);
    return index >= 0 ? index + 1 : null;
}

/**
 * Get player's best score entry in all-time leaderboard
 * @returns {Object|null} - Best entry or null
 */
export function getPlayerBestEntry() {
    const playerName = getPlayerName() || 'Anonymous';
    const leaderboard = getAllTimeLeaderboard(100);

    return leaderboard.find(e => e.name === playerName) || null;
}

/**
 * Format time for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted time (MM:SS)
 */
export function formatTime(seconds) {
    if (seconds === Infinity || seconds === undefined || seconds === null) {
        return '--:--';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format score for display
 * @param {number} score - Score value
 * @returns {string} - Formatted score with commas
 */
export function formatScore(score) {
    return (score || 0).toLocaleString();
}

/**
 * Clean up old daily leaderboards (keep last 30 days)
 */
export function cleanupOldLeaderboards() {
    const data = getLeaderboards();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let cleaned = false;

    for (const date of Object.keys(data.daily)) {
        if (date < cutoffStr) {
            delete data.daily[date];
            cleaned = true;
        }
    }

    if (cleaned) {
        saveLeaderboards(data);
        console.log('[Leaderboards] Cleaned up old daily leaderboards');
    }
}

/**
 * Get recent high scores (last 7 days)
 * @param {number} limit - Max entries per day
 * @returns {Array} - Array of { date, entries }
 */
export function getRecentHighScores(limit = 3) {
    const data = getLeaderboards();
    const today = new Date();
    const results = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        if (data.daily[dateStr] && data.daily[dateStr].length > 0) {
            results.push({
                date: dateStr,
                entries: data.daily[dateStr].slice(0, limit)
            });
        }
    }

    return results;
}
