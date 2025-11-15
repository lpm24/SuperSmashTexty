// Statistics and Achievements scene
import { getSaveStats, getUnlockedAchievements, getCurrencyName } from '../systems/metaProgression.js';
import { ACHIEVEMENTS, getAchievementCategories, getAchievementsByCategory } from '../data/achievements.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    formatButtonText
} from '../config/uiConfig.js';

export function setupStatisticsScene(k) {
    k.scene('statistics', () => {
        const stats = getSaveStats();
        const unlockedAchievements = getUnlockedAchievements();
        const currencyName = getCurrencyName();
        let currentTab = 'stats'; // stats or achievements
        
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
            k.text(formatButtonText('Statistics & Achievements'), { size: UI_TEXT_SIZES.TITLE }),
            k.pos(k.width() / 2, 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        
        // Tab buttons (centered like Settings menu)
        const tabY = 90;
        const tabSpacing = 120; // Same spacing as Settings menu
        const tabWidth = 150;
        const tabHeight = 30;
        
        const tabs = [
            { key: 'stats', label: 'Statistics' },
            { key: 'achievements', label: 'Achievements' }
        ];
        
        // Calculate centered positions for tabs (same as Settings menu)
        const totalTabWidth = (tabs.length - 1) * tabSpacing;
        const firstTabX = k.width() / 2 - totalTabWidth / 2;
        
        const tabButtons = [];
        tabs.forEach((tab, index) => {
            const tabX = firstTabX + index * tabSpacing;
            const isActive = currentTab === tab.key;
            
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
                k.text(tab.label, { size: UI_TEXT_SIZES.BODY }),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(...(isActive ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_TERTIARY)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            
            tabBg.onClick(() => {
                currentTab = tab.key;
                scrollOffset = 0; // Reset scroll when switching tabs
                refreshContent();
            });
            
            tabButtons.push({ bg: tabBg, label: tabLabel, key: tab.key });
        });
        
        // Content area
        const contentY = 140;
        const progressAreaHeight = 40; // Space for progress text
        const backButtonArea = 60; // Space for back button
        const bottomButtonArea = progressAreaHeight + backButtonArea; // Total reserved space
        const viewportTop = contentY;
        const viewportBottom = k.height() - bottomButtonArea; // Scrollable area stops before progress text
        let contentItems = [];
        let scrollOffset = 0; // For achievements scrolling
        const scrollSpeed = 50; // Pixels per scroll step
        
        // Refresh content display
        function refreshContent() {
            // Update tab visuals
            tabButtons.forEach(tab => {
                const isActive = currentTab === tab.key;
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
            contentItems.forEach(item => {
                if (item.exists()) k.destroy(item);
            });
            contentItems = [];
            
            if (currentTab === 'stats') {
                // Display statistics
                const statsY = contentY + 20;
                const statsSpacing = 30;
                
                const statLabels = [
                    { label: 'Total Runs', value: stats.totalRuns || 0 },
                    { label: 'Best Floor', value: stats.bestFloor || 1 },
                    { label: 'Best Room', value: stats.bestRoom || 1 },
                    { label: 'Best Level', value: stats.bestLevel || 1 },
                    { label: 'Total Enemies Killed', value: stats.totalEnemiesKilled || 0 },
                    { label: 'Total Bosses Killed', value: stats.totalBossesKilled || 0 },
                    { label: 'Total Rooms Cleared', value: stats.totalRoomsCleared || 0 },
                    { label: 'Total Floors Reached', value: stats.totalFloorsReached || 0 },
                    { label: `Total ${currencyName} Earned`, value: stats.totalCurrencyEarned || 0 }
                ];
                
                statLabels.forEach((stat, index) => {
                    const y = statsY + index * statsSpacing;
                    
                    // Label
                    const labelText = k.add([
                        k.text(stat.label + ':', { size: 18 }),
                        k.pos(200, y),
                        k.anchor('left'),
                        k.color(200, 200, 200),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    
                    // Value
                    const valueText = k.add([
                        k.text(stat.value.toString(), { size: 18 }),
                        k.pos(500, y),
                        k.anchor('left'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    
                    contentItems.push(labelText, valueText);
                });
                
            } else if (currentTab === 'achievements') {
                // Display achievements by category with scrolling
                const categories = getAchievementCategories();
                let currentY = contentY + 20 - scrollOffset;
                
                // Calculate total content height to determine if scrolling is needed
                let totalContentHeight = 0;
                categories.forEach(category => {
                    totalContentHeight += 35; // Category header
                    const categoryAchievements = getAchievementsByCategory(category);
                    totalContentHeight += categoryAchievements.length * 50; // Achievement cards
                    totalContentHeight += 20; // Spacing after category
                });
                
                // Clamp scroll offset
                const availableHeight = viewportBottom - viewportTop;
                const maxScroll = Math.max(0, totalContentHeight - availableHeight);
                scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
                currentY = contentY + 20 - scrollOffset;
                
                categories.forEach(category => {
                    // Category header (only render if visible)
                    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                    const headerY = currentY;
                    
                    if (headerY >= viewportTop - 35 && headerY <= viewportBottom) {
                        const headerText = k.add([
                            k.text(categoryName, { size: 20 }),
                            k.pos(k.width() / 2, headerY),
                            k.anchor('center'),
                            k.color(255, 200, 100),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(headerText);
                    }
                    currentY += 35;
                    
                    // Achievements in this category
                    const categoryAchievements = getAchievementsByCategory(category);
                    categoryAchievements.forEach((achievement, index) => {
                        const isUnlocked = unlockedAchievements.includes(achievement.id);
                        const y = currentY + index * 50;
                        
                        // Only render if visible (within viewport, accounting for card height)
                        const cardTop = y - 22.5; // Half of card height (45/2)
                        const cardBottom = y + 22.5;
                        
                        if (cardBottom >= viewportTop && cardTop <= viewportBottom) {
                            // Achievement card
                            const cardBg = k.add([
                                k.rect(700, 45),
                                k.pos(k.width() / 2, y),
                                k.anchor('center'),
                                k.color(isUnlocked ? 40 : 30, isUnlocked ? 40 : 30, isUnlocked ? 50 : 30),
                                k.outline(2, k.rgb(isUnlocked ? 100 : 50, isUnlocked ? 100 : 50, isUnlocked ? 150 : 50)),
                                k.fixed(),
                                k.z(1000)
                            ]);
                            
                            // Icon
                            const iconText = k.add([
                                k.text(achievement.icon, { size: 24 }),
                                k.pos(50, y),
                                k.anchor('left'),
                                k.color(isUnlocked ? 255 : 100, isUnlocked ? 255 : 100, isUnlocked ? 255 : 100),
                                k.fixed(),
                                k.z(1001)
                            ]);
                            
                            // Name
                            const nameText = k.add([
                                k.text(achievement.name, { size: 18 }),
                                k.pos(100, y - 10),
                                k.anchor('left'),
                                k.color(isUnlocked ? 255 : 150, isUnlocked ? 255 : 150, isUnlocked ? 255 : 150),
                                k.fixed(),
                                k.z(1001)
                            ]);
                            
                            // Description
                            const descText = k.add([
                                k.text(achievement.description, { size: 14 }),
                                k.pos(100, y + 10),
                                k.anchor('left'),
                                k.color(isUnlocked ? 200 : 100, isUnlocked ? 200 : 100, isUnlocked ? 200 : 100),
                                k.fixed(),
                                k.z(1001)
                            ]);
                            
                            // Status
                            const statusText = k.add([
                                k.text(isUnlocked ? 'UNLOCKED' : 'LOCKED', { size: 14 }),
                                k.pos(650, y),
                                k.anchor('right'),
                                k.color(isUnlocked ? 100 : 150, isUnlocked ? 255 : 150, isUnlocked ? 100 : 150),
                                k.fixed(),
                                k.z(1001)
                            ]);
                            
                            contentItems.push(cardBg, iconText, nameText, descText, statusText);
                        }
                    });
                    
                    currentY += categoryAchievements.length * 50 + 20;
                });
                
                // Achievement progress (always visible at bottom, above back button, outside scrollable area)
                const totalAchievements = Object.keys(ACHIEVEMENTS).length;
                const unlockedCount = unlockedAchievements.length;
                const progressText = k.add([
                    k.text(`Progress: ${unlockedCount}/${totalAchievements} (${Math.round(unlockedCount / totalAchievements * 100)}%)`, { size: 16 }),
                    k.pos(k.width() / 2, k.height() - backButtonArea - progressAreaHeight / 2),
                    k.anchor('center'),
                    k.color(200, 200, 255),
                    k.fixed(),
                    k.z(1000)
                ]);
                contentItems.push(progressText);
            }
        }
        
        // Initial refresh
        refreshContent();
        
        // Scrolling for achievements tab using DOM wheel event
        const wheelHandler = (e) => {
            if (currentTab === 'achievements') {
                e.preventDefault();
                e.stopPropagation();
                const oldOffset = scrollOffset;
                scrollOffset += e.deltaY * 0.3; // Scale deltaY for smoother scrolling
                
                // Clamp scroll offset immediately
                const categories = getAchievementCategories();
                let totalContentHeight = 0;
                categories.forEach(category => {
                    totalContentHeight += 35;
                    const categoryAchievements = getAchievementsByCategory(category);
                    totalContentHeight += categoryAchievements.length * 50;
                    totalContentHeight += 20;
                });
                const availableHeight = viewportBottom - viewportTop;
                const maxScroll = Math.max(0, totalContentHeight - availableHeight);
                scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
                
                // Only refresh if scroll actually changed
                if (scrollOffset !== oldOffset) {
                    refreshContent();
                }
            }
        };
        
        // Add wheel event listener to the game container
        const gameContainer = document.querySelector('#game-container');
        if (gameContainer) {
            gameContainer.addEventListener('wheel', wheelHandler, { passive: false });
        }
        
        // Cleanup on scene end
        k.onDestroy(() => {
            if (gameContainer) {
                gameContainer.removeEventListener('wheel', wheelHandler);
            }
        });
        
        // Keyboard scrolling
        k.onKeyPress('arrowdown', () => {
            if (currentTab === 'achievements') {
                const oldOffset = scrollOffset;
                scrollOffset += scrollSpeed;
                
                // Clamp scroll offset
                const categories = getAchievementCategories();
                let totalContentHeight = 0;
                categories.forEach(category => {
                    totalContentHeight += 35;
                    const categoryAchievements = getAchievementsByCategory(category);
                    totalContentHeight += categoryAchievements.length * 50;
                    totalContentHeight += 20;
                });
                const availableHeight = viewportBottom - viewportTop;
                const maxScroll = Math.max(0, totalContentHeight - availableHeight);
                scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
                
                if (scrollOffset !== oldOffset) {
                    refreshContent();
                }
            }
        });
        
        k.onKeyPress('arrowup', () => {
            if (currentTab === 'achievements') {
                const oldOffset = scrollOffset;
                scrollOffset -= scrollSpeed;
                
                // Clamp scroll offset
                const categories = getAchievementCategories();
                let totalContentHeight = 0;
                categories.forEach(category => {
                    totalContentHeight += 35;
                    const categoryAchievements = getAchievementsByCategory(category);
                    totalContentHeight += categoryAchievements.length * 50;
                    totalContentHeight += 20;
                });
                const availableHeight = viewportBottom - viewportTop;
                const maxScroll = Math.max(0, totalContentHeight - availableHeight);
                scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
                
                if (scrollOffset !== oldOffset) {
                    refreshContent();
                }
            }
        });
        
        // Back button (centered like Settings menu)
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
        
        k.onKeyPress('escape', () => {
            k.go('menu');
        });
    });
}

