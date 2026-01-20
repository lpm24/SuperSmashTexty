// Shop scene - allows players to purchase unlocks
import { getCurrency, getCurrencyName, isUnlocked, purchaseUnlock, purchasePermanentUpgrade, getPermanentUpgradeLevel, getTotalRefundableCredits, refundAllPermanentUpgrades, refundSinglePermanentUpgrade, isItemAchievementUnlockedSync, isAchievementUnlocked, purchaseBooster, getActiveBoostersCount, getEquippedCosmetic, setEquippedCosmetic, getSaveStats } from '../systems/metaProgression.js';
import { getUnlocksForCategory, getUnlockInfo, CHARACTER_UNLOCKS, WEAPON_UNLOCKS, PERMANENT_UPGRADE_UNLOCKS, COSMETIC_UNLOCKS, RUN_BOOSTER_UNLOCKS } from '../data/unlocks.js';
import { getAchievementById, getAchievementProgress } from '../data/achievements.js';
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
        const tabSpacing = 95;
        const tabWidth = 85;
        const tabHeight = 30;

        const categories = [
            { key: 'permanentUpgrades', label: 'Upgrades' },
            { key: 'boosters', label: 'Boosters' },
            { key: 'cosmetics', label: 'Cosmetics' },
            { key: 'weapons', label: 'Weapons' },
            { key: 'characters', label: 'Chars' }
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

        // Flag to prevent double-handling of pagination clicks in same frame
        let paginationClickHandled = false;
        
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
                // Show all permanent upgrades and boosters
                if (currentCategory === 'permanentUpgrades') return true;
                if (currentCategory === 'boosters') return true; // Always show boosters (consumables)
                // For cosmetics, show all non-defaults
                if (currentCategory === 'cosmetics') return !unlock.unlockedByDefault;
                // For characters/weapons, only show non-default
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

            // Display unlocks - Redesigned card layout
            const cardWidth = 340;
            const cardHeight = 105;
            const itemSpacing = cardHeight + 8;
            const startY = contentY + 5;
            const itemsPerColumn = 3;

            // Benefit icon mapping - shows what type of bonus this gives
            const getBenefitIcon = (desc) => {
                if (!desc) return null;
                const d = desc.toLowerCase();
                if (d.includes('hp') || d.includes('health')) return { icon: '♥', color: [255, 100, 100] };
                if (d.includes('damage') || d.includes('dmg')) return { icon: '⚔', color: [255, 200, 100] };
                if (d.includes('speed')) return { icon: '»', color: [100, 200, 255] };
                if (d.includes('crit')) return { icon: '★', color: [255, 255, 100] };
                if (d.includes('xp') || d.includes('pickup')) return { icon: '◆', color: [100, 255, 200] };
                if (d.includes('defense') || d.includes('reduction')) return { icon: '◈', color: [150, 150, 255] };
                if (d.includes('credit') || d.includes('silver')) return { icon: '$', color: [200, 150, 50] };
                if (d.includes('level')) return { icon: '↑', color: [200, 100, 255] };
                if (d.includes('invuln') || d.includes('immunity')) return { icon: '◎', color: [100, 255, 255] };
                if (d.includes('trail') || d.includes('glow') || d.includes('effect')) return { icon: '✧', color: [200, 150, 255] };
                return null;
            };

            pageItems.forEach((key, index) => {
                const unlock = unlocks[key];
                const column = Math.floor(index / itemsPerColumn);
                const row = index % itemsPerColumn;
                const itemX = 45 + column * (cardWidth + 15);
                const itemY = startY + row * itemSpacing;

                // Check achievement requirement
                const isAchievementLocked = !isItemAchievementUnlockedSync(unlock);
                const requiredAchievement = unlock.requiredAchievement ? getAchievementById(unlock.requiredAchievement) : null;

                // Determine item status for styling
                const isUnlockedChar = currentCategory === 'characters' && isUnlocked('characters', key);
                const isUnlockedWeapon = currentCategory === 'weapons' && isUnlocked('weapons', key);
                const isMaxedUpgrade = currentCategory === 'permanentUpgrades' && getPermanentUpgradeLevel(key) >= (unlock.maxLevel || 1);
                // Cosmetics are "owned" if: default, purchased, OR achievement requirement is met
                const isCosmeticAchievementUnlocked = currentCategory === 'cosmetics' && unlock.requiredAchievement && !isAchievementLocked;
                const isOwnedCosmetic = currentCategory === 'cosmetics' && (isUnlocked('cosmetics', key) || unlock.unlockedByDefault || isCosmeticAchievementUnlocked);
                const isEquippedCosmetic = currentCategory === 'cosmetics' && getEquippedCosmetic(unlock.category) === key;

                // Card border color based on status
                let borderColor, bgColor;
                if (isAchievementLocked) {
                    borderColor = k.rgb(60, 50, 50);
                    bgColor = [30, 25, 25];
                } else if (isEquippedCosmetic) {
                    borderColor = k.rgb(100, 200, 255);
                    bgColor = [35, 45, 55];
                } else if (isMaxedUpgrade || isUnlockedChar || isUnlockedWeapon || isOwnedCosmetic) {
                    borderColor = k.rgb(80, 150, 80);
                    bgColor = [35, 45, 35];
                } else {
                    borderColor = k.rgb(80, 80, 120);
                    bgColor = [35, 35, 45];
                }

                // Card background
                const cardBg = k.add([
                    k.rect(cardWidth, cardHeight),
                    k.pos(itemX, itemY),
                    k.anchor('topleft'),
                    k.color(...bgColor),
                    k.outline(2, borderColor),
                    k.area(),
                    k.fixed(),
                    k.z(1000)
                ]);

                // === TOP ROW: Icon + Name + Benefit indicator ===
                let contentStartX = itemX + 10;

                // Character/Weapon icon (if applicable)
                if ((currentCategory === 'characters' || currentCategory === 'weapons') && unlock.char) {
                    const iconBg = k.add([
                        k.rect(40, 40),
                        k.pos(itemX + 8, itemY + 8),
                        k.anchor('topleft'),
                        k.color(25, 25, 35),
                        k.outline(1, k.rgb(60, 60, 80)),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    const iconText = k.add([
                        k.text(unlock.char, { size: 28 }),
                        k.pos(itemX + 28, itemY + 28),
                        k.anchor('center'),
                        k.color(...(isAchievementLocked ? [60, 60, 60] : (unlock.color || [200, 200, 200]))),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    unlockItems.push(iconBg, iconText);
                    contentStartX = itemX + 55;
                }

                // Cosmetic icon
                if (currentCategory === 'cosmetics') {
                    const cosmeticIcon = unlock.category === 'trail' ? '~' : unlock.category === 'death' ? '✕' : '○';
                    // Get a safe color array (handles 'rainbow' string and missing colors)
                    const baseColor = Array.isArray(unlock.color) ? unlock.color : [150, 150, 200];
                    // Dim the color when achievement-locked
                    const cosmeticColor = isAchievementLocked ? [60, 60, 70] : baseColor;
                    const borderColor = isAchievementLocked ? [50, 50, 60] : baseColor;
                    const iconBg = k.add([
                        k.rect(36, 36),
                        k.pos(itemX + 8, itemY + 8),
                        k.anchor('topleft'),
                        k.color(25, 25, 35),
                        k.outline(1, k.rgb(...borderColor)),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    const iconText = k.add([
                        k.text(cosmeticIcon, { size: 22 }),
                        k.pos(itemX + 26, itemY + 26),
                        k.anchor('center'),
                        k.color(...cosmeticColor),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    unlockItems.push(iconBg, iconText);
                    contentStartX = itemX + 50;
                }

                // Item name
                const nameText = k.add([
                    k.text(unlock.name, { size: 16 }),
                    k.pos(contentStartX, itemY + 10),
                    k.anchor('topleft'),
                    k.color(isAchievementLocked ? 100 : 255, isAchievementLocked ? 100 : 255, isAchievementLocked ? 100 : 255),
                    k.fixed(),
                    k.z(1001)
                ]);

                // Benefit icon (top right, shows what type of bonus)
                const benefit = getBenefitIcon(unlock.description);
                if (benefit && !isAchievementLocked) {
                    const benefitIcon = k.add([
                        k.text(benefit.icon, { size: 18 }),
                        k.pos(itemX + cardWidth - 12, itemY + 12),
                        k.anchor('topright'),
                        k.color(...benefit.color),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    unlockItems.push(benefitIcon);
                }

                // Lock icon for achievement-locked items
                if (isAchievementLocked) {
                    const lockIcon = k.add([
                        k.text('(X)', { size: 14 }),
                        k.pos(itemX + cardWidth - 10, itemY + 10),
                        k.anchor('topright'),
                        k.color(150, 80, 80),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    unlockItems.push(lockIcon);
                }

                // === MIDDLE ROW: Description (constrained to 2 lines max) ===
                const descWidth = cardWidth - contentStartX + itemX - 90; // Leave room for button
                const descY = itemY + 30;

                // Build description text with achievement progress for locked items
                let descriptionText = unlock.description;
                let achievementProgress = null;
                if (isAchievementLocked && requiredAchievement) {
                    const stats = getSaveStats();
                    achievementProgress = getAchievementProgress(requiredAchievement.id, stats);
                    if (achievementProgress) {
                        descriptionText = `${requiredAchievement.name} (${achievementProgress.current}/${achievementProgress.target})`;
                    } else {
                        descriptionText = `Requires: ${requiredAchievement.name}`;
                    }
                }

                const descText = k.add([
                    k.text(descriptionText, { size: 12, width: descWidth }),
                    k.pos(contentStartX, descY),
                    k.anchor('topleft'),
                    k.color(isAchievementLocked ? 140 : 180, isAchievementLocked ? 110 : 180, isAchievementLocked ? 110 : 180),
                    k.fixed(),
                    k.z(1001)
                ]);

                // Show mini progress bar for achievement-locked items with trackable progress
                if (isAchievementLocked && achievementProgress && achievementProgress.target > 1) {
                    const miniBarWidth = Math.min(descWidth, 120);
                    const miniBarHeight = 4;
                    const miniBarX = contentStartX;
                    const miniBarY = descY + 18;

                    // Background bar
                    const miniBarBg = k.add([
                        k.rect(miniBarWidth, miniBarHeight),
                        k.pos(miniBarX, miniBarY),
                        k.anchor('topleft'),
                        k.color(40, 35, 45),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    unlockItems.push(miniBarBg);

                    // Filled portion
                    const fillWidth = Math.max(0, achievementProgress.progress * miniBarWidth);
                    if (fillWidth > 0) {
                        const miniBarFill = k.add([
                            k.rect(fillWidth, miniBarHeight),
                            k.pos(miniBarX, miniBarY),
                            k.anchor('topleft'),
                            k.color(100, 80, 130),
                            k.fixed(),
                            k.z(1002)
                        ]);
                        unlockItems.push(miniBarFill);
                    }
                }
                
                // === BOTTOM ROW: Status/Progress + Action Button ===
                const bottomY = itemY + cardHeight - 28;
                const buttonX = itemX + cardWidth - 85;
                const buttonWidth = 75;
                const buttonHeight = 24;

                // Calculate escalating price for permanent upgrades
                function getUpgradePrice(level) {
                    const prices = [50, 65, 90, 115, 160];
                    if (level < prices.length) return prices[level];
                    return 160 + (level - 4) * 50;
                }

                // Determine status and purchase state
                let statusText = '';
                let canPurchase = false;
                let purchaseCost = unlock.cost;
                let showProgressBar = false;
                let progressLevel = 0;
                let progressMax = 1;

                if (currentCategory === 'permanentUpgrades') {
                    const level = getPermanentUpgradeLevel(key);
                    const maxLevel = unlock.maxLevel || 1;
                    progressLevel = level;
                    progressMax = maxLevel;
                    showProgressBar = true;

                    if (level >= maxLevel) {
                        statusText = 'MAXED';
                    } else {
                        purchaseCost = getUpgradePrice(level);
                        canPurchase = currency >= purchaseCost;
                    }
                } else if (currentCategory === 'boosters') {
                    const boosterCount = getActiveBoostersCount(key);
                    statusText = boosterCount > 0 ? `Ready (${boosterCount})` : 'Consumable';
                    canPurchase = currency >= purchaseCost;
                } else if (currentCategory === 'cosmetics') {
                    const cosmeticType = unlock.category;
                    if (isEquippedCosmetic) {
                        statusText = 'EQUIPPED';
                    } else if (isOwnedCosmetic) {
                        // Differentiate between achievement-unlocked and purchased
                        statusText = isCosmeticAchievementUnlocked ? 'UNLOCKED' : 'OWNED';
                    } else if (!isAchievementLocked) {
                        // Only show purchase option if not achievement-locked
                        canPurchase = currency >= purchaseCost;
                    }
                    // If achievement-locked, no status text needed (VIEW button handles it)
                } else if (currentCategory === 'characters') {
                    if (!isUnlockedChar) {
                        canPurchase = currency >= purchaseCost;
                    }
                } else if (currentCategory === 'weapons') {
                    if (!isUnlockedWeapon) {
                        canPurchase = currency >= purchaseCost;
                    }
                }

                // Progress bar for permanent upgrades
                if (showProgressBar) {
                    const barWidth = 100;
                    const barHeight = 8;
                    const barX = contentStartX;
                    const barY = bottomY + 8;

                    // Background bar
                    const barBg = k.add([
                        k.rect(barWidth, barHeight),
                        k.pos(barX, barY),
                        k.anchor('topleft'),
                        k.color(30, 30, 40),
                        k.outline(1, k.rgb(60, 60, 80)),
                        k.fixed(),
                        k.z(1001)
                    ]);

                    // Filled portion
                    const fillWidth = Math.max(0, (progressLevel / progressMax) * (barWidth - 2));
                    if (fillWidth > 0) {
                        const barFill = k.add([
                            k.rect(fillWidth, barHeight - 2),
                            k.pos(barX + 1, barY + 1),
                            k.anchor('topleft'),
                            k.color(progressLevel >= progressMax ? 100 : 80, progressLevel >= progressMax ? 200 : 150, progressLevel >= progressMax ? 100 : 80),
                            k.fixed(),
                            k.z(1002)
                        ]);
                        unlockItems.push(barFill);
                    }

                    // Level text
                    const levelText = k.add([
                        k.text(`${progressLevel}/${progressMax}`, { size: 10 }),
                        k.pos(barX + barWidth + 8, barY + 4),
                        k.anchor('left'),
                        k.color(progressLevel >= progressMax ? 100 : 150, progressLevel >= progressMax ? 255 : 200, progressLevel >= progressMax ? 100 : 150),
                        k.fixed(),
                        k.z(1001)
                    ]);

                    unlockItems.push(barBg, levelText);
                }

                // Status text (for non-progress items)
                let statusLabel = null;
                if (statusText && !showProgressBar) {
                    // Color based on status type
                    let statusColor;
                    switch (statusText) {
                        case 'EQUIPPED':
                            statusColor = [100, 200, 255]; // Cyan for equipped
                            break;
                        case 'UNLOCKED':
                            statusColor = [180, 140, 255]; // Purple for achievement-unlocked
                            break;
                        case 'MAXED':
                        case 'OWNED':
                            statusColor = [100, 200, 100]; // Green for owned/maxed
                            break;
                        default:
                            statusColor = [180, 180, 180]; // Gray default
                    }
                    statusLabel = k.add([
                        k.text(statusText, { size: 11 }),
                        k.pos(contentStartX, bottomY + 7),
                        k.anchor('topleft'),
                        k.color(...statusColor),
                        k.fixed(),
                        k.z(1001)
                    ]);
                }
                
                // Purchase button or View Achievement button
                if (isAchievementLocked && requiredAchievement) {
                    // Show "View" button for achievement-locked items
                    const viewButtonBg = k.add([
                        k.rect(buttonWidth, buttonHeight),
                        k.pos(buttonX, bottomY),
                        k.anchor('topleft'),
                        k.color(50, 40, 60),
                        k.outline(1, k.rgb(100, 80, 130)),
                        k.area({ width: buttonWidth, height: buttonHeight }),
                        k.fixed(),
                        k.z(1010)
                    ]);

                    const viewButtonText = k.add([
                        k.text('VIEW', { size: 11 }),
                        k.pos(buttonX + buttonWidth / 2, bottomY + buttonHeight / 2),
                        k.anchor('center'),
                        k.color(160, 130, 200),
                        k.fixed(),
                        k.z(1011)
                    ]);

                    // Hover effects for better feedback
                    viewButtonBg.onHover(() => {
                        viewButtonBg.color = k.rgb(70, 55, 85);
                        viewButtonBg.outline.color = k.rgb(140, 110, 180);
                        viewButtonText.color = k.rgb(200, 170, 255);
                    });
                    viewButtonBg.onHoverEnd(() => {
                        viewButtonBg.color = k.rgb(50, 40, 60);
                        viewButtonBg.outline.color = k.rgb(100, 80, 130);
                        viewButtonText.color = k.rgb(160, 130, 200);
                    });

                    // Store achievement reference for closure
                    const achievementToShow = requiredAchievement;
                    viewButtonBg.onClick(() => {
                        playMenuNav();
                        showAchievementModal(k, achievementToShow);
                    });
                    viewButtonBg.cursor = 'pointer';

                    unlockItems.push(viewButtonBg, viewButtonText);
                } else if (isAchievementLocked) {
                    // Achievement locked but no specific achievement found - show locked status
                    const lockedText = k.add([
                        k.text('LOCKED', { size: 11 }),
                        k.pos(buttonX + buttonWidth / 2, bottomY + buttonHeight / 2),
                        k.anchor('center'),
                        k.color(100, 80, 80),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    unlockItems.push(lockedText);
                } else if (canPurchase || (currentCategory === 'permanentUpgrades' && progressLevel < progressMax)) {
                    const buttonBg = k.add([
                        k.rect(buttonWidth, buttonHeight),
                        k.pos(buttonX, bottomY),
                        k.anchor('topleft'),
                        k.color(canPurchase ? 40 : 30, canPurchase ? 120 : 40, canPurchase ? 40 : 30),
                        k.outline(1, k.rgb(canPurchase ? 80 : 50, canPurchase ? 180 : 60, canPurchase ? 80 : 50)),
                        k.area(),
                        k.fixed(),
                        k.z(1001)
                    ]);

                    const buttonText = k.add([
                        k.text(`$${purchaseCost}`, { size: 12 }),
                        k.pos(buttonX + buttonWidth / 2, bottomY + buttonHeight / 2),
                        k.anchor('center'),
                        k.color(canPurchase ? 255 : 120, canPurchase ? 255 : 120, canPurchase ? 255 : 120),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    
                    // Add right-click handler for permanent upgrades (refund single level)
                    if (currentCategory === 'permanentUpgrades') {
                        if (progressLevel > 0) {
                            // Use global mouse release event to detect right-click
                            let rightClickHandler = null;
                            rightClickHandler = k.onMouseRelease('right', () => {
                                // Check if mouse is over the button
                                const mousePos = k.mousePos();

                                if (mousePos.x >= buttonX && mousePos.x <= buttonX + buttonWidth &&
                                    mousePos.y >= bottomY && mousePos.y <= bottomY + buttonHeight) {
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
                            } else if (currentCategory === 'boosters') {
                                result = purchaseBooster(key, purchaseCost);
                            } else {
                                result = purchaseUnlock(currentCategory, key, purchaseCost);
                            }
                            
                            // Handle result (permanent upgrades and boosters return object, regular unlocks return boolean)
                            if (currentCategory === 'permanentUpgrades' || currentCategory === 'boosters') {
                                if (result && result.success) {
                                    // Play purchase success sound
                                    playPurchaseSuccess();

                                    // Purchase successful - different message for boosters
                                    const msgText = currentCategory === 'boosters' ? 'Booster Ready!' : 'Purchased!';
                                    const successMsg = k.add([
                                        k.text(msgText, { size: 20 }),
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
                } else if (currentCategory === 'cosmetics' && isOwnedCosmetic && !isEquippedCosmetic) {
                    // Show EQUIP button for owned but not equipped cosmetics
                    const equipButtonBg = k.add([
                        k.rect(buttonWidth, buttonHeight),
                        k.pos(buttonX, bottomY),
                        k.anchor('topleft'),
                        k.color(40, 80, 120),
                        k.outline(1, k.rgb(80, 140, 200)),
                        k.area(),
                        k.fixed(),
                        k.z(1001)
                    ]);

                    const equipButtonText = k.add([
                        k.text('EQUIP', { size: 11 }),
                        k.pos(buttonX + buttonWidth / 2, bottomY + buttonHeight / 2),
                        k.anchor('center'),
                        k.color(200, 230, 255),
                        k.fixed(),
                        k.z(1002)
                    ]);

                    // Hover effects
                    equipButtonBg.onHover(() => {
                        equipButtonBg.color = k.rgb(50, 100, 150);
                        equipButtonBg.outline.color = k.rgb(100, 170, 240);
                        equipButtonText.color = k.rgb(230, 245, 255);
                    });
                    equipButtonBg.onHoverEnd(() => {
                        equipButtonBg.color = k.rgb(40, 80, 120);
                        equipButtonBg.outline.color = k.rgb(80, 140, 200);
                        equipButtonText.color = k.rgb(200, 230, 255);
                    });

                    equipButtonBg.onClick(() => {
                        if (isPurchasing) return;
                        isPurchasing = true;
                        playMenuNav();
                        setEquippedCosmetic(unlock.category, key);
                        isPurchasing = false;
                        refreshShop();
                    });
                    equipButtonBg.cursor = 'pointer';

                    unlockItems.push(equipButtonBg, equipButtonText);
                } else if (currentCategory === 'cosmetics' && isEquippedCosmetic && !key.includes('None')) {
                    // Show UNEQUIP button for equipped cosmetics (except default "None" cosmetics)
                    const unequipButtonBg = k.add([
                        k.rect(buttonWidth, buttonHeight),
                        k.pos(buttonX, bottomY),
                        k.anchor('topleft'),
                        k.color(80, 50, 50),
                        k.outline(1, k.rgb(160, 100, 100)),
                        k.area(),
                        k.fixed(),
                        k.z(1001)
                    ]);

                    const unequipButtonText = k.add([
                        k.text('UNEQUIP', { size: 11 }),
                        k.pos(buttonX + buttonWidth / 2, bottomY + buttonHeight / 2),
                        k.anchor('center'),
                        k.color(255, 180, 180),
                        k.fixed(),
                        k.z(1002)
                    ]);

                    // Hover effects
                    unequipButtonBg.onHover(() => {
                        unequipButtonBg.color = k.rgb(100, 60, 60);
                        unequipButtonBg.outline.color = k.rgb(200, 120, 120);
                        unequipButtonText.color = k.rgb(255, 210, 210);
                    });
                    unequipButtonBg.onHoverEnd(() => {
                        unequipButtonBg.color = k.rgb(80, 50, 50);
                        unequipButtonBg.outline.color = k.rgb(160, 100, 100);
                        unequipButtonText.color = k.rgb(255, 180, 180);
                    });

                    unequipButtonBg.onClick(() => {
                        if (isPurchasing) return;
                        isPurchasing = true;
                        playMenuNav();
                        // Reset to default "None" cosmetic for this category
                        const noneKey = unlock.category + 'None';
                        setEquippedCosmetic(unlock.category, noneKey);
                        isPurchasing = false;
                        refreshShop();
                    });
                    unequipButtonBg.cursor = 'pointer';

                    unlockItems.push(unequipButtonBg, unequipButtonText);
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

                // Page indicator pips
                const pipSpacing = 20;
                const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;
                const pipsEndX = paginationCenterX + ((totalPages - 1) * pipSpacing) / 2;

                // Arrows positioned well outside the pips to prevent overlap
                const arrowOffset = 35;
                const leftArrowX = pipsStartX - arrowOffset;
                const rightArrowX = pipsEndX + arrowOffset;

                // Left arrow FIRST (so it registers clicks before pips)
                const leftArrowBg = k.add([
                    k.rect(30, 30),
                    k.pos(leftArrowX, paginationY),
                    k.anchor('center'),
                    k.color(0, 0, 0),
                    k.opacity(0),
                    k.area({ width: 30, height: 30 }),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS + 10)
                ]);

                const leftArrowText = k.add([
                    k.text('<', { size: 24 }),
                    k.pos(leftArrowX, paginationY),
                    k.anchor('center'),
                    k.color(currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT + 10)
                ]);

                if (currentPage > 0) {
                    leftArrowBg.onClick(() => {
                        if (paginationClickHandled) return;
                        paginationClickHandled = true;
                        k.wait(0, () => { paginationClickHandled = false; });
                        playMenuNav();
                        currentPage--;
                        refreshShop();
                    });
                    leftArrowBg.cursor = 'pointer';
                }
                paginationItems.push(leftArrowBg, leftArrowText);

                // Right arrow SECOND (so it registers clicks before pips)
                const rightArrowBg = k.add([
                    k.rect(30, 30),
                    k.pos(rightArrowX, paginationY),
                    k.anchor('center'),
                    k.color(0, 0, 0),
                    k.opacity(0),
                    k.area({ width: 30, height: 30 }),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS + 10)
                ]);

                const rightArrowText = k.add([
                    k.text('>', { size: 24 }),
                    k.pos(rightArrowX, paginationY),
                    k.anchor('center'),
                    k.color(currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT + 10)
                ]);

                if (currentPage < totalPages - 1) {
                    rightArrowBg.onClick(() => {
                        if (paginationClickHandled) return;
                        paginationClickHandled = true;
                        k.wait(0, () => { paginationClickHandled = false; });
                        playMenuNav();
                        currentPage++;
                        refreshShop();
                    });
                    rightArrowBg.cursor = 'pointer';
                }
                paginationItems.push(rightArrowBg, rightArrowText);

                // Page indicator pips LAST (lower z-index, won't interfere with arrows)
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
                        if (paginationClickHandled) return;
                        paginationClickHandled = true;
                        k.wait(0, () => { paginationClickHandled = false; });
                        if (pageIndex !== currentPage) {
                            playMenuNav();
                            currentPage = pageIndex;
                            refreshShop();
                        }
                    });
                    pipBg.cursor = 'pointer';

                    paginationItems.push(pipBg, pipText);
                }
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

