// Statistics and Achievements scene
import { getSaveStats, getUnlockedAchievements, getCurrencyName } from '../systems/metaProgression.js';
import { ACHIEVEMENTS, getAchievementCategories, getAchievementsByCategory } from '../data/achievements.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    formatButtonText,
    createMenuParticles,
    createAnimatedTitle
} from '../config/uiConfig.js';

// Helper function to convert HSL to RGB for rainbow gradient
function hslToRgb(h, s, l) {
    // Clamp inputs to valid ranges
    h = Math.max(0, Math.min(1, h));
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    // Ensure RGB values are valid integers
    return [
        Math.max(0, Math.min(255, Math.round(r * 255))),
        Math.max(0, Math.min(255, Math.round(g * 255))),
        Math.max(0, Math.min(255, Math.round(b * 255)))
    ];
}

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

        // Background particle effects
        createMenuParticles(k, { patternCount: 10, particleCount: 15 });

        // Title
        createAnimatedTitle(k, 'RATINGS AND RECORDS', k.width() / 2, 60, 8);
        
        // Tab buttons (centered like Settings menu)
        const tabY = 90;
        const tabSpacing = 160; // Increased spacing to add padding between buttons
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
        const viewportBottom = k.height() - bottomButtonArea; // Content area stops before progress text
        let contentItems = [];
        
        // Refresh content display
        function refreshContent() {
            // Verify k is available
            if (!k || typeof k.add !== 'function') {
                console.error('k is not available or k.add is not a function');
                return;
            }
            
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
                if (item && typeof item.exists === 'function' && item.exists()) {
                    try {
                        k.destroy(item);
                    } catch (e) {
                        console.warn('Error destroying content item:', e);
                    }
                }
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
                try {
                // Redesigned: Small icon boxes in grid layout, all on one page
                // Categories displayed in two columns
                const categories = getAchievementCategories();
                const boxSize = 50; // Size of each achievement icon box
                const boxSpacing = 10; // Spacing between boxes
                const categorySpacing = 25; // Spacing between categories
                const categoryHeaderHeight = 25;
                const columnSpacing = 40; // Spacing between the two columns
                
                // Calculate layout to fit everything on one page with two columns
                const availableWidth = (k.width() - 100 - columnSpacing) / 2; // Half width for each column
                const availableHeight = viewportBottom - viewportTop - 20; // Leave some margin
                
                // Two columns
                const leftColumnX = 50;
                const rightColumnX = k.width() / 2 + columnSpacing / 2;
                
                let leftColumnY = contentY + 10;
                let rightColumnY = contentY + 10;
                
                categories.forEach((category, categoryIndex) => {
                    // Achievements in this category as icon boxes
                    const categoryAchievements = getAchievementsByCategory(category);
                    if (categoryAchievements.length === 0) return; // Skip empty categories
                    
                    // Alternate between left and right columns
                    const isLeftColumn = categoryIndex % 2 === 0;
                    const columnX = isLeftColumn ? leftColumnX : rightColumnX;
                    let currentY = isLeftColumn ? leftColumnY : rightColumnY;
                    
                    // Category header
                    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                    const headerText = k.add([
                        k.text(categoryName, { size: 18 }),
                        k.pos(columnX + availableWidth / 2, currentY),
                        k.anchor('center'),
                        k.color(255, 200, 100),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    contentItems.push(headerText);
                    currentY += categoryHeaderHeight + 5;
                    
                    const boxesPerRow = Math.max(1, Math.floor(availableWidth / (boxSize + boxSpacing)));
                    const actualBoxesInRow = Math.min(boxesPerRow, categoryAchievements.length);
                    const rowWidth = actualBoxesInRow * (boxSize + boxSpacing) - boxSpacing;
                    const startX = columnX + (availableWidth - rowWidth) / 2;
                    
                    categoryAchievements.forEach((achievement, index) => {
                        const isUnlocked = unlockedAchievements.includes(achievement.id);
                        const row = Math.floor(index / boxesPerRow);
                        const col = index % boxesPerRow;
                        const boxX = startX + col * (boxSize + boxSpacing);
                        const boxY = currentY + row * (boxSize + boxSpacing);
                        
                        // Validate positions
                        if (!isFinite(boxX) || !isFinite(boxY) || boxX < 0 || boxY < 0) {
                            console.warn('Invalid box position:', { boxX, boxY, index, col, row });
                            return; // Skip this achievement
                        }
                        
                        // Icon box background
                        let boxBg, iconText, tooltipBg, tooltipName, tooltipDesc;
                        
                        try {
                            boxBg = k.add([
                                k.rect(boxSize, boxSize),
                                k.pos(boxX, boxY),
                                k.anchor('topleft'),
                                k.color(isUnlocked ? 40 : 25, isUnlocked ? 40 : 25, isUnlocked ? 50 : 25),
                                k.outline(2, k.rgb(isUnlocked ? 150 : 60, isUnlocked ? 150 : 60, isUnlocked ? 200 : 60)),
                                k.area({ width: boxSize, height: boxSize }), // Explicit area definition
                                k.fixed(),
                                k.z(1000)
                            ]);
                        } catch (e) {
                            console.error('Error creating boxBg:', e, { boxX, boxY, boxSize });
                            return; // Skip this achievement
                        }
                        
                        // Icon
                        try {
                            iconText = k.add([
                                k.text(achievement.icon, { size: 28 }),
                                k.pos(boxX + boxSize / 2, boxY + boxSize / 2),
                                k.anchor('center'),
                                k.color(isUnlocked ? 255 : 80, isUnlocked ? 255 : 80, isUnlocked ? 255 : 80),
                                k.fixed(),
                                k.z(1001)
                            ]);
                        } catch (e) {
                            console.error('Error creating iconText:', e);
                            if (boxBg) k.destroy(boxBg);
                            return;
                        }
                        
                        // Tooltips disabled - will add achievement name as text below icon instead
                        const nameText = k.add([
                            k.text(achievement.name, { size: 12, width: boxSize + 20 }),
                            k.pos(boxX + boxSize / 2, boxY + boxSize + 12),
                            k.anchor('center'),
                            k.color(isUnlocked ? 200 : 100, isUnlocked ? 200 : 100, isUnlocked ? 200 : 100),
                            k.fixed(),
                            k.z(1001)
                        ]);
                        
                        contentItems.push(boxBg, iconText, nameText);
                    });
                    
                    // Move to next category - update the appropriate column's Y position
                    const rows = Math.ceil(categoryAchievements.length / boxesPerRow);
                    const categoryHeight = categoryHeaderHeight + 5 + rows * (boxSize + boxSpacing) + categorySpacing;
                    
                    if (isLeftColumn) {
                        leftColumnY += categoryHeight;
                    } else {
                        rightColumnY += categoryHeight;
                    }
                });
                
                // Rainbow gradient progress bar
                const totalAchievements = Object.keys(ACHIEVEMENTS).length;
                const unlockedCount = unlockedAchievements.length;
                const progressPercent = unlockedCount / totalAchievements;
                
                const progressBarY = k.height() - backButtonArea - progressAreaHeight / 2;
                const progressBarWidth = 600;
                const progressBarHeight = 25;
                const progressBarX = k.width() / 2;
                
                // Progress bar background
                const progressBarBg = k.add([
                    k.rect(progressBarWidth, progressBarHeight),
                    k.pos(progressBarX, progressBarY),
                    k.anchor('center'),
                    k.color(30, 30, 40),
                    k.outline(2, k.rgb(100, 100, 150)),
                    k.fixed(),
                    k.z(1000)
                ]);
                contentItems.push(progressBarBg);
                
                // Rainbow gradient fill (simulated with multiple colored segments)
                const fillWidth = progressBarWidth * progressPercent;
                if (fillWidth > 2 && progressPercent > 0 && isFinite(fillWidth)) {
                    // Use fewer, larger segments for better performance and reliability
                    const segmentCount = Math.min(15, Math.max(3, Math.floor(fillWidth / 15)));
                    if (segmentCount > 0 && isFinite(segmentCount)) {
                        const segmentWidth = fillWidth / segmentCount;
                        
                        if (segmentWidth > 0 && isFinite(segmentWidth)) {
                            for (let i = 0; i < segmentCount; i++) {
                                const segmentX = progressBarX - progressBarWidth / 2 + i * segmentWidth;
                                // Cycle through full rainbow spectrum (0-360 degrees) across the filled portion
                                const hue = (i / segmentCount) * 360;
                                const rgb = hslToRgb(hue / 360, 1, 0.5);
                                
                                if (isFinite(segmentX) && segmentWidth > 0) {
                                    const segment = k.add([
                                        k.rect(segmentWidth, progressBarHeight - 4),
                                        k.pos(segmentX + segmentWidth / 2, progressBarY),
                                        k.anchor('center'),
                                        k.color(rgb[0], rgb[1], rgb[2]),
                                        k.fixed(),
                                        k.z(1001)
                                    ]);
                                    if (segment) {
                                        contentItems.push(segment);
                                    }
                                }
                            }
                        }
                    }
                } else if (fillWidth > 0 && isFinite(fillWidth)) {
                    // For very small progress, just use a single colored rectangle
                    const rgb = hslToRgb(0, 1, 0.5); // Red color
                    const segmentX = progressBarX - progressBarWidth / 2 + fillWidth / 2;
                    if (isFinite(segmentX)) {
                        const segment = k.add([
                            k.rect(fillWidth, progressBarHeight - 4),
                            k.pos(segmentX, progressBarY),
                            k.anchor('center'),
                            k.color(rgb[0], rgb[1], rgb[2]),
                            k.fixed(),
                            k.z(1001)
                        ]);
                        if (segment) {
                            contentItems.push(segment);
                        }
                    }
                }
                
                // Progress text
                const progressText = k.add([
                    k.text(`${unlockedCount}/${totalAchievements} (${Math.round(progressPercent * 100)}%)`, { size: 16 }),
                    k.pos(progressBarX, progressBarY + progressBarHeight / 2 + 20),
                    k.anchor('center'),
                    k.color(200, 200, 255),
                    k.fixed(),
                    k.z(1000)
                ]);
                contentItems.push(progressText);
                } catch (e) {
                    console.error('Error rendering achievements:', e);
                    // Fallback: show error message
                    const errorText = k.add([
                        k.text('Error loading achievements', { size: 18 }),
                        k.pos(k.width() / 2, contentY + 50),
                        k.anchor('center'),
                        k.color(255, 100, 100),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    contentItems.push(errorText);
                }
            }
        }
        
        // Initial refresh
        refreshContent();
        
        // No scrolling needed for achievements tab anymore (all on one page)
        
        // Back button (standardized)
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
            k.go('menu');
        });
        
        k.onKeyPress('escape', () => {
            k.go('menu');
        });
    });
}

