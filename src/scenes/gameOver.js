// Game over scene
import { getCurrency, getCurrencyName, getSaveData } from '../systems/metaProgression.js';
import { playMenuSelect, playMenuNav } from '../systems/sounds.js';
import { isMultiplayerActive, isHost } from '../systems/multiplayerGame.js';
import { onMessage, offMessage, broadcast } from '../systems/networkSystem.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    UI_TERMS
} from '../config/uiConfig.js';

export function setupGameOverScene(k) {
    k.scene('gameOver', (args) => {
        const runStats = args?.runStats || {
            floorsReached: 1,
            roomsCleared: 0,
            enemiesKilled: 0,
            bossesKilled: 0
        };
        const currencyEarned = args?.currencyEarned || 0;
        const totalCurrency = getCurrency();
        const saveData = getSaveData();
        const currencyName = getCurrencyName();
        
        // Background overlay
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(...UI_COLORS.BG_DARK),
            k.opacity(0.95),
            k.fixed(),
            k.z(UI_Z_LAYERS.OVERLAY)
        ]);

        // Title
        k.add([
            k.text('Game Over', { size: 48 }),
            k.pos(k.width() / 2, 80),
            k.anchor('center'),
            k.color(...UI_COLORS.DANGER),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);
        
        // Run Statistics
        const statsY = 160;
        const statsSpacing = 30;
        
        k.add([
            k.text('Run Statistics', { size: UI_TEXT_SIZES.HEADER }),
            k.pos(k.width() / 2, statsY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        k.add([
            k.text(`${UI_TERMS.FLOOR}s Reached: ${runStats.floorsReached}`, { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() / 2, statsY + statsSpacing),
            k.anchor('center'),
            k.color(...UI_COLORS.INFO),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        k.add([
            k.text(`${UI_TERMS.ROOM}s Cleared: ${runStats.roomsCleared}`, { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() / 2, statsY + statsSpacing * 2),
            k.anchor('center'),
            k.color(...UI_COLORS.INFO),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        k.add([
            k.text(`Enemies Killed: ${runStats.enemiesKilled}`, { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() / 2, statsY + statsSpacing * 3),
            k.anchor('center'),
            k.color(...UI_COLORS.INFO),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        if (runStats.bossesKilled > 0) {
            k.add([
                k.text(`Bosses Defeated: ${runStats.bossesKilled}`, { size: UI_TEXT_SIZES.LABEL }),
                k.pos(k.width() / 2, statsY + statsSpacing * 4),
                k.anchor('center'),
                k.color(...UI_COLORS.BOSS_NAME),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL)
            ]);
        }

        // Currency earned
        const currencyY = statsY + statsSpacing * (runStats.bossesKilled > 0 ? 6 : 5);
        k.add([
            k.text(`${currencyName} Earned: +${currencyEarned}`, { size: UI_TEXT_SIZES.BUTTON }),
            k.pos(k.width() / 2, currencyY),
            k.anchor('center'),
            k.color(...UI_COLORS.SUCCESS),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        k.add([
            k.text(`Total ${currencyName}: ${totalCurrency}`, { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() / 2, currencyY + 30),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);
        
        // Lifetime stats (optional, can be expanded)
        const lifetimeY = currencyY + 80;
        k.add([
            k.text('Lifetime Stats', { size: UI_TEXT_SIZES.BUTTON }),
            k.pos(k.width() / 2, lifetimeY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        k.add([
            k.text(`Best ${UI_TERMS.FLOOR}: ${saveData.stats.bestFloor} | Total Runs: ${saveData.stats.totalRuns}`, { size: UI_TEXT_SIZES.BODY }),
            k.pos(k.width() / 2, lifetimeY + 25),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_TERTIARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Restart prompt - different text for host vs client in multiplayer
        const inMultiplayer = isMultiplayerActive();
        const isHostPlayer = isHost();

        const restartText = inMultiplayer && !isHostPlayer
            ? 'Waiting for Host to Restart...'
            : 'Press SPACE to Restart';

        k.add([
            k.text(restartText, { size: UI_TEXT_SIZES.HEADER }),
            k.pos(k.width() / 2, k.height() - 60),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_TERTIARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        k.add([
            k.text('Press T for Statistics | ESC to Return to Menu', { size: UI_TEXT_SIZES.BODY }),
            k.pos(k.width() / 2, k.height() - 30),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL)
        ]);

        // Listen for restart signal from host (clients only)
        if (inMultiplayer && !isHostPlayer) {
            onMessage('game_restart', () => {
                playMenuSelect();
                offMessage('game_restart');
                k.go('game', { resetState: true });
            });
        }

        k.onKeyPress('space', () => {
            // In multiplayer, only host can trigger restart
            if (inMultiplayer && !isHostPlayer) {
                return; // Client waits for host signal
            }

            playMenuSelect();

            // Broadcast restart to clients before going to game
            if (inMultiplayer && isHostPlayer) {
                broadcast('game_restart', {});
            }

            // Reset game state when restarting
            k.go('game', { resetState: true });
        });

        k.onKeyPress('t', () => {
            playMenuNav();
            k.go('statistics');
        });

        k.onKeyPress('escape', () => {
            playMenuNav();
            // Clean up message listener
            if (inMultiplayer && !isHostPlayer) {
                offMessage('game_restart');
            }
            // Return to menu
            k.go('menu');
        });
    });
}

