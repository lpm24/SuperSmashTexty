// Character selection scene
import { getCurrency, getCurrencyName, isUnlocked, setSelectedCharacter, getSelectedCharacter } from '../systems/metaProgression.js';
import { broadcastCharacterChange } from '../systems/partySystem.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { playMenuSelect, playMenuNav } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    UI_TERMS,
    formatButtonText,
    formatStatLabel,
    createCreditIndicator,
    createMenuParticles
} from '../config/uiConfig.js';

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
        k.add([
            k.text(formatButtonText('Characters'), { size: UI_TEXT_SIZES.TITLE }),
            k.pos(k.width() / 2, 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        
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
        const visibleRows = 3;
        const viewportHeight = visibleRows * (cardHeight + cardSpacing);
        
        // Calculate grid layout
        const totalRows = Math.ceil(characterKeys.length / cardsPerRow);
        let scrollOffset = 0;
        
        const characterCards = [];
        let selectedCharacterKey = selectedChar || characterKeys[0];
        let detailItems = [];
        let isRefreshing = false; // Prevent infinite loops
        
        // Function to refresh display
        function refreshDisplay() {
            if (isRefreshing) return; // Prevent recursive calls
            isRefreshing = true;
            
            // Calculate maxScroll dynamically
            const maxScroll = Math.max(0, (totalRows * (cardHeight + cardSpacing)) - viewportHeight);
            
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
            
            // Clamp scroll
            scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
            
            // Render character selection grid (left side)
            characterKeys.forEach((key, index) => {
                const char = CHARACTER_UNLOCKS[key];
                const isUnlockedChar = isUnlocked('characters', key) || char.unlockedByDefault;
                const isSelected = selectedCharacterKey === key;
                
                const row = Math.floor(index / cardsPerRow);
                const col = index % cardsPerRow;
                const cardX = 20 + col * (cardWidth + cardSpacing);
                const cardY = startY + row * (cardHeight + cardSpacing) - scrollOffset;
                
                // Only render if visible
                if (cardY >= startY - cardHeight && cardY <= startY + viewportHeight) {
                    // Card background
                    const cardBg = k.add([
                        k.rect(cardWidth, cardHeight),
                        k.pos(cardX, cardY),
                        k.anchor('topleft'),
                        k.color(...(isSelected ? UI_COLORS.BG_MEDIUM : UI_COLORS.BG_DARK)),
                        k.outline(2, isSelected ? k.rgb(...UI_COLORS.BORDER_ACTIVE) : (isUnlockedChar ? k.rgb(...UI_COLORS.TEXT_DISABLED) : k.rgb(...UI_COLORS.BG_DARK))),
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
                    
                    // Click handler
                    if (isUnlockedChar) {
                        cardBg.onClick(() => {
                            if (selectedCharacterKey !== key) {
                                playMenuSelect();
                                selectedCharacterKey = key;
                                setSelectedCharacter(key);
                                broadcastCharacterChange(key); // Sync with party members
                                refreshDisplay();
                            }
                        });
                        cardBg.cursor = 'pointer';
                    }
                    
                    characterCards.push(cardBg, charVisual, nameText);
                }
            });
            
            // Render character details (right side)
            const selectedChar = CHARACTER_UNLOCKS[selectedCharacterKey];
            const isUnlockedChar = isUnlocked('characters', selectedCharacterKey) || selectedChar.unlockedByDefault;
            let detailY = startY;
            
            // Character visual (large)
            const detailVisual = k.add([
                k.text(selectedChar.char, { size: 72 }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY + 40),
                k.anchor('center'),
                k.color(...(isUnlockedChar ? selectedChar.color : UI_COLORS.BG_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            detailItems.push(detailVisual);
            detailY += 100;

            // Character name
            const detailName = k.add([
                k.text(selectedChar.name, { size: UI_TEXT_SIZES.HEADER }),
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
                k.text(selectedChar.description, { size: UI_TEXT_SIZES.SMALL, width: rightPanelWidth - 40 }),
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
                k.text(`${UI_TERMS.HEALTH}: ${selectedChar.stats.health}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(statsText);
            detailY += 25;

            const speedText = k.add([
                k.text(`${UI_TERMS.SPEED}: ${selectedChar.stats.speed}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(speedText);
            detailY += 25;

            const damageText = k.add([
                k.text(`${UI_TERMS.DAMAGE}: ${selectedChar.stats.damage}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            detailItems.push(damageText);
            detailY += 40;
            
            // Selected indicator
            if (selectedCharacterKey === selectedChar) {
                const selectedIndicator = k.add([
                    k.text('✓ SELECTED', { size: UI_TEXT_SIZES.LABEL }),
                    k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.SUCCESS),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                detailItems.push(selectedIndicator);
            }

            // Locked info
            if (!isUnlockedChar && selectedChar.unlockRequirement) {
                const unlockText = k.add([
                    k.text(`Unlock: Complete ${UI_TERMS.FLOOR} ${selectedChar.unlockRequirement.value}`, { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(rightPanelX + rightPanelWidth / 2, detailY + 30),
                    k.anchor('center'),
                    k.color(...UI_COLORS.GOLD),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                detailItems.push(unlockText);
            }
            
            isRefreshing = false;
        }
        
        // Initial display
        refreshDisplay();
        
        // Scrolling for character grid
        const wheelHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const oldOffset = scrollOffset;
            const maxScroll = Math.max(0, (totalRows * (cardHeight + cardSpacing)) - viewportHeight);
            scrollOffset += e.deltaY * 0.3;
            scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
            if (scrollOffset !== oldOffset) {
                refreshDisplay();
            }
        };
        
        const gameContainer = document.querySelector('#game-container');
        if (gameContainer) {
            gameContainer.addEventListener('wheel', wheelHandler, { passive: false });
        }
        
        k.onDestroy(() => {
            if (gameContainer) {
                gameContainer.removeEventListener('wheel', wheelHandler);
            }
        });
        
        // Keyboard scrolling
        k.onKeyPress('arrowdown', () => {
            const oldOffset = scrollOffset;
            const maxScroll = Math.max(0, (totalRows * (cardHeight + cardSpacing)) - viewportHeight);
            scrollOffset += 50;
            scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
            if (scrollOffset !== oldOffset) {
                refreshDisplay();
            }
        });
        
        k.onKeyPress('arrowup', () => {
            const oldOffset = scrollOffset;
            const maxScroll = Math.max(0, (totalRows * (cardHeight + cardSpacing)) - viewportHeight);
            scrollOffset -= 50;
            scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
            if (scrollOffset !== oldOffset) {
                refreshDisplay();
            }
        });
        
        // Back button (centered like other menus)
        const backButton = k.add([
            k.rect(120, 35),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        const backText = k.add([
            k.text(formatButtonText('Back'), { size: UI_TEXT_SIZES.BODY }),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        
        backButton.onClick(() => {
            playMenuNav();
            k.go('menu');
        });

        // Instructions
        k.add([
            k.text('Click a character to select | Press SPACE to start', { size: UI_TEXT_SIZES.BODY }),
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

        k.onKeyPress('space', () => {
            playMenuSelect();
            k.go('game', { resetState: true });
        });
    });
}
