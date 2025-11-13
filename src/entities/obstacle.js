// Obstacle entity definition
// Obstacles can be walls (block everything) or cover (block movement, allow projectiles)

export function createObstacle(k, x, y, width, height, type = 'wall', char = '#', color = null) {
    // type: 'wall' (blocks movement and projectiles) or 'cover' (blocks movement, projectiles pass)
    
    // Use rect for better visual representation
    const obstacle = k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.anchor('center'),
        k.color(color || (type === 'wall' ? k.rgb(100, 100, 100) : k.rgb(120, 120, 120))),
        k.outline(1, color || (type === 'wall' ? k.rgb(80, 80, 80) : k.rgb(100, 100, 100))),
        k.area({ width: width, height: height }),
        k.fixed(), // Fixed position (doesn't move)
        'obstacle',
        type === 'wall' ? 'wall' : 'cover' // Tag for collision filtering
    ]);
    
    obstacle.type = type; // 'wall' or 'cover'
    obstacle.width = width;
    obstacle.height = height;
    
    return obstacle;
}

