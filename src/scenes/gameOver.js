// Game over scene - TV Station themed with player comparison table and currency animation
import { getCurrency, getCurrencyName, getSaveData, getSelectedCharacter, getPlayerName, calculateRunXP, addXP, getPlayerLevel, getXPProgress, getTotalXP, getXPForNextLevel } from '../systems/metaProgression.js';
import { playMenuSelect, playMenuNav, stopMusic, playDefeatMusic } from '../systems/sounds.js';
import { isMultiplayerActive, isHost } from '../systems/multiplayerGame.js';
import { onMessage, offMessage, broadcast } from '../systems/networkSystem.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { MINIBOSS_TYPES } from '../data/minibosses.js';
import { BOSS_TYPES } from '../data/bosses.js';
import { ACHIEVEMENTS, ACHIEVEMENT_COLORS } from '../data/achievements.js';
import { getRunUnlockedAchievements } from '../systems/achievementChecker.js';
import { showAchievementModal } from '../components/achievementModal.js';
import { calculateScore, submitScore, formatScore } from '../systems/leaderboards.js';
import { getGlobalRank } from '../systems/onlineLeaderboards.js';
import { markDailyCompleted, getTodayDateString } from '../systems/dailyRuns.js';
import {
    UI_SIZES,
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    UI_TERMS,
    createProgressBar
} from '../config/uiConfig.js';
import { createButton } from '../config/uiComponents.js';

// Get enemy name from data files, with fallback to type key
function getEnemyName(type) {
    if (ENEMY_TYPES[type]?.name) return ENEMY_TYPES[type].name;
    if (MINIBOSS_TYPES[type]?.name) return MINIBOSS_TYPES[type].name;
    if (BOSS_TYPES[type]?.name) return BOSS_TYPES[type].name;
    return type;
}

// Get enemy character for display
function getEnemyChar(type) {
    return ENEMY_TYPES[type]?.char || MINIBOSS_TYPES[type]?.char || BOSS_TYPES[type]?.char || 'E';
}

// Get enemy color for display
function getEnemyColor(type) {
    return ENEMY_TYPES[type]?.color || MINIBOSS_TYPES[type]?.color || BOSS_TYPES[type]?.color || [255, 100, 100];
}

// Currency icons for variety (gold themed)
const CURRENCY_ICONS = ['$', '¢', '£', '¥', '€'];

// Award definitions
const AWARDS = [
    { id: 'slayer', title: 'Slayer', icon: '⚔', check: (stats) => stats.kills || 0, color: [255, 100, 100] },
    { id: 'collector', title: 'Hoarder', icon: '💰', check: (stats) => stats.creditsPickedUp || 0, color: [255, 215, 0] },
    { id: 'bossBuster', title: 'Boss Buster', icon: '👑', check: (stats) => stats.bossesKilled || 0, color: [255, 150, 50] }
];

export function setupGameOverScene(k) {
    k.scene('gameOver', (args) => {
        // Stop combat music, play defeat music
        stopMusic();
        playDefeatMusic();

        const runStats = args?.runStats || {
            floorsReached: 1,
            roomsCleared: 0,
            enemiesKilled: 0,
            bossesKilled: 0,
            killsByType: {}
        };
        const currencyEarned = args?.currencyEarned || 0;
        const totalCurrency = getCurrency();
        const saveData = getSaveData();
        const currencyName = getCurrencyName();
        const partyStats = args?.partyStats || [];
        const isDailyRun = args?.isDailyRun || false;
        const dailyCharacter = args?.dailyCharacter || null;

        // Calculate duration
        const duration = runStats.startTime ? (Date.now() - runStats.startTime) / 1000 : 0;

        // Calculate and submit score
        const score = calculateScore({
            floorsReached: runStats.floorsReached || 1,
            enemiesKilled: runStats.enemiesKilled || 0,
            bossesKilled: runStats.bossesKilled || 0,
            duration: duration
        });

        const character = dailyCharacter || getSelectedCharacter() || 'survivor';

        // Submit to leaderboards
        const leaderboardResult = submitScore({
            score: score,
            floor: runStats.floorsReached || 1,
            character: character,
            time: duration,
            isDaily: isDailyRun,
            date: getTodayDateString()
        });

        // Mark daily as completed if it was a daily run
        if (isDailyRun) {
            markDailyCompleted({
                score: score,
                floor: runStats.floorsReached || 1,
                character: character,
                duration: duration
            });
        }

        // Calculate total credits from all players
        const totalTeamCredits = partyStats.length > 0
            ? partyStats.reduce((sum, p) => sum + (p.creditsPickedUp || 0), 0)
            : currencyEarned;

        // Get achievements unlocked this run
        const unlockedAchievementIds = getRunUnlockedAchievements();

        // Calculate and award XP for this run
        const xpEarned = calculateRunXP({
            floorsReached: runStats.floorsReached || 1,
            enemiesKilled: runStats.enemiesKilled || 0,
            bossesKilled: runStats.bossesKilled || 0,
            isDailyRun: isDailyRun
        });
        const xpResult = addXP(xpEarned);
        const leveledUp = xpResult.levelsGained > 0;

        // Background overlay
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(20, 15, 25),
            k.opacity(0.98),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        // ==========================================
        // HEADER SECTION - Title, Score, Rankings
        // ==========================================
        const headerY = 25;

        // Title
        k.add([
            k.text('BROADCAST TERMINATED', { size: 28 }),
            k.pos(k.width() / 2, headerY),
            k.anchor('center'),
            k.color(...UI_COLORS.DANGER),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Score display - large and centered
        k.add([
            k.text(`SCORE: ${formatScore(score)}`, { size: 22 }),
            k.pos(k.width() / 2, headerY + 32),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Run summary - compact horizontal
        k.add([
            k.text(`Floor ${runStats.floorsReached} | ${runStats.roomsCleared} Rooms | ${runStats.enemiesKilled} Kills | ${Math.floor(duration)}s`, { size: 12 }),
            k.pos(k.width() / 2, headerY + 54),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // ==========================================
        // RANKINGS ROW - Below header, above table
        // ==========================================
        const rankRowY = headerY + 75;

        // Build rank display strings
        let localRankText = '';
        if (isDailyRun && leaderboardResult.dailyRank) {
            localRankText = `Daily #${leaderboardResult.dailyRank}`;
            if (leaderboardResult.dailyRank === 1) localRankText += ' NEW RECORD!';
        } else if (leaderboardResult.rank) {
            localRankText = `All-Time #${leaderboardResult.rank}`;
            if (leaderboardResult.isNewBest) localRankText += ' PERSONAL BEST!';
        }

        if (localRankText) {
            k.add([
                k.text(localRankText, { size: 14 }),
                k.pos(k.width() / 2 - 120, rankRowY),
                k.anchor('center'),
                k.color(...(leaderboardResult.isNewBest ? UI_COLORS.SUCCESS : UI_COLORS.TEXT_PRIMARY)),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);
        }

        // Global rank - fetched async
        const globalRankLabel = k.add([
            k.text('Global: ...', { size: 14 }),
            k.pos(k.width() / 2 + 120, rankRowY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        const playerName = getPlayerName() || 'Anonymous';
        getGlobalRank(playerName, score).then(result => {
            if (!globalRankLabel.exists()) return;
            if (result.error) {
                globalRankLabel.text = 'Global: offline';
            } else if (result.rank) {
                globalRankLabel.text = `Global #${result.rank} of ${result.total}`;
                globalRankLabel.color = k.rgb(...UI_COLORS.GOLD);
            } else {
                globalRankLabel.text = 'Global: unranked';
            }
        });

        // ==========================================
        // PLAYER COMPARISON TABLE
        // ==========================================
        const tableStartY = rankRowY + 30;
        const numPlayers = Math.max(partyStats.length, 1);

        // Build player data
        const playersToShow = partyStats.length > 0 ? partyStats : [{
            name: playerName,
            characterData: { char: '@', color: [255, 255, 255] },
            kills: runStats.enemiesKilled,
            creditsPickedUp: currencyEarned,
            bossesKilled: runStats.bossesKilled,
            achievements: unlockedAchievementIds // For single player, all achievements belong to them
        }];

        // Calculate awards - for single player, award all qualifying awards
        // For multiplayer, only the best player for each category gets the award
        const awardWinners = {};
        if (playersToShow.length === 1) {
            // Single player gets all awards they qualify for
            const player = playersToShow[0];
            AWARDS.forEach(award => {
                const value = award.check(player);
                if (value > 0) {
                    if (!awardWinners[player.name]) {
                        awardWinners[player.name] = [];
                    }
                    awardWinners[player.name].push(award);
                }
            });
        } else {
            // Multiplayer: only best player for each award
            AWARDS.forEach(award => {
                let bestPlayer = null;
                let bestValue = 0;
                playersToShow.forEach(player => {
                    const value = award.check(player);
                    if (value > bestValue) {
                        bestValue = value;
                        bestPlayer = player;
                    }
                });
                if (bestPlayer && bestValue > 0) {
                    if (!awardWinners[bestPlayer.name]) {
                        awardWinners[bestPlayer.name] = [];
                    }
                    awardWinners[bestPlayer.name].push(award);
                }
            });
        }

        // Table layout constants - leave room for kill panel on right (160px)
        const killPanelReservedWidth = 170; // 140px panel + 30px gap
        const tableWidth = Math.min(k.width() - killPanelReservedWidth - 30, 500);
        const tableX = 20;
        const colWidth = (tableWidth - 80) / numPlayers; // 80px for label column
        const rowHeight = 28;
        const labelColWidth = 80;

        // Table background
        const tableHeight = rowHeight * 7 + 10; // 7 rows + padding
        k.add([
            k.rect(tableWidth, tableHeight),
            k.pos(tableX, tableStartY),
            k.color(30, 25, 35),
            k.outline(2, k.rgb(60, 50, 80)),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Table header row (player names with icons)
        let currentY = tableStartY + 8;

        // Row labels
        const rowLabels = ['', 'Kills', 'Credits', 'Bosses', 'Awards', 'Achievements'];

        // Header row - Player icons and names
        playersToShow.forEach((player, idx) => {
            const colX = tableX + labelColWidth + idx * colWidth + colWidth / 2;

            // Character icon
            const charIcon = player.characterData?.char || '@';
            const charColor = player.characterData?.color || [255, 255, 255];

            k.add([
                k.text(charIcon, { size: 20 }),
                k.pos(colX, currentY + 3),
                k.anchor('center'),
                k.color(...charColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 1)
            ]);

            // Player name (below icon)
            const maxNameLen = numPlayers <= 2 ? 12 : (numPlayers === 3 ? 8 : 6);
            const displayName = (player.name || `P${idx + 1}`).substring(0, maxNameLen);
            k.add([
                k.text(displayName, { size: 11 }),
                k.pos(colX, currentY + 20),
                k.anchor('center'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 1)
            ]);
        });
        currentY += rowHeight + 8;

        // Data rows
        const rowData = [
            { label: 'Kills', getValue: (p) => p.kills || 0, color: UI_COLORS.DANGER },
            { label: 'Credits', getValue: (p) => p.creditsPickedUp || 0, color: UI_COLORS.GOLD },
            { label: 'Bosses', getValue: (p) => p.bossesKilled || 0, color: [255, 150, 50] }
        ];

        rowData.forEach(row => {
            // Row label
            k.add([
                k.text(row.label, { size: 12 }),
                k.pos(tableX + 10, currentY),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 1)
            ]);

            // Values for each player
            playersToShow.forEach((player, idx) => {
                const colX = tableX + labelColWidth + idx * colWidth + colWidth / 2;
                const value = row.getValue(player);

                k.add([
                    k.text(String(value), { size: 14 }),
                    k.pos(colX, currentY),
                    k.anchor('center'),
                    k.color(...row.color),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);
            });

            currentY += rowHeight;
        });

        // Awards row
        k.add([
            k.text('Awards', { size: 12 }),
            k.pos(tableX + 10, currentY),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);

        playersToShow.forEach((player, idx) => {
            const colX = tableX + labelColWidth + idx * colWidth + colWidth / 2;
            const playerAwards = awardWinners[player.name] || [];

            if (playerAwards.length > 0) {
                const awardIcons = playerAwards.map(a => a.icon).join(' ');
                k.add([
                    k.text(awardIcons, { size: 14 }),
                    k.pos(colX, currentY),
                    k.anchor('center'),
                    k.color(255, 220, 100),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);
            } else {
                k.add([
                    k.text('-', { size: 14 }),
                    k.pos(colX, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_DISABLED),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);
            }
        });
        currentY += rowHeight;

        // Achievements row - clickable icons
        k.add([
            k.text('Unlocks', { size: 12 }),
            k.pos(tableX + 10, currentY),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);

        playersToShow.forEach((player, idx) => {
            const colX = tableX + labelColWidth + idx * colWidth + colWidth / 2;

            // For multiplayer, achievements would be per-player
            // For single player, show all achievements
            const playerAchievements = player.achievements || (idx === 0 ? unlockedAchievementIds : []);

            if (playerAchievements.length > 0) {
                const maxIcons = Math.min(playerAchievements.length, 3);
                const iconSize = 22;
                const iconSpacing = 4;
                const totalWidth = maxIcons * iconSize + (maxIcons - 1) * iconSpacing;
                const startX = colX - totalWidth / 2 + iconSize / 2;

                playerAchievements.slice(0, maxIcons).forEach((achId, achIdx) => {
                    const achievement = ACHIEVEMENTS[achId];
                    if (!achievement) return;

                    const achX = startX + achIdx * (iconSize + iconSpacing);
                    const difficultyColor = ACHIEVEMENT_COLORS[achievement.difficulty] || ACHIEVEMENT_COLORS.normal;

                    // Achievement icon box
                    const achBox = k.add([
                        k.rect(iconSize, iconSize),
                        k.pos(achX, currentY),
                        k.anchor('center'),
                        k.color(40, 35, 50),
                        k.outline(2, k.rgb(...difficultyColor)),
                        k.area(),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.MODAL + 1)
                    ]);

                    k.add([
                        k.text(achievement.icon, { size: 12 }),
                        k.pos(achX, currentY),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.MODAL + 2)
                    ]);

                    achBox.onClick(() => {
                        playMenuNav();
                        showAchievementModal(k, achievement);
                    });
                    achBox.cursor = 'pointer';
                });

                // Show +N more if needed
                if (playerAchievements.length > maxIcons) {
                    const moreCount = playerAchievements.length - maxIcons;
                    const moreX = startX + maxIcons * (iconSize + iconSpacing);
                    k.add([
                        k.text(`+${moreCount}`, { size: 10 }),
                        k.pos(moreX, currentY),
                        k.anchor('left'),
                        k.color(200, 180, 100),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.MODAL + 1)
                    ]);
                }
            } else {
                k.add([
                    k.text('-', { size: 14 }),
                    k.pos(colX, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_DISABLED),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);
            }
        });

        // ==========================================
        // MONEY BUCKET ANIMATION - Below table
        // ==========================================
        const bucketSectionY = tableStartY + tableHeight + 15;
        // Calculate bucket width based on available space and player count
        const maxBucketWidth = numPlayers === 1 ? 180 : (numPlayers === 2 ? 160 : (numPlayers === 3 ? 120 : 100));
        const bucketSpacing = 8;
        // Ensure buckets fit within table width
        const availableWidth = tableWidth - 20; // 10px padding on each side
        const calculatedBucketWidth = (availableWidth - (numPlayers - 1) * bucketSpacing) / numPlayers;
        const bucketWidth = Math.min(maxBucketWidth, calculatedBucketWidth);
        const bucketHeight = 80;
        const totalBucketsWidth = numPlayers * bucketWidth + (numPlayers - 1) * bucketSpacing;
        const bucketStartX = tableX + (tableWidth - totalBucketsWidth) / 2 + bucketWidth / 2;

        const playerBuckets = [];

        playersToShow.forEach((player, index) => {
            const bucketX = bucketStartX + index * (bucketWidth + bucketSpacing);
            const credits = player.creditsPickedUp || 0;

            // Bucket container
            k.add([
                k.rect(bucketWidth - 10, bucketHeight),
                k.pos(bucketX, bucketSectionY + bucketHeight / 2),
                k.anchor('center'),
                k.outline(3, k.rgb(...UI_COLORS.TEXT_DISABLED)),
                k.color(0, 0, 0),
                k.opacity(0.5),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);

            // Currency label below bucket
            const currencyLabel = k.add([
                k.text(`0 ${currencyName}`, { size: 16 }),
                k.pos(bucketX, bucketSectionY + bucketHeight + 14),
                k.anchor('center'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 10)
            ]);

            playerBuckets.push({
                x: bucketX,
                y: bucketSectionY,
                width: bucketWidth - 10,
                height: bucketHeight,
                credits: credits,
                label: currencyLabel,
                particles: [],
                spawnedCount: 0,
                displayedCount: 0
            });
        });

        // Currency drop animation
        const maxParticlesPerPlayer = 35;
        const particleSpawnDelay = 0.06;
        const particleFallSpeed = 280;
        let animationTimer = 0;
        const animationStartDelay = 0.5;

        k.onUpdate(() => {
            animationTimer += k.dt();
            if (animationTimer < animationStartDelay) return;

            playerBuckets.forEach((bucket, bucketIndex) => {
                if (bucket.credits <= 0) return;

                const targetParticles = Math.min(bucket.credits, maxParticlesPerPlayer);
                const particleValue = bucket.credits / targetParticles;

                const spawnTime = (animationTimer - animationStartDelay) - (bucketIndex * 0.12);
                const targetSpawned = Math.floor(spawnTime / particleSpawnDelay);

                while (bucket.spawnedCount < targetParticles && bucket.spawnedCount < targetSpawned) {
                    const startX = bucket.x + (Math.random() - 0.5) * (bucket.width - 16);
                    const startY = bucket.y - 30 - Math.random() * 25;
                    const icon = CURRENCY_ICONS[Math.floor(Math.random() * CURRENCY_ICONS.length)];

                    const particle = k.add([
                        k.text(icon, { size: 14 }),
                        k.pos(startX, startY),
                        k.anchor('center'),
                        k.color(255, 215, 0),
                        k.opacity(1),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.MODAL + 5),
                        'currencyParticle',
                        {
                            velocity: particleFallSpeed + Math.random() * 60,
                            landed: false,
                            value: particleValue
                        }
                    ]);

                    bucket.particles.push(particle);
                    bucket.spawnedCount++;
                }

                // Update particles
                bucket.particles.forEach(particle => {
                    if (!particle.exists() || particle.landed) return;

                    particle.pos.y += particle.velocity * k.dt();

                    const bucketBottom = bucket.y + bucket.height - 6;
                    const stackHeight = bucket.particles.filter(p => p.landed).length * 1.5;
                    const landingY = bucketBottom - stackHeight;

                    if (particle.pos.y >= landingY) {
                        particle.pos.y = landingY;
                        particle.landed = true;
                        bucket.displayedCount += particle.value;
                        bucket.label.text = `${Math.floor(bucket.displayedCount)} ${currencyName}`;
                        particle.opacity = 0.85;
                    }
                });
            });
        });

        // ==========================================
        // KILL BREAKDOWN - Right side panel
        // ==========================================
        const killPanelX = k.width() - 160;
        const killPanelY = tableStartY;
        const killPanelWidth = 140;
        const killPanelHeight = tableHeight + bucketHeight + 30;

        // Kill panel background
        k.add([
            k.rect(killPanelWidth, killPanelHeight),
            k.pos(killPanelX - killPanelWidth / 2, killPanelY),
            k.color(25, 20, 30),
            k.outline(2, k.rgb(50, 40, 60)),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Kill panel title
        k.add([
            k.text('STAFF', { size: 14 }),
            k.pos(killPanelX, killPanelY + 12),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);
        k.add([
            k.text('TERMINATED', { size: 14 }),
            k.pos(killPanelX, killPanelY + 26),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);

        // Kill list
        const killsByType = runStats.killsByType || {};
        const sortedKills = Object.entries(killsByType)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);

        let killY = killPanelY + 48;
        const killSpacing = 20;
        const maxKillsToShow = Math.floor((killPanelHeight - 60) / killSpacing);

        if (sortedKills.length === 0) {
            k.add([
                k.text('No staff', { size: 12 }),
                k.pos(killPanelX, killY + 10),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_DISABLED),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 1)
            ]);
            k.add([
                k.text('harmed', { size: 12 }),
                k.pos(killPanelX, killY + 24),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_DISABLED),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 1)
            ]);
        } else {
            const showCount = Math.min(sortedKills.length, maxKillsToShow);

            for (let i = 0; i < showCount; i++) {
                const [type, count] = sortedKills[i];
                const char = getEnemyChar(type);
                const color = getEnemyColor(type);

                // Enemy icon
                k.add([
                    k.text(char, { size: 14 }),
                    k.pos(killPanelX - 50, killY),
                    k.anchor('center'),
                    k.color(...color),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);

                // Short name
                const name = getEnemyName(type);
                const shortName = name.length > 8 ? name.substring(0, 6) + '..' : name;
                k.add([
                    k.text(shortName, { size: 10 }),
                    k.pos(killPanelX - 35, killY),
                    k.anchor('left'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);

                // Count
                k.add([
                    k.text(`x${count}`, { size: 11 }),
                    k.pos(killPanelX + 55, killY),
                    k.anchor('right'),
                    k.color(...UI_COLORS.DANGER),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);

                killY += killSpacing;
            }

            if (sortedKills.length > showCount) {
                const remaining = sortedKills.slice(showCount).reduce((sum, [_, c]) => sum + c, 0);
                k.add([
                    k.text(`+${remaining} more`, { size: 10 }),
                    k.pos(killPanelX, killY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_DISABLED),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);
            }
        }

        // ==========================================
        // FOOTER - Totals and Controls
        // ==========================================
        const footerY = k.height() - 90;

        // Team earnings (left side)
        k.add([
            k.text(`+${totalTeamCredits} ${currencyName}`, { size: 16 }),
            k.pos(k.width() / 2 - 100, footerY),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // XP earned (right side)
        const xpColor = leveledUp ? UI_COLORS.SUCCESS : [150, 200, 255];
        const xpText = leveledUp
            ? `+${xpEarned} XP (LEVEL UP!)`
            : `+${xpEarned} XP`;
        k.add([
            k.text(xpText, { size: 16 }),
            k.pos(k.width() / 2 + 100, footerY),
            k.anchor('center'),
            k.color(...xpColor),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Level and progress bar
        const currentLevel = getPlayerLevel();
        const xpProgress = getXPProgress();
        const currentXP = getTotalXP();
        const nextLevelXP = getXPForNextLevel();

        k.add([
            k.text(`Level ${currentLevel}`, { size: 12 }),
            k.pos(k.width() / 2, footerY + 18),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // XP progress bar
        const barWidth = 200;
        const barHeight = 8;
        const barX = k.width() / 2;
        const barY = footerY + 32;

        // Bar background
        k.add([
            k.rect(barWidth, barHeight),
            k.pos(barX, barY),
            k.anchor('center'),
            k.color(40, 40, 60),
            k.outline(1, k.rgb(80, 80, 100)),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Bar fill
        k.add([
            k.rect(barWidth * xpProgress, barHeight - 2),
            k.pos(barX - barWidth / 2 + (barWidth * xpProgress) / 2 + 1, barY),
            k.anchor('center'),
            k.color(100, 180, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);

        // XP numbers
        k.add([
            k.text(`${currentXP} / ${nextLevelXP} XP`, { size: 10 }),
            k.pos(k.width() / 2, barY + 12),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Buttons
        const inMultiplayer = isMultiplayerActive();
        const isHostPlayer = isHost();
        const buttonY = k.height() - 30;
        const { LG, SM } = UI_SIZES.BUTTON;

        const playAgainEnabled = !inMultiplayer || isHostPlayer;
        const playAgainText = inMultiplayer && !isHostPlayer ? 'Waiting...' : 'PLAY AGAIN';

        // Play Again button
        const playAgainBg = k.add([
            k.rect(LG.width, LG.height),
            k.pos(k.width() / 2 - 80, buttonY),
            k.anchor('center'),
            k.color(...(playAgainEnabled ? UI_COLORS.SUCCESS : UI_COLORS.BG_DISABLED)),
            k.outline(2, k.rgb(...(playAgainEnabled ? UI_COLORS.BORDER : UI_COLORS.BG_DARK))),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        const playAgainLabel = k.add([
            k.text(playAgainText, { size: UI_TEXT_SIZES.H2 }),
            k.pos(k.width() / 2 - 80, buttonY),
            k.anchor('center'),
            k.color(...(playAgainEnabled ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_DISABLED)),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);

        // Menu button
        const menuBg = k.add([
            k.rect(SM.width, SM.height),
            k.pos(k.width() / 2 + 100, buttonY),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        const menuLabel = k.add([
            k.text('MENU', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2 + 100, buttonY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);

        // Button hover effects
        if (playAgainEnabled) {
            playAgainBg.onHoverUpdate(() => {
                playAgainBg.color = k.rgb(...(UI_COLORS.SUCCESS_HOVER || [80, 180, 80]));
                playAgainBg.scale = k.vec2(1.02, 1.02);
                playAgainLabel.scale = k.vec2(1.02, 1.02);
            });
            playAgainBg.onHoverEnd(() => {
                playAgainBg.color = k.rgb(...UI_COLORS.SUCCESS);
                playAgainBg.scale = k.vec2(1, 1);
                playAgainLabel.scale = k.vec2(1, 1);
            });
        }

        menuBg.onHoverUpdate(() => {
            menuBg.color = k.rgb(...UI_COLORS.NEUTRAL_HOVER);
            menuBg.scale = k.vec2(1.02, 1.02);
            menuLabel.scale = k.vec2(1.02, 1.02);
        });
        menuBg.onHoverEnd(() => {
            menuBg.color = k.rgb(...UI_COLORS.NEUTRAL);
            menuBg.scale = k.vec2(1, 1);
            menuLabel.scale = k.vec2(1, 1);
        });

        // Button click handlers
        if (playAgainEnabled) {
            playAgainBg.onClick(() => {
                playMenuSelect();
                if (inMultiplayer && isHostPlayer) {
                    broadcast('game_restart', {});
                }
                k.go('game', { resetState: true });
            });
        }

        menuBg.onClick(() => {
            playMenuNav();
            if (inMultiplayer && !isHostPlayer) {
                offMessage('game_restart');
            }
            k.go('menu');
        });

        // Network handlers
        if (inMultiplayer && !isHostPlayer) {
            onMessage('game_restart', () => {
                playMenuSelect();
                offMessage('game_restart');
                k.go('game', { resetState: true });
            });
        }

        // Keyboard shortcuts
        k.onKeyPress('space', () => {
            if (inMultiplayer && !isHostPlayer) return;
            playMenuSelect();
            if (inMultiplayer && isHostPlayer) {
                broadcast('game_restart', {});
            }
            k.go('game', { resetState: true });
        });

        k.onKeyPress('escape', () => {
            playMenuNav();
            if (inMultiplayer && !isHostPlayer) {
                offMessage('game_restart');
            }
            k.go('menu');
        });
    });
}
