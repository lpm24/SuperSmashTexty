// Combat system - handles autofire and collisions
import { createProjectile } from '../entities/projectile.js';

export function setupCombatSystem(k, player) {
    let lastFireTime = 0;

    // Autofire system
    k.onUpdate(() => {
        if (k.paused) return;
        
        const mousePos = k.mousePos();
        const time = k.time();
        
        // Calculate direction to mouse
        const toMouse = k.vec2(
            mousePos.x - player.pos.x,
            mousePos.y - player.pos.y
        );
        const distance = toMouse.len();
        
        if (distance > 0) {
            const baseDirection = toMouse.unit();
            
            // Fire if enough time has passed
            if (time - lastFireTime >= 1 / player.fireRate) {
                const projectileCount = player.projectileCount || 1;
                const spreadAngle = player.spreadAngle || 0;
                
                // Calculate spread directions
                const directions = [];
                if (projectileCount === 1) {
                    directions.push(baseDirection);
                } else if (spreadAngle > 0) {
                    // Spread pattern (shotgun)
                    const angleStep = spreadAngle / (projectileCount - 1);
                    const startAngle = -spreadAngle / 2;
                    for (let i = 0; i < projectileCount; i++) {
                        const angle = startAngle + (angleStep * i);
                        const rad = angle * (Math.PI / 180);
                        const cos = Math.cos(rad);
                        const sin = Math.sin(rad);
                        const dir = k.vec2(
                            baseDirection.x * cos - baseDirection.y * sin,
                            baseDirection.x * sin + baseDirection.y * cos
                        );
                        directions.push(dir.unit());
                    }
                } else {
                    // Multi-shot without spread (all same direction)
                    for (let i = 0; i < projectileCount; i++) {
                        directions.push(baseDirection);
                    }
                }
                
                // Fire all projectiles
                directions.forEach((direction, index) => {
                    // Small delay for multi-shot without spread (staggered)
                    const delay = spreadAngle === 0 && projectileCount > 1 ? index * 0.02 : 0;
                    
                    k.wait(delay, () => {
                        // Check for critical hit
                        const isCrit = Math.random() < (player.critChance || 0);
                        const finalDamage = isCrit 
                            ? Math.floor(player.projectileDamage * (player.critDamage || 2.0))
                            : player.projectileDamage;
                        
                        createProjectile(k, player.pos.x, player.pos.y, direction, 
                            player.projectileSpeed, finalDamage, 
                            player.piercing || 0, isCrit);
                    });
                });
                
                lastFireTime = time;
            }
        }
    });

    // Collision: Projectile hits Enemy
    k.onCollide('projectile', 'enemy', (projectile, enemy) => {
        if (k.paused) return;
        
        // Check if this projectile has already hit this enemy (for piercing)
        if (projectile.piercedEnemies && projectile.piercedEnemies.has(enemy)) {
            return; // Already hit this enemy
        }
        
        enemy.hurt(projectile.damage);
        
        // Track this enemy for piercing
        if (projectile.piercedEnemies) {
            projectile.piercedEnemies.add(enemy);
        }
        
        // Destroy projectile if it can't pierce anymore
        // If piercing = n, projectile can hit n+1 enemies total
        // piercing = 0: hit 1 enemy, piercing = 1: hit 2 enemies, etc.
        if (projectile.piercedEnemies.size > (projectile.piercing || 0)) {
            k.destroy(projectile);
        }
        
        // Knockback enemy away from projectile direction
        const knockbackDir = k.vec2(
            enemy.pos.x - projectile.pos.x,
            enemy.pos.y - projectile.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = 15; // Reduced knockback distance
            enemy.pos.x += normalized.x * knockbackAmount;
            enemy.pos.y += normalized.y * knockbackAmount;
        }
        
        // Visual feedback (different color for crits)
        enemy.color = projectile.isCrit ? k.rgb(255, 200, 0) : k.rgb(255, 255, 255);
        k.wait(0.1, () => {
            if (enemy.exists()) {
                enemy.color = k.rgb(255, 100, 100);
            }
        });
    });

    // Collision: Enemy hits Player
    k.onCollide('enemy', 'player', (enemy, player) => {
        if (k.paused) return;
        
        // Check if player is invulnerable (immunity frames)
        if (player.invulnerable) return;
        
        // Apply damage with defense reduction
        const baseDamage = 10;
        const finalDamage = Math.max(1, baseDamage - (player.defense || 0));
        player.hurt(finalDamage);
        player.invulnerable = true;
        player.invulnerableTime = player.invulnerableDuration;
        
        // Knockback enemy away from player (player doesn't move)
        const knockbackDir = k.vec2(
            enemy.pos.x - player.pos.x,
            enemy.pos.y - player.pos.y
        );
        const knockbackDist = knockbackDir.len();
        if (knockbackDist > 0) {
            const normalized = knockbackDir.unit();
            const knockbackAmount = 20; // Knockback distance for enemies
            enemy.pos.x += normalized.x * knockbackAmount;
            enemy.pos.y += normalized.y * knockbackAmount;
        }
        
        // Initial hit flash (will be overridden by immunity flash)
        player.color = k.rgb(255, 100, 100);
    });
}

