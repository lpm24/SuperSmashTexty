// Game over scene - TV Station themed with currency bucket animation
import { getCurrency, getCurrencyName, getSaveData, getSelectedCharacter, getPlayerName } from '../systems/metaProgression.js';
import { playMenuSelect, playMenuNav } from '../systems/sounds.js';
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
    // Check enemies first
    if (ENEMY_TYPES[type]?.name) {
        return ENEMY_TYPES[type].name;
    }
    // Check mini-bosses
    if (MINIBOSS_TYPES[type]?.name) {
        return MINIBOSS_TYPES[type].name;
    }
    // Check bosses
    if (BOSS_TYPES[type]?.name) {
        return BOSS_TYPES[type].name;
    }
    // Fallback to type key
    return type;
}

// Get enemy character for display
function getEnemyChar(type) {
    return ENEMY_TYPES[type]?.char || 'E';
}

// Get enemy color for display
function getEnemyColor(type) {
    return ENEMY_TYPES[type]?.color || [255, 100, 100];
}

// Currency icons for variety (gold themed)
const CURRENCY_ICONS = ['$', '¢', '£', '¥', '€'];

// Award definitions
const AWARDS = [
    {
        id: 'slayer',
        title: 'Slayer',
        check: (stats) => stats.kills || 0,
        color: [255, 100, 100]
    },
    {
        id: 'collector',
        title: 'Hoarder',
        check: (stats) => stats.creditsPickedUp || 0,
        color: [255, 255, 100]
    },
    {
        id: 'bossBuster',
        title: 'Boss Buster',
        check: (stats) => stats.bossesKilled || 0,
        color: [255, 150, 50]
    }
];

export function setupGameOverScene(k) {
    k.scene('gameOver', (args) => {
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

        // Background overlay
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(30, 20, 20),
            k.opacity(0.98),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        // Title
        k.add([
            k.text('BROADCAST TERMINATED', { size: 36 }),
            k.pos(k.width() / 2, 30),
            k.anchor('center'),
            k.color(...UI_COLORS.DANGER),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Run stats summary
        k.add([
            k.text(`Floor ${runStats.floorsReached} | ${runStats.roomsCleared} Rooms | ${runStats.enemiesKilled} Kills`, { size: 16 }),
            k.pos(k.width() / 2, 58),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Score display
        k.add([
            k.text(`SCORE: ${formatScore(score)}`, { size: 24 }),
            k.pos(k.width() / 2, 85),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Show rank if achieved
        let rankText = '';
        if (isDailyRun && leaderboardResult.dailyRank) {
            rankText = `Daily Rank: #${leaderboardResult.dailyRank}`;
            if (leaderboardResult.dailyRank === 1) rankText += ' (NEW RECORD!)';
        } else if (leaderboardResult.rank) {
            rankText = `All-Time Rank: #${leaderboardResult.rank}`;
            if (leaderboardResult.isNewBest) rankText += ' (PERSONAL BEST!)';
        }

        if (rankText) {
            k.add([
                k.text(rankText, { size: 14 }),
                k.pos(k.width() / 2, 108),
                k.anchor('center'),
                k.color(...(leaderboardResult.isNewBest ? UI_COLORS.SUCCESS : UI_COLORS.TEXT_SECONDARY)),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);
        }

        // Fetch and display global rank asynchronously
        const globalRankY = rankText ? 126 : 108;
        const globalRankLabel = k.add([
            k.text('Global Rank: ...', { size: 12 }),
            k.pos(k.width() / 2, globalRankY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        const playerName = getPlayerName() || 'Anonymous';
        getGlobalRank(playerName, score).then(result => {
            if (!globalRankLabel.exists()) return;

            if (result.error) {
                globalRankLabel.text = 'Global Rank: offline';
                globalRankLabel.color = k.rgb(...UI_COLORS.TEXT_DISABLED);
            } else if (result.rank) {
                globalRankLabel.text = `Global Rank: #${result.rank} of ${result.total}`;
                globalRankLabel.color = k.rgb(...UI_COLORS.GOLD);
            } else {
                globalRankLabel.text = 'Global Rank: unranked';
                globalRankLabel.color = k.rgb(...UI_COLORS.TEXT_DISABLED);
            }
        });

        // Calculate awards
        const awardWinners = {};
        if (partyStats.length > 0) {
            AWARDS.forEach(award => {
                let bestPlayer = null;
                let bestValue = 0;
                partyStats.forEach(player => {
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

        // ==========================================
        // PLAYER BUCKETS - LEFT SIDE
        // ==========================================
        const numPlayers = Math.max(partyStats.length, 1);

        // Dynamic sizing based on player count
        const bucketWidth = numPlayers === 1 ? 200 : (numPlayers === 2 ? 180 : 140);
        const bucketHeight = 100;
        const bucketSpacing = 8;

        // Position buckets on left side
        const startX = 20 + bucketWidth / 2;
        const bucketY = 250;

        const playerBuckets = [];

        // Create buckets for each player
        const playersToShow = partyStats.length > 0 ? partyStats : [{
            name: 'You',
            characterData: { char: '@', color: [255, 255, 255] },
            kills: runStats.enemiesKilled,
            creditsPickedUp: currencyEarned,
            bossesKilled: runStats.bossesKilled
        }];

        playersToShow.forEach((player, index) => {
            const bucketX = startX + index * (bucketWidth + bucketSpacing);
            const playerAwards = awardWinners[player.name] || [];
            const credits = player.creditsPickedUp || 0;

            // Character icon
            const charIcon = player.characterData?.char || '@';
            const charColor = player.characterData?.color || [255, 255, 255];

            k.add([
                k.text(charIcon, { size: 32 }),
                k.pos(bucketX, 90),
                k.anchor('center'),
                k.color(...charColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);

            // Player name
            const maxNameLen = numPlayers <= 2 ? 12 : 8;
            const displayName = (player.name || `Player ${index + 1}`).substring(0, maxNameLen);
            k.add([
                k.text(displayName, { size: 16 }),
                k.pos(bucketX, 118),
                k.anchor('center'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);

            // Kill count
            k.add([
                k.text(`${player.kills || 0} kills`, { size: 14 }),
                k.pos(bucketX, 138),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);

            // Awards (show 1-2 based on space)
            let awardY = 156;
            const maxAwards = numPlayers <= 2 ? 2 : 1;
            playerAwards.slice(0, maxAwards).forEach(award => {
                k.add([
                    k.text(`"${award.title}"`, { size: 12 }),
                    k.pos(bucketX, awardY),
                    k.anchor('center'),
                    k.color(...award.color),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL)
                ]);
                awardY += 16;
            });

            // Bucket container
            k.add([
                k.rect(bucketWidth - 16, bucketHeight),
                k.pos(bucketX, bucketY + bucketHeight / 2),
                k.anchor('center'),
                k.outline(3, k.rgb(...UI_COLORS.TEXT_DISABLED)),
                k.color(0, 0, 0),
                k.opacity(0.4),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);

            // Currency label below bucket (gold color)
            const currencyLabel = k.add([
                k.text(`0 ${currencyName}`, { size: 20 }),
                k.pos(bucketX, bucketY + bucketHeight + 18),
                k.anchor('center'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 10)
            ]);

            playerBuckets.push({
                x: bucketX,
                y: bucketY,
                width: bucketWidth - 16,
                height: bucketHeight,
                credits: credits,
                label: currencyLabel,
                particles: [],
                spawnedCount: 0,
                displayedCount: 0
            });
        });

        // ==========================================
        // KILL BREAKDOWN - RIGHT SIDE (20% bigger)
        // ==========================================
        const rightX = k.width() - 140;
        let rightY = 85;

        k.add([
            k.text('STAFF TERMINATED', { size: 22 }),
            k.pos(rightX, rightY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);
        rightY += 32;

        // Get kills by type and sort
        const killsByType = runStats.killsByType || {};
        const sortedKills = Object.entries(killsByType)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);

        if (sortedKills.length === 0) {
            k.add([
                k.text('No staff harmed', { size: 17 }),
                k.pos(rightX, rightY + 10),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_DISABLED),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);
        } else {
            const maxToShow = Math.min(sortedKills.length, 10);
            const killSpacing = 26;

            for (let i = 0; i < maxToShow; i++) {
                const [type, count] = sortedKills[i];
                const tvName = getEnemyName(type);
                const char = getEnemyChar(type);
                const color = getEnemyColor(type);

                // Enemy icon
                k.add([
                    k.text(char, { size: 17 }),
                    k.pos(rightX - 90, rightY),
                    k.anchor('center'),
                    k.color(...color),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL)
                ]);

                // Enemy name (truncated)
                const shortName = tvName.length > 12 ? tvName.substring(0, 10) + '..' : tvName;
                k.add([
                    k.text(shortName, { size: 14 }),
                    k.pos(rightX - 70, rightY),
                    k.anchor('left'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL)
                ]);

                // Kill count
                k.add([
                    k.text(`x${count}`, { size: 14 }),
                    k.pos(rightX + 80, rightY),
                    k.anchor('right'),
                    k.color(...UI_COLORS.DANGER),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL)
                ]);

                rightY += killSpacing;
            }

            if (sortedKills.length > maxToShow) {
                const remainingKills = sortedKills.slice(maxToShow).reduce((sum, [_, c]) => sum + c, 0);
                k.add([
                    k.text(`+${remainingKills} more`, { size: 13 }),
                    k.pos(rightX, rightY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_DISABLED),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL)
                ]);
            }
        }

        // ==========================================
        // ACHIEVEMENTS UNLOCKED - Below kill breakdown
        // ==========================================
        const unlockedAchievementIds = getRunUnlockedAchievements();
        if (unlockedAchievementIds.length > 0) {
            rightY += 30;

            // Section title
            k.add([
                k.text('ACHIEVEMENTS UNLOCKED', { size: 16 }),
                k.pos(rightX, rightY),
                k.anchor('center'),
                k.color(255, 220, 100),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);
            rightY += 24;

            // Show up to 3 achievements inline
            const maxAchievementsToShow = 3;
            const achievementsToShow = unlockedAchievementIds.slice(0, maxAchievementsToShow);
            const boxSize = 50;
            const boxSpacing = 8;
            const totalWidth = achievementsToShow.length * (boxSize + boxSpacing) - boxSpacing;
            let achStartX = rightX - totalWidth / 2;

            achievementsToShow.forEach((achId, index) => {
                const achievement = ACHIEVEMENTS[achId];
                if (!achievement) return;

                const achX = achStartX + index * (boxSize + boxSpacing);
                const difficultyColor = ACHIEVEMENT_COLORS[achievement.difficulty] || ACHIEVEMENT_COLORS.normal;

                // Achievement box background with gold border
                const achBox = k.add([
                    k.rect(boxSize, boxSize),
                    k.pos(achX + boxSize / 2, rightY + boxSize / 2),
                    k.anchor('center'),
                    k.color(40, 35, 50),
                    k.outline(2, k.rgb(255, 200, 100)),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL)
                ]);

                // Achievement icon
                k.add([
                    k.text(achievement.icon, { size: 24 }),
                    k.pos(achX + boxSize / 2, rightY + boxSize / 2 - 5),
                    k.anchor('center'),
                    k.color(...difficultyColor),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);

                // Achievement name (below icon, truncated)
                const shortName = achievement.name.length > 8 ? achievement.name.substring(0, 7) + '..' : achievement.name;
                k.add([
                    k.text(shortName, { size: 10 }),
                    k.pos(achX + boxSize / 2, rightY + boxSize + 8),
                    k.anchor('center'),
                    k.color(200, 200, 200),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 1)
                ]);

                // Click to view achievement details
                achBox.onClick(() => {
                    playMenuNav();
                    showAchievementModal(k, achievement);
                });
            });

            rightY += boxSize + 20;

            // Show "+N more" if there are more achievements
            if (unlockedAchievementIds.length > maxAchievementsToShow) {
                const moreCount = unlockedAchievementIds.length - maxAchievementsToShow;
                const moreText = k.add([
                    k.text(`+${moreCount} more`, { size: 12 }),
                    k.pos(rightX, rightY),
                    k.anchor('center'),
                    k.color(200, 180, 100),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL)
                ]);

                // Make clickable to go to statistics/achievements page
                moreText.onClick(() => {
                    playMenuNav();
                    k.go('statistics');
                });
            }
        }

        // ==========================================
        // CURRENCY DROP ANIMATION
        // ==========================================
        const maxParticlesPerPlayer = 40;
        const particleSpawnDelay = 0.05;
        const particleFallSpeed = 300;
        let animationTimer = 0;
        const animationStartDelay = 0.8;

        k.onUpdate(() => {
            animationTimer += k.dt();
            if (animationTimer < animationStartDelay) return;

            playerBuckets.forEach((bucket, bucketIndex) => {
                if (bucket.credits <= 0) return;

                const targetParticles = Math.min(bucket.credits, maxParticlesPerPlayer);
                const particleValue = bucket.credits / targetParticles;

                const spawnTime = (animationTimer - animationStartDelay) - (bucketIndex * 0.15);
                const targetSpawned = Math.floor(spawnTime / particleSpawnDelay);

                while (bucket.spawnedCount < targetParticles && bucket.spawnedCount < targetSpawned) {
                    const startX = bucket.x + (Math.random() - 0.5) * (bucket.width - 20);
                    const startY = bucket.y - 40 - Math.random() * 30;
                    const icon = CURRENCY_ICONS[Math.floor(Math.random() * CURRENCY_ICONS.length)];

                    const particle = k.add([
                        k.text(icon, { size: 16 }),
                        k.pos(startX, startY),
                        k.anchor('center'),
                        k.color(255, 215, 0), // Gold color
                        k.opacity(1),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.MODAL + 5),
                        'currencyParticle',
                        {
                            velocity: particleFallSpeed + Math.random() * 80,
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

                    const bucketBottom = bucket.y + bucket.height - 8;
                    const stackHeight = bucket.particles.filter(p => p.landed).length * 2;
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
        // BOTTOM: Total & Controls
        // ==========================================
        k.add([
            k.text(`Team Earnings: +${totalTeamCredits} ${currencyName}`, { size: 18 }),
            k.pos(k.width() / 2, k.height() - 95),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        k.add([
            k.text(`Career Total: ${totalCurrency} ${currencyName}`, { size: 14 }),
            k.pos(k.width() / 2, k.height() - 72),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Controls - Buttons using standardized sizes
        const inMultiplayer = isMultiplayerActive();
        const isHostPlayer = isHost();

        const buttonY = k.height() - 40;
        const { LG, SM } = UI_SIZES.BUTTON;

        // Play Again button
        const playAgainEnabled = !inMultiplayer || isHostPlayer;
        const playAgainText = inMultiplayer && !isHostPlayer
            ? 'Waiting...'
            : 'PLAY AGAIN';

        // Play Again button (LG size) - primary CTA
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

        // Menu button (SM size) - secondary action
        const menuBg = k.add([
            k.rect(SM.width, SM.height),
            k.pos(k.width() / 2 + 130, buttonY),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        const menuLabel = k.add([
            k.text('MENU', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2 + 130, buttonY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1)
        ]);

        // Button hover effects
        if (playAgainEnabled) {
            playAgainBg.onHoverUpdate(() => {
                playAgainBg.color = k.rgb(...UI_COLORS.SUCCESS_HOVER || [80, 180, 80]);
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
