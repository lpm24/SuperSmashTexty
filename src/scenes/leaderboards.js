/**
 * Leaderboards Scene
 *
 * Displays leaderboard data with four tabs:
 * - Daily: Today's daily run leaderboard
 * - All-Time: Top scores ever
 * - Personal Bests: Best per character
 * - Global: Online global leaderboard (Dreamlo API)
 */

import {
    getDailyLeaderboard,
    getAllTimeLeaderboard,
    getPersonalBests,
    formatScore,
    formatTime
} from '../systems/leaderboards.js';
import { getOnlineLeaderboard } from '../systems/onlineLeaderboards.js';
import { getPlayerName } from '../systems/metaProgression.js';
import { getTodayDateString, getDailyCharacter } from '../systems/dailyRuns.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { playMenuSelect, playMenuNav } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS
} from '../config/uiConfig.js';

// Tab types
const TABS = {
    DAILY: 'daily',
    ALL_TIME: 'allTime',
    PERSONAL: 'personal',
    GLOBAL: 'global'
};

export function setupLeaderboardsScene(k) {
    k.scene('leaderboards', (args = {}) => {
        const initialTab = args.tab || TABS.DAILY;
        let currentTab = initialTab;

        // Pagination settings
        const ENTRIES_PER_PAGE = 10;
        const CHARACTERS_PER_PAGE = 5;
        let currentPage = 0; // Used for DAILY, ALL-TIME, and PERSONAL tabs

        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.color(...UI_COLORS.BG_DARK),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Title
        k.add([
            k.text('LEADERBOARDS', { size: UI_TEXT_SIZES.TITLE }),
            k.pos(k.width() / 2, 50),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Tab container
        const tabY = 100;
        const tabWidth = 115;
        const tabSpacing = 8;
        const totalTabWidth = (tabWidth * 4) + (tabSpacing * 3);
        const startX = (k.width() - totalTabWidth) / 2;

        // Content container
        const contentY = 160;

        // Content elements (will be destroyed and recreated on tab change)
        let contentElements = [];

        // Create tab button
        function createTab(text, tabType, x) {
            const isActive = currentTab === tabType;
            const bg = k.add([
                k.rect(tabWidth, 40),
                k.pos(x, tabY),
                k.anchor('center'),
                k.color(...(isActive ? UI_COLORS.SECONDARY : UI_COLORS.BG_MEDIUM)),
                k.outline(2, k.rgb(...(isActive ? UI_COLORS.BORDER_HOVER : UI_COLORS.BORDER))),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS),
                'tab'
            ]);

            const label = k.add([
                k.text(text, { size: UI_TEXT_SIZES.BODY }),
                k.pos(x, tabY),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT),
                'tab'
            ]);

            bg.onClick(() => {
                if (currentTab !== tabType) {
                    playMenuNav();
                    currentTab = tabType;
                    currentPage = 0; // Reset pagination when switching tabs
                    refreshTabs();
                    renderContent();
                }
            });

            bg.onHoverUpdate(() => {
                if (currentTab !== tabType) {
                    bg.color = k.rgb(...UI_COLORS.BG_LIGHT);
                }
            });

            bg.onHoverEnd(() => {
                if (currentTab !== tabType) {
                    bg.color = k.rgb(...UI_COLORS.BG_MEDIUM);
                }
            });

            return { bg, label, tabType };
        }

        // Create tabs
        let tabs = [];
        function refreshTabs() {
            // Destroy old tabs
            k.get('tab').forEach(t => k.destroy(t));
            tabs = [];

            const tab1 = createTab('DAILY', TABS.DAILY, startX + tabWidth / 2);
            const tab2 = createTab('ALL-TIME', TABS.ALL_TIME, startX + tabWidth + tabSpacing + tabWidth / 2);
            const tab3 = createTab('PERSONAL', TABS.PERSONAL, startX + (tabWidth + tabSpacing) * 2 + tabWidth / 2);
            const tab4 = createTab('GLOBAL', TABS.GLOBAL, startX + (tabWidth + tabSpacing) * 3 + tabWidth / 2);

            tabs = [tab1, tab2, tab3, tab4];
        }

        // Render content based on current tab
        function renderContent() {
            // Clear previous content
            contentElements.forEach(el => {
                if (el.exists()) k.destroy(el);
            });
            contentElements = [];

            switch (currentTab) {
                case TABS.DAILY:
                    renderDailyContent();
                    break;
                case TABS.ALL_TIME:
                    renderAllTimeContent();
                    break;
                case TABS.PERSONAL:
                    renderPersonalContent();
                    break;
                case TABS.GLOBAL:
                    renderGlobalContent();
                    break;
            }
        }

        // Render daily leaderboard
        function renderDailyContent() {
            const today = getTodayDateString();
            const dailyChar = getDailyCharacter(today);
            const charData = CHARACTER_UNLOCKS[dailyChar] || CHARACTER_UNLOCKS.survivor;
            const allEntries = getDailyLeaderboard(today, 100); // Get all entries
            const playerName = getPlayerName() || 'Anonymous';

            const totalPages = Math.ceil(allEntries.length / ENTRIES_PER_PAGE);
            if (currentPage >= totalPages && totalPages > 0) currentPage = totalPages - 1;

            const startIndex = currentPage * ENTRIES_PER_PAGE;
            const entries = allEntries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);

            // Date and character info
            const dateLabel = k.add([
                k.text(`Date: ${today}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(k.width() / 2 - 100, contentY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(dateLabel);

            const charLabel = k.add([
                k.text(`Character: ${charData.char} ${charData.name}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(k.width() / 2 + 50, contentY),
                k.anchor('left'),
                k.color(...charData.color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(charLabel);

            // Header row
            const headerY = contentY + 40;
            renderLeaderboardHeader(headerY);

            // Entries
            if (allEntries.length === 0) {
                const noData = k.add([
                    k.text('No entries yet. Be the first!', { size: UI_TEXT_SIZES.BODY }),
                    k.pos(k.width() / 2, headerY + 60),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_DISABLED),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                contentElements.push(noData);
            } else {
                entries.forEach((entry, index) => {
                    const rowY = headerY + 40 + (index * 35);
                    const isPlayer = entry.name.toLowerCase() === playerName.toLowerCase();
                    const globalRank = startIndex + index + 1;
                    renderLeaderboardRow(globalRank, entry, rowY, isPlayer);
                });

                // Pagination controls
                if (totalPages > 1) {
                    renderPaginationControls(headerY + 40 + (ENTRIES_PER_PAGE * 35) + 10, totalPages);
                }
            }
        }

        // Render all-time leaderboard
        function renderAllTimeContent() {
            const allEntries = getAllTimeLeaderboard(100); // Get all entries
            const playerName = getPlayerName() || 'Anonymous';

            const totalPages = Math.ceil(allEntries.length / ENTRIES_PER_PAGE);
            if (currentPage >= totalPages && totalPages > 0) currentPage = totalPages - 1;

            const startIndex = currentPage * ENTRIES_PER_PAGE;
            const entries = allEntries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);

            // Header row
            const headerY = contentY + 10;
            renderLeaderboardHeader(headerY);

            // Entries
            if (allEntries.length === 0) {
                const noData = k.add([
                    k.text('No entries yet. Play a game!', { size: UI_TEXT_SIZES.BODY }),
                    k.pos(k.width() / 2, headerY + 60),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_DISABLED),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                contentElements.push(noData);
            } else {
                entries.forEach((entry, index) => {
                    const rowY = headerY + 40 + (index * 35);
                    const isPlayer = entry.name.toLowerCase() === playerName.toLowerCase();
                    const globalRank = startIndex + index + 1;
                    renderLeaderboardRow(globalRank, entry, rowY, isPlayer);
                });

                // Pagination controls
                if (totalPages > 1) {
                    renderPaginationControls(headerY + 40 + (ENTRIES_PER_PAGE * 35) + 10, totalPages);
                }
            }
        }

        // Render personal bests
        function renderPersonalContent() {
            const personalBests = getPersonalBests();
            const characters = Object.keys(CHARACTER_UNLOCKS);
            const totalPages = Math.ceil(characters.length / CHARACTERS_PER_PAGE);

            // Clamp page to valid range
            if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);

            // Get characters for current page
            const startIndex = currentPage * CHARACTERS_PER_PAGE;
            const pageCharacters = characters.slice(startIndex, startIndex + CHARACTERS_PER_PAGE);

            // Header
            const headerY = contentY + 10;
            const headers = ['Character', 'Best Score', 'Best Floor', 'Best Time'];
            const colPositions = [120, 280, 420, 540];

            headers.forEach((header, i) => {
                const headerText = k.add([
                    k.text(header, { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(colPositions[i], headerY),
                    k.anchor('left'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                contentElements.push(headerText);
            });

            // Divider
            const divider = k.add([
                k.rect(500, 2),
                k.pos(k.width() / 2, headerY + 20),
                k.anchor('center'),
                k.color(...UI_COLORS.BORDER),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            contentElements.push(divider);

            // Character rows (paginated)
            pageCharacters.forEach((charKey, pageIndex) => {
                const charData = CHARACTER_UNLOCKS[charKey];
                const bests = personalBests[charKey];
                const rowY = headerY + 45 + (pageIndex * 40);

                // Character icon and name
                const charIcon = k.add([
                    k.text(`${charData.char} ${charData.name}`, { size: UI_TEXT_SIZES.BODY }),
                    k.pos(colPositions[0], rowY),
                    k.anchor('left'),
                    k.color(...charData.color),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                contentElements.push(charIcon);

                if (bests) {
                    // Best score
                    const scoreText = k.add([
                        k.text(formatScore(bests.bestScore), { size: UI_TEXT_SIZES.BODY }),
                        k.pos(colPositions[1], rowY),
                        k.anchor('left'),
                        k.color(...UI_COLORS.TEXT_PRIMARY),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(scoreText);

                    // Best floor
                    const floorText = k.add([
                        k.text(`Floor ${bests.bestFloor}`, { size: UI_TEXT_SIZES.BODY }),
                        k.pos(colPositions[2], rowY),
                        k.anchor('left'),
                        k.color(...UI_COLORS.TEXT_PRIMARY),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(floorText);

                    // Best time
                    const timeText = k.add([
                        k.text(formatTime(bests.bestTime), { size: UI_TEXT_SIZES.BODY }),
                        k.pos(colPositions[3], rowY),
                        k.anchor('left'),
                        k.color(...UI_COLORS.TEXT_PRIMARY),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(timeText);
                } else {
                    // No data
                    const noData = k.add([
                        k.text('-- no data --', { size: UI_TEXT_SIZES.SMALL }),
                        k.pos(colPositions[1], rowY),
                        k.anchor('left'),
                        k.color(...UI_COLORS.TEXT_DISABLED),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(noData);
                }
            });

            // Pagination controls
            if (totalPages > 1) {
                const paginationY = headerY + 45 + (CHARACTERS_PER_PAGE * 40) + 20;
                renderPaginationControls(paginationY, totalPages);
            }
        }

        // Render global leaderboard
        function renderGlobalContent() {
            const playerName = getPlayerName() || 'Anonymous';
            const headerY = contentY + 10;

            // Show loading state initially
            const loadingText = k.add([
                k.text('Connecting to global leaderboard...', { size: UI_TEXT_SIZES.BODY }),
                k.pos(k.width() / 2, headerY + 100),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(loadingText);

            // Fetch global leaderboard
            getOnlineLeaderboard(10).then(result => {
                // Remove loading text
                if (loadingText.exists()) {
                    k.destroy(loadingText);
                    const idx = contentElements.indexOf(loadingText);
                    if (idx > -1) contentElements.splice(idx, 1);
                }

                // Check if we're still on the GLOBAL tab
                if (currentTab !== TABS.GLOBAL) return;

                if (result.error) {
                    // Error state
                    const errorText = k.add([
                        k.text(result.error, { size: UI_TEXT_SIZES.BODY }),
                        k.pos(k.width() / 2, headerY + 80),
                        k.anchor('center'),
                        k.color(...UI_COLORS.DANGER),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(errorText);

                    // Retry button
                    const retryBg = k.add([
                        k.rect(120, 35),
                        k.pos(k.width() / 2, headerY + 130),
                        k.anchor('center'),
                        k.color(...UI_COLORS.SECONDARY),
                        k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                        k.area(),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_ELEMENTS)
                    ]);
                    contentElements.push(retryBg);

                    const retryLabel = k.add([
                        k.text('Try Again', { size: UI_TEXT_SIZES.SMALL }),
                        k.pos(k.width() / 2, headerY + 130),
                        k.anchor('center'),
                        k.color(...UI_COLORS.TEXT_PRIMARY),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(retryLabel);

                    retryBg.onClick(() => {
                        playMenuNav();
                        renderContent();
                    });

                    retryBg.onHoverUpdate(() => {
                        retryBg.color = k.rgb(...UI_COLORS.SECONDARY_HOVER);
                    });

                    retryBg.onHoverEnd(() => {
                        retryBg.color = k.rgb(...UI_COLORS.SECONDARY);
                    });

                    return;
                }

                const entries = result.entries;

                // Header row
                renderLeaderboardHeader(headerY);

                // Entries
                if (entries.length === 0) {
                    const noData = k.add([
                        k.text('No global entries yet. Be the first!', { size: UI_TEXT_SIZES.BODY }),
                        k.pos(k.width() / 2, headerY + 60),
                        k.anchor('center'),
                        k.color(...UI_COLORS.TEXT_DISABLED),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(noData);
                } else {
                    entries.forEach((entry, index) => {
                        const rowY = headerY + 40 + (index * 35);
                        const isPlayer = entry.name.toLowerCase() === playerName.toLowerCase();
                        renderLeaderboardRow(index + 1, entry, rowY, isPlayer);
                    });
                }

                // Show total count at bottom
                if (result.totalCount > 0) {
                    const totalY = headerY + 40 + (Math.min(entries.length, 10) * 35) + 20;
                    const totalText = k.add([
                        k.text(`${result.totalCount} player${result.totalCount !== 1 ? 's' : ''} worldwide`, { size: UI_TEXT_SIZES.SMALL }),
                        k.pos(k.width() / 2, totalY),
                        k.anchor('center'),
                        k.color(...UI_COLORS.TEXT_SECONDARY),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    contentElements.push(totalText);
                }
            });
        }

        // Render pagination controls (reusable)
        function renderPaginationControls(y, totalPages) {
            const paginationCenterX = k.width() / 2;

            // Page indicator pips (created first, lower z-index)
            const pipSpacing = 20;
            const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;

            for (let i = 0; i < totalPages; i++) {
                const isCurrentPagePip = i === currentPage;
                const pipX = pipsStartX + i * pipSpacing;

                // Pip hitbox (explicit bounded area)
                const pipBg = k.add([
                    k.rect(16, 16),
                    k.pos(pipX, y),
                    k.anchor('center'),
                    k.color(0, 0, 0),
                    k.opacity(0),
                    k.area({ width: 16, height: 16 }),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                const pipText = k.add([
                    k.text(isCurrentPagePip ? '●' : '○', { size: 14 }),
                    k.pos(pipX, y),
                    k.anchor('center'),
                    k.color(isCurrentPagePip ? 255 : 120, isCurrentPagePip ? 255 : 120, isCurrentPagePip ? 255 : 120),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                const pageIndex = i;
                pipBg.onClick(() => {
                    if (pageIndex !== currentPage) {
                        playMenuNav();
                        currentPage = pageIndex;
                        renderContent();
                    }
                });
                pipBg.cursor = 'pointer';

                contentElements.push(pipBg, pipText);
            }

            // Left arrow (created after pips, higher z-index for click priority)
            const leftArrowBg = k.add([
                k.rect(30, 30),
                k.pos(paginationCenterX - 80, y),
                k.anchor('center'),
                k.color(0, 0, 0),
                k.opacity(0),
                k.area({ width: 30, height: 30 }),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
            ]);

            const leftArrowText = k.add([
                k.text('<', { size: 24 }),
                k.pos(paginationCenterX - 80, y),
                k.anchor('center'),
                k.color(currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80, currentPage > 0 ? 255 : 80),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT + 1)
            ]);

            if (currentPage > 0) {
                leftArrowBg.onClick(() => {
                    playMenuNav();
                    currentPage--;
                    renderContent();
                });
                leftArrowBg.cursor = 'pointer';
            }
            contentElements.push(leftArrowBg, leftArrowText);

            // Right arrow (created after pips, higher z-index for click priority)
            const rightArrowBg = k.add([
                k.rect(30, 30),
                k.pos(paginationCenterX + 80, y),
                k.anchor('center'),
                k.color(0, 0, 0),
                k.opacity(0),
                k.area({ width: 30, height: 30 }),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
            ]);

            const rightArrowText = k.add([
                k.text('>', { size: 24 }),
                k.pos(paginationCenterX + 80, y),
                k.anchor('center'),
                k.color(currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80, currentPage < totalPages - 1 ? 255 : 80),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT + 1)
            ]);

            if (currentPage < totalPages - 1) {
                rightArrowBg.onClick(() => {
                    playMenuNav();
                    currentPage++;
                    renderContent();
                });
                rightArrowBg.cursor = 'pointer';
            }
            contentElements.push(rightArrowBg, rightArrowText);
        }

        // Render leaderboard header row
        function renderLeaderboardHeader(y) {
            const headers = ['#', 'Name', 'Score', 'Floor', 'Time'];
            const colPositions = [80, 150, 350, 470, 560];

            headers.forEach((header, i) => {
                const headerText = k.add([
                    k.text(header, { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(colPositions[i], y),
                    k.anchor(i === 0 ? 'center' : 'left'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                contentElements.push(headerText);
            });

            // Divider line
            const divider = k.add([
                k.rect(550, 2),
                k.pos(k.width() / 2, y + 20),
                k.anchor('center'),
                k.color(...UI_COLORS.BORDER),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            contentElements.push(divider);
        }

        // Render leaderboard row
        function renderLeaderboardRow(rank, entry, y, isHighlighted = false) {
            const colPositions = [80, 150, 350, 470, 560];
            const color = isHighlighted ? UI_COLORS.GOLD : UI_COLORS.TEXT_PRIMARY;
            const charData = CHARACTER_UNLOCKS[entry.character] || CHARACTER_UNLOCKS.survivor;

            // Rank
            const rankText = k.add([
                k.text(rank <= 3 ? ['', '1st', '2nd', '3rd'][rank] : `${rank}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[0], y),
                k.anchor('center'),
                k.color(...(rank === 1 ? [255, 215, 0] : rank === 2 ? [192, 192, 192] : rank === 3 ? [205, 127, 50] : color)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(rankText);

            // Name with character icon
            const nameText = k.add([
                k.text(`${charData.char} ${entry.name}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[1], y),
                k.anchor('left'),
                k.color(...color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(nameText);

            // Score
            const scoreText = k.add([
                k.text(formatScore(entry.score), { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[2], y),
                k.anchor('left'),
                k.color(...color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(scoreText);

            // Floor
            const floorText = k.add([
                k.text(`${entry.floor}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[3], y),
                k.anchor('left'),
                k.color(...color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(floorText);

            // Time
            const timeText = k.add([
                k.text(formatTime(entry.time), { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[4], y),
                k.anchor('left'),
                k.color(...color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(timeText);

            // Highlight background for current player
            if (isHighlighted) {
                const highlight = k.add([
                    k.rect(550, 30),
                    k.pos(k.width() / 2, y),
                    k.anchor('center'),
                    k.color(...UI_COLORS.GOLD),
                    k.opacity(0.1),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
                ]);
                contentElements.push(highlight);
            }
        }

        // Back button
        const backButton = k.add([
            k.rect(150, 45),
            k.pos(k.width() / 2, k.height() - 50),
            k.anchor('center'),
            k.color(...UI_COLORS.SECONDARY),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        k.add([
            k.text('BACK', { size: UI_TEXT_SIZES.BUTTON }),
            k.pos(k.width() / 2, k.height() - 50),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        backButton.onClick(() => {
            playMenuSelect();
            k.go('menu');
        });

        backButton.onHoverUpdate(() => {
            backButton.color = k.rgb(...UI_COLORS.SECONDARY_HOVER);
        });

        backButton.onHoverEnd(() => {
            backButton.color = k.rgb(...UI_COLORS.SECONDARY);
        });

        // Keyboard shortcuts
        k.onKeyPress('escape', () => {
            playMenuSelect();
            k.go('menu');
        });

        // Initialize
        refreshTabs();
        renderContent();
    });
}
