/**
 * Leaderboards Scene
 *
 * Displays leaderboard data with three tabs:
 * - Daily: Today's daily run leaderboard
 * - All-Time: Top scores ever
 * - Personal Bests: Best per character
 */

import {
    getDailyLeaderboard,
    getAllTimeLeaderboard,
    getPersonalBests,
    formatScore,
    formatTime
} from '../systems/leaderboards.js';
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
    PERSONAL: 'personal'
};

export function setupLeaderboardsScene(k) {
    k.scene('leaderboards', (args = {}) => {
        const initialTab = args.tab || TABS.DAILY;
        let currentTab = initialTab;

        // Pagination for personal bests (5 characters per page)
        const CHARACTERS_PER_PAGE = 5;
        let personalPage = 0;

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
        const tabWidth = 150;
        const tabSpacing = 10;
        const totalTabWidth = (tabWidth * 3) + (tabSpacing * 2);
        const startX = (k.width() - totalTabWidth) / 2;

        // Content container
        const contentY = 160;
        const contentHeight = k.height() - contentY - 80;

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
                    personalPage = 0; // Reset pagination when switching tabs
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

            tabs = [tab1, tab2, tab3];
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
            }
        }

        // Render daily leaderboard
        function renderDailyContent() {
            const today = getTodayDateString();
            const dailyChar = getDailyCharacter(today);
            const charData = CHARACTER_UNLOCKS[dailyChar] || CHARACTER_UNLOCKS.survivor;
            const entries = getDailyLeaderboard(today, 10);
            const playerName = getPlayerName() || 'Anonymous';

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
            if (entries.length === 0) {
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
                    const isPlayer = entry.name === playerName;
                    renderLeaderboardRow(index + 1, entry, rowY, isPlayer);
                });
            }
        }

        // Render all-time leaderboard
        function renderAllTimeContent() {
            const entries = getAllTimeLeaderboard(10);
            const playerName = getPlayerName() || 'Anonymous';

            // Header row
            const headerY = contentY + 10;
            renderLeaderboardHeader(headerY);

            // Entries
            if (entries.length === 0) {
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
                    const isPlayer = entry.name === playerName;
                    renderLeaderboardRow(index + 1, entry, rowY, isPlayer);
                });
            }
        }

        // Render personal bests
        function renderPersonalContent() {
            const personalBests = getPersonalBests();
            const characters = Object.keys(CHARACTER_UNLOCKS);
            const totalPages = Math.ceil(characters.length / CHARACTERS_PER_PAGE);

            // Clamp page to valid range
            if (personalPage >= totalPages) personalPage = Math.max(0, totalPages - 1);

            // Get characters for current page
            const startIndex = personalPage * CHARACTERS_PER_PAGE;
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

            // Pagination controls (consistent with other pages)
            if (totalPages > 1) {
                const paginationY = headerY + 45 + (CHARACTERS_PER_PAGE * 40) + 20;
                const paginationCenterX = k.width() / 2;

                // Left arrow
                const leftArrow = k.add([
                    k.text('<', { size: 24 }),
                    k.pos(paginationCenterX - 60, paginationY),
                    k.anchor('center'),
                    k.color(personalPage > 0 ? 255 : 80, personalPage > 0 ? 255 : 80, personalPage > 0 ? 255 : 80),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                if (personalPage > 0) {
                    leftArrow.onClick(() => {
                        playMenuNav();
                        personalPage--;
                        renderContent();
                    });
                    leftArrow.cursor = 'pointer';
                }
                contentElements.push(leftArrow);

                // Page indicator pips
                const pipSpacing = 16;
                const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;

                for (let i = 0; i < totalPages; i++) {
                    const isCurrentPage = i === personalPage;
                    const pip = k.add([
                        k.text(isCurrentPage ? '●' : '○', { size: 14 }),
                        k.pos(pipsStartX + i * pipSpacing, paginationY),
                        k.anchor('center'),
                        k.color(isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120, isCurrentPage ? 255 : 120),
                        k.area(),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);

                    const pageIndex = i;
                    pip.onClick(() => {
                        if (pageIndex !== personalPage) {
                            playMenuNav();
                            personalPage = pageIndex;
                            renderContent();
                        }
                    });
                    pip.cursor = 'pointer';

                    contentElements.push(pip);
                }

                // Right arrow
                const rightArrow = k.add([
                    k.text('>', { size: 24 }),
                    k.pos(paginationCenterX + 60, paginationY),
                    k.anchor('center'),
                    k.color(personalPage < totalPages - 1 ? 255 : 80, personalPage < totalPages - 1 ? 255 : 80, personalPage < totalPages - 1 ? 255 : 80),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                if (personalPage < totalPages - 1) {
                    rightArrow.onClick(() => {
                        playMenuNav();
                        personalPage++;
                        renderContent();
                    });
                    rightArrow.cursor = 'pointer';
                }
                contentElements.push(rightArrow);
            }
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
