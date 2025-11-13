// Game over scene
export function setupGameOverScene(k) {
    k.scene('gameOver', () => {
        k.add([
            k.text('Game Over', { size: 48 }),
            k.pos(k.width() / 2, k.height() / 2 - 50),
            k.anchor('center'),
            k.color(255, 100, 100)
        ]);
        
        k.add([
            k.text('Press SPACE to Restart', { size: 24 }),
            k.pos(k.width() / 2, k.height() / 2 + 50),
            k.anchor('center'),
            k.color(150, 150, 150)
        ]);
        
        k.onKeyPress('space', () => {
            // Reset game state when restarting
            k.go('game', { resetState: true });
        });
    });
}

