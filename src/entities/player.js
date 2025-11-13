// Player entity definition
export function createPlayer(k, x, y) {
    const player = k.add([
        k.text('@', { size: 24 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(100, 150, 255),
        k.area(),
        k.health(100),
        'player'
    ]);

    // Player stats
    player.speed = 150;
    player.maxHealth = 100;
    player.level = 1;
    player.xp = 0;
    player.xpToNext = 10;
    player.pickupRadius = 30; // Base pickup radius in pixels
    player.invulnerable = false; // Immunity frames flag
    player.invulnerableTime = 0; // Time remaining in immunity
    player.invulnerableDuration = 1.0; // 1 second of immunity after hit
    
    // Sync health component with maxHealth
    player.setHP(player.maxHealth);
    
    // Weapon stats
    player.fireRate = 1.5; // shots per second (updated from 0.5 for better feel)
    player.projectileSpeed = 300;
    player.projectileDamage = 10;
    player.lastFireTime = 0;
    
    // Advanced weapon stats
    player.projectileCount = 1; // Number of projectiles per shot (multi-shot)
    player.piercing = 0; // Number of enemies a projectile can pass through
    player.critChance = 0; // Critical hit chance (0-1)
    player.critDamage = 2.0; // Critical hit damage multiplier
    player.spreadAngle = 0; // Spread angle in degrees (0 = no spread)
    player.defense = 0; // Damage reduction (flat reduction)
    
    // Character abilities
    player.xpMultiplier = 1.1; // +10% XP gain (The Survivor's unique ability)

    // Movement
    let moveDir = k.vec2(0, 0);
    
    k.onKeyDown(['w', 'up'], () => {
        moveDir.y = -1;
    });
    
    k.onKeyDown(['s', 'down'], () => {
        moveDir.y = 1;
    });
    
    k.onKeyDown(['a', 'left'], () => {
        moveDir.x = -1;
    });
    
    k.onKeyDown(['d', 'right'], () => {
        moveDir.x = 1;
    });
    
    k.onKeyRelease(['w', 'up'], () => {
        if (!k.isKeyDown('s') && !k.isKeyDown('down')) {
            moveDir.y = 0;
        }
    });
    
    k.onKeyRelease(['s', 'down'], () => {
        if (!k.isKeyDown('w') && !k.isKeyDown('up')) {
            moveDir.y = 0;
        }
    });
    
    k.onKeyRelease(['a', 'left'], () => {
        if (!k.isKeyDown('d') && !k.isKeyDown('right')) {
            moveDir.x = 0;
        }
    });
    
    k.onKeyRelease(['d', 'right'], () => {
        if (!k.isKeyDown('a') && !k.isKeyDown('left')) {
            moveDir.x = 0;
        }
    });

    // Update movement and immunity frames
    player.onUpdate(() => {
        if (k.paused) return;
        
        // Update immunity frames
        if (player.invulnerable) {
            player.invulnerableTime -= k.dt();
            if (player.invulnerableTime <= 0) {
                player.invulnerable = false;
                player.color = k.rgb(100, 150, 255); // Reset to normal color
            } else {
                // Flash effect during immunity (every 0.1 seconds)
                const flashRate = 10; // flashes per second
                const shouldShow = Math.floor(player.invulnerableTime * flashRate) % 2 === 0;
                if (shouldShow) {
                    player.color = k.rgb(100, 150, 255);
                } else {
                    player.color = k.rgb(100, 150, 255, 0.3); // Semi-transparent
                }
            }
        }
        
        if (moveDir.len() > 0) {
            const len = moveDir.len();
            const normalized = moveDir.scale(1 / len);
            const moveAmount = normalized.scale(player.speed * k.dt());
            
            // Check collision with obstacles before moving
            const newX = player.pos.x + moveAmount.x;
            const newY = player.pos.y + moveAmount.y;
            
            // Test collision with obstacles (walls and cover both block movement)
            let canMoveX = true;
            let canMoveY = true;
            
            const obstacles = k.get('obstacle');
            const playerSize = 12; // Approximate player collision size
            
            for (const obstacle of obstacles) {
                if (!obstacle.exists()) continue;
                
                // Check X movement
                const obsLeft = obstacle.pos.x - obstacle.width / 2;
                const obsRight = obstacle.pos.x + obstacle.width / 2;
                const obsTop = obstacle.pos.y - obstacle.height / 2;
                const obsBottom = obstacle.pos.y + obstacle.height / 2;
                
                const playerLeft = newX - playerSize;
                const playerRight = newX + playerSize;
                const playerTop = player.pos.y - playerSize;
                const playerBottom = player.pos.y + playerSize;
                
                if (playerRight > obsLeft && playerLeft < obsRight &&
                    playerBottom > obsTop && playerTop < obsBottom) {
                    canMoveX = false;
                }
                
                // Check Y movement
                const playerLeftY = player.pos.x - playerSize;
                const playerRightY = player.pos.x + playerSize;
                const playerTopY = newY - playerSize;
                const playerBottomY = newY + playerSize;
                
                if (playerRightY > obsLeft && playerLeftY < obsRight &&
                    playerBottomY > obsTop && playerTopY < obsBottom) {
                    canMoveY = false;
                }
            }
            
            // Apply movement if no collision
            if (canMoveX) player.pos.x = newX;
            if (canMoveY) player.pos.y = newY;
        }
        
        // Keep player in bounds (room boundaries)
        const roomWidth = k.width();
        const roomHeight = k.height();
        const margin = 20;
        
        player.pos.x = k.clamp(player.pos.x, margin, roomWidth - margin);
        player.pos.y = k.clamp(player.pos.y, margin, roomHeight - margin);
    });

    return player;
}

