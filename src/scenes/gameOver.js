// Game over scene
import { getCurrency, getCurrencyName, getSaveData } from '../systems/metaProgression.js';

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
            k.color(0, 0, 0),
            k.opacity(0.8),
            k.fixed(),
            k.z(999)
        ]);
        
        // Title
        k.add([
            k.text('Game Over', { size: 48 }),
            k.pos(k.width() / 2, 80),
            k.anchor('center'),
            k.color(255, 100, 100),
            k.fixed(),
            k.z(1000)
        ]);
        
        // Run Statistics
        const statsY = 160;
        const statsSpacing = 30;
        
        k.add([
            k.text('Run Statistics', { size: 24 }),
            k.pos(k.width() / 2, statsY),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(1000)
        ]);
        
        k.add([
            k.text(`Floors Reached: ${runStats.floorsReached}`, { size: 18 }),
            k.pos(k.width() / 2, statsY + statsSpacing),
            k.anchor('center'),
            k.color(200, 200, 255),
            k.fixed(),
            k.z(1000)
        ]);
        
        k.add([
            k.text(`Rooms Cleared: ${runStats.roomsCleared}`, { size: 18 }),
            k.pos(k.width() / 2, statsY + statsSpacing * 2),
            k.anchor('center'),
            k.color(200, 200, 255),
            k.fixed(),
            k.z(1000)
        ]);
        
        k.add([
            k.text(`Enemies Killed: ${runStats.enemiesKilled}`, { size: 18 }),
            k.pos(k.width() / 2, statsY + statsSpacing * 3),
            k.anchor('center'),
            k.color(200, 200, 255),
            k.fixed(),
            k.z(1000)
        ]);
        
        if (runStats.bossesKilled > 0) {
            k.add([
                k.text(`Bosses Defeated: ${runStats.bossesKilled}`, { size: 18 }),
                k.pos(k.width() / 2, statsY + statsSpacing * 4),
                k.anchor('center'),
                k.color(255, 200, 100),
                k.fixed(),
                k.z(1000)
            ]);
        }
        
        // Currency earned
        const currencyY = statsY + statsSpacing * (runStats.bossesKilled > 0 ? 6 : 5);
        k.add([
            k.text(`${currencyName} Earned: +${currencyEarned}`, { size: 20 }),
            k.pos(k.width() / 2, currencyY),
            k.anchor('center'),
            k.color(100, 255, 100),
            k.fixed(),
            k.z(1000)
        ]);
        
        k.add([
            k.text(`Total ${currencyName}: ${totalCurrency}`, { size: 18 }),
            k.pos(k.width() / 2, currencyY + 30),
            k.anchor('center'),
            k.color(150, 255, 150),
            k.fixed(),
            k.z(1000)
        ]);
        
        // Lifetime stats (optional, can be expanded)
        const lifetimeY = currencyY + 80;
        k.add([
            k.text('Lifetime Stats', { size: 20 }),
            k.pos(k.width() / 2, lifetimeY),
            k.anchor('center'),
            k.color(200, 200, 200),
            k.fixed(),
            k.z(1000)
        ]);
        
        k.add([
            k.text(`Best Floor: ${saveData.stats.bestFloor} | Total Runs: ${saveData.stats.totalRuns}`, { size: 16 }),
            k.pos(k.width() / 2, lifetimeY + 25),
            k.anchor('center'),
            k.color(150, 150, 150),
            k.fixed(),
            k.z(1000)
        ]);
        
        // Restart prompt
        k.add([
            k.text('Press SPACE to Restart', { size: 24 }),
            k.pos(k.width() / 2, k.height() - 60),
            k.anchor('center'),
            k.color(150, 150, 150),
            k.fixed(),
            k.z(1000)
        ]);
        
        k.add([
            k.text('Press T for Statistics | ESC to Return to Menu', { size: 16 }),
            k.pos(k.width() / 2, k.height() - 30),
            k.anchor('center'),
            k.color(120, 120, 120),
            k.fixed(),
            k.z(1000)
        ]);
        
        k.onKeyPress('space', () => {
            // Reset game state when restarting
            k.go('game', { resetState: true });
        });
        
        k.onKeyPress('t', () => {
            k.go('statistics');
        });
        
        k.onKeyPress('escape', () => {
            // Return to menu
            k.go('menu');
        });
    });
}

