// Shop scene - allows players to purchase unlocks
import { getCurrency, getCurrencyName, isUnlocked, purchaseUnlock, purchasePermanentUpgrade, getPermanentUpgradeLevel } from '../systems/metaProgression.js';
import { getUnlocksForCategory, getUnlockInfo, CHARACTER_UNLOCKS, WEAPON_UNLOCKS, PERMANENT_UPGRADE_UNLOCKS } from '../data/unlocks.js';
import { playPurchaseSuccess, playPurchaseError, playMenuNav } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    formatButtonText,
    createCreditIndicator
} from '../config/uiConfig.js';

export function setupShopScene(k) {
    k.scene('shop', () => {
        const currency = getCurrency();
        const currencyName = getCurrencyName();
        
        // Current category tab
        let currentCategory = 'permanentUpgrades'; // Start with permanent upgrades since they're most useful
        
        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(...UI_COLORS.BG_DARK),
            k.fixed(),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Title
        k.add([
            k.text(formatButtonText('Shop'), { size: UI_TEXT_SIZES.TITLE }),
            k.pos(k.width() / 2, 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Currency display (standardized)
        const creditIndicator = createCreditIndicator(k, currency, currencyName);
        
        // Category tabs
        const tabY = 90;
        const tabSpacing = 120;
        const tabWidth = 100;
        const tabHeight = 30;
        
        const categories = [
            { key: 'permanentUpgrades', label: 'Upgrades' },
            { key: 'characters', label: 'Characters' },
            { key: 'weapons', label: 'Weapons' }
        ];
        
        const tabButtons = [];
        categories.forEach((cat, index) => {
            const tabX = k.width() / 2 - (categories.length * tabSpacing) / 2 + index * tabSpacing;
            const isActive = currentCategory === cat.key;
            
            const tabBg = k.add([
                k.rect(tabWidth, tabHeight),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(...(isActive ? UI_COLORS.SECONDARY : UI_COLORS.BG_MEDIUM)),
                k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);

            const tabLabel = k.add([
                k.text(cat.label, { size: UI_TEXT_SIZES.BODY }),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(...(isActive ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_TERTIARY)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            
            tabBg.onClick(() => {
                playMenuNav();
                currentCategory = cat.key;
                refreshShop();
            });
            
            tabButtons.push({ bg: tabBg, label: tabLabel, category: cat.key });
        });
        
        // Content area
        const contentY = 140;
        const contentHeight = k.height() - contentY - 60;
        let unlockItems = [];
        
        // Refresh shop display
        function refreshShop() {
            // Update tab visuals
            tabButtons.forEach(tab => {
                const isActive = currentCategory === tab.category;
                tab.bg.color = k.rgb(
                    isActive ? 100 : 50,
                    isActive ? 100 : 50,
                    isActive ? 150 : 80
                );
                tab.label.color = k.rgb(
                    isActive ? 255 : 150,
                    isActive ? 255 : 150,
                    isActive ? 255 : 150
                );
            });
            
            // Clear existing items
            unlockItems.forEach(item => {
                if (item.exists()) k.destroy(item);
            });
            unlockItems = [];
            
            // Get unlocks for current category
            const unlocks = getUnlocksForCategory(currentCategory);
            const unlockKeys = Object.keys(unlocks);
            
            // Filter out default unlocks if they're not interesting to show
            const displayUnlocks = unlockKeys.filter(key => {
                const unlock = unlocks[key];
                // Show all permanent upgrades, but only show non-default characters/weapons
                if (currentCategory === 'permanentUpgrades') return true;
                return !unlock.unlockedByDefault;
            });
            
            if (displayUnlocks.length === 0) {
                // No unlocks available in this category
                const noItemsText = k.add([
                    k.text('No items available in this category yet.', { size: 18 }),
                    k.pos(k.width() / 2, contentY + 50),
                    k.anchor('center'),
                    k.color(150, 150, 150),
                    k.fixed(),
                    k.z(1000)
                ]);
                unlockItems.push(noItemsText);
                return;
            }
            
            // Display unlocks
            const itemSpacing = 100;
            const startY = contentY + 20;
            const maxItemsPerColumn = Math.floor(contentHeight / itemSpacing);
            const itemsPerColumn = Math.min(maxItemsPerColumn, displayUnlocks.length);
            
            displayUnlocks.forEach((key, index) => {
                const unlock = unlocks[key];
                const column = Math.floor(index / itemsPerColumn);
                const row = index % itemsPerColumn;
                const itemX = 50 + column * 350;
                const itemY = startY + row * itemSpacing;
                
                // Item card background
                // For characters, use green border if unlocked
                const isUnlockedChar = currentCategory === 'characters' && isUnlocked('characters', key);
                const borderColor = isUnlockedChar ? k.rgb(100, 255, 100) : k.rgb(80, 80, 100);
                
                const cardBg = k.add([
                    k.rect(320, 90),
                    k.pos(itemX, itemY),
                    k.anchor('topleft'),
                    k.color(40, 40, 50),
                    k.outline(2, borderColor),
                    k.area(),
                    k.fixed(),
                    k.z(1000)
                ]);
                
                // Character icon (if this is a character) - centered vertically
                if (currentCategory === 'characters' && unlock.char) {
                    const iconText = k.add([
                        k.text(unlock.char, { size: 32 }),
                        k.pos(itemX + 25, itemY + 45), // Center vertically: itemY + 90/2 = itemY + 45
                        k.anchor('center'),
                        k.color(...(isUnlockedChar && unlock.color ? unlock.color : [100, 100, 100])),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    unlockItems.push(iconText);
                }
                
                // Item name (offset right if character icon is present)
                const nameX = (currentCategory === 'characters' && unlock.char) ? itemX + 70 : itemX + 10;
                const nameText = k.add([
                    k.text(unlock.name, { size: 18 }),
                    k.pos(nameX, itemY + 10),
                    k.anchor('topleft'),
                    k.color(255, 255, 255),
                    k.fixed(),
                    k.z(1001)
                ]);
                
                // Item description (with width constraint to prevent overflow, offset if character icon present)
                const descX = (currentCategory === 'characters' && unlock.char) ? itemX + 70 : itemX + 10;
                const descWidth = (currentCategory === 'characters' && unlock.char) ? 230 : 300;
                const descText = k.add([
                    k.text(unlock.description, { size: 14, width: descWidth }),
                    k.pos(descX, itemY + 35),
                    k.anchor('topleft'),
                    k.color(200, 200, 200),
                    k.fixed(),
                    k.z(1001)
                ]);
                
                // Calculate escalating price for permanent upgrades
                function getUpgradePrice(level) {
                    // Level 1 = $50, Level 2 = $65, Level 3 = $90, Level 4 = $115, Level 5 = $160
                    const prices = [50, 65, 90, 115, 160];
                    if (level < prices.length) {
                        return prices[level];
                    }
                    // For levels beyond 5, increase by 50 each level
                    return 160 + (level - 4) * 50;
                }
                
                // Check if unlocked / level
                let statusText = '';
                let canPurchase = false;
                let purchaseCost = unlock.cost;
                
                if (currentCategory === 'permanentUpgrades') {
                    const level = getPermanentUpgradeLevel(key);
                    const maxLevel = unlock.maxLevel || 1;
                    if (level >= maxLevel) {
                        statusText = `MAX (${level}/${maxLevel})`;
                    } else {
                        statusText = `Level ${level}/${maxLevel}`;
                        // Use escalating price based on current level
                        purchaseCost = getUpgradePrice(level);
                        canPurchase = currency >= purchaseCost;
                    }
                } else if (currentCategory === 'characters') {
                    // For characters, don't show "UNLOCKED" text - border color indicates unlock status
                    if (!isUnlocked('characters', key)) {
                        canPurchase = currency >= purchaseCost;
                    }
                } else {
                    if (isUnlocked(currentCategory, key)) {
                        statusText = 'UNLOCKED';
                    } else {
                        canPurchase = currency >= purchaseCost;
                    }
                }
                
                // Status text (only show if not a character, or if it's a permanent upgrade)
                let statusLabel = null;
                if (statusText && currentCategory !== 'characters') {
                    const statusX = (currentCategory === 'characters' && unlock.char) ? itemX + 70 : itemX + 10;
                    statusLabel = k.add([
                        k.text(statusText, { size: 14 }),
                        k.pos(statusX, itemY + 60),
                        k.anchor('topleft'),
                        k.color(isUnlocked(currentCategory, key) || (currentCategory === 'permanentUpgrades' && getPermanentUpgradeLevel(key) > 0) ? 100 : 200, 
                                isUnlocked(currentCategory, key) || (currentCategory === 'permanentUpgrades' && getPermanentUpgradeLevel(key) > 0) ? 255 : 200, 
                                isUnlocked(currentCategory, key) || (currentCategory === 'permanentUpgrades' && getPermanentUpgradeLevel(key) > 0) ? 100 : 200),
                        k.fixed(),
                        k.z(1001)
                    ]);
                }
                
                // Purchase button
                if (canPurchase || (currentCategory === 'permanentUpgrades' && getPermanentUpgradeLevel(key) < (unlock.maxLevel || 1))) {
                    const buttonBg = k.add([
                        k.rect(80, 30),
                        k.pos(itemX + 230, itemY + 55),
                        k.anchor('topleft'),
                        k.color(canPurchase ? 50 : 30, canPurchase ? 150 : 30, canPurchase ? 50 : 30),
                        k.outline(2, k.rgb(canPurchase ? 100 : 50, canPurchase ? 200 : 50, canPurchase ? 100 : 50)),
                        k.area(),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    
                    const buttonText = k.add([
                        k.text(`$${purchaseCost}`, { size: 14 }),
                        k.pos(itemX + 270, itemY + 70),
                        k.anchor('center'),
                        k.color(canPurchase ? 255 : 150, canPurchase ? 255 : 150, canPurchase ? 255 : 150),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    
                    if (canPurchase) {
                        buttonBg.onClick(() => {
                            let result;
                            if (currentCategory === 'permanentUpgrades') {
                                result = purchasePermanentUpgrade(key, purchaseCost, unlock.maxLevel);
                            } else {
                                result = purchaseUnlock(currentCategory, key, purchaseCost);
                            }
                            
                            // Handle result (permanent upgrades return object, regular unlocks return boolean)
                            if (currentCategory === 'permanentUpgrades') {
                                if (result && result.success) {
                                    // Play purchase success sound
                                    playPurchaseSuccess();

                                    // Purchase successful
                                    const successMsg = k.add([
                                        k.text('Purchased!', { size: 20 }),
                                        k.pos(k.width() / 2, k.height() / 2),
                                        k.anchor('center'),
                                        k.color(100, 255, 100),
                                        k.fixed(),
                                        k.z(2000)
                                    ]);

                                    k.wait(0.5, () => {
                                        if (successMsg.exists()) k.destroy(successMsg);
                                    });

                                    // Refresh shop
                                    refreshShop();
                                    // Update currency display
                                    creditIndicator.updateCurrency(getCurrency());
                                } else if (result && result.reason === 'insufficientCurrency') {
                                    // Play purchase error sound
                                    playPurchaseError();

                                    // Not enough currency
                                    const errorMsg = k.add([
                                        k.text(`Not enough ${currencyName}!`, { size: 20 }),
                                        k.pos(k.width() / 2, k.height() / 2),
                                        k.anchor('center'),
                                        k.color(255, 100, 100),
                                        k.fixed(),
                                        k.z(2000)
                                    ]);

                                    k.wait(0.5, () => {
                                        if (errorMsg.exists()) k.destroy(errorMsg);
                                    });
                                }
                            } else {
                                // Regular unlock (returns boolean)
                                if (result) {
                                    // Play purchase success sound
                                    playPurchaseSuccess();

                                    // Purchase successful
                                    const successMsg = k.add([
                                        k.text('Purchased!', { size: 20 }),
                                        k.pos(k.width() / 2, k.height() / 2),
                                        k.anchor('center'),
                                        k.color(100, 255, 100),
                                        k.fixed(),
                                        k.z(2000)
                                    ]);

                                    k.wait(0.5, () => {
                                        if (successMsg.exists()) k.destroy(successMsg);
                                    });

                                    // Refresh shop
                                    refreshShop();
                                    // Update currency display
                                    creditIndicator.updateCurrency(getCurrency());
                                } else {
                                    // Play purchase error sound
                                    playPurchaseError();

                                    // Not enough currency
                                    const errorMsg = k.add([
                                        k.text(`Not enough ${currencyName}!`, { size: 20 }),
                                        k.pos(k.width() / 2, k.height() / 2),
                                        k.anchor('center'),
                                        k.color(255, 100, 100),
                                        k.fixed(),
                                        k.z(2000)
                                    ]);
                                    
                                    k.wait(0.5, () => {
                                        if (errorMsg.exists()) k.destroy(errorMsg);
                                    });
                                }
                            }
                        });
                    }
                    
                    unlockItems.push(buttonBg, buttonText);
                }
                
                // Push all items (only push statusLabel if it exists)
                unlockItems.push(cardBg, nameText, descText);
                if (statusLabel) {
                    unlockItems.push(statusLabel);
                }
            });
        }
        
        // Initial refresh
        refreshShop();
        
        // Back button (standardized, centered like other menus)
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
        
        k.onKeyPress('escape', () => {
            k.go('menu');
        });
    });
}

