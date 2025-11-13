// Projectile entity definition
export function createProjectile(k, x, y, direction, speed, damage, piercing = 0, isCrit = false) {
    const projectile = k.add([
        k.text('*', { size: 16 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(isCrit ? 255 : 255, isCrit ? 200 : 255, isCrit ? 0 : 100), // Orange/red for crits
        k.area(),
        k.move(direction, speed),
        'projectile'
    ]);

    projectile.damage = damage;
    projectile.piercing = piercing; // Number of enemies this can pass through
    projectile.piercedEnemies = new Set(); // Track which enemies this has already hit
    projectile.isCrit = isCrit;
    projectile.lifetime = 2; // seconds
    projectile.age = 0;

    // Remove projectile after lifetime
    projectile.onUpdate(() => {
        if (k.paused) return;
        
        projectile.age += k.dt();
        if (projectile.age >= projectile.lifetime) {
            k.destroy(projectile);
        }
        
        // Remove if out of bounds
        if (projectile.pos.x < 0 || projectile.pos.x > k.width() ||
            projectile.pos.y < 0 || projectile.pos.y > k.height()) {
            k.destroy(projectile);
        }
    });

    return projectile;
}

