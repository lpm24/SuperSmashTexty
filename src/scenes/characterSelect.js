// Character selection scene
import { getCurrency, getCurrencyName, isUnlocked, setSelectedCharacter, getSelectedCharacter, isAchievementUnlocked } from '../systems/metaProgression.js';
import { broadcastCharacterChange } from '../systems/partySystem.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { playMenuSelect, playMenuNav } from '../systems/sounds.js';
import {
    UI_SIZES,
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
import { createStatBar } from '../config/uiComponents.js';

// Animation constants for character preview
const CHAR_ANIM = {
    BREATHE_SPEED: 1.5,
    BREATHE_AMOUNT: 0.04,
    BOB_SPEED: 2,
    BOB_AMOUNT: 3,
    GLOW_PULSE_SPEED: 2,
    GLOW_MIN: 0.3,
    GLOW_MAX: 0.7
};

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
        const leftPanelWidth = 360;
        const rightPanelX = leftPanelWidth + 20;
        const rightPanelWidth = k.width() - rightPanelX - 20;
        const startY = 110;
        // Custom smaller card size to fit more characters
        const cardWidth = 165;
        const cardHeight = 70;
        const cardSpacing = 8;
        const cardsPerRow = 2;
        const rowsPerPage = 5;
        const charactersPerPage = cardsPerRow * rowsPerPage;

        // Helper to strip "The " prefix from names for display
        const formatName = (name) => name.replace(/^The\s+/i, '');

        // Helper to render description with highlighted stats
        // Returns array of text elements
        const renderHighlightedDescription = (description, x, y, maxWidth) => {
            const elements = [];
            // Regex to match stat patterns like "+10% XP", "-20% health", "+2 orbital", etc.
            const statPattern = /([+-]?\d+%?\s*(?:XP|health|HP|speed|damage|crit|dodge|reduction|lifesteal|blast radius|drones?|orbital))/gi;

            // Split description by stat patterns
            const parts = description.split(statPattern);
            const matches = description.match(statPattern) || [];

            // Build text segments
            let currentText = '';
            const segments = [];

            let matchIndex = 0;
            parts.forEach((part, i) => {
                if (i % 2 === 0) {
                    // Regular text
                    if (part) segments.push({ text: part, highlight: false });
                } else {
                    // Stat text (matched pattern)
                    segments.push({ text: part, highlight: true });
                }
            });

            // Render as a single line with color markup using Kaplay's text formatting
            // Since Kaplay doesn't support inline color changes easily, we'll render separate elements
            // For simplicity, we'll render the full text in secondary color and overlay highlighted parts

            // Full description in secondary color
            const baseText = k.add([
                k.text(description, { size: UI_TEXT_SIZES.SMALL, width: maxWidth }),
                k.pos(x, y),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            elements.push(baseText);

            // Create highlighted overlay for stat values
            // We need to extract positions - this is complex, so let's use a simpler approach:
            // Re-render just the highlighted parts in a brighter color on top
            // Since we can't get precise character positions, we'll use a different approach:
            // Render the description with stat values in a highlight color (gold/yellow)

            // Alternative approach: Use different formatting
            // Actually, let's format the description by replacing stat values with colored versions
            // Since we can't do inline colors, let's just make the whole description look different
            // by adding a separate line for the key stat highlights

            // Find all stat mentions and create a summary line
            if (matches.length > 0) {
                const statSummary = matches.join(' | ');
                const highlightText = k.add([
                    k.text(statSummary, { size: UI_TEXT_SIZES.TINY }),
                    k.pos(x, y + 28),
                    k.anchor('center'),
                    k.color(...UI_COLORS.GOLD),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT + 1)
                ]);
                elements.push(highlightText);
            }

            return elements;
        };

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
                const isConfirmedSelection = confirmedCharacterKey === key;

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
                    k.scale(1),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS),
                    {
                        baseX: cardX,
                        baseY: cardY,
                        isHovered: false
                    }
                ]);

                // Character visual
                const charVisual = k.add([
                    k.text(char.char, { size: UI_TEXT_SIZES.HEADER }),
                    k.pos(cardX + 28, cardY + cardHeight / 2),
                    k.anchor('center'),
                    k.color(...(isUnlockedChar ? char.color : UI_COLORS.BG_DISABLED)),
                    k.fixed(),
                    k.scale(1),
                    k.z(UI_Z_LAYERS.UI_TEXT),
                    {
                        baseX: cardX + 28,
                        baseY: cardY + cardHeight / 2
                    }
                ]);

                // Character name (stripped of "The " prefix)
                const nameText = k.add([
                    k.text(formatName(char.name), { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(cardX + 60, cardY + cardHeight / 2),
                    k.anchor('left'),
                    k.color(...(isUnlockedChar ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_DISABLED)),
                    k.fixed(),
                    k.scale(1),
                    k.z(UI_Z_LAYERS.UI_TEXT),
                    {
                        baseX: cardX + 60,
                        baseY: cardY + cardHeight / 2
                    }
                ]);

                // Hover effects for cards
                cardBg.onHoverUpdate(() => {
                    if (!cardBg.isHovered && !isViewed) {
                        cardBg.isHovered = true;
                        playMenuNav();
                    }
                    if (!isViewed) {
                        // Scale up slightly and brighten
                        cardBg.scale = k.vec2(1.05, 1.05);
                        charVisual.scale = k.vec2(1.15, 1.15);
                        nameText.scale = k.vec2(1.05, 1.05);
                        cardBg.color = k.rgb(50, 50, 65);
                        // Add slight bounce to character
                        const bounce = Math.sin(k.time() * 8) * 2;
                        charVisual.pos.y = charVisual.baseY + bounce;
                    }
                });

                cardBg.onHoverEnd(() => {
                    cardBg.isHovered = false;
                    cardBg.scale = k.vec2(1, 1);
                    charVisual.scale = k.vec2(1, 1);
                    nameText.scale = k.vec2(1, 1);
                    cardBg.color = k.rgb(...(isViewed ? UI_COLORS.BG_MEDIUM : UI_COLORS.BG_DARK));
                    charVisual.pos.y = charVisual.baseY;
                });

                // Locked overlay
                if (!isUnlockedChar) {
                    const lockText = k.add([
                        k.text('🔒', { size: UI_TEXT_SIZES.SMALL }),
                        k.pos(cardX + cardWidth - 18, cardY + cardHeight / 2),
                        k.anchor('center'),
                        k.color(...UI_COLORS.DANGER),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.OVERLAY)
                    ]);
                    characterCards.push(lockText);
                }

                // Current selection indicator (checkmark badge)
                if (isConfirmedSelection) {
                    const checkBadge = k.add([
                        k.circle(8),
                        k.pos(cardX + cardWidth - 10, cardY + 12),
                        k.anchor('center'),
                        k.color(...UI_COLORS.SUCCESS),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT + 1)
                    ]);
                    const checkMark = k.add([
                        k.text('✓', { size: 10 }),
                        k.pos(cardX + cardWidth - 10, cardY + 12),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT + 2)
                    ]);
                    characterCards.push(checkBadge, checkMark);
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
            if (totalPages > 1) {
                const paginationY = startY + rowsPerPage * (cardHeight + cardSpacing) + 15;
                const paginationCenterX = leftPanelWidth / 2;

                // Page indicator pips
                const pipSpacing = 20;
                const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;
                const pipsEndX = paginationCenterX + ((totalPages - 1) * pipSpacing) / 2;

                // Arrows positioned outside the pips with offset for pip clickable area (16px) + gap
                const arrowOffset = 25;
                const leftArrowX = pipsStartX - arrowOffset;
                const rightArrowX = pipsEndX + arrowOffset;

                for (let i = 0; i < totalPages; i++) {
                    const isCurrentPage = i === currentPage;
                    const pipX = pipsStartX + i * pipSpacing;

                    const pipBg = k.add([
                        k.rect(16, 16),
                        k.pos(pipX, paginationY),
                        k.anchor('center'),
                        k.color(0, 0, 0),
                        k.opacity(0),
                        k.area({ width: 16, height: 16 }),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_ELEMENTS)
                    ]);

                    const pipText = k.add([
                        k.text(isCurrentPage ? '●' : '○', { size: 14 }),
                        k.pos(pipX, paginationY),
                        k.anchor('center'),
                        k.color(isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);

                    const pageIndex = i;
                    pipBg.onClick(() => {
                        if (pageIndex !== currentPage) {
                            playMenuNav();
                            currentPage = pageIndex;
                            refreshDisplay();
                        }
                    });
                    pipBg.cursor = 'pointer';

                    paginationItems.push(pipBg, pipText);
                }

                // Left arrow (higher z-index to sit on top and take priority)
                const leftArrowBg = k.add([
                    k.rect(30, 30),
                    k.pos(leftArrowX, paginationY),
                    k.anchor('center'),
                    k.color(0, 0, 0),
                    k.opacity(0),
                    k.area({ width: 30, height: 30 }),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
                ]);

                const leftArrowText = k.add([
                    k.text('<', { size: 24 }),
                    k.pos(leftArrowX, paginationY),
                    k.anchor('center'),
                    k.color(currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT + 1)
                ]);

                if (currentPage > 0) {
                    leftArrowBg.onClick(() => {
                        playMenuNav();
                        currentPage--;
                        refreshDisplay();
                    });
                    leftArrowBg.cursor = 'pointer';
                }
                paginationItems.push(leftArrowBg, leftArrowText);

                // Right arrow (higher z-index to sit on top and take priority)
                const rightArrowBg = k.add([
                    k.rect(30, 30),
                    k.pos(rightArrowX, paginationY),
                    k.anchor('center'),
                    k.color(0, 0, 0),
                    k.opacity(0),
                    k.area({ width: 30, height: 30 }),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
                ]);

                const rightArrowText = k.add([
                    k.text('>', { size: 24 }),
                    k.pos(rightArrowX, paginationY),
                    k.anchor('center'),
                    k.color(currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT + 1)
                ]);

                if (currentPage < totalPages - 1) {
                    rightArrowBg.onClick(() => {
                        playMenuNav();
                        currentPage++;
                        refreshDisplay();
                    });
                    rightArrowBg.cursor = 'pointer';
                }
                paginationItems.push(rightArrowBg, rightArrowText);
            }
            
            // Render character details (right side)
            const viewedChar = CHARACTER_UNLOCKS[viewedCharacterKey];
            const isViewedUnlocked = isUnlocked('characters', viewedCharacterKey) || viewedChar.unlockedByDefault;
            let detailY = startY;

            // Preview panel background for clarity
            const previewPanelBg = k.add([
                k.rect(rightPanelWidth - 10, 380),
                k.pos(rightPanelX + 5, startY - 10),
                k.anchor('topleft'),
                k.color(25, 25, 35),
                k.outline(2, k.rgb(60, 60, 80)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS - 1)
            ]);
            detailItems.push(previewPanelBg);

            // Glow effect behind character (pulses)
            const charGlow = k.add([
                k.circle(50),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY + 45),
                k.anchor('center'),
                k.color(...(isViewedUnlocked ? viewedChar.color : [80, 80, 80])),
                k.opacity(CHAR_ANIM.GLOW_MIN),
                k.scale(1),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            detailItems.push(charGlow);

            // Character visual (large) with animation reference
            const detailVisual = k.add([
                k.text(viewedChar.char, { size: 72 }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY + 45),
                k.anchor('center'),
                k.color(...(isViewedUnlocked ? viewedChar.color : UI_COLORS.BG_DISABLED)),
                k.fixed(),
                k.scale(1),
                k.z(UI_Z_LAYERS.UI_ELEMENTS + 1),
                {
                    baseY: detailY + 45,
                    baseScale: 1,
                    animTime: Math.random() * Math.PI * 2 // Random start phase
                }
            ]);
            detailItems.push(detailVisual);

            // Animate the character and glow
            const animLoop = k.onUpdate(() => {
                if (!detailVisual.exists()) return;

                detailVisual.animTime += k.dt();

                // Breathing effect (scale)
                const breathe = 1 + Math.sin(detailVisual.animTime * CHAR_ANIM.BREATHE_SPEED) * CHAR_ANIM.BREATHE_AMOUNT;
                detailVisual.scale = k.vec2(breathe, breathe);

                // Bobbing effect (position)
                const bob = Math.sin(detailVisual.animTime * CHAR_ANIM.BOB_SPEED) * CHAR_ANIM.BOB_AMOUNT;
                detailVisual.pos.y = detailVisual.baseY + bob;

                // Glow pulse
                if (charGlow.exists()) {
                    const glowIntensity = CHAR_ANIM.GLOW_MIN +
                        (Math.sin(detailVisual.animTime * CHAR_ANIM.GLOW_PULSE_SPEED) * 0.5 + 0.5) *
                        (CHAR_ANIM.GLOW_MAX - CHAR_ANIM.GLOW_MIN);
                    charGlow.opacity = glowIntensity;
                    charGlow.scale = k.vec2(1 + glowIntensity * 0.3, 1 + glowIntensity * 0.3);
                }
            });
            detailItems.push({ exists: () => true, destroy: () => animLoop.cancel() });

            detailY += 110;

            // Character name (stripped of "The " prefix)
            const detailName = k.add([
                k.text(formatName(viewedChar.name), { size: UI_TEXT_SIZES.HEADER }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(detailName);
            detailY += 35;

            // Description with highlighted stats
            const descElements = renderHighlightedDescription(
                viewedChar.description,
                rightPanelX + rightPanelWidth / 2,
                detailY,
                rightPanelWidth - 40
            );
            detailItems.push(...descElements);
            detailY += 55;

            // Stats with visual bars
            const statsLabel = k.add([
                k.text('Stats:', { size: UI_TEXT_SIZES.LABEL }),
                k.pos(rightPanelX + 20, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.WARNING),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(statsLabel);
            detailY += 28;

            // Stat bar constants
            const statBarWidth = 100;
            const statBarX = rightPanelX + 40;
            const statRowHeight = 24;

            // Health stat bar (max 175 - characters range 60-150)
            const healthBar = createStatBar(k, {
                label: UI_TERMS.HEALTH,
                value: viewedChar.stats.health,
                maxValue: 175,
                x: statBarX,
                y: detailY,
                width: statBarWidth,
                usePercentageColor: true
            });
            detailItems.push(...healthBar.elements);
            detailY += statRowHeight;

            // Speed stat bar (max 225 - characters range 100-200)
            const speedBar = createStatBar(k, {
                label: UI_TERMS.SPEED,
                value: viewedChar.stats.speed,
                maxValue: 225,
                x: statBarX,
                y: detailY,
                width: statBarWidth,
                usePercentageColor: true
            });
            detailItems.push(...speedBar.elements);
            detailY += statRowHeight;

            // Damage stat bar (max 25 - characters range 8-20)
            const damageBar = createStatBar(k, {
                label: UI_TERMS.DAMAGE,
                value: viewedChar.stats.damage,
                maxValue: 25,
                x: statBarX,
                y: detailY,
                width: statBarWidth,
                usePercentageColor: true
            });
            detailItems.push(...damageBar.elements);
            detailY += 30;

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
