// Shop scene - allows players to purchase unlocks
import { getCurrency, getCurrencyName, isUnlocked, purchaseUnlock, purchasePermanentUpgrade, getPermanentUpgradeLevel, getTotalRefundableCredits, refundAllPermanentUpgrades, refundSinglePermanentUpgrade, isItemAchievementUnlockedSync, isAchievementUnlocked } from '../systems/metaProgression.js';
import { getUnlocksForCategory, getUnlockInfo, CHARACTER_UNLOCKS, WEAPON_UNLOCKS, PERMANENT_UPGRADE_UNLOCKS } from '../data/unlocks.js';
import { getAchievementById } from '../data/achievements.js';
import { showAchievementModal } from '../components/achievementModal.js';
import { playPurchaseSuccess, playPurchaseError, playMenuNav } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    formatButtonText,
    createCreditIndicator,
    createMenuParticles,
    createAnimatedTitle
} from '../config/uiConfig.js';

export function setupShopScene(k) {
    k.scene('shop', () => {
        // Prevent context menu on right-click
        const preventContextMenu = (e) => {
            e.preventDefault();
            return false;
        };
        document.addEventListener('contextmenu', preventContextMenu);
        
        // Cleanup on scene leave
        k.onSceneLeave(() => {
            document.removeEventListener('contextmenu', preventContextMenu);
        });
        
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

        // Background particle effects
        createMenuParticles(k, { patternCount: 10, particleCount: 15 });

        // Title (moved up to avoid collision with tabs)
        createAnimatedTitle(k, 'MERCH', k.width() / 2, 35, 8);

        // Currency display (standardized)
        const creditIndicator = createCreditIndicator(k, currency, currencyName);

        // Category tabs
        const tabY = 80;
        const tabSpacing = 120;
        const tabWidth = 100;
        const tabHeight = 30;
        
        const categories = [
            { key: 'permanentUpgrades', label: 'Upgrades' },
            { key: 'characters', label: 'Characters' },
            { key: 'weapons', label: 'Weapons' }
        ];
        
        // Calculate centered positions for tabs (same as Statistics and Settings menus)
        const totalTabWidth = (categories.length - 1) * tabSpacing;
        const firstTabX = k.width() / 2 - totalTabWidth / 2;
        
        const tabButtons = [];
        categories.forEach((cat, index) => {
            const tabX = firstTabX + index * tabSpacing;
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
                currentPage = 0; // Reset to first page when switching tabs
                refreshShop();
            });
            
            tabButtons.push({ bg: tabBg, label: tabLabel, category: cat.key });
        });
        
        // Content area
        const contentY = 130;
        const contentHeight = k.height() - contentY - 100; // Leave room for pagination
        let unlockItems = [];

        // Pagination state
        let currentPage = 0;
        const ITEMS_PER_PAGE = 6; // 2 columns x 3 rows
        let paginationItems = []; // Store pagination UI elements

        // Flag to prevent multiple simultaneous purchases
        let isPurchasing = false;
        
        // Refresh shop display
        function refreshShop() {
            // Update currency display
            const currentCurrency = getCurrency();
            creditIndicator.updateCurrency(currentCurrency);
            
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
            
            // Update refund button visibility
            updateRefundButton();
            
            // Clear existing items
            unlockItems.forEach(item => {
                if (item.exists()) k.destroy(item);
            });
            unlockItems = [];

            // Clear pagination items
            paginationItems.forEach(item => {
                if (item.exists()) k.destroy(item);
            });
            paginationItems = [];

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
            
            // Pagination calculations
            const totalPages = Math.ceil(displayUnlocks.length / ITEMS_PER_PAGE);
            // Clamp currentPage to valid range
            if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);

            // Get items for current page
            const startIndex = currentPage * ITEMS_PER_PAGE;
            const pageItems = displayUnlocks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            // Display unlocks
            const itemSpacing = 100;
            const startY = contentY + 10;
            const itemsPerColumn = 3;

            pageItems.forEach((key, index) => {
                const unlock = unlocks[key];
                const column = Math.floor(index / itemsPerColumn);
                const row = index % itemsPerColumn;
                const itemX = 50 + column * 350;
                const itemY = startY + row * itemSpacing;

                // Check achievement requirement
                const isAchievementLocked = !isItemAchievementUnlockedSync(unlock);
                const requiredAchievement = unlock.requiredAchievement ? getAchievementById(unlock.requiredAchievement) : null;

                // Item card background
                // For characters, use green border if unlocked
                const isUnlockedChar = currentCategory === 'characters' && isUnlocked('characters', key);
                let borderColor;
                if (isAchievementLocked) {
                    borderColor = k.rgb(60, 50, 50); // Dim red-gray for achievement-locked
                } else if (isUnlockedChar) {
                    borderColor = k.rgb(100, 255, 100);
                } else {
                    borderColor = k.rgb(80, 80, 100);
                }

                const cardBg = k.add([
                    k.rect(320, 90),
                    k.pos(itemX, itemY),
                    k.anchor('topleft'),
                    k.color(isAchievementLocked ? 30 : 40, isAchievementLocked ? 25 : 40, isAchievementLocked ? 25 : 50),
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
                        k.color(...(isAchievementLocked ? [50, 50, 50] : (isUnlockedChar && unlock.color ? unlock.color : [100, 100, 100]))),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    unlockItems.push(iconText);
                }

                // Lock icon for achievement-locked items
                // Using parentheses instead of square brackets to avoid KAPLAY styled text tag parsing
                if (isAchievementLocked) {
                    const lockIcon = k.add([
                        k.text('(X)', { size: 16 }),
                        k.pos(itemX + 300, itemY + 10),
                        k.anchor('topright'),
                        k.color(150, 100, 100),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    unlockItems.push(lockIcon);
                }

                // Item name (offset right if character icon is present)
                const nameX = (currentCategory === 'characters' && unlock.char) ? itemX + 70 : itemX + 10;
                const nameText = k.add([
                    k.text(unlock.name, { size: 18 }),
                    k.pos(nameX, itemY + 10),
                    k.anchor('topleft'),
                    k.color(isAchievementLocked ? 120 : 255, isAchievementLocked ? 120 : 255, isAchievementLocked ? 120 : 255),
                    k.fixed(),
                    k.z(1001)
                ]);

                // Item description (with width constraint to prevent overflow, offset if character icon present)
                const descX = (currentCategory === 'characters' && unlock.char) ? itemX + 70 : itemX + 10;
                const descWidth = (currentCategory === 'characters' && unlock.char) ? 180 : 200; // Reduced width to prevent button overlap
                const descText = k.add([
                    k.text(isAchievementLocked ? `Requires: ${requiredAchievement?.name || 'Unknown Achievement'}` : unlock.description, { size: 14, width: descWidth }),
                    k.pos(descX, itemY + 35),
                    k.anchor('topleft'),
                    k.color(isAchievementLocked ? 150 : 200, isAchievementLocked ? 100 : 200, isAchievementLocked ? 100 : 200),
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
                
                // Purchase button or View Achievement button
                if (isAchievementLocked) {
                    // Show "View" button for achievement-locked items
                    const viewButtonBg = k.add([
                        k.rect(80, 30),
                        k.pos(itemX + 230, itemY + 55),
                        k.anchor('topleft'),
                        k.color(60, 50, 80),
                        k.outline(2, k.rgb(100, 80, 150)),
                        k.area(),
                        k.fixed(),
                        k.z(1001)
                    ]);

                    const viewButtonText = k.add([
                        k.text('VIEW', { size: 14 }),
                        k.pos(itemX + 270, itemY + 70),
                        k.anchor('center'),
                        k.color(180, 150, 255),
                        k.fixed(),
                        k.z(1002)
                    ]);

                    viewButtonBg.onClick(() => {
                        playMenuNav();
                        if (requiredAchievement) {
                            showAchievementModal(k, requiredAchievement);
                        }
                    });

                    unlockItems.push(viewButtonBg, viewButtonText);
                } else if (canPurchase || (currentCategory === 'permanentUpgrades' && getPermanentUpgradeLevel(key) < (unlock.maxLevel || 1))) {
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
                    
                    // Add right-click handler for permanent upgrades (refund single level)
                    if (currentCategory === 'permanentUpgrades') {
                        const currentLevel = getPermanentUpgradeLevel(key);
                        if (currentLevel > 0) {
                            // Use global mouse release event to detect right-click
                            let rightClickHandler = null;
                            rightClickHandler = k.onMouseRelease('right', () => {
                                // Check if mouse is over the button
                                const mousePos = k.mousePos();
                                // Button position and size
                                const buttonX = itemX + 230;
                                const buttonY = itemY + 55;
                                const buttonWidth = 80;
                                const buttonHeight = 30;
                                
                                if (mousePos.x >= buttonX && mousePos.x <= buttonX + buttonWidth &&
                                    mousePos.y >= buttonY && mousePos.y <= buttonY + buttonHeight) {
                                    // Right-click on button: refund single level
                                    if (isPurchasing) return;
                                    isPurchasing = true;
                                    
                                    const result = refundSinglePermanentUpgrade(key);
                                    
                                    if (result && result.success) {
                                        // Play purchase success sound (reusing for refund)
                                        playPurchaseSuccess();
                                        
                                        // Refund successful
                                        const refundMsg = k.add([
                                            k.text(`Refunded $${result.refundAmount}!`, { size: 20 }),
                                            k.pos(k.width() / 2, k.height() / 2),
                                            k.anchor('center'),
                                            k.color(100, 200, 255),
                                            k.fixed(),
                                            k.z(2000)
                                        ]);
                                        
                                        k.wait(0.5, () => {
                                            if (refundMsg.exists()) k.destroy(refundMsg);
                                        });
                                        
                                        // Refresh shop and reset flag
                                        refreshShop();
                                        k.wait(0.2, () => {
                                            isPurchasing = false;
                                        });
                                    } else {
                                        // Reset flag on error
                                        isPurchasing = false;
                                    }
                                }
                            });
                            
                            // Cleanup handler when button is destroyed
                            buttonBg.onDestroy(() => {
                                if (rightClickHandler) {
                                    rightClickHandler.cancel();
                                }
                            });
                        }
                    }
                    
                    if (canPurchase) {
                        buttonBg.onClick(() => {
                            // Prevent multiple simultaneous purchases
                            if (isPurchasing) return;
                            isPurchasing = true;
                            
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

                                    // Refresh shop and reset purchasing flag with delay to prevent double-purchase
                                    refreshShop();
                                    k.wait(0.2, () => {
                                        isPurchasing = false;
                                    });
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
                                    
                                    // Reset purchasing flag
                                    isPurchasing = false;
                                } else {
                                    // Reset purchasing flag on any other error
                                    isPurchasing = false;
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

                                    // Refresh shop and reset purchasing flag with delay to prevent double-purchase
                                    refreshShop();
                                    k.wait(0.2, () => {
                                        isPurchasing = false;
                                    });
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
                                    
                                    // Reset purchasing flag
                                    isPurchasing = false;
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

            // Add pagination controls if more than one page
            if (totalPages > 1) {
                const paginationY = k.height() - 115;
                const paginationCenterX = k.width() / 2;

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
                        refreshShop();
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

                    // Allow clicking pips to jump to page
                    const pageIndex = i;
                    pip.onClick(() => {
                        if (pageIndex !== currentPage) {
                            playMenuNav();
                            currentPage = pageIndex;
                            refreshShop();
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
                        refreshShop();
                    });
                    rightArrow.cursor = 'pointer';
                }
                paginationItems.push(rightArrow);
            }
        }
        
        // Refund button (only shown on permanent upgrades tab)
        // Matches "Reset to Defaults" button formatting from Settings menu
        let refundButton = null;
        let refundText = null;
        
        function updateRefundButton() {
            const refundableAmount = getTotalRefundableCredits();
            const showRefund = currentCategory === 'permanentUpgrades' && refundableAmount > 0;
            
            if (showRefund) {
                if (!refundButton) {
                    refundButton = k.add([
                        k.rect(200, 30),
                        k.pos(k.width() / 2, k.height() - 80),
                        k.anchor('center'),
                        k.color(100, 50, 50),
                        k.outline(2, k.rgb(150, 100, 100)),
                        k.area(),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_ELEMENTS)
                    ]);
                    
                    refundText = k.add([
                        k.text(`REFUND: $${refundableAmount}`, { size: 14 }),
                        k.pos(k.width() / 2, k.height() - 80),
                        k.anchor('center'),
                        k.color(255, 200, 200),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    
                    refundButton.onClick(() => {
                        const result = refundAllPermanentUpgrades();
                        if (result.success) {
                            playPurchaseSuccess();
                            // Refresh shop to update display
                            refreshShop();
                        } else {
                            playPurchaseError();
                        }
                    });
                } else {
                    // Update refund amount in button text
                    refundText.text = `REFUND: $${refundableAmount}`;
                    refundButton.hidden = false;
                    refundText.hidden = false;
                }
            } else {
                if (refundButton) {
                    refundButton.hidden = true;
                    if (refundText) refundText.hidden = true;
                }
            }
        }
        
        // Initial refresh (after refund button function is defined)
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

