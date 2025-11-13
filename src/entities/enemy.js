// Enemy entity definition
export function createEnemy(k, x, y, type = 'basic', floor = 1) {
    const enemyTypes = {
        basic: {
            char: 'E',
            color: [255, 100, 100],
            baseHealth: 30,
            baseSpeed: 50,
            size: 20,
            baseXPValue: 5,
            behavior: 'rush' // rush, tank, fast
        },
        rusher: {
            char: 'R',
            color: [255, 150, 100],
            baseHealth: 25,
            baseSpeed: 70,
            size: 18,
            baseXPValue: 6,
            behavior: 'rush'
        },
        tank: {
            char: 'T',
            color: [150, 150, 255],
            baseHealth: 80,
            baseSpeed: 30,
            size: 24,
            baseXPValue: 12,
            behavior: 'rush'
        },
        fast: {
            char: 'F',
            color: [255, 255, 100],
            baseHealth: 20,
            baseSpeed: 90,
            size: 16,
            baseXPValue: 7,
            behavior: 'rush'
        }
    };

    const baseConfig = enemyTypes[type] || enemyTypes.basic;
    
    // Scale stats based on floor
    const floorMultiplier = 1 + (floor - 1) * 0.3; // 30% increase per floor
    const config = {
        char: baseConfig.char,
        color: baseConfig.color,
        health: Math.floor(baseConfig.baseHealth * floorMultiplier),
        speed: Math.floor(baseConfig.baseSpeed * (1 + (floor - 1) * 0.1)), // 10% speed increase per floor
        size: baseConfig.size,
        xpValue: Math.floor(baseConfig.baseXPValue * floorMultiplier),
        behavior: baseConfig.behavior
    };
    
    const enemy = k.add([
        k.text(config.char, { size: config.size }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...config.color),
        k.area(),
        k.health(config.health),
        'enemy'
    ]);

    enemy.maxHealth = config.health;
    enemy.speed = config.speed;
    enemy.xpValue = config.xpValue;
    enemy.type = type;
    enemy.behavior = config.behavior;
    enemy.floor = floor;

    // AI based on behavior type
    enemy.onUpdate(() => {
        if (k.paused) return;
        
        const player = k.get('player')[0];
        if (!player) return;
        
        const dir = k.vec2(
            player.pos.x - enemy.pos.x,
            player.pos.y - enemy.pos.y
        );
        const distance = dir.len();
        
        if (distance > 0) {
            const normalized = dir.unit();
            
            // Different movement patterns based on behavior
            let moveAmount;
            if (enemy.behavior === 'rush') {
                // Direct charge
                moveAmount = normalized.scale(enemy.speed * k.dt());
            } else if (enemy.behavior === 'fast') {
                // Fast mover with slight jitter for unpredictability
                const jitter = k.vec2(
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.3
                );
                const moveDir = k.vec2(
                    normalized.x + jitter.x,
                    normalized.y + jitter.y
                ).unit();
                moveAmount = moveDir.scale(enemy.speed * k.dt());
            } else {
                // Default: direct movement
                moveAmount = normalized.scale(enemy.speed * k.dt());
            }
            
            // Check collision with obstacles before moving
            const newX = enemy.pos.x + moveAmount.x;
            const newY = enemy.pos.y + moveAmount.y;
            
            let canMoveX = true;
            let canMoveY = true;
            
            const obstacles = k.get('obstacle');
            const enemySize = enemy.size || 12;
            
            for (const obstacle of obstacles) {
                if (!obstacle.exists()) continue;
                
                const obsLeft = obstacle.pos.x - obstacle.width / 2;
                const obsRight = obstacle.pos.x + obstacle.width / 2;
                const obsTop = obstacle.pos.y - obstacle.height / 2;
                const obsBottom = obstacle.pos.y + obstacle.height / 2;
                
                // Check X movement
                const enemyLeftX = newX - enemySize;
                const enemyRightX = newX + enemySize;
                const enemyTopX = enemy.pos.y - enemySize;
                const enemyBottomX = enemy.pos.y + enemySize;
                
                if (enemyRightX > obsLeft && enemyLeftX < obsRight &&
                    enemyBottomX > obsTop && enemyTopX < obsBottom) {
                    canMoveX = false;
                }
                
                // Check Y movement
                const enemyLeftY = enemy.pos.x - enemySize;
                const enemyRightY = enemy.pos.x + enemySize;
                const enemyTopY = newY - enemySize;
                const enemyBottomY = newY + enemySize;
                
                if (enemyRightY > obsLeft && enemyLeftY < obsRight &&
                    enemyBottomY > obsTop && enemyTopY < obsBottom) {
                    canMoveY = false;
                }
            }
            
            // Apply movement if no collision
            if (canMoveX) enemy.pos.x = newX;
            if (canMoveY) enemy.pos.y = newY;
        }
    });

    // Mark as not dead initially
    enemy.isDead = false;

    return enemy;
}

