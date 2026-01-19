/**
 * Tutorial System
 *
 * Shows helpful hints to new players on first occurrence.
 * Hints are stored in localStorage and only shown once.
 */

// Tutorial hint definitions
const TUTORIAL_HINTS = {
    movement: {
        id: 'movement',
        message: 'Use WASD to move',
        duration: 3,
        trigger: 'firstMove' // Triggered on game start
    },
    shooting: {
        id: 'shooting',
        message: 'Aim with mouse - autofire!',
        duration: 3,
        trigger: 'firstShoot' // Triggered when player starts shooting
    },
    levelUp: {
        id: 'levelUp',
        message: 'Choose upgrade with 1-3 or click',
        duration: 4,
        trigger: 'firstLevelUp' // Triggered on first level up
    },
    synergy: {
        id: 'synergy',
        message: 'Combine upgrades for bonuses!',
        duration: 4,
        trigger: 'firstSynergy' // Triggered when synergy is first activated
    },
    shop: {
        id: 'shop',
        message: 'Spend credits on permanent upgrades',
        duration: 4,
        trigger: 'firstShopVisit' // Triggered when visiting shop
    }
};

// Storage key for tutorial progress
const TUTORIAL_STORAGE_KEY = 'superSmashTexty_tutorialProgress';

// Currently displayed hint (to prevent duplicates)
let currentHint = null;

/**
 * Load tutorial progress from localStorage
 * @returns {Object} Tutorial progress with hintsShown array
 */
export function loadTutorialProgress() {
    try {
        const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load tutorial progress:', e);
    }

    return { hintsShown: [] };
}

/**
 * Save tutorial progress to localStorage
 * @param {Object} progress - Tutorial progress to save
 */
function saveTutorialProgress(progress) {
    try {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.warn('Failed to save tutorial progress:', e);
    }
}

/**
 * Check if a hint has been shown before
 * @param {string} hintId - Hint identifier
 * @returns {boolean} Whether the hint has been shown
 */
export function hasHintBeenShown(hintId) {
    const progress = loadTutorialProgress();
    return progress.hintsShown.includes(hintId);
}

/**
 * Mark a hint as shown
 * @param {string} hintId - Hint identifier
 */
function markHintShown(hintId) {
    const progress = loadTutorialProgress();
    if (!progress.hintsShown.includes(hintId)) {
        progress.hintsShown.push(hintId);
        saveTutorialProgress(progress);
    }
}

/**
 * Show a tutorial hint if it hasn't been shown before
 * @param {object} k - KAPLAY instance
 * @param {string} hintId - Hint identifier
 * @returns {boolean} Whether the hint was shown
 */
export function showHint(k, hintId) {
    // Don't show if already showing a hint
    if (currentHint) return false;

    // Don't show if already shown before
    if (hasHintBeenShown(hintId)) return false;

    const hint = TUTORIAL_HINTS[hintId];
    if (!hint) return false;

    // Mark as shown
    markHintShown(hintId);

    // Create hint display
    const hintBg = k.add([
        k.rect(300, 40),
        k.pos(k.width() / 2, 50),
        k.anchor('center'),
        k.color(0, 0, 0),
        k.opacity(0.8),
        k.fixed(),
        k.z(700),
        'tutorialHint'
    ]);

    const hintText = k.add([
        k.text(hint.message, { size: 16 }),
        k.pos(k.width() / 2, 50),
        k.anchor('center'),
        k.color(255, 255, 200),
        k.fixed(),
        k.z(701),
        'tutorialHint'
    ]);

    currentHint = { bg: hintBg, text: hintText };

    // Fade out after duration
    k.wait(hint.duration, () => {
        if (hintBg.exists()) k.destroy(hintBg);
        if (hintText.exists()) k.destroy(hintText);
        currentHint = null;
    });

    return true;
}

/**
 * Show movement hint (called at game start)
 * @param {object} k - KAPLAY instance
 */
export function showMovementHint(k) {
    showHint(k, 'movement');
}

/**
 * Show shooting hint (called when player first shoots)
 * @param {object} k - KAPLAY instance
 */
export function showShootingHint(k) {
    showHint(k, 'shooting');
}

/**
 * Show level up hint (called on first level up)
 * @param {object} k - KAPLAY instance
 */
export function showLevelUpHint(k) {
    showHint(k, 'levelUp');
}

/**
 * Show synergy hint (called when synergy activates)
 * @param {object} k - KAPLAY instance
 */
export function showSynergyHint(k) {
    showHint(k, 'synergy');
}

/**
 * Show shop hint (called when visiting shop)
 * @param {object} k - KAPLAY instance
 */
export function showShopHint(k) {
    showHint(k, 'shop');
}

/**
 * Reset tutorial progress (for testing)
 */
export function resetTutorialProgress() {
    saveTutorialProgress({ hintsShown: [] });
}

/**
 * Clear any currently displayed hint
 * @param {object} k - KAPLAY instance
 */
export function clearCurrentHint(k) {
    if (currentHint) {
        if (currentHint.bg && currentHint.bg.exists()) k.destroy(currentHint.bg);
        if (currentHint.text && currentHint.text.exists()) k.destroy(currentHint.text);
        currentHint = null;
    }
}
