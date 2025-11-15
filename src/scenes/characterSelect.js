// Character selection scene
import { getCurrency, getCurrencyName, isUnlocked, setSelectedCharacter, getSelectedCharacter } from '../systems/metaProgression.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';

export function setupCharacterSelectScene(k) {
    k.scene('characterSelect', () => {
        const currency = getCurrency();
        const currencyName = getCurrencyName();
        const selectedChar = getSelectedCharacter();
        
        // Currency display (top right)
        k.add([
            k.text(`${currencyName}: ${currency}`, { size: 18 }),
            k.pos(k.width() - 20, 20),
            k.anchor('topright'),
            k.color(100, 255, 100),
            k.fixed()
        ]);
        
        // Title
        k.add([
            k.text('Select Character', { size: 36 }),
            k.pos(k.width() / 2, 60),
            k.anchor('center'),
            k.color(255, 255, 255)
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
                        k.color(isSelected ? 50 : 30, isSelected ? 50 : 30, isSelected ? 60 : 40),
                        k.outline(2, isSelected ? k.rgb(100, 150, 255) : (isUnlockedChar ? k.rgb(100, 100, 100) : k.rgb(50, 50, 50))),
                        k.area(),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    
                    // Character visual
                    const charVisual = k.add([
                        k.text(char.char, { size: 36 }),
                        k.pos(cardX + cardWidth / 2, cardY + 30),
                        k.anchor('center'),
                        k.color(...(isUnlockedChar ? char.color : [50, 50, 50])),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    
                    // Character name
                    const nameText = k.add([
                        k.text(char.name, { size: 14 }),
                        k.pos(cardX + cardWidth / 2, cardY + 70),
                        k.anchor('center'),
                        k.color(isUnlockedChar ? 255 : 100, isUnlockedChar ? 255 : 100, isUnlockedChar ? 255 : 100),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    
                    // Locked overlay
                    if (!isUnlockedChar) {
                        const lockText = k.add([
                            k.text('🔒', { size: 20 }),
                            k.pos(cardX + cardWidth / 2, cardY + cardHeight / 2),
                            k.anchor('center'),
                            k.color(150, 50, 50),
                            k.fixed(),
                            k.z(1002)
                        ]);
                        characterCards.push(lockText);
                    }
                    
                    // Click handler
                    if (isUnlockedChar) {
                        cardBg.onClick(() => {
                            if (selectedCharacterKey !== key) {
                                selectedCharacterKey = key;
                                setSelectedCharacter(key);
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
                k.color(...(isUnlockedChar ? selectedChar.color : [50, 50, 50])),
                k.fixed(),
                k.z(1000)
            ]);
            detailItems.push(detailVisual);
            detailY += 100;
            
            // Character name
            const detailName = k.add([
                k.text(selectedChar.name, { size: 24 }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                k.anchor('center'),
                k.color(255, 255, 255),
                k.fixed(),
                k.z(1000)
            ]);
            detailItems.push(detailName);
            detailY += 40;
            
            // Description
            const detailDesc = k.add([
                k.text(selectedChar.description, { size: 14, width: rightPanelWidth - 40 }),
                k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                k.anchor('center'),
                k.color(200, 200, 200),
                k.fixed(),
                k.z(1000)
            ]);
            detailItems.push(detailDesc);
            detailY += 60;
            
            // Stats
            const statsLabel = k.add([
                k.text('Stats:', { size: 18 }),
                k.pos(rightPanelX + 20, detailY),
                k.anchor('left'),
                k.color(255, 255, 100),
                k.fixed(),
                k.z(1000)
            ]);
            detailItems.push(statsLabel);
            detailY += 30;
            
            const statsText = k.add([
                k.text(`Health: ${selectedChar.stats.health}`, { size: 16 }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(255, 255, 255),
                k.fixed(),
                k.z(1000)
            ]);
            detailItems.push(statsText);
            detailY += 25;
            
            const speedText = k.add([
                k.text(`Speed: ${selectedChar.stats.speed}`, { size: 16 }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(255, 255, 255),
                k.fixed(),
                k.z(1000)
            ]);
            detailItems.push(speedText);
            detailY += 25;
            
            const damageText = k.add([
                k.text(`Damage: ${selectedChar.stats.damage}`, { size: 16 }),
                k.pos(rightPanelX + 40, detailY),
                k.anchor('left'),
                k.color(255, 255, 255),
                k.fixed(),
                k.z(1000)
            ]);
            detailItems.push(damageText);
            detailY += 40;
            
            // Selected indicator
            if (selectedCharacterKey === selectedChar) {
                const selectedIndicator = k.add([
                    k.text('✓ SELECTED', { size: 18 }),
                    k.pos(rightPanelX + rightPanelWidth / 2, detailY),
                    k.anchor('center'),
                    k.color(100, 255, 100),
                    k.fixed(),
                    k.z(1000)
                ]);
                detailItems.push(selectedIndicator);
            }
            
            // Locked info
            if (!isUnlockedChar && selectedChar.unlockRequirement) {
                const unlockText = k.add([
                    k.text(`Unlock: Complete Floor ${selectedChar.unlockRequirement.value}`, { size: 14 }),
                    k.pos(rightPanelX + rightPanelWidth / 2, detailY + 30),
                    k.anchor('center'),
                    k.color(200, 150, 100),
                    k.fixed(),
                    k.z(1000)
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
            k.color(80, 80, 100),
            k.outline(2, k.rgb(150, 150, 150)),
            k.area(),
            k.fixed(),
            k.z(1000)
        ]);
        
        const backText = k.add([
            k.text('Back', { size: 16 }),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(200, 200, 200),
            k.fixed(),
            k.z(1001)
        ]);
        
        backButton.onClick(() => {
            k.go('menu');
        });
        
        // Instructions
        k.add([
            k.text('Click a character to select | Press SPACE to start', { size: 16 }),
            k.pos(k.width() / 2, k.height() - 80),
            k.anchor('center'),
            k.color(150, 150, 150),
            k.fixed(),
            k.z(1000)
        ]);
        
        // Controls
        k.onKeyPress('escape', () => {
            k.go('menu');
        });
        
        k.onKeyPress('space', () => {
            k.go('game', { resetState: true });
        });
    });
}
