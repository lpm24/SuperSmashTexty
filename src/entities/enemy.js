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
            if (enemy.behavior === 'rush') {
                // Direct charge
                const moveAmount = normalized.scale(enemy.speed * k.dt());
                enemy.pos.x += moveAmount.x;
                enemy.pos.y += moveAmount.y;
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
                const moveAmount = moveDir.scale(enemy.speed * k.dt());
                enemy.pos.x += moveAmount.x;
                enemy.pos.y += moveAmount.y;
            } else {
                // Default: direct movement
                const moveAmount = normalized.scale(enemy.speed * k.dt());
                enemy.pos.x += moveAmount.x;
                enemy.pos.y += moveAmount.y;
            }
        }
    });

    // Mark as not dead initially
    enemy.isDead = false;

    return enemy;
}

