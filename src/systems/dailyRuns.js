/**
 * Daily Runs System
 *
 * Provides daily seeded challenges where:
 * - Same date = same seed = same character + room layout
 * - Character is locked (can't change)
 * - Score saves to daily leaderboard
 * - One attempt per day (can view leaderboard after completion)
 */

import { SeededRandom, seedFromString } from '../utils/seededRandom.js';

// Storage key for daily run data
const DAILY_RUN_STORAGE_KEY = 'superSmashTextyDailyRuns';

// Available characters for daily runs
const DAILY_CHARACTERS = ['survivor', 'scout', 'tank', 'sniper', 'pyro'];

/**
 * Get today's date string in ISO format (YYYY-MM-DD)
 * @returns {string} - Today's date
 */
export function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get the seed for a specific date's daily run
 * @param {string} date - Date string (YYYY-MM-DD), defaults to today
 * @returns {number} - Deterministic seed for the date
 */
export function getDailySeed(date = null) {
    const dateStr = date || getTodayDateString();
    return seedFromString(dateStr + 'SuperSmashTexty');
}

/**
 * Get today's daily seed
 * @returns {number} - Today's daily seed
 */
export function getTodayDailySeed() {
    return getDailySeed(getTodayDateString());
}

/**
 * Get the character for a specific date's daily run
 * @param {string} date - Date string (YYYY-MM-DD), defaults to today
 * @returns {string} - Character key for the daily run
 */
export function getDailyCharacter(date = null) {
    const seed = getDailySeed(date);
    const rng = new SeededRandom(seed);
    return rng.choose(DAILY_CHARACTERS);
}

/**
 * Get today's daily character
 * @returns {string} - Today's daily character
 */
export function getTodayDailyCharacter() {
    return getDailyCharacter(getTodayDateString());
}

/**
 * Get stored daily run data
 * @returns {Object} - Daily run data
 */
function getDailyRunData() {
    try {
        const data = localStorage.getItem(DAILY_RUN_STORAGE_KEY);
        return data ? JSON.parse(data) : { completedDays: {}, attempts: {} };
    } catch (e) {
        console.warn('[DailyRuns] Failed to parse daily run data:', e);
        return { completedDays: {}, attempts: {} };
    }
}

/**
 * Save daily run data
 * @param {Object} data - Data to save
 */
function saveDailyRunData(data) {
    try {
        localStorage.setItem(DAILY_RUN_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('[DailyRuns] Failed to save daily run data:', e);
    }
}

/**
 * Check if today's daily run has been completed
 * @returns {boolean} - True if already completed today
 */
export function hasCompletedDailyToday() {
    const data = getDailyRunData();
    const today = getTodayDateString();
    return !!data.completedDays[today];
}

/**
 * Check if a specific date's daily run has been completed
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {boolean} - True if completed
 */
export function hasCompletedDaily(date) {
    const data = getDailyRunData();
    return !!data.completedDays[date];
}

/**
 * Get completion data for a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Object|null} - Completion data or null
 */
export function getDailyCompletion(date) {
    const data = getDailyRunData();
    return data.completedDays[date] || null;
}

/**
 * Get today's completion data
 * @returns {Object|null} - Completion data or null
 */
export function getTodayCompletion() {
    return getDailyCompletion(getTodayDateString());
}

/**
 * Mark a daily run as completed
 * @param {Object} runStats - Stats from the completed run
 * @param {number} runStats.score - Final score
 * @param {number} runStats.floor - Floor reached
 * @param {string} runStats.character - Character used
 * @param {number} runStats.duration - Run duration in seconds
 * @returns {Object} - Completion result with rank
 */
export function markDailyCompleted(runStats) {
    const data = getDailyRunData();
    const today = getTodayDateString();

    // Store completion data
    const completion = {
        date: today,
        score: runStats.score || 0,
        floor: runStats.floor || 1,
        character: runStats.character || getTodayDailyCharacter(),
        duration: runStats.duration || 0,
        completedAt: Date.now()
    };

    data.completedDays[today] = completion;
    saveDailyRunData(data);

    console.log('[DailyRuns] Marked daily completed:', completion);

    return completion;
}

/**
 * Get attempt count for today
 * @returns {number} - Number of attempts today
 */
export function getTodayAttemptCount() {
    const data = getDailyRunData();
    const today = getTodayDateString();
    return data.attempts[today] || 0;
}

/**
 * Increment attempt count for today
 */
export function incrementAttemptCount() {
    const data = getDailyRunData();
    const today = getTodayDateString();
    data.attempts[today] = (data.attempts[today] || 0) + 1;
    saveDailyRunData(data);
}

/**
 * Get daily run info for display
 * @returns {Object} - Daily run info
 */
export function getDailyRunInfo() {
    const today = getTodayDateString();
    const seed = getDailySeed(today);
    const character = getDailyCharacter(today);
    const completed = hasCompletedDailyToday();
    const completion = getTodayCompletion();
    const attempts = getTodayAttemptCount();

    return {
        date: today,
        seed: seed,
        character: character,
        completed: completed,
        completion: completion,
        attempts: attempts
    };
}

/**
 * Create a seeded RNG for the daily run
 * @param {string} date - Date string, defaults to today
 * @returns {SeededRandom} - Seeded RNG instance
 */
export function createDailyRNG(date = null) {
    const seed = getDailySeed(date);
    return new SeededRandom(seed);
}

/**
 * Get historical daily runs (last N days)
 * @param {number} days - Number of days to look back
 * @returns {Array} - Array of daily run completions
 */
export function getDailyHistory(days = 7) {
    const data = getDailyRunData();
    const history = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        if (data.completedDays[dateStr]) {
            history.push({
                date: dateStr,
                ...data.completedDays[dateStr]
            });
        }
    }

    return history;
}

/**
 * Clean up old daily run data (keep last 30 days)
 */
export function cleanupOldDailyData() {
    const data = getDailyRunData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let cleaned = false;

    // Clean old completions
    for (const date of Object.keys(data.completedDays)) {
        if (date < cutoffStr) {
            delete data.completedDays[date];
            cleaned = true;
        }
    }

    // Clean old attempts
    for (const date of Object.keys(data.attempts)) {
        if (date < cutoffStr) {
            delete data.attempts[date];
            cleaned = true;
        }
    }

    if (cleaned) {
        saveDailyRunData(data);
        console.log('[DailyRuns] Cleaned up old daily run data');
    }
}
