// Main menu scene
export function setupMenuScene(k) {
    k.scene('menu', () => {
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
        
        k.onKeyPress('space', () => {
            // Reset game state when starting new game
            k.go('game', { resetState: true });
        });
    });
}

