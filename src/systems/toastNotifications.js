/**
 * Toast Notification System
 * Displays non-blocking notifications in the top-right corner of the screen
 */

import { UI_Z_LAYERS, UI_COLORS } from '../config/uiConfig.js';
import { ACHIEVEMENT_COLORS } from '../data/achievements.js';

// Toast queue and state
const toastState = {
    queue: [],
    activeToasts: [],
    k: null,
    maxActiveToasts: 3,
    toastWidth: 300,
    toastHeight: 80,
    toastMargin: 10,
    animationDuration: 0.3,
    displayDuration: 3
};

/**
 * Initialize the toast system with a Kaplay instance
 * @param {Object} k - Kaplay instance
 */
export function initToastSystem(k) {
    toastState.k = k;
    toastState.queue = [];
    toastState.activeToasts = [];
}

/**
 * Show a toast notification
 * @param {Object} options - Toast options
 * @param {string} options.title - Toast title
 * @param {string} options.message - Toast message
 * @param {string} options.icon - Icon character to display
 * @param {Array} options.iconColor - RGB color array for icon
 * @param {string} options.type - Toast type ('achievement', 'info', 'success', 'error')
 * @param {number} options.duration - Display duration in seconds (default: 3)
 */
export function showToast(options) {
    const k = toastState.k;
    if (!k) {
        console.warn('Toast system not initialized');
        return;
    }

    const toast = {
        title: options.title || 'Notification',
        message: options.message || '',
        icon: options.icon || '!',
        iconColor: options.iconColor || UI_COLORS.TEXT_PRIMARY,
        type: options.type || 'info',
        duration: options.duration || toastState.displayDuration
    };

    toastState.queue.push(toast);
    processQueue();
}

/**
 * Show an achievement unlock toast
 * @param {Object} achievement - Achievement object
 */
export function showAchievementToast(achievement) {
    const difficultyColor = ACHIEVEMENT_COLORS[achievement.difficulty] || ACHIEVEMENT_COLORS.normal;

    showToast({
        title: 'Achievement Unlocked!',
        message: `${achievement.name}\n${achievement.description}`,
        icon: achievement.icon,
        iconColor: difficultyColor,
        type: 'achievement',
        duration: 4
    });
}

/**
 * Show a multiplayer achievement toast (when another player unlocks)
 * @param {string} playerName - Name of the player who unlocked
 * @param {Object} achievement - Achievement object
 */
export function showMultiplayerAchievementToast(playerName, achievement) {
    const difficultyColor = ACHIEVEMENT_COLORS[achievement.difficulty] || ACHIEVEMENT_COLORS.normal;

    showToast({
        title: `${playerName} unlocked:`,
        message: achievement.name,
        icon: achievement.icon,
        iconColor: difficultyColor,
        type: 'achievement',
        duration: 3
    });
}

/**
 * Process the toast queue and display toasts
 */
function processQueue() {
    const k = toastState.k;
    if (!k) return;

    // Check if we can show more toasts
    while (toastState.queue.length > 0 && toastState.activeToasts.length < toastState.maxActiveToasts) {
        const toastData = toastState.queue.shift();
        createToastUI(toastData);
    }
}

/**
 * Create the UI elements for a toast
 * @param {Object} toastData - Toast data
 */
function createToastUI(toastData) {
    const k = toastState.k;
    if (!k) return;

    const startX = k.width() + toastState.toastWidth; // Start off-screen right
    const targetX = k.width() - toastState.toastMargin - toastState.toastWidth / 2;
    const toastIndex = toastState.activeToasts.length;
    const y = toastState.toastMargin + toastIndex * (toastState.toastHeight + toastState.toastMargin) + toastState.toastHeight / 2 + 20;

    // Get border color based on type
    let borderColor = UI_COLORS.BORDER;
    let bgColor = [...UI_COLORS.BG_MEDIUM];
    if (toastData.type === 'achievement') {
        borderColor = toastData.iconColor;
        bgColor = [40, 35, 50];
    } else if (toastData.type === 'success') {
        borderColor = UI_COLORS.SUCCESS;
    } else if (toastData.type === 'error') {
        borderColor = UI_COLORS.ERROR;
    }

    // Toast container
    const container = k.add([
        k.rect(toastState.toastWidth, toastState.toastHeight),
        k.pos(startX, y),
        k.anchor('center'),
        k.color(...bgColor),
        k.outline(2, k.rgb(...borderColor)),
        k.opacity(0.95),
        k.fixed(),
        k.z(UI_Z_LAYERS.TOOLTIP),
        'toast'
    ]);

    // Icon background
    const iconBg = k.add([
        k.rect(50, toastState.toastHeight - 10),
        k.pos(startX - toastState.toastWidth / 2 + 30, y),
        k.anchor('center'),
        k.color(...bgColor),
        k.opacity(0.5),
        k.fixed(),
        k.z(UI_Z_LAYERS.TOOLTIP + 1),
        'toast'
    ]);

    // Icon
    const icon = k.add([
        k.text(toastData.icon, { size: 28 }),
        k.pos(startX - toastState.toastWidth / 2 + 30, y),
        k.anchor('center'),
        k.color(...toastData.iconColor),
        k.fixed(),
        k.z(UI_Z_LAYERS.TOOLTIP + 2),
        'toast'
    ]);

    // Title
    const title = k.add([
        k.text(toastData.title, { size: 14 }),
        k.pos(startX - toastState.toastWidth / 2 + 65, y - 20),
        k.anchor('left'),
        k.color(...(toastData.type === 'achievement' ? [255, 220, 100] : UI_COLORS.TEXT_PRIMARY)),
        k.fixed(),
        k.z(UI_Z_LAYERS.TOOLTIP + 2),
        'toast'
    ]);

    // Message (support multi-line)
    const messageLines = toastData.message.split('\n');
    const messageElements = [];
    messageLines.forEach((line, index) => {
        const msg = k.add([
            k.text(line, { size: 12, width: toastState.toastWidth - 80 }),
            k.pos(startX - toastState.toastWidth / 2 + 65, y - 5 + index * 16),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.TOOLTIP + 2),
            'toast'
        ]);
        messageElements.push(msg);
    });

    // Store all elements
    const toastElements = {
        container,
        iconBg,
        icon,
        title,
        messages: messageElements,
        startX,
        targetX,
        y,
        state: 'entering', // 'entering', 'visible', 'exiting', 'done'
        timer: 0,
        data: toastData
    };

    toastState.activeToasts.push(toastElements);

    // Animation update handler
    const updateHandler = k.onUpdate(() => {
        if (toastElements.state === 'done') {
            updateHandler.cancel();
            return;
        }

        toastElements.timer += k.dt();

        if (toastElements.state === 'entering') {
            // Slide in animation
            const progress = Math.min(toastElements.timer / toastState.animationDuration, 1);
            const easedProgress = easeOutCubic(progress);
            const currentX = lerp(toastElements.startX, toastElements.targetX, easedProgress);

            updateToastPositionX(toastElements, currentX);

            if (progress >= 1) {
                toastElements.state = 'visible';
                toastElements.timer = 0;
            }
        } else if (toastElements.state === 'visible') {
            // Display duration
            if (toastElements.timer >= toastElements.data.duration) {
                toastElements.state = 'exiting';
                toastElements.timer = 0;
            }
        } else if (toastElements.state === 'exiting') {
            // Slide out animation
            const progress = Math.min(toastElements.timer / toastState.animationDuration, 1);
            const easedProgress = easeInCubic(progress);
            const exitX = k.width() + toastState.toastWidth;
            const currentX = lerp(toastElements.targetX, exitX, easedProgress);

            updateToastPositionX(toastElements, currentX);

            // Fade out
            const opacity = 1 - progress;
            toastElements.container.opacity = opacity * 0.95;
            toastElements.iconBg.opacity = opacity * 0.5;
            toastElements.icon.opacity = opacity;
            toastElements.title.opacity = opacity;
            toastElements.messages.forEach(msg => msg.opacity = opacity);

            if (progress >= 1) {
                toastElements.state = 'done';
                destroyToast(toastElements);
            }
        }
    });

    toastElements.updateHandler = updateHandler;
}

/**
 * Update toast position on X axis
 * @param {Object} toastElements - Toast elements object
 * @param {number} x - New X position
 */
function updateToastPositionX(toastElements, x) {
    const offset = x - toastElements.container.pos.x;
    toastElements.container.pos.x = x;
    toastElements.iconBg.pos.x += offset;
    toastElements.icon.pos.x += offset;
    toastElements.title.pos.x += offset;
    toastElements.messages.forEach(msg => msg.pos.x += offset);
}

/**
 * Destroy a toast and its elements
 * @param {Object} toastElements - Toast elements object
 */
function destroyToast(toastElements) {
    const k = toastState.k;
    if (!k) return;

    // Cancel update handler
    if (toastElements.updateHandler) {
        toastElements.updateHandler.cancel();
    }

    // Destroy all elements
    if (toastElements.container.exists()) k.destroy(toastElements.container);
    if (toastElements.iconBg.exists()) k.destroy(toastElements.iconBg);
    if (toastElements.icon.exists()) k.destroy(toastElements.icon);
    if (toastElements.title.exists()) k.destroy(toastElements.title);
    toastElements.messages.forEach(msg => {
        if (msg.exists()) k.destroy(msg);
    });

    // Remove from active toasts
    const index = toastState.activeToasts.indexOf(toastElements);
    if (index > -1) {
        toastState.activeToasts.splice(index, 1);
    }

    // Reposition remaining toasts
    repositionActiveToasts();

    // Process queue
    processQueue();
}

/**
 * Reposition active toasts after one is removed
 */
function repositionActiveToasts() {
    toastState.activeToasts.forEach((toast, index) => {
        if (toast.state === 'visible' || toast.state === 'entering') {
            const newY = toastState.toastMargin + index * (toastState.toastHeight + toastState.toastMargin) + toastState.toastHeight / 2 + 20;

            // Animate to new position
            const oldY = toast.container.pos.y;
            const offsetY = newY - oldY;

            toast.container.pos.y = newY;
            toast.iconBg.pos.y += offsetY;
            toast.icon.pos.y += offsetY;
            toast.title.pos.y += offsetY;
            toast.messages.forEach((msg, msgIndex) => {
                msg.pos.y += offsetY;
            });
            toast.y = newY;
        }
    });
}

/**
 * Clear all active toasts
 */
export function clearAllToasts() {
    const k = toastState.k;
    if (!k) return;

    // Destroy all active toasts
    [...toastState.activeToasts].forEach(toast => {
        destroyToast(toast);
    });

    // Clear queue
    toastState.queue = [];
}

/**
 * Clean up toast system (call on scene change)
 */
export function cleanupToastSystem() {
    clearAllToasts();
    toastState.k = null;
}

// Easing functions
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
    return t * t * t;
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}
