// Projectile entity definition
export function createProjectile(k, x, y, direction, speed, damage, piercing = 0, obstaclePiercing = 0, isCrit = false, maxRange = null) {
    const projectile = k.add([
        k.text('*', { size: 16 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(isCrit ? 255 : 255, isCrit ? 200 : 255, isCrit ? 0 : 100), // Orange/red for crits
        k.area(),
        'projectile'
    ]);

    projectile.damage = damage;
    projectile.piercing = piercing; // Number of enemies this can pass through
    projectile.obstaclePiercing = obstaclePiercing; // Number of obstacles this can pass through (separate from enemy piercing)
    projectile.piercedEnemies = new Set(); // Track which enemies this has already hit
    projectile.piercedObstacles = new Set(); // Track which obstacles this has already hit
    projectile.isCrit = isCrit;
    // Set max range - use provided range or default based on speed
    projectile.maxRange = maxRange || 750; // Maximum distance in pixels
    projectile.distanceTraveled = 0;
    projectile.direction = direction; // Store direction for manual movement
    projectile.speed = speed; // Store speed for manual movement
    
    // Method to apply weapon visual properties
    projectile.useWeaponVisual = function(weaponDef) {
        if (weaponDef && weaponDef.char) {
            // Update text directly (KAPLAY allows direct text assignment)
            projectile.text = weaponDef.char;
        }
        if (weaponDef && weaponDef.color) {
            // Keep crit color if it's a crit, otherwise use weapon color
            if (!projectile.isCrit) {
                projectile.color = k.rgb(...weaponDef.color);
            }
        }
        if (weaponDef && weaponDef.range) {
            projectile.maxRange = weaponDef.range;
        }
    };

    // Manual movement and range management
    projectile.onUpdate(() => {
        if (k.paused) return;
        
        // Move projectile manually
        const moveAmount = projectile.direction.scale(projectile.speed * k.dt());
        const distanceThisFrame = moveAmount.len();
        projectile.distanceTraveled += distanceThisFrame;
        
        projectile.pos.x += moveAmount.x;
        projectile.pos.y += moveAmount.y;
        
        // Remove if exceeded max range
        if (projectile.distanceTraveled >= projectile.maxRange) {
            k.destroy(projectile);
            return;
        }
        
        // Remove if out of bounds
        if (projectile.pos.x < 0 || projectile.pos.x > k.width() ||
            projectile.pos.y < 0 || projectile.pos.y > k.height()) {
            k.destroy(projectile);
        }
    });

    return projectile;
}

