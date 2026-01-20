// Statistics and Achievements scene
import { getSaveStats, getUnlockedAchievements, getCurrencyName, getRunHistory } from '../systems/metaProgression.js';
import { ACHIEVEMENTS, getAchievementCategories, getAchievementsByCategory, ACHIEVEMENT_COLORS, getAchievementProgress } from '../data/achievements.js';
import { playMenuNav } from '../systems/sounds.js';
import {
    UI_SIZES,
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
        let currentTab = 'stats'; // stats, achievements, or history
        let achievementCategory = 'all'; // all, or specific category
        let currentPage = 0;
        const ACHIEVEMENTS_PER_PAGE = 15; // 5x3 grid
        let isNavigating = false; // Debounce flag for pagination and category tabs
        let selectedAchievement = null; // Currently selected achievement for detail panel

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
        createAnimatedTitle(k, 'RATINGS AND RECORDS', k.width() / 2, 35, 8);

        // Tab buttons (centered like Settings menu)
        const tabY = 80;
        const tabSpacing = 160; // Increased spacing to add padding between buttons
        const tabWidth = 150;
        const tabHeight = 30;

        const tabs = [
            { key: 'stats', label: 'Statistics' },
            { key: 'achievements', label: 'Achievements' },
            { key: 'history', label: 'History' }
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
                if (isNavigating) return;
                isNavigating = true;
                playMenuNav();
                currentTab = tab.key;
                currentPage = 0;
                achievementCategory = 'all';
                k.wait(0, () => {
                    refreshContent();
                    k.wait(0.1, () => { isNavigating = false; });
                });
            });

            tabButtons.push({ bg: tabBg, label: tabLabel, key: tab.key });
        });

        // Content area
        const contentY = 140;
        const backButtonArea = 80; // Increased space for back button
        const viewportBottom = k.height() - backButtonArea;
        let contentItems = [];
        let categoryTabItems = [];

        // Get all achievement categories
        const allCategories = ['all', ...getAchievementCategories()];

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

            // Clear category tab items
            categoryTabItems.forEach(item => {
                if (item && typeof item.exists === 'function' && item.exists()) {
                    try {
                        k.destroy(item);
                    } catch (e) {
                        console.warn('Error destroying category tab item:', e);
                    }
                }
            });
            categoryTabItems = [];

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
                    // ========================================================
                    // SPLIT PANEL LAYOUT: Grid on left, Detail panel on right
                    // ========================================================

                    // Layout constants
                    const panelGap = 20;
                    const leftPanelWidth = 320;
                    const rightPanelWidth = 300;
                    const totalWidth = leftPanelWidth + panelGap + rightPanelWidth;
                    const startX = (k.width() - totalWidth) / 2;
                    const panelTop = contentY + 5;
                    const panelHeight = viewportBottom - panelTop - 80;

                    // Category tabs (horizontal, above the panels)
                    const categoryTabY = panelTop;
                    const categoryTabWidth = 70;
                    const categoryTabHeight = 22;
                    const categoryTabSpacing = 75;

                    const displayCategories = allCategories.slice(0, 7);
                    const totalCategoryWidth = (displayCategories.length - 1) * categoryTabSpacing;
                    const firstCategoryX = k.width() / 2 - totalCategoryWidth / 2;

                    displayCategories.forEach((cat, index) => {
                        const catX = firstCategoryX + index * categoryTabSpacing;
                        const isActive = achievementCategory === cat;
                        const catName = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);

                        const catBg = k.add([
                            k.rect(categoryTabWidth, categoryTabHeight),
                            k.pos(catX, categoryTabY),
                            k.anchor('center'),
                            k.color(isActive ? 80 : 40, isActive ? 80 : 40, isActive ? 120 : 60),
                            k.outline(1, k.rgb(100, 100, 150)),
                            k.area(),
                            k.fixed(),
                            k.z(1000)
                        ]);

                        const catLabel = k.add([
                            k.text(catName, { size: 11 }),
                            k.pos(catX, categoryTabY),
                            k.anchor('center'),
                            k.color(isActive ? 255 : 150, isActive ? 255 : 150, isActive ? 255 : 150),
                            k.fixed(),
                            k.z(1001)
                        ]);

                        catBg.onClick(() => {
                            if (isNavigating) return;
                            isNavigating = true;
                            playMenuNav();
                            achievementCategory = cat;
                            currentPage = 0;
                            selectedAchievement = null;
                            k.wait(0, () => {
                                refreshContent();
                                k.wait(0.1, () => { isNavigating = false; });
                            });
                        });

                        categoryTabItems.push(catBg, catLabel);
                    });

                    // Get achievements for current category
                    let categoryAchievements;
                    if (achievementCategory === 'all') {
                        categoryAchievements = Object.values(ACHIEVEMENTS);
                    } else {
                        categoryAchievements = getAchievementsByCategory(achievementCategory);
                    }

                    // Pagination
                    const totalPages = Math.ceil(categoryAchievements.length / ACHIEVEMENTS_PER_PAGE);
                    if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);

                    const startIndex = currentPage * ACHIEVEMENTS_PER_PAGE;
                    const pageAchievements = categoryAchievements.slice(startIndex, startIndex + ACHIEVEMENTS_PER_PAGE);

                    // ========== LEFT PANEL: Achievement Grid ==========
                    const gridTop = panelTop + 35;
                    const boxSize = 50;
                    const boxSpacing = 8;
                    const boxesPerRow = 5;
                    const rowHeight = boxSize + 22;
                    const gridStartX = startX;

                    // Left panel background
                    const leftPanelBg = k.add([
                        k.rect(leftPanelWidth, panelHeight - 35),
                        k.pos(startX, gridTop),
                        k.anchor('topleft'),
                        k.color(25, 25, 35),
                        k.outline(2, k.rgb(60, 60, 80)),
                        k.fixed(),
                        k.z(999)
                    ]);
                    contentItems.push(leftPanelBg);

                    // Achievement grid
                    const gridPadding = 15;
                    pageAchievements.forEach((achievement, index) => {
                        const isUnlocked = unlockedAchievements.includes(achievement.id);
                        const isSelected = selectedAchievement && selectedAchievement.id === achievement.id;
                        const row = Math.floor(index / boxesPerRow);
                        const col = index % boxesPerRow;
                        const boxX = gridStartX + gridPadding + col * (boxSize + boxSpacing);
                        const boxY = gridTop + gridPadding + row * rowHeight;

                        const difficultyColor = ACHIEVEMENT_COLORS[achievement.difficulty] || ACHIEVEMENT_COLORS.normal;

                        // Selection highlight
                        const highlightColor = isSelected ? [100, 100, 180] : (isUnlocked ? [50, 50, 65] : [30, 30, 40]);
                        const borderColor = isSelected ? [150, 150, 255] : (isUnlocked ? difficultyColor : [50, 50, 60]);

                        const boxBg = k.add([
                            k.rect(boxSize, boxSize),
                            k.pos(boxX, boxY),
                            k.anchor('topleft'),
                            k.color(...highlightColor),
                            k.outline(isSelected ? 3 : 2, k.rgb(...borderColor)),
                            k.area({ width: boxSize, height: boxSize }),
                            k.fixed(),
                            k.z(1000)
                        ]);

                        const iconText = k.add([
                            k.text(achievement.icon, { size: 24 }),
                            k.pos(boxX + boxSize / 2, boxY + boxSize / 2),
                            k.anchor('center'),
                            k.color(isUnlocked ? 255 : 80, isUnlocked ? 255 : 80, isUnlocked ? 255 : 80),
                            k.fixed(),
                            k.z(1001)
                        ]);

                        // Progress bar under locked achievements
                        if (!isUnlocked) {
                            const progress = getAchievementProgress(achievement.id, stats);
                            if (progress && progress.percentage > 0) {
                                const barWidth = boxSize - 4;
                                const fillWidth = barWidth * progress.progress;

                                const progressBg = k.add([
                                    k.rect(barWidth, 4),
                                    k.pos(boxX + 2, boxY + boxSize - 6),
                                    k.anchor('topleft'),
                                    k.color(20, 20, 30),
                                    k.fixed(),
                                    k.z(1001)
                                ]);
                                contentItems.push(progressBg);

                                if (fillWidth > 0) {
                                    const progressFill = k.add([
                                        k.rect(fillWidth, 4),
                                        k.pos(boxX + 2, boxY + boxSize - 6),
                                        k.anchor('topleft'),
                                        k.color(...difficultyColor),
                                        k.opacity(0.8),
                                        k.fixed(),
                                        k.z(1002)
                                    ]);
                                    contentItems.push(progressFill);
                                }
                            }
                        }

                        // Click handler - select achievement
                        boxBg.onClick(() => {
                            if (isNavigating) return;
                            playMenuNav();
                            selectedAchievement = achievement;
                            isNavigating = true;
                            k.wait(0, () => {
                                refreshContent();
                                k.wait(0.1, () => { isNavigating = false; });
                            });
                        });

                        contentItems.push(boxBg, iconText);
                    });

                    // ========== RIGHT PANEL: Detail View ==========
                    const rightPanelX = startX + leftPanelWidth + panelGap;

                    // Right panel background
                    const rightPanelBg = k.add([
                        k.rect(rightPanelWidth, panelHeight - 35),
                        k.pos(rightPanelX, gridTop),
                        k.anchor('topleft'),
                        k.color(30, 28, 40),
                        k.outline(2, k.rgb(70, 70, 100)),
                        k.fixed(),
                        k.z(999)
                    ]);
                    contentItems.push(rightPanelBg);

                    // Detail content
                    const detailCenterX = rightPanelX + rightPanelWidth / 2;
                    const detailTop = gridTop + 20;

                    if (selectedAchievement) {
                        const ach = selectedAchievement;
                        const isUnlocked = unlockedAchievements.includes(ach.id);
                        const progress = getAchievementProgress(ach.id, stats);
                        const difficultyColor = ACHIEVEMENT_COLORS[ach.difficulty] || ACHIEVEMENT_COLORS.normal;

                        // Large icon
                        const iconBg = k.add([
                            k.rect(70, 70),
                            k.pos(detailCenterX, detailTop + 35),
                            k.anchor('center'),
                            k.color(isUnlocked ? 45 : 25, isUnlocked ? 45 : 25, isUnlocked ? 55 : 30),
                            k.outline(3, k.rgb(...(isUnlocked ? difficultyColor : [60, 60, 70]))),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(iconBg);

                        const largeIcon = k.add([
                            k.text(ach.icon, { size: 40 }),
                            k.pos(detailCenterX, detailTop + 35),
                            k.anchor('center'),
                            k.color(isUnlocked ? 255 : 100, isUnlocked ? 255 : 100, isUnlocked ? 255 : 100),
                            k.fixed(),
                            k.z(1001)
                        ]);
                        contentItems.push(largeIcon);

                        // Achievement name
                        const nameText = k.add([
                            k.text(ach.name, { size: 16 }),
                            k.pos(detailCenterX, detailTop + 85),
                            k.anchor('center'),
                            k.color(...(isUnlocked ? [255, 255, 255] : [180, 180, 180])),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(nameText);

                        // Difficulty badge
                        const diffName = ach.difficulty.charAt(0).toUpperCase() + ach.difficulty.slice(1);
                        const diffBadge = k.add([
                            k.text(diffName, { size: 11 }),
                            k.pos(detailCenterX, detailTop + 105),
                            k.anchor('center'),
                            k.color(...difficultyColor),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(diffBadge);

                        // Description
                        const descText = k.add([
                            k.text(ach.description, { size: 12 }),
                            k.pos(detailCenterX, detailTop + 130),
                            k.anchor('center'),
                            k.color(180, 180, 200),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(descText);

                        // Status / Progress
                        let statusY = detailTop + 160;
                        if (isUnlocked) {
                            const statusText = k.add([
                                k.text('UNLOCKED', { size: 14 }),
                                k.pos(detailCenterX, statusY),
                                k.anchor('center'),
                                k.color(100, 255, 100),
                                k.fixed(),
                                k.z(1000)
                            ]);
                            contentItems.push(statusText);
                        } else if (progress) {
                            // Progress bar
                            const barWidth = 200;
                            const barHeight = 16;

                            const progressBgBar = k.add([
                                k.rect(barWidth, barHeight),
                                k.pos(detailCenterX, statusY),
                                k.anchor('center'),
                                k.color(30, 30, 45),
                                k.outline(1, k.rgb(70, 70, 90)),
                                k.fixed(),
                                k.z(1000)
                            ]);
                            contentItems.push(progressBgBar);

                            const fillWidth = Math.max(2, barWidth * progress.progress);
                            const progressFillBar = k.add([
                                k.rect(fillWidth, barHeight - 4),
                                k.pos(detailCenterX - barWidth / 2 + fillWidth / 2, statusY),
                                k.anchor('center'),
                                k.color(...difficultyColor),
                                k.opacity(0.9),
                                k.fixed(),
                                k.z(1001)
                            ]);
                            contentItems.push(progressFillBar);

                            const progressLabel = k.add([
                                k.text(`${progress.current} / ${progress.target}`, { size: 11 }),
                                k.pos(detailCenterX, statusY + 20),
                                k.anchor('center'),
                                k.color(150, 150, 180),
                                k.fixed(),
                                k.z(1000)
                            ]);
                            contentItems.push(progressLabel);
                            statusY += 35;
                        }

                        // Hint (if locked)
                        if (!isUnlocked && ach.hint) {
                            const hintY = statusY + 15;
                            const hintLabel = k.add([
                                k.text('Hint:', { size: 10 }),
                                k.pos(detailCenterX, hintY),
                                k.anchor('center'),
                                k.color(120, 120, 140),
                                k.fixed(),
                                k.z(1000)
                            ]);
                            contentItems.push(hintLabel);

                            const hintText = k.add([
                                k.text(ach.hint, { size: 11 }),
                                k.pos(detailCenterX, hintY + 18),
                                k.anchor('center'),
                                k.color(160, 160, 180),
                                k.fixed(),
                                k.z(1000)
                            ]);
                            contentItems.push(hintText);
                        }

                    } else {
                        // No achievement selected - show prompt
                        const promptIcon = k.add([
                            k.text('👈', { size: 32 }),
                            k.pos(detailCenterX, detailTop + 60),
                            k.anchor('center'),
                            k.color(150, 150, 180),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(promptIcon);

                        const promptText = k.add([
                            k.text('Select an achievement', { size: 14 }),
                            k.pos(detailCenterX, detailTop + 100),
                            k.anchor('center'),
                            k.color(120, 120, 150),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(promptText);

                        const promptText2 = k.add([
                            k.text('to view details', { size: 12 }),
                            k.pos(detailCenterX, detailTop + 120),
                            k.anchor('center'),
                            k.color(100, 100, 130),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(promptText2);
                    }

                    // Pagination controls
                    if (totalPages > 1) {
                        const paginationY = viewportBottom - 55;
                        const paginationCenterX = k.width() / 2;

                        // Page indicator pips
                        const pipSpacing = 20;
                        const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;
                        const pipsEndX = paginationCenterX + ((totalPages - 1) * pipSpacing) / 2;

                        // Arrows positioned outside the pips with offset for pip clickable area (16px) + gap
                        const arrowOffset = 25;
                        const leftArrowX = pipsStartX - arrowOffset;
                        const rightArrowX = pipsEndX + arrowOffset;

                        // Helper function to handle page change
                        const goToPage = (newPage) => {
                            if (isNavigating || newPage === currentPage || newPage < 0 || newPage >= totalPages) return;
                            isNavigating = true;
                            playMenuNav();
                            currentPage = newPage;
                            // Defer refresh to next frame to ensure clean destruction
                            k.wait(0, () => {
                                refreshContent();
                                k.wait(0.15, () => { isNavigating = false; });
                            });
                        };

                        for (let i = 0; i < totalPages; i++) {
                            const isCurrentPip = i === currentPage;
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
                                k.text(isCurrentPip ? '●' : '○', { size: 14 }),
                                k.pos(pipX, paginationY),
                                k.anchor('center'),
                                k.color(isCurrentPip ? 255 : 120, isCurrentPip ? 255 : 120, isCurrentPip ? 255 : 120),
                                k.fixed(),
                                k.z(UI_Z_LAYERS.UI_TEXT)
                            ]);

                            const pageIndex = i;
                            pipBg.onClick(() => goToPage(pageIndex));
                            pipBg.cursor = 'pointer';

                            contentItems.push(pipBg, pipText);
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
                            const targetPage = currentPage - 1;
                            leftArrowBg.onClick(() => goToPage(targetPage));
                            leftArrowBg.cursor = 'pointer';
                        }
                        contentItems.push(leftArrowBg, leftArrowText);

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
                            const targetPage = currentPage + 1;
                            rightArrowBg.onClick(() => goToPage(targetPage));
                            rightArrowBg.cursor = 'pointer';
                        }
                        contentItems.push(rightArrowBg, rightArrowText);
                    }

                    // Achievement Trophy Meter - satisfying progress display
                    const totalAchievements = Object.keys(ACHIEVEMENTS).length;
                    const unlockedCount = unlockedAchievements.length;
                    const progressPercent = unlockedCount / totalAchievements;
                    const isComplete = progressPercent >= 1;

                    const meterY = viewportBottom - 20;
                    const meterX = k.width() / 2;

                    // Trophy icon on the left
                    const trophyIcon = k.add([
                        k.text(isComplete ? '🏆' : '🏆', { size: 24 }),
                        k.pos(meterX - 220, meterY),
                        k.anchor('center'),
                        k.color(isComplete ? 255 : 150, isComplete ? 215 : 150, isComplete ? 0 : 150),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    contentItems.push(trophyIcon);

                    // Animated trophy for 100% completion
                    if (isComplete) {
                        let trophyTime = 0;
                        trophyIcon.onUpdate(() => {
                            trophyTime += k.dt();
                            // Gentle pulse effect
                            const scale = 1 + Math.sin(trophyTime * 3) * 0.1;
                            trophyIcon.scale = k.vec2(scale, scale);
                        });
                    }

                    // ASCII-style progress meter: |████████░░░░|
                    const totalBlocks = 20;
                    const filledBlocks = Math.floor(progressPercent * totalBlocks);
                    const emptyBlocks = totalBlocks - filledBlocks;

                    // Build the meter string with blocks
                    let meterString = '';
                    for (let i = 0; i < filledBlocks; i++) {
                        meterString += '█';
                    }
                    for (let i = 0; i < emptyBlocks; i++) {
                        meterString += '░';
                    }

                    // Meter background frame
                    const meterFrame = k.add([
                        k.text('|' + '░'.repeat(totalBlocks) + '|', { size: 16 }),
                        k.pos(meterX, meterY),
                        k.anchor('center'),
                        k.color(60, 60, 80),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    contentItems.push(meterFrame);

                    // Filled portion with color based on progress
                    let fillColor;
                    if (isComplete) {
                        fillColor = [255, 215, 0]; // Gold for 100%
                    } else if (progressPercent >= 0.75) {
                        fillColor = [100, 255, 100]; // Green for 75%+
                    } else if (progressPercent >= 0.5) {
                        fillColor = [255, 255, 100]; // Yellow for 50%+
                    } else if (progressPercent >= 0.25) {
                        fillColor = [255, 180, 100]; // Orange for 25%+
                    } else {
                        fillColor = [200, 200, 200]; // Gray for less
                    }

                    const filledMeter = k.add([
                        k.text('|' + meterString + '|', { size: 16 }),
                        k.pos(meterX, meterY),
                        k.anchor('center'),
                        k.color(...fillColor),
                        k.fixed(),
                        k.z(1001)
                    ]);
                    contentItems.push(filledMeter);

                    // Animate fill color for 100% completion (rainbow cycle)
                    if (isComplete) {
                        let colorTime = 0;
                        filledMeter.onUpdate(() => {
                            colorTime += k.dt();
                            const hue = (colorTime * 60) % 360;
                            const rgb = hslToRgb(hue / 360, 1, 0.6);
                            filledMeter.color = k.rgb(rgb[0], rgb[1], rgb[2]);
                        });
                    }

                    // Progress count and percentage
                    const percentText = Math.round(progressPercent * 100);
                    const statusText = isComplete ? 'COMPLETE!' : `${percentText}%`;
                    const progressLabel = k.add([
                        k.text(`${unlockedCount}/${totalAchievements}`, { size: 14 }),
                        k.pos(meterX + 180, meterY - 8),
                        k.anchor('center'),
                        k.color(180, 180, 200),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    contentItems.push(progressLabel);

                    const statusLabel = k.add([
                        k.text(statusText, { size: 12 }),
                        k.pos(meterX + 180, meterY + 8),
                        k.anchor('center'),
                        k.color(...(isComplete ? [255, 215, 0] : [150, 150, 180])),
                        k.fixed(),
                        k.z(1002)
                    ]);
                    contentItems.push(statusLabel);

                    // Sparkle effect for 100% completion
                    if (isComplete) {
                        let sparkleTime = 0;
                        statusLabel.onUpdate(() => {
                            sparkleTime += k.dt();
                            const pulse = Math.sin(sparkleTime * 4) * 0.3 + 0.7;
                            statusLabel.opacity = pulse;
                        });
                    }
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
            } else if (currentTab === 'history') {
                // Display run history
                const runHistory = getRunHistory();
                const historyY = contentY + 10;
                const rowHeight = 40;

                if (runHistory.length === 0) {
                    // No history yet
                    const noHistoryText = k.add([
                        k.text('No run history yet. Complete a run to see it here!', { size: 16 }),
                        k.pos(k.width() / 2, historyY + 50),
                        k.anchor('center'),
                        k.color(150, 150, 150),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    contentItems.push(noHistoryText);
                } else {
                    // Header row
                    const headers = ['#', 'Floor', 'Rooms', 'Kills', 'Level', 'Credits', 'Time'];
                    const headerPositions = [60, 120, 200, 280, 360, 450, 550];

                    headers.forEach((header, i) => {
                        const headerText = k.add([
                            k.text(header, { size: 14 }),
                            k.pos(headerPositions[i], historyY),
                            k.anchor('left'),
                            k.color(255, 200, 100),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        contentItems.push(headerText);
                    });

                    // Run history rows (limit to 10 most recent)
                    const displayRuns = runHistory.slice(0, 10);
                    displayRuns.forEach((run, index) => {
                        const y = historyY + (index + 1) * rowHeight;

                        // Format duration
                        const mins = Math.floor(run.duration / 60);
                        const secs = run.duration % 60;
                        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

                        const rowData = [
                            `${index + 1}`,
                            `${run.floorsReached}`,
                            `${run.roomsCleared}`,
                            `${run.enemiesKilled}`,
                            `${run.level}`,
                            `${currencyName}${run.currencyEarned}`,
                            timeStr
                        ];

                        rowData.forEach((value, i) => {
                            const cellText = k.add([
                                k.text(value, { size: 14 }),
                                k.pos(headerPositions[i], y),
                                k.anchor('left'),
                                k.color(200, 200, 200),
                                k.fixed(),
                                k.z(1000)
                            ]);
                            contentItems.push(cellText);
                        });
                    });

                    // Show total runs count
                    const totalText = k.add([
                        k.text(`Showing ${displayRuns.length} of ${runHistory.length} recent runs`, { size: 12 }),
                        k.pos(k.width() / 2, viewportBottom - 30),
                        k.anchor('center'),
                        k.color(100, 100, 150),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    contentItems.push(totalText);
                }
            }
        }

        // Initial refresh
        refreshContent();

        // Back button (SM size - secondary action)
        const { SM } = UI_SIZES.BUTTON;
        const backButton = k.add([
            k.rect(SM.width, SM.height),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        const backText = k.add([
            k.text('BACK', { size: UI_TEXT_SIZES.SMALL }),
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
