// Main menu scene
import { getCurrency, getCurrencyName } from '../systems/metaProgression.js';

export function setupMenuScene(k) {
    k.scene('menu', () => {
        const currency = getCurrency();
        const currencyName = getCurrencyName();
        
        // Currency display (top right)
        k.add([
            k.text(`${currencyName}: ${currency}`, { size: 18 }),
            k.pos(k.width() - 20, 20),
            k.anchor('topright'),
            k.color(100, 255, 100),
            k.fixed()
        ]);
        
        k.add([
            k.text('SuperSmashTexty', { size: 48 }),
            k.pos(k.width() / 2, k.height() / 2 - 100),
            k.anchor('center'),
            k.color(255, 255, 255)
        ]);
        
        k.add([
            k.text('Press SPACE to Start', { size: 24 }),
            k.pos(k.width() / 2, k.height() / 2 + 50),
            k.anchor('center'),
            k.color(150, 150, 150)
        ]);
        
        k.add([
            k.text('WASD: Move | Mouse: Aim', { size: 16 }),
            k.pos(k.width() / 2, k.height() / 2 + 100),
            k.anchor('center'),
            k.color(100, 100, 100)
        ]);
        
        k.add([
            k.text('Press C for Character Select', { size: 14 }),
            k.pos(k.width() / 2, k.height() / 2 + 130),
            k.anchor('center'),
            k.color(150, 150, 200)
        ]);
        
        k.add([
            k.text('Press S for Shop', { size: 14 }),
            k.pos(k.width() / 2, k.height() / 2 + 155),
            k.anchor('center'),
            k.color(150, 150, 200)
        ]);
        
        k.add([
            k.text('Press O for Settings', { size: 14 }),
            k.pos(k.width() / 2, k.height() / 2 + 180),
            k.anchor('center'),
            k.color(150, 150, 200)
        ]);
        
        k.add([
            k.text('Press T for Statistics', { size: 14 }),
            k.pos(k.width() / 2, k.height() / 2 + 205),
            k.anchor('center'),
            k.color(150, 150, 200)
        ]);
        
        k.onKeyPress('space', () => {
            // Reset game state when starting new game
            k.go('game', { resetState: true });
        });
        
        k.onKeyPress('c', () => {
            k.go('characterSelect');
        });
        
        k.onKeyPress('s', () => {
            k.go('shop');
        });
        
        k.onKeyPress('o', () => {
            k.go('settings');
        });
        
        k.onKeyPress('t', () => {
            k.go('statistics');
        });
    });
}

