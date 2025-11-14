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
        
        // Character cards
        const characterKeys = Object.keys(CHARACTER_UNLOCKS);
        const cardWidth = 200;
        const cardHeight = 180;
        const cardSpacing = 20;
        const startX = (k.width() - (characterKeys.length * (cardWidth + cardSpacing) - cardSpacing)) / 2;
        const startY = 150;
        
        const characterCards = [];
        
        characterKeys.forEach((key, index) => {
            const char = CHARACTER_UNLOCKS[key];
            const isUnlockedChar = isUnlocked('characters', key) || char.unlockedByDefault;
            const isSelected = selectedChar === key;
            
            const cardX = startX + index * (cardWidth + cardSpacing);
            const cardY = startY;
            
            // Card background
            const cardBg = k.add([
                k.rect(cardWidth, cardHeight),
                k.pos(cardX, cardY),
                k.anchor('topleft'),
                k.color(isSelected ? 50 : 30, isSelected ? 50 : 30, isSelected ? 60 : 40),
                k.outline(2, isSelected ? k.rgb(100, 150, 255) : (isUnlockedChar ? k.rgb(100, 100, 100) : k.rgb(50, 50, 50)))
            ]);
            
            // Character visual
            const charVisual = k.add([
                k.text(char.char, { size: 48 }),
                k.pos(cardX + cardWidth / 2, cardY + 40),
                k.anchor('center'),
                k.color(...(isUnlockedChar ? char.color : [50, 50, 50]))
            ]);
            
            // Character name
            const nameText = k.add([
                k.text(char.name, { size: 18 }),
                k.pos(cardX + cardWidth / 2, cardY + 90),
                k.anchor('center'),
                k.color(isUnlockedChar ? 255 : 100, isUnlockedChar ? 255 : 100, isUnlockedChar ? 255 : 100)
            ]);
            
            // Description
            const descText = k.add([
                k.text(char.description, { size: 12 }),
                k.pos(cardX + cardWidth / 2, cardY + 115),
                k.anchor('center'),
                k.color(isUnlockedChar ? 200 : 80, isUnlockedChar ? 200 : 80, isUnlockedChar ? 200 : 80),
                k.width(cardWidth - 20)
            ]);
            
            // Stats display
            const statsText = k.add([
                k.text(`HP: ${char.stats.health} | SPD: ${char.stats.speed} | DMG: ${char.stats.damage}`, { size: 11 }),
                k.pos(cardX + cardWidth / 2, cardY + 145),
                k.anchor('center'),
                k.color(isUnlockedChar ? 150 : 60, isUnlockedChar ? 150 : 60, isUnlockedChar ? 150 : 60)
            ]);
            
            // Locked overlay
            if (!isUnlockedChar) {
                const lockText = k.add([
                    k.text('LOCKED', { size: 24 }),
                    k.pos(cardX + cardWidth / 2, cardY + cardHeight / 2),
                    k.anchor('center'),
                    k.color(150, 50, 50)
                ]);
                
                // Unlock requirement
                if (char.unlockRequirement) {
                    const reqText = k.add([
                        k.text(`Complete Floor ${char.unlockRequirement.value}`, { size: 12 }),
                        k.pos(cardX + cardWidth / 2, cardY + cardHeight - 15),
                        k.anchor('center'),
                        k.color(150, 150, 150)
                    ]);
                }
            }
            
            // Selected indicator
            if (isSelected) {
                const selectedIndicator = k.add([
                    k.text('SELECTED', { size: 14 }),
                    k.pos(cardX + cardWidth / 2, cardY + 10),
                    k.anchor('center'),
                    k.color(100, 200, 255)
                ]);
            }
            
            // Click handler
            if (isUnlockedChar) {
                cardBg.onClick(() => {
                    setSelectedCharacter(key);
                    k.go('characterSelect'); // Refresh scene
                });
                cardBg.cursor = 'pointer';
            }
            
            characterCards.push({ key, cardBg, isUnlockedChar, isSelected });
        });
        
        // Instructions
        k.add([
            k.text('Click a character to select | Press ESC to return', { size: 16 }),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(150, 150, 150)
        ]);
        
        k.add([
            k.text('Press SPACE to start game', { size: 18 }),
            k.pos(k.width() / 2, k.height() - 15),
            k.anchor('center'),
            k.color(100, 255, 100)
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

