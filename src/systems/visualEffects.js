// Visual Effects System - screen shake, hit freeze, and other juice effects
import { getSetting } from './settings.js';

let kInstance = null;
let originalCamPos = null;
let shakeTimer = 0;
let shakeIntensity = 0;
let inHitFreeze = false;

// Rate limiting for screen shake to prevent performance issues
let lastShakeTime = 0;
const MIN_SHAKE_INTERVAL = 0.05; // Minimum 50ms between shake calls

// Rate limiting for hit freeze
let lastFreezeTime = 0;
const MIN_FREEZE_INTERVAL = 100; // Minimum 100ms between freeze calls

/**
 * Initialize the visual effects system
 * @param {object} k - Kaplay instance
 */
export function initVisualEffects(k) {
    kInstance = k;
}

/**
 * Apply screen shake effect
 * @param {number} intensity - Shake intensity in pixels (default 5)
 * @param {number} duration - Shake duration in seconds (default 0.1)
 */
export function screenShake(intensity = 5, duration = 0.1) {
    if (!kInstance) return;

    // Check if screen shake is enabled in settings (or if reduced motion is enabled)
    if (!getSetting('visual', 'showScreenShake')) return;
    if (getSetting('accessibility', 'reducedMotion')) return;

    // Rate limit screen shake to prevent performance issues
    const currentTime = kInstance.time();
    if (currentTime - lastShakeTime < MIN_SHAKE_INTERVAL) {
        // Still allow extending duration/intensity of existing shake
        if (shakeTimer > 0) {
            shakeIntensity = Math.max(shakeIntensity, intensity);
            shakeTimer = Math.max(shakeTimer, duration);
        }
        return;
    }
    lastShakeTime = currentTime;

    // Store original position if not already shaking
    if (shakeTimer <= 0) {
        originalCamPos = kInstance.camPos();
    }

    // Set shake parameters (use max if already shaking)
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeTimer = Math.max(shakeTimer, duration);
}

/**
 * Update screen shake (call this in onUpdate)
 * @param {number} dt - Delta time
 */
export function updateScreenShake(dt) {
    if (!kInstance || shakeTimer <= 0) return;

    shakeTimer -= dt;

    if (shakeTimer > 0) {
        // Apply random offset based on intensity
        const offsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
        const offsetY = (Math.random() - 0.5) * 2 * shakeIntensity;

        if (originalCamPos) {
            kInstance.camPos(originalCamPos.x + offsetX, originalCamPos.y + offsetY);
        }
    } else {
        // Restore original position
        if (originalCamPos) {
            kInstance.camPos(originalCamPos);
        }
        shakeIntensity = 0;
        originalCamPos = null;
    }
}

/**
 * Apply hit freeze effect (brief pause for impact)
 * @param {number} duration - Freeze duration in milliseconds (default 50)
 */
export function hitFreeze(duration = 50) {
    if (!kInstance) return;

    // Check if hit freeze is enabled in settings (or if reduced motion is enabled)
    if (!getSetting('visual', 'showHitFreeze')) return;
    if (getSetting('accessibility', 'reducedMotion')) return;

    // Don't freeze if already paused or in freeze
    if (kInstance.paused || inHitFreeze) return;

    // Rate limit hit freeze to prevent performance issues
    const currentTime = Date.now();
    if (currentTime - lastFreezeTime < MIN_FREEZE_INTERVAL) {
        return;
    }
    lastFreezeTime = currentTime;

    // Pause the game briefly
    kInstance.paused = true;
    inHitFreeze = true;

    // Resume after duration
    setTimeout(() => {
        // Only unpause if we were the ones who paused it
        kInstance.paused = false;
        inHitFreeze = false;
    }, duration);
}

/**
 * Check if currently in hit freeze (for UI to distinguish from user pause)
 */
export function isInHitFreeze() {
    return inHitFreeze;
}

/**
 * Combined effect for big hits (shake + freeze)
 * @param {object} options - Effect options
 * @param {number} options.shakeIntensity - Shake intensity (default 8)
 * @param {number} options.shakeDuration - Shake duration (default 0.15)
 * @param {number} options.freezeDuration - Freeze duration in ms (default 50)
 */
export function bigHitEffect(options = {}) {
    const {
        shakeIntensity = 8,
        shakeDuration = 0.15,
        freezeDuration = 50
    } = options;

    screenShake(shakeIntensity, shakeDuration);
    hitFreeze(freezeDuration);
}

/**
 * Effect presets for different situations
 */
export const EffectPresets = {
    // Player takes damage
    playerHit: () => {
        screenShake(6, 0.1);
        hitFreeze(30);
    },

    // Critical hit landed
    criticalHit: () => {
        screenShake(4, 0.08);
        hitFreeze(40);
    },

    // Boss takes damage
    bossHit: () => {
        screenShake(3, 0.05);
    },

    // Boss dies
    bossDeath: () => {
        screenShake(15, 0.3);
        hitFreeze(100);
    },

    // Explosion
    explosion: () => {
        screenShake(10, 0.2);
        hitFreeze(60);
    },

    // Player dies
    playerDeath: () => {
        screenShake(12, 0.25);
        hitFreeze(150);
    },

    // Level up
    levelUp: () => {
        screenShake(5, 0.15);
    },

    // Small impact (enemy hit)
    smallImpact: () => {
        screenShake(2, 0.05);
    }
};

/**
 * Reset visual effects state (call on scene change)
 */
export function resetVisualEffects() {
    shakeTimer = 0;
    shakeIntensity = 0;
    if (kInstance && originalCamPos) {
        kInstance.camPos(originalCamPos);
    }
    originalCamPos = null;
    lastShakeTime = 0;
    lastFreezeTime = 0;
    inHitFreeze = false;
}
