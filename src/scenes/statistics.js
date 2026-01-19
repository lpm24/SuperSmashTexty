// Statistics and Achievements scene
import { getSaveStats, getUnlockedAchievements, getCurrencyName, getRunHistory } from '../systems/metaProgression.js';
import { ACHIEVEMENTS, getAchievementCategories, getAchievementsByCategory, ACHIEVEMENT_COLORS, getAchievementProgress } from '../data/achievements.js';
import { showAchievementModal } from '../components/achievementModal.js';
import { playMenuNav } from '../systems/sounds.js';
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
        let currentTab = 'stats'; // stats, achievements, or history
        let achievementCategory = 'all'; // all, or specific category
        let currentPage = 0;
        const ACHIEVEMENTS_PER_PAGE = 8; // 4x2 grid

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
                playMenuNav();
                currentTab = tab.key;
                currentPage = 0;
                achievementCategory = 'all';
                refreshContent();
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
                    // Category sub-tabs
                    const categoryTabY = contentY + 5;
                    const categoryTabWidth = 80;
                    const categoryTabHeight = 25;
                    const categoryTabSpacing = 85;

                    const displayCategories = allCategories.slice(0, 7); // Limit to 7 categories
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
                            k.text(catName, { size: 12 }),
                            k.pos(catX, categoryTabY),
                            k.anchor('center'),
                            k.color(isActive ? 255 : 150, isActive ? 255 : 150, isActive ? 255 : 150),
                            k.fixed(),
                            k.z(1001)
                        ]);

                        catBg.onClick(() => {
                            playMenuNav();
                            achievementCategory = cat;
                            currentPage = 0;
                            refreshContent();
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

                    // Grid layout (4x2)
                    const gridStartY = contentY + 40;
                    const boxSize = 70;
                    const boxSpacing = 15;
                    const boxesPerRow = 4;
                    const gridWidth = boxesPerRow * (boxSize + boxSpacing) - boxSpacing;
                    const gridStartX = k.width() / 2 - gridWidth / 2;

                    pageAchievements.forEach((achievement, index) => {
                        const isUnlocked = unlockedAchievements.includes(achievement.id);
                        const row = Math.floor(index / boxesPerRow);
                        const col = index % boxesPerRow;
                        const boxX = gridStartX + col * (boxSize + boxSpacing);
                        const boxY = gridStartY + row * (boxSize + boxSpacing + 30); // Extra space for name

                        const difficultyColor = ACHIEVEMENT_COLORS[achievement.difficulty] || ACHIEVEMENT_COLORS.normal;

                        // Icon box background
                        const boxBg = k.add([
                            k.rect(boxSize, boxSize),
                            k.pos(boxX, boxY),
                            k.anchor('topleft'),
                            k.color(isUnlocked ? 40 : 25, isUnlocked ? 40 : 25, isUnlocked ? 50 : 25),
                            k.outline(2, k.rgb(...(isUnlocked ? difficultyColor : [60, 60, 60]))),
                            k.area({ width: boxSize, height: boxSize }),
                            k.fixed(),
                            k.z(1000)
                        ]);

                        // Icon
                        const iconText = k.add([
                            k.text(achievement.icon, { size: 32 }),
                            k.pos(boxX + boxSize / 2, boxY + boxSize / 2),
                            k.anchor('center'),
                            k.color(isUnlocked ? 255 : 80, isUnlocked ? 255 : 80, isUnlocked ? 255 : 80),
                            k.fixed(),
                            k.z(1001)
                        ]);

                        // Achievement name below
                        const nameText = k.add([
                            k.text(achievement.name, { size: 11, width: boxSize + 20 }),
                            k.pos(boxX + boxSize / 2, boxY + boxSize + 10),
                            k.anchor('center'),
                            k.color(isUnlocked ? 200 : 100, isUnlocked ? 200 : 100, isUnlocked ? 200 : 100),
                            k.fixed(),
                            k.z(1001)
                        ]);

                        // Progress indicator for locked achievements with thresholds
                        if (!isUnlocked) {
                            const progress = getAchievementProgress(achievement.id, stats);
                            if (progress) {
                                const progressText = k.add([
                                    k.text(`${progress.percentage}%`, { size: 10 }),
                                    k.pos(boxX + boxSize / 2, boxY + boxSize + 22),
                                    k.anchor('center'),
                                    k.color(...UI_COLORS.TEXT_DISABLED),
                                    k.fixed(),
                                    k.z(1001)
                                ]);
                                contentItems.push(progressText);
                            }
                        }

                        // Click handler for modal
                        boxBg.onClick(() => {
                            playMenuNav();
                            showAchievementModal(k, achievement);
                        });

                        contentItems.push(boxBg, iconText, nameText);
                    });

                    // Pagination controls
                    if (totalPages > 1) {
                        const paginationY = viewportBottom - 85;
                        const paginationCenterX = k.width() / 2;

                        // Left arrow
                        const leftArrow = k.add([
                            k.text('<', { size: 24 }),
                            k.pos(paginationCenterX - 80, paginationY),
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
                                refreshContent();
                            });
                        }
                        contentItems.push(leftArrow);

                        // Page indicator pips
                        const pipSpacing = 16;
                        const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;

                        for (let i = 0; i < totalPages; i++) {
                            const isCurrentPage = i === currentPage;
                            const pip = k.add([
                                k.text(isCurrentPage ? '|' : '.', { size: 14 }),
                                k.pos(pipsStartX + i * pipSpacing, paginationY),
                                k.anchor('center'),
                                k.color(isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120),
                                k.area(),
                                k.fixed(),
                                k.z(UI_Z_LAYERS.UI_TEXT)
                            ]);

                            const pageIndex = i;
                            pip.onClick(() => {
                                if (pageIndex !== currentPage) {
                                    playMenuNav();
                                    currentPage = pageIndex;
                                    refreshContent();
                                }
                            });

                            contentItems.push(pip);
                        }

                        // Right arrow
                        const rightArrow = k.add([
                            k.text('>', { size: 24 }),
                            k.pos(paginationCenterX + 80, paginationY),
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
                                refreshContent();
                            });
                        }
                        contentItems.push(rightArrow);
                    }

                    // Rainbow gradient progress bar (moved above back button)
                    const totalAchievements = Object.keys(ACHIEVEMENTS).length;
                    const unlockedCount = unlockedAchievements.length;
                    const progressPercent = unlockedCount / totalAchievements;

                    const progressBarY = viewportBottom - 45;
                    const progressBarWidth = 500;
                    const progressBarHeight = 20;
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

                    // Rainbow gradient fill
                    const fillWidth = progressBarWidth * progressPercent;
                    if (fillWidth > 2 && progressPercent > 0 && isFinite(fillWidth)) {
                        const segmentCount = Math.min(15, Math.max(3, Math.floor(fillWidth / 15)));
                        if (segmentCount > 0 && isFinite(segmentCount)) {
                            const segmentWidth = fillWidth / segmentCount;

                            if (segmentWidth > 0 && isFinite(segmentWidth)) {
                                for (let i = 0; i < segmentCount; i++) {
                                    const segmentX = progressBarX - progressBarWidth / 2 + i * segmentWidth;
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
                    }

                    // Progress text (above progress bar)
                    const progressText = k.add([
                        k.text(`${unlockedCount}/${totalAchievements} (${Math.round(progressPercent * 100)}%)`, { size: 14 }),
                        k.pos(progressBarX, progressBarY - 18),
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
            playMenuNav();
            k.go('menu');
        });

        k.onKeyPress('escape', () => {
            k.go('menu');
        });
    });
}
