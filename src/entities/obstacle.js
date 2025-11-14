// Obstacle entity definition
// Obstacles can be walls (block everything) or cover (block movement, allow projectiles)

export function createObstacle(k, x, y, width, height, type = 'wall', char = '#', color = null) {
    // type: 'wall' (blocks movement and projectiles) or 'cover' (blocks movement, projectiles pass)
    
    // Visual distinction: walls are darker/solid, cover is lighter/more transparent
    // Walls: darker gray (100, 100, 100) - solid, blocks everything
    // Cover: lighter gray (140, 140, 140) - allows projectiles through
    const isWall = type === 'wall';
    const defaultColor = isWall ? k.rgb(100, 100, 100) : k.rgb(140, 140, 140);
    const defaultOutline = isWall ? k.rgb(80, 80, 80) : k.rgb(120, 120, 120);
    
    // Use rect for visual representation
    const obstacle = k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.anchor('center'),
        k.color(color || defaultColor),
        k.outline(2, color || defaultOutline), // Thicker outline for better visibility
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

