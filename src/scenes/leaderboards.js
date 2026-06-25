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
    UI_SIZES,
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

// Shared leaderboard column X positions (used by both header and rows).
// Numeric columns (Score/Floor/Time) treat their position as the RIGHT edge
// so digits align down the list; Name is the left edge, Rank is centered.
const LEADERBOARD_COLS = [80, 150, 350, 470, 560];

export function setupLeaderboardsScene(k) {
    k.scene('leaderboards', (args = {}) => {
        const initialTab = args.tab || TABS.DAILY;
        let currentTab = initialTab;

        // Pagination settings
        const ENTRIES_PER_PAGE = 8;
        const CHARACTERS_PER_PAGE = 5;
        let currentPage = 0; // Used for DAILY, ALL-TIME, and PERSONAL tabs

        // Layout band reserved for the BACK button at the bottom of the screen.
        // Keep all leaderboard rows + pagination above this so nothing overlaps
        // the BACK button (mirrors statistics.js viewportBottom pattern).
        const ROW_HEIGHT = 28; // shrunk from 35 so a full page fits on-canvas
        const viewportBottom = k.height() - 70;

        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.color(...UI_COLORS.BG_DARK),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Title (use H1 for consistency with statistics/profile scenes)
        k.add([
            k.text('LEADERBOARDS', { size: UI_TEXT_SIZES.H1 }),
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

        // Monotonic token bumped on every renderContent() call. Async work (the
        // GLOBAL fetch) captures the token at call time and bails on resolve if
        // the value has changed (tab switched / scene re-rendered / destroyed).
        let renderSeq = 0;

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
                k.color(...(isActive ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_TERTIARY)),
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
            // Bump the render token so any in-flight async render bails out.
            renderSeq++;

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
                    const rowY = headerY + 40 + (index * ROW_HEIGHT);
                    const isPlayer = entry.name.toLowerCase() === playerName.toLowerCase();
                    const globalRank = startIndex + index + 1;
                    renderLeaderboardRow(globalRank, entry, rowY, isPlayer);
                });

                // Pagination controls - keep clamped above the BACK button band
                if (totalPages > 1) {
                    const paginationY = Math.min(
                        headerY + 40 + (ENTRIES_PER_PAGE * ROW_HEIGHT) + 10,
                        viewportBottom - 20
                    );
                    renderPaginationControls(paginationY, totalPages);
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
                    const rowY = headerY + 40 + (index * ROW_HEIGHT);
                    const isPlayer = entry.name.toLowerCase() === playerName.toLowerCase();
                    const globalRank = startIndex + index + 1;
                    renderLeaderboardRow(globalRank, entry, rowY, isPlayer);
                });

                // Pagination controls - keep clamped above the BACK button band
                if (totalPages > 1) {
                    const paginationY = Math.min(
                        headerY + 40 + (ENTRIES_PER_PAGE * ROW_HEIGHT) + 10,
                        viewportBottom - 20
                    );
                    renderPaginationControls(paginationY, totalPages);
                }
            }
        }

        // Render personal bests
        function renderPersonalContent() {
            const personalBests = getPersonalBests();
            const characters = Object.keys(CHARACTER_UNLOCKS);

            // If the player has no personal bests for ANY character, show a single
            // centered empty state instead of a full table of '-- no data --'.
            const hasAnyBests = characters.some(charKey => personalBests[charKey]);
            if (!hasAnyBests) {
                const emptyState = k.add([
                    k.text('No personal bests yet — play a run!', { size: UI_TEXT_SIZES.BODY }),
                    k.pos(k.width() / 2, contentY + 80),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_DISABLED),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                contentElements.push(emptyState);
                return;
            }

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

            // Capture the render token so we can bail if the scene re-renders or
            // the user switches away while the async fetch is still in flight.
            const mySeq = renderSeq;

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

            // Fetch a larger window (100) so we can surface the player's own rank
            // even when they fall outside the top 10. Race against an 8s timeout
            // that falls back to the standard error UI below.
            const FETCH_TIMEOUT_MS = 8000;
            const timeoutFallback = new Promise(resolve => {
                k.wait(FETCH_TIMEOUT_MS / 1000, () => {
                    resolve({ entries: [], totalCount: 0, error: 'Connection timed out' });
                });
            });

            Promise.race([getOnlineLeaderboard(100), timeoutFallback]).then(result => {
                // Bail if this render is stale (tab switched, re-rendered, or the
                // scene was destroyed) - prevents drawing onto the wrong screen.
                if (renderSeq !== mySeq || currentTab !== TABS.GLOBAL) return;

                // Remove loading text
                if (loadingText.exists()) {
                    k.destroy(loadingText);
                    const idx = contentElements.indexOf(loadingText);
                    if (idx > -1) contentElements.splice(idx, 1);
                }

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

                const allEntries = result.entries;
                const topEntries = allEntries.slice(0, 10);

                // Header row
                renderLeaderboardHeader(headerY);

                // Entries (top 10)
                if (topEntries.length === 0) {
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
                    topEntries.forEach((entry, index) => {
                        const rowY = headerY + 40 + (index * ROW_HEIGHT);
                        const isPlayer = entry.name.toLowerCase() === playerName.toLowerCase();
                        renderLeaderboardRow(index + 1, entry, rowY, isPlayer);
                    });
                }

                // Pin the player's own standing below the top 10 when they exist
                // in the leaderboard but fall outside the visible window. Keeps the
                // your-rank affordance consistent with DAILY / ALL-TIME.
                const playerIndex = allEntries.findIndex(
                    e => e.name.toLowerCase() === playerName.toLowerCase()
                );
                const bottomBaseY = headerY + 40 + (Math.min(topEntries.length, 10) * ROW_HEIGHT);
                const hasYouRow = playerIndex >= 10;

                if (hasYouRow) {
                    const playerEntry = allEntries[playerIndex];
                    const playerRank = playerIndex + 1;
                    // Clamp the pinned row above the BACK button band.
                    const youRowY = Math.min(bottomBaseY + 6, viewportBottom - 36);
                    renderLeaderboardRow(playerRank, playerEntry, youRowY, true);
                }

                // Show total count at bottom (kept above the BACK button band)
                if (result.totalCount > 0) {
                    const baseTotalY = hasYouRow ? bottomBaseY + ROW_HEIGHT + 14 : bottomBaseY + 20;
                    const totalY = Math.min(baseTotalY, viewportBottom - 10);
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

            // Page indicator pips
            const pipSpacing = 20;
            const pipsStartX = paginationCenterX - ((totalPages - 1) * pipSpacing) / 2;
            const pipsEndX = paginationCenterX + ((totalPages - 1) * pipSpacing) / 2;

            // Arrows positioned outside the pips with offset for pip clickable area (16px) + gap
            const arrowOffset = 25;
            const leftArrowX = pipsStartX - arrowOffset;
            const rightArrowX = pipsEndX + arrowOffset;

            for (let i = 0; i < totalPages; i++) {
                const isCurrentPagePip = i === currentPage;
                const pipX = pipsStartX + i * pipSpacing;

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

            // Left arrow (higher z-index to sit on top and take priority)
            const leftArrowBg = k.add([
                k.rect(30, 30),
                k.pos(leftArrowX, y),
                k.anchor('center'),
                k.color(0, 0, 0),
                k.opacity(0),
                k.area({ width: 30, height: 30 }),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
            ]);

            const leftArrowText = k.add([
                k.text('<', { size: 24 }),
                k.pos(leftArrowX, y),
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

            // Right arrow (higher z-index to sit on top and take priority)
            const rightArrowBg = k.add([
                k.rect(30, 30),
                k.pos(rightArrowX, y),
                k.anchor('center'),
                k.color(0, 0, 0),
                k.opacity(0),
                k.area({ width: 30, height: 30 }),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
            ]);

            const rightArrowText = k.add([
                k.text('>', { size: 24 }),
                k.pos(rightArrowX, y),
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
            const colPositions = LEADERBOARD_COLS;

            headers.forEach((header, i) => {
                // Numeric columns (Score/Floor/Time = indices 2..4) are right-anchored
                // so their header lines up with the right-aligned digits below.
                const anchor = i === 0 ? 'center' : (i >= 2 ? 'right' : 'left');
                const headerText = k.add([
                    k.text(header, { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(colPositions[i], y),
                    k.anchor(anchor),
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
            const colPositions = LEADERBOARD_COLS;
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

            // Score (right-anchored so digits align down the column)
            const scoreText = k.add([
                k.text(formatScore(entry.score), { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[2], y),
                k.anchor('right'),
                k.color(...color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(scoreText);

            // Floor (right-anchored so digits align down the column)
            const floorText = k.add([
                k.text(`${entry.floor}`, { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[3], y),
                k.anchor('right'),
                k.color(...color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(floorText);

            // Time (right-anchored so digits align down the column)
            const timeText = k.add([
                k.text(formatTime(entry.time), { size: UI_TEXT_SIZES.BODY }),
                k.pos(colPositions[4], y),
                k.anchor('right'),
                k.color(...color),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            contentElements.push(timeText);

            // Highlight background for current player - make it pop with a
            // stronger fill, a gold outline, and a small 'YOU' marker.
            if (isHighlighted) {
                const bandWidth = 550;
                const highlight = k.add([
                    k.rect(bandWidth, 30),
                    k.pos(k.width() / 2, y),
                    k.anchor('center'),
                    k.color(...UI_COLORS.GOLD),
                    k.opacity(0.22),
                    k.outline(2, k.rgb(...UI_COLORS.GOLD)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
                ]);
                contentElements.push(highlight);

                // 'YOU' marker just left of the highlight band
                const youMarker = k.add([
                    k.text('YOU', { size: UI_TEXT_SIZES.TINY }),
                    k.pos(k.width() / 2 - bandWidth / 2 - 6, y),
                    k.anchor('right'),
                    k.color(...UI_COLORS.GOLD),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                contentElements.push(youMarker);
            }
        }

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

        k.add([
            k.text('BACK', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
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
