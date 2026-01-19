/**
 * Achievement Detail Modal Component
 * Displays detailed achievement information with progress tracking
 */

import { UI_Z_LAYERS, UI_COLORS, UI_TEXT_SIZES } from '../config/uiConfig.js';
import { ACHIEVEMENT_COLORS, getAchievementProgress } from '../data/achievements.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { getSaveStats, isAchievementUnlocked } from '../systems/metaProgression.js';
import { playMenuNav } from '../systems/sounds.js';

/**
 * Get characters unlocked by a specific achievement
 * @param {string} achievementId - The achievement ID to check
 * @returns {Array} Array of character objects that this achievement unlocks
 */
function getCharactersUnlockedByAchievement(achievementId) {
    const characters = [];
    for (const [key, char] of Object.entries(CHARACTER_UNLOCKS)) {
        if (char.unlockRequirement?.type === 'achievement' && char.unlockRequirement?.value === achievementId) {
            characters.push({ key, ...char });
        }
    }
    return characters;
}

// Modal state
let modalState = {
    isOpen: false,
    elements: [],
    k: null,
    onClose: null
};

/**
 * Show the achievement detail modal
 * @param {Object} k - Kaplay instance
 * @param {Object} achievement - Achievement data object
 * @param {Function} onClose - Optional callback when modal is closed
 */
export function showAchievementModal(k, achievement, onClose = null) {
    if (modalState.isOpen) {
        closeAchievementModal();
    }

    modalState.k = k;
    modalState.isOpen = true;
    modalState.onClose = onClose;
    modalState.elements = [];

    const stats = getSaveStats();
    const isUnlocked = isAchievementUnlocked(achievement.id);
    const progress = getAchievementProgress(achievement.id, stats);
    const difficultyColor = ACHIEVEMENT_COLORS[achievement.difficulty] || ACHIEVEMENT_COLORS.normal;

    // Modal dimensions - taller to fit unlocks and progress info
    const modalWidth = 420;
    const modalHeight = 400;
    const centerX = k.width() / 2;
    const centerY = k.height() / 2;

    // Overlay background (darkens the screen)
    const overlay = k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.color(0, 0, 0),
        k.opacity(0.7),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL - 1),
        k.area(),
        'achievementModalOverlay'
    ]);
    modalState.elements.push(overlay);

    // Close modal on overlay click
    overlay.onClick(() => {
        closeAchievementModal();
    });

    // Modal background
    const modalBg = k.add([
        k.rect(modalWidth, modalHeight),
        k.pos(centerX, centerY),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(3, k.rgb(...difficultyColor)),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL),
        'achievementModal'
    ]);
    modalState.elements.push(modalBg);

    // Achievement name
    const nameText = k.add([
        k.text(achievement.name, { size: UI_TEXT_SIZES.HEADER }),
        k.pos(centerX, centerY - 130),
        k.anchor('center'),
        k.color(...(isUnlocked ? difficultyColor : UI_COLORS.TEXT_DISABLED)),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1),
        'achievementModal'
    ]);
    modalState.elements.push(nameText);

    // Icon (large)
    const iconBg = k.add([
        k.rect(64, 64),
        k.pos(centerX, centerY - 70),
        k.anchor('center'),
        k.color(isUnlocked ? 50 : 30, isUnlocked ? 50 : 30, isUnlocked ? 60 : 30),
        k.outline(2, k.rgb(...(isUnlocked ? difficultyColor : UI_COLORS.TEXT_DISABLED))),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1),
        'achievementModal'
    ]);
    modalState.elements.push(iconBg);

    const iconText = k.add([
        k.text(achievement.icon, { size: 36 }),
        k.pos(centerX, centerY - 70),
        k.anchor('center'),
        k.color(...(isUnlocked ? [255, 255, 255] : [80, 80, 80])),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 2),
        'achievementModal'
    ]);
    modalState.elements.push(iconText);

    // Description
    const descText = k.add([
        k.text(achievement.description, { size: UI_TEXT_SIZES.BODY, width: modalWidth - 40 }),
        k.pos(centerX, centerY - 20),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_SECONDARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1),
        'achievementModal'
    ]);
    modalState.elements.push(descText);

    // Progress bar (if applicable)
    if (progress && !isUnlocked) {
        const progressBarWidth = 280;
        const progressBarHeight = 20;
        const progressY = centerY + 25;

        // Progress bar background
        const progressBg = k.add([
            k.rect(progressBarWidth, progressBarHeight),
            k.pos(centerX, progressY),
            k.anchor('center'),
            k.color(30, 30, 40),
            k.outline(2, k.rgb(80, 80, 100)),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            'achievementModal'
        ]);
        modalState.elements.push(progressBg);

        // Progress bar fill
        const fillWidth = Math.max(4, progressBarWidth * progress.progress);
        const progressFill = k.add([
            k.rect(fillWidth, progressBarHeight - 4),
            k.pos(centerX - progressBarWidth / 2 + fillWidth / 2, progressY),
            k.anchor('center'),
            k.color(...difficultyColor),
            k.opacity(0.8),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 2),
            'achievementModal'
        ]);
        modalState.elements.push(progressFill);

        // Progress text
        const progressText = k.add([
            k.text(`${progress.current}/${progress.target} (${progress.percentage}%)`, { size: UI_TEXT_SIZES.SMALL }),
            k.pos(centerX, progressY + 25),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_TERTIARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            'achievementModal'
        ]);
        modalState.elements.push(progressText);
    } else if (isUnlocked) {
        // Show "UNLOCKED" status
        const unlockedText = k.add([
            k.text('UNLOCKED', { size: UI_TEXT_SIZES.LABEL }),
            k.pos(centerX, centerY + 25),
            k.anchor('center'),
            k.color(...UI_COLORS.SUCCESS),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            'achievementModal'
        ]);
        modalState.elements.push(unlockedText);
    }

    // Hint (if locked)
    if (!isUnlocked && achievement.hint) {
        const hintLabel = k.add([
            k.text('Hint:', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(centerX, centerY + 65),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            'achievementModal'
        ]);
        modalState.elements.push(hintLabel);

        const hintText = k.add([
            k.text(achievement.hint, { size: UI_TEXT_SIZES.SMALL, width: modalWidth - 60 }),
            k.pos(centerX, centerY + 85),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_TERTIARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            'achievementModal'
        ]);
        modalState.elements.push(hintText);
    }

    // Unlocks section (if achievement unlocks shop items or characters)
    const characterUnlocks = getCharactersUnlockedByAchievement(achievement.id);
    const hasShopUnlocks = achievement.unlocks && achievement.unlocks.length > 0;
    const hasCharacterUnlocks = characterUnlocks.length > 0;

    if (hasShopUnlocks || hasCharacterUnlocks) {
        const unlocksY = centerY + (isUnlocked ? 65 : 115);
        let currentY = unlocksY;

        const unlocksLabel = k.add([
            k.text('-- UNLOCKS --', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(centerX, currentY),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            'achievementModal'
        ]);
        modalState.elements.push(unlocksLabel);
        currentY += 20;

        // Show character unlocks
        characterUnlocks.forEach((char) => {
            const charText = k.add([
                k.text(`${char.char} ${char.name}`, { size: UI_TEXT_SIZES.SMALL }),
                k.pos(centerX, currentY),
                k.anchor('center'),
                k.color(...(isUnlocked ? char.color : UI_COLORS.TEXT_TERTIARY)),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 1),
                'achievementModal'
            ]);
            modalState.elements.push(charText);
            currentY += 18;
        });

        // Show shop unlocks
        if (hasShopUnlocks) {
            achievement.unlocks.forEach((unlockKey) => {
                // Convert unlock key to display name
                const displayName = unlockKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const unlockText = k.add([
                    k.text(`${displayName} (Shop)`, { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(centerX, currentY),
                    k.anchor('center'),
                    k.color(...(isUnlocked ? UI_COLORS.SUCCESS : UI_COLORS.TEXT_TERTIARY)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1),
                    'achievementModal'
                ]);
                modalState.elements.push(unlockText);
                currentY += 18;
            });
        }
    }

    // Difficulty badge - positioned near bottom of modal
    // Using lenticular brackets instead of square brackets to avoid KAPLAY styled text tag parsing
    const difficultyName = achievement.difficulty.charAt(0).toUpperCase() + achievement.difficulty.slice(1);
    const difficultyBadge = k.add([
        k.text(`【${difficultyName}】`, { size: UI_TEXT_SIZES.SMALL }),
        k.pos(centerX, centerY + modalHeight / 2 - 60),
        k.anchor('center'),
        k.color(...difficultyColor),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1),
        'achievementModal'
    ]);
    modalState.elements.push(difficultyBadge);

    // Close button
    const closeButton = k.add([
        k.rect(80, 30),
        k.pos(centerX, centerY + modalHeight / 2 - 30),
        k.anchor('center'),
        k.color(...UI_COLORS.NEUTRAL),
        k.outline(2, k.rgb(...UI_COLORS.BORDER)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1),
        'achievementModal'
    ]);
    modalState.elements.push(closeButton);

    const closeText = k.add([
        k.text('CLOSE', { size: UI_TEXT_SIZES.SMALL }),
        k.pos(centerX, centerY + modalHeight / 2 - 30),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_SECONDARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 2),
        'achievementModal'
    ]);
    modalState.elements.push(closeText);

    closeButton.onClick(() => {
        playMenuNav();
        closeAchievementModal();
    });

    // Close on escape key
    const escHandler = k.onKeyPress('escape', () => {
        closeAchievementModal();
    });
    modalState.escHandler = escHandler;
}

/**
 * Close the achievement modal
 */
export function closeAchievementModal() {
    if (!modalState.isOpen) return;

    const k = modalState.k;
    if (!k) return;

    // Destroy all modal elements
    modalState.elements.forEach(element => {
        if (element && element.exists && element.exists()) {
            k.destroy(element);
        }
    });
    modalState.elements = [];

    // Cancel escape handler
    if (modalState.escHandler) {
        modalState.escHandler.cancel();
        modalState.escHandler = null;
    }

    modalState.isOpen = false;

    // Call onClose callback
    if (modalState.onClose) {
        modalState.onClose();
        modalState.onClose = null;
    }
}

/**
 * Check if modal is currently open
 * @returns {boolean}
 */
export function isAchievementModalOpen() {
    return modalState.isOpen;
}
