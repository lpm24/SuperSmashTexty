// Character selection scene
import { getCurrency, getCurrencyName, isUnlocked, setSelectedCharacter, getSelectedCharacter, isAchievementUnlocked } from '../systems/metaProgression.js';
import { broadcastCharacterChange } from '../systems/partySystem.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { playMenuSelect, playMenuNav } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    UI_TERMS,
    formatButtonText,
    formatStatLabel,
    createCreditIndicator,
    createMenuParticles,
    createAnimatedTitle
} from '../config/uiConfig.js';

// Helper function to get unlock requirement text
function getUnlockText(char) {
    if (!char.unlockRequirement) return null;

    if (char.unlockRequirement.type === 'floor') {
        return `Unlock: Complete ${UI_TERMS.FLOOR} ${char.unlockRequirement.value}`;
    } else if (char.unlockRequirement.type === 'achievement') {
        const achievement = ACHIEVEMENTS[char.unlockRequirement.value];
        if (achievement) {
            return `Unlock: ${achievement.name}`;
        }
        return `Unlock: Achievement required`;
    }
    return null;
}

export function setupCharacterSelectScene(k) {
    k.scene('characterSelect', () => {
        const currency = getCurrency();
        const currencyName = getCurrencyName();
        const selectedChar = getSelectedCharacter();
        
        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(...UI_COLORS.BG_DARK),
            k.fixed(),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Background particle effects
        createMenuParticles(k, { patternCount: 10, particleCount: 15 });

        // Currency display (standardized)
        const creditIndicator = createCreditIndicator(k, currency, currencyName);

        // Title
        createAnimatedTitle(k, 'CONTESTANTS', k.width() / 2, 60, 8);
        
        // Character selection layout: Left side = selection grid, Right side = details
        const characterKeys = Object.keys(CHARACTER_UNLOCKS);
        const leftPanelWidth = 350;
        const rightPanelX = leftPanelWidth + 20;
        const rightPanelWidth = k.width() - rightPanelX - 20;
        const startY = 120;
        const cardWidth = 150;
        const cardHeight = 100;
        const cardSpacing = 15;
        const cardsPerRow = 2;
        const rowsPerPage = 3;
        const charactersPerPage = cardsPerRow * rowsPerPage;

        // Pagination state
        const totalPages = Math.ceil(characterKeys.length / charactersPerPage);
        let currentPage = 0;

        // Find the page containing the selected character
        const selectedIndex = characterKeys.indexOf(selectedChar || characterKeys[0]);
        if (selectedIndex >= 0) {
            currentPage = Math.floor(selectedIndex / charactersPerPage);
        }

        const characterCards = [];
        const confirmedCharacterKey = selectedChar || characterKeys[0]; // The saved selection
        let viewedCharacterKey = confirmedCharacterKey; // What's being viewed/previewed
        let detailItems = [];
        let paginationItems = [];
        let isRefreshing = false; // Prevent infinite loops

        // Function to refresh display
        function refreshDisplay() {
            if (isRefreshing) return; // Prevent recursive calls
            isRefreshing = true;

            // Clear existing cards
            characterCards.forEach(card => {
                if (card && card.exists && card.exists()) {
                    k.destroy(card);
                }
            });
            characterCards.length = 0;

            // Clear detail items
            detailItems.forEach(item => {
                if (item && item.exists && item.exists()) {
                    k.destroy(item);
                }
            });
            detailItems = [];

            // Clear pagination items
            paginationItems.forEach(item => {
                if (item && item.exists && item.exists()) {
                    k.destroy(item);
                }
            });
            paginationItems = [];

            // Get characters for current page
            const pageStart = currentPage * charactersPerPage;
            const pageEnd = Math.min(pageStart + charactersPerPage, characterKeys.length);
            const pageCharacters = characterKeys.slice(pageStart, pageEnd);

            // Render character selection grid (left side)
            pageCharacters.forEach((key, pageIndex) => {
                const char = CHARACTER_UNLOCKS[key];
                const isUnlockedChar = isUnlocked('characters', key) || char.unlockedByDefault;
                const isViewed = viewedCharacterKey === key;

                const row = Math.floor(pageIndex / cardsPerRow);
                const col = pageIndex % cardsPerRow;
                const cardX = 20 + col * (cardWidth + cardSpacing);
                const cardY = startY + row * (cardHeight + cardSpacing);

                // Card background
                const cardBg = k.add([
                    k.rect(cardWidth, cardHeight),
                    k.pos(cardX, cardY),
                    k.anchor('topleft'),
                    k.color(...(isViewed ? UI_COLORS.BG_MEDIUM : UI_COLORS.BG_DARK)),
                    k.outline(2, isViewed ? k.rgb(...UI_COLORS.BORDER_ACTIVE) : (isUnlockedChar ? k.rgb(...UI_COLORS.TEXT_DISABLED) : k.rgb(...UI_COLORS.BG_DARK))),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                // Character visual
                const charVisual = k.add([
                    k.text(char.char, { size: UI_TEXT_SIZES.TITLE }),
                    k.pos(cardX + cardWidth / 2, cardY + 30),
                    k.anchor('center'),
                    k.color(...(isUnlockedChar ? char.color : UI_COLORS.BG_DISABLED)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                // Character name
                const nameText = k.add([
                    k.text(char.name, { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(cardX + cardWidth / 2, cardY + 70),
                    k.anchor('center'),
                    k.color(...(isUnlockedChar ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_DISABLED)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                // Locked overlay
                if (!isUnlockedChar) {
                    const lockText = k.add([
                        k.text('🔒', { size: UI_TEXT_SIZES.BUTTON }),
                        k.pos(cardX + cardWidth / 2, cardY + cardHeight / 2),
                        k.anchor('center'),
                        k.color(...UI_COLORS.DANGER),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.OVERLAY)
                    ]);
                    characterCards.push(lockText);
                }

                // Click handler - all cards are clickable for viewing
                cardBg.onClick(() => {
                    if (viewedCharacterKey !== key) {
                        playMenuSelect();
                        viewedCharacterKey = key;
                        refreshDisplay();
                    }
                });
                cardBg.cursor = 'pointer';

                characterCards.push(cardBg, charVisual, nameText);
            });

            // Pagination controls (only show if more than one page)
            // Matches shop/statistics pagination style
            if (totalPages > 1) {
                const paginationY = startY + rowsPerPage * (cardHeight + cardSpacing) + 15;
                const paginationCenterX = leftPanelWidth / 2;

                // Left arrow
                const leftArrow = k.add([
                    k.text('<', { size: 24 }),
                    k.pos(paginationCenterX - 60, paginationY),
                    k.anchor('center'),
                    k.color(currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                if (currentPage > 0) {
                    leftArrow.onClick(() => {
                        playMenuNav();
                        currentPage--;
                        refreshDisplay();
                    });
                    leftArrow.cursor = 'pointer';
                }
                paginationItems.push(leftArrow);

                // Page indicator pips
                const pipSpacing = 16;
                const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;

                for (let i = 0; i < totalPages; i++) {
                    const isCurrentPage = i === currentPage;
                    const pip = k.add([
                        k.text(isCurrentPage ? '●' : '○', { size: 14 }),
                        k.pos(pipsStartX + i * pipSpacing, paginationY),
                        k.anchor('center'),
                        k.color(isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120),
                        k.area(),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);

                    const pageIndex = i;
                    pip.onClick(() => {
                        if (pageIndex !== currentPage) {
                            playMenuNav();
                            currentPage = pageIndex;
                            refreshDisplay();
                        }
                    });
                    pip.cursor = 'pointer';

                    paginationItems.push(pip);
                }

                // Right arrow
                const rightArrow = k.add([
                    k.text('>', { size: 24 }),
                    k.pos(paginationCenterX + 60, paginationY),
                    k.anchor('center'),
                    k.color(currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                if (currentPage < totalPages - 1) {
                    rightArrow.onClick(() => {
                        playMenuNav();
                        currentPage++;
                        refreshDisplay();
                    });
                    rightArrow.cursor = 'pointer';
                }
                paginationItems.push(rightArrow);
            }
            
            // Render character details (right side)
            const viewedChar = CHARACTER_UNLOCKS[viewedCharacterKey];
            const isViewedUnlocked = isUnlocked('characters', viewedCharacterKey) || viewedChar.unlockedByDefault;
            let detailY = startY;
            
            // Character visual (large)
            const detailVisual = k.add([
                k.text(viewedChar.char, { size: 72 }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY + 40),
                k.anchor('center'),
                k.color(...(isViewedUnlocked ? viewedChar.color : UI_COLORS.BG_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            detailItems.push(detailVisual);
            detailY += 100;

            // Character name
            const detailName = k.add([
                k.text(viewedChar.name, { size: UI_TEXT_SIZES.HEADER }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(detailName);
            detailY += 40;

            // Description
            const detailDesc = k.add([
                k.text(viewedChar.description, { size: UI_TEXT_SIZES.SMALL, width: rightPanelWidth - 40 }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(detailDesc);
            detailY += 60;

            // Stats
            const statsLabel = k.add([
                k.text('Stats:', { size: UI_TEXT_SIZES.LABEL }),
                k.pos(rightPanelX + 20, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.WARNING),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(statsLabel);
            detailY += 30;

            const statsText = k.add([
                k.text(`${UI_TERMS.HEALTH}: ${viewedChar.stats.health}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(statsText);
            detailY += 25;

            const speedText = k.add([
                k.text(`${UI_TERMS.SPEED}: ${viewedChar.stats.speed}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(speedText);
            detailY += 25;

            const damageText = k.add([
                k.text(`${UI_TERMS.DAMAGE}: ${viewedChar.stats.damage}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(damageText);
            detailY += 40;

            // Currently selected indicator (show if viewing the confirmed selection)
            if (viewedCharacterKey === confirmedCharacterKey) {
                const selectedIndicator = k.add([
                    k.text('✓ CURRENT SELECTION', { size: UI_TEXT_SIZES.LABEL }),
                    k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.SUCCESS),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                detailItems.push(selectedIndicator);
            }

            // Locked info
            if (!isViewedUnlocked) {
                const unlockTextStr = getUnlockText(viewedChar);
                if (unlockTextStr) {
                    const unlockText = k.add([
                        k.text(unlockTextStr, { size: UI_TEXT_SIZES.SMALL, width: rightPanelWidth - 40 }),
                        k.pos(rightPanelX + rightPanelWidth / 2, detailY + 30),
                        k.anchor('center'),
                        k.color(...UI_COLORS.GOLD),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    detailItems.push(unlockText);
                }
            }
            
            isRefreshing = false;
        }
        
        // Initial display
        refreshDisplay();

        // Keyboard pagination
        k.onKeyPress('arrowleft', () => {
            if (currentPage > 0) {
                playMenuNav();
                currentPage--;
                refreshDisplay();
            }
        });

        k.onKeyPress('arrowright', () => {
            if (currentPage < totalPages - 1) {
                playMenuNav();
                currentPage++;
                refreshDisplay();
            }
        });

        // Cancel button (left side)
        const cancelButton = k.add([
            k.rect(120, 35),
            k.pos(k.width() / 2 - 70, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        k.add([
            k.text(formatButtonText('Cancel'), { size: UI_TEXT_SIZES.BODY }),
            k.pos(k.width() / 2 - 70, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        cancelButton.onClick(() => {
            playMenuNav();
            k.go('menu');
        });

        // Confirm button (right side) - track for enabling/disabling
        let confirmButton = null;
        let confirmText = null;
        let confirmButtonItems = [];

        function updateConfirmButton() {
            // Clean up old button
            confirmButtonItems.forEach(item => {
                if (item && item.exists && item.exists()) {
                    k.destroy(item);
                }
            });
            confirmButtonItems = [];

            const viewedChar = CHARACTER_UNLOCKS[viewedCharacterKey];
            const isViewedUnlocked = isUnlocked('characters', viewedCharacterKey) || viewedChar.unlockedByDefault;

            confirmButton = k.add([
                k.rect(120, 35),
                k.pos(k.width() / 2 + 70, k.height() - 40),
                k.anchor('center'),
                k.color(...(isViewedUnlocked ? UI_COLORS.SUCCESS : UI_COLORS.BG_DISABLED)),
                k.outline(2, k.rgb(...(isViewedUnlocked ? UI_COLORS.BORDER : UI_COLORS.BG_DARK))),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            confirmButtonItems.push(confirmButton);

            confirmText = k.add([
                k.text(formatButtonText('Confirm'), { size: UI_TEXT_SIZES.BODY }),
                k.pos(k.width() / 2 + 70, k.height() - 40),
                k.anchor('center'),
                k.color(...(isViewedUnlocked ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            confirmButtonItems.push(confirmText);

            if (isViewedUnlocked) {
                confirmButton.onClick(() => {
                    playMenuSelect();
                    setSelectedCharacter(viewedCharacterKey);
                    broadcastCharacterChange(viewedCharacterKey);
                    k.go('menu');
                });
                confirmButton.cursor = 'pointer';
            }
        }

        // Initial confirm button render
        updateConfirmButton();

        // Wrap refreshDisplay to also update confirm button
        const originalRefreshDisplay = refreshDisplay;
        refreshDisplay = function() {
            originalRefreshDisplay();
            updateConfirmButton();
        };

        // Instructions
        k.add([
            k.text('Click a character to preview | Confirm to select', { size: UI_TEXT_SIZES.BODY }),
            k.pos(k.width() / 2, k.height() - 80),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_TERTIARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Controls
        k.onKeyPress('escape', () => {
            playMenuNav();
            k.go('menu');
        });

        k.onKeyPress('enter', () => {
            const viewedChar = CHARACTER_UNLOCKS[viewedCharacterKey];
            const isViewedUnlocked = isUnlocked('characters', viewedCharacterKey) || viewedChar.unlockedByDefault;
            if (isViewedUnlocked) {
                playMenuSelect();
                setSelectedCharacter(viewedCharacterKey);
                broadcastCharacterChange(viewedCharacterKey);
                k.go('menu');
            }
        });
    });
}
