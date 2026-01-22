/**
 * Particle System
 *
 * Handles visual particle effects including:
 * - Blood splatters on damage
 * - Death explosions
 * - Hit impact effects
 * - Generic particle spawning
 * - Object pooling for performance
 */

import { getParticlePool } from './objectPool.js';
import { getSetting } from './settings.js';

/**
 * Create a single particle (with optional pooling)
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Particle options
 * @returns {Object} - Particle game object
 */
function createParticle(k, x, y, options = {}) {
    // Try to use object pool for better performance
    const pool = getParticlePool();
    if (pool) {
        return pool.acquire(x, y, options);
    }

    // Fall back to direct creation if pool not available
    const {
        char = '*',
        size = 12,
        color = [255, 255, 255],
        velocity = { x: 0, y: 0 },
        gravity = 0,
        lifetime = 1.0,
        fadeStart = 0.3,
        friction = 0.95,
        zIndex = 100
    } = options;

    const particle = k.add([
        k.text(char, { size }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...color),
        k.z(zIndex),
        'particle'
    ]);

    // Particle physics properties
    particle.velocity = { x: velocity.x, y: velocity.y };
    particle.gravity = gravity;
    particle.friction = friction;
    particle.lifetime = lifetime;
    particle.fadeStart = fadeStart;
    particle.age = 0;
    particle.initialOpacity = 1.0;

    return particle;
}

/**
 * Release a particle back to the pool or destroy it
 * @param {Object} k - Kaplay instance
 * @param {Object} particle - The particle to release
 */
function releaseParticle(k, particle) {
    const pool = getParticlePool();
    if (pool && particle._pooled) {
        pool.release(particle);
    } else {
        k.destroy(particle);
    }
}

/**
 * Update all particles (call this in onUpdate)
 * @param {Object} k - Kaplay instance
 */
export function updateParticles(k) {
    const particles = k.get('particle');

    particles.forEach(particle => {
        if (!particle.exists()) return;
        if (particle.hidden) return; // Skip pooled hidden particles

        // Update age
        particle.age += k.dt();

        // Check if particle should be released/destroyed
        if (particle.age >= particle.lifetime) {
            releaseParticle(k, particle);
            return;
        }

        // Apply velocity
        particle.pos.x += particle.velocity.x * k.dt() * 60;
        particle.pos.y += particle.velocity.y * k.dt() * 60;

        // Apply gravity
        particle.velocity.y += particle.gravity * k.dt() * 60;

        // Apply friction
        particle.velocity.x *= particle.friction;
        particle.velocity.y *= particle.friction;

        // Fade out based on lifetime
        const lifetimePercent = particle.age / particle.lifetime;
        if (lifetimePercent >= particle.fadeStart) {
            const fadePercent = (lifetimePercent - particle.fadeStart) / (1 - particle.fadeStart);
            particle.opacity = particle.initialOpacity * (1 - fadePercent);
        }
    });
}

/**
 * Check if particles are enabled in settings
 * @returns {boolean} - Whether particles should be shown
 */
function areParticlesEnabled() {
    // Disable particles if setting is off or reduced motion is enabled
    if (getSetting('visual', 'showParticles') === false) return false;
    if (getSetting('accessibility', 'reducedMotion')) return false;
    return true;
}

/**
 * Spawn blood splatter particles
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Blood splatter options
 */
export function spawnBloodSplatter(k, x, y, options = {}) {
    if (!areParticlesEnabled()) return;

    const {
        count = 8,
        color = [255, 50, 50],
        speed = 2,
        isCrit = false
    } = options;

    const chars = ['.', ',', "'", '`', '*'];
    const actualCount = isCrit ? count * 1.5 : count;
    const actualSpeed = isCrit ? speed * 1.5 : speed;
    const actualColor = isCrit ? [255, 200, 0] : color;

    for (let i = 0; i < actualCount; i++) {
        // Random direction
        const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.5;
        const speedMult = 0.5 + Math.random() * 0.5;
        const velocity = {
            x: Math.cos(angle) * actualSpeed * speedMult,
            y: Math.sin(angle) * actualSpeed * speedMult
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 8 + Math.random() * 6,
            color: actualColor,
            velocity,
            gravity: 0.15,
            lifetime: 0.5 + Math.random() * 0.3,
            fadeStart: 0.4,
            friction: 0.92
        });
    }
}

/**
 * Spawn death explosion particles
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Death explosion options
 */
export function spawnDeathExplosion(k, x, y, options = {}) {
    if (!areParticlesEnabled()) return;

    const {
        count = 8,
        color = [255, 100, 100],
        speed = 2.5,
        isBoss = false,
        isMiniboss = false
    } = options;

    const chars = ['*', '+', '·'];
    const actualCount = isBoss ? count * 2 : (isMiniboss ? count * 1.5 : count);
    const actualSpeed = isBoss ? speed * 1.5 : (isMiniboss ? speed * 1.2 : speed);

    // Simple burst of particles
    for (let i = 0; i < actualCount; i++) {
        const angle = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.3;
        const speedMult = 0.6 + Math.random() * 0.4;
        const velocity = {
            x: Math.cos(angle) * actualSpeed * speedMult,
            y: Math.sin(angle) * actualSpeed * speedMult
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 10 + Math.random() * 6,
            color,
            velocity,
            gravity: 0.1,
            lifetime: 0.5 + Math.random() * 0.3,
            fadeStart: 0.2,
            friction: 0.92
        });
    }
}

/**
 * Spawn hit impact particles
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} direction - Direction of impact {x, y}
 * @param {Object} options - Hit impact options
 */
export function spawnHitImpact(k, x, y, direction, options = {}) {
    if (!areParticlesEnabled()) return;

    const {
        count = 5,
        color = [255, 255, 100],
        speed = 2.5,
        isCrit = false
    } = options;

    const chars = ['·', '°', '•', '˙'];
    const actualCount = isCrit ? count * 2 : count;
    const actualColor = isCrit ? [255, 200, 0] : color;

    // Normalize direction
    const dirLen = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    const dirNorm = dirLen > 0 ? { x: direction.x / dirLen, y: direction.y / dirLen } : { x: 1, y: 0 };

    for (let i = 0; i < actualCount; i++) {
        // Spread particles in a cone from impact direction
        const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.6; // 108 degree cone
        const angle = Math.atan2(dirNorm.y, dirNorm.x) + spreadAngle;
        const speedMult = 0.6 + Math.random() * 0.8;

        const velocity = {
            x: Math.cos(angle) * speed * speedMult,
            y: Math.sin(angle) * speed * speedMult
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 10 + Math.random() * 4,
            color: actualColor,
            velocity,
            gravity: 0.05,
            lifetime: 0.3 + Math.random() * 0.2,
            fadeStart: 0.3,
            friction: 0.88,
            zIndex: 150
        });
    }
}

/**
 * Spawn generic particle burst
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Particle burst options
 */
export function spawnParticleBurst(k, x, y, options = {}) {
    if (!areParticlesEnabled()) return;

    const {
        count = 10,
        char = '*',
        color = [255, 255, 255],
        speed = 2,
        size = 12,
        lifetime = 1.0,
        gravity = 0.1,
        friction = 0.95
    } = options;

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speedMult = 0.5 + Math.random() * 0.5;
        const velocity = {
            x: Math.cos(angle) * speed * speedMult,
            y: Math.sin(angle) * speed * speedMult
        };

        createParticle(k, x, y, {
            char,
            size: size + Math.random() * 4,
            color,
            velocity,
            gravity,
            lifetime: lifetime + (Math.random() - 0.5) * 0.2,
            fadeStart: 0.4,
            friction
        });
    }
}

/**
 * Spawn XP collection particles (sparkles)
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export function spawnXPSparkles(k, x, y) {
    if (!areParticlesEnabled()) return;

    const chars = ['*', '+', '·'];
    const count = 5;

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const velocity = {
            x: Math.cos(angle) * 1.5,
            y: Math.sin(angle) * 1.5 - 1 // Slight upward bias
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 8 + Math.random() * 4,
            color: [100, 255, 100],
            velocity,
            gravity: -0.05, // Float upward
            lifetime: 0.6 + Math.random() * 0.3,
            fadeStart: 0.3,
            friction: 0.96,
            zIndex: 200
        });
    }
}

/**
 * Spawn level up particles
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export function spawnLevelUpEffect(k, x, y) {
    if (!areParticlesEnabled()) return;

    const chars = ['★', '☆', '*', '+'];
    const count = 20;

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const velocity = {
            x: Math.cos(angle) * 3,
            y: Math.sin(angle) * 3 - 1
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 14 + Math.random() * 6,
            color: [255, 255, 100],
            velocity,
            gravity: -0.1, // Float upward
            lifetime: 1.2 + Math.random() * 0.4,
            fadeStart: 0.5,
            friction: 0.97,
            zIndex: 250
        });
    }
}

// ============================================
// COSMETIC EFFECTS
// ============================================

/**
 * Spawn a trail particle behind the player
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} trailType - Trail type key (trailFire, trailIce, etc.)
 * @param {Array} color - RGB color array or 'rainbow'
 */
export function spawnTrailParticle(k, x, y, trailType, color) {
    if (!areParticlesEnabled()) return;

    const chars = {
        trailFire: ['░', '▒', '▓', '█'],
        trailIce: ['*', '❄', '·', '°'],
        trailPoison: ['~', '≈', '∞', '◦'],
        trailShadow: ['░', '▒', '▓', '█'],
        trailRainbow: ['★', '◆', '●', '♦']
    };

    const trailChars = chars[trailType] || ['·', '°', '*'];
    const char = trailChars[Math.floor(Math.random() * trailChars.length)];

    // Handle rainbow color
    let particleColor = color;
    if (color === 'rainbow') {
        const hue = (Date.now() * 0.1) % 360;
        particleColor = hslToRgb(hue, 100, 60);
    }

    // Random slight offset
    const offsetX = (Math.random() - 0.5) * 8;
    const offsetY = (Math.random() - 0.5) * 8;

    createParticle(k, x + offsetX, y + offsetY, {
        char,
        size: 10 + Math.random() * 6,
        color: particleColor,
        velocity: { x: (Math.random() - 0.5) * 0.3, y: (Math.random() - 0.5) * 0.3 },
        gravity: trailType === 'trailFire' ? -0.02 : 0.01,
        lifetime: 0.4 + Math.random() * 0.2,
        fadeStart: 0.2,
        friction: 0.98,
        zIndex: -10
    });
}

/**
 * Convert HSL to RGB (for rainbow effects)
 */
function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Create a glow entity around a target
 * @param {Object} k - Kaplay instance
 * @param {Object} target - Entity to glow around
 * @param {string} glowType - Glow type key (glowGold, glowCrimson, etc.)
 * @param {Array} color - RGB color array
 * @returns {Object} - Glow entity
 */
export function createGlowEffect(k, target, glowType, color) {
    const glowEntity = k.add([
        k.text('○', { size: 48 }),
        k.pos(target.pos.x, target.pos.y),
        k.anchor('center'),
        k.color(...color),
        k.opacity(0.3),
        k.z(-5),
        'playerGlow'
    ]);

    // Store glow properties
    glowEntity.target = target;
    glowEntity.glowType = glowType;
    glowEntity.pulseTime = 0;
    glowEntity.baseOpacity = 0.25;

    return glowEntity;
}

/**
 * Update glow effect (call in game loop)
 * @param {Object} k - Kaplay instance
 * @param {Object} glow - Glow entity
 */
export function updateGlowEffect(k, glow) {
    if (!glow || !glow.exists() || !glow.target || !glow.target.exists()) {
        if (glow && glow.exists()) k.destroy(glow);
        return;
    }

    // Follow target
    glow.pos = glow.target.pos.clone();

    // Pulse effect
    glow.pulseTime += k.dt() * 3;
    const pulse = Math.sin(glow.pulseTime) * 0.1;
    glow.opacity = glow.baseOpacity + pulse;

    // Electric glow has a flicker
    if (glow.glowType === 'glowElectric' && Math.random() < 0.05) {
        glow.opacity = glow.baseOpacity + 0.3;
    }
}

/**
 * Spawn cosmetic death effect
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} deathType - Death effect type
 * @param {Array} enemyColor - Enemy's color
 */
export function spawnCosmeticDeath(k, x, y, deathType, enemyColor = [255, 100, 100]) {
    if (!areParticlesEnabled()) return;

    switch (deathType) {
        case 'deathExplosion':
            spawnExplosiveDeath(k, x, y, enemyColor);
            break;
        case 'deathDisintegrate':
            spawnDisintegrateDeath(k, x, y, enemyColor);
            break;
        case 'deathVaporize':
            spawnVaporizeDeath(k, x, y, enemyColor);
            break;
        case 'deathPixelate':
            spawnPixelateDeath(k, x, y, enemyColor);
            break;
        case 'deathFireworks':
            spawnFireworksDeath(k, x, y, enemyColor);
            break;
        default:
            // Standard death - use existing spawnDeathExplosion
            spawnDeathExplosion(k, x, y, { color: enemyColor });
    }
}

/**
 * Explosive death - large burst with bright flash
 */
function spawnExplosiveDeath(k, x, y, color) {
    const chars = ['*', '#', '@', 'X', '+', '※'];
    const count = 20;

    // Bright flash in center
    const flash = k.add([
        k.text('●', { size: 40 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(255, 255, 200),
        k.opacity(1),
        k.z(200),
        'particle'
    ]);
    flash.age = 0;
    flash.lifetime = 0.2;
    flash.fadeStart = 0;
    flash.velocity = { x: 0, y: 0 };
    flash.gravity = 0;
    flash.friction = 1;

    // Explosion ring
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 4 + Math.random() * 2;
        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 14 + Math.random() * 10,
            color: [255, 200, 100],
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            gravity: 0.05,
            lifetime: 0.6 + Math.random() * 0.3,
            fadeStart: 0.2,
            friction: 0.92
        });
    }

    // Secondary debris
    for (let i = 0; i < count / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 10 + Math.random() * 6,
            color,
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            gravity: 0.1,
            lifetime: 0.8 + Math.random() * 0.4,
            fadeStart: 0.3,
            friction: 0.94
        });
    }
}

/**
 * Disintegrate death - particles fall and scatter
 */
function spawnDisintegrateDeath(k, x, y, color) {
    const chars = ['░', '▒', '▓', '█', '▪', '▫'];
    const count = 25;

    for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;

        createParticle(k, x + offsetX, y + offsetY, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 8 + Math.random() * 8,
            color: [color[0] * (0.6 + Math.random() * 0.4), color[1] * (0.6 + Math.random() * 0.4), color[2] * (0.6 + Math.random() * 0.4)],
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            gravity: 0.2, // Heavy gravity - fall down
            lifetime: 1.0 + Math.random() * 0.5,
            fadeStart: 0.5,
            friction: 0.96
        });
    }
}

/**
 * Vaporize death - particles rise and fade
 */
function spawnVaporizeDeath(k, x, y, color) {
    const chars = ['~', '≈', '∼', '°', '·'];
    const count = 20;

    // Smoke puff
    for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * 15;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.5;

        createParticle(k, x + offsetX, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 10 + Math.random() * 10,
            color: [Math.min(255, color[0] + 100), Math.min(255, color[1] + 100), Math.min(255, color[2] + 100)],
            velocity: { x: Math.cos(angle) * speed, y: -1.5 - Math.random() * 1.5 }, // Rise upward
            gravity: -0.05, // Negative gravity - float up
            lifetime: 1.2 + Math.random() * 0.5,
            fadeStart: 0.3,
            friction: 0.98
        });
    }
}

/**
 * Pixelate death - square pixel particles
 */
function spawnPixelateDeath(k, x, y, color) {
    const chars = ['■', '□', '▪', '▫', '◾', '◽'];
    const gridSize = 5;
    const spacing = 6;

    // Create a grid of pixels that scatter
    for (let gx = -gridSize / 2; gx <= gridSize / 2; gx++) {
        for (let gy = -gridSize / 2; gy <= gridSize / 2; gy++) {
            const offsetX = gx * spacing;
            const offsetY = gy * spacing;
            const dist = Math.sqrt(gx * gx + gy * gy);
            const angle = Math.atan2(gy, gx);
            const speed = 1 + dist * 0.3 + Math.random() * 0.5;

            createParticle(k, x + offsetX, y + offsetY, {
                char: chars[Math.floor(Math.random() * chars.length)],
                size: 8 + Math.random() * 4,
                color,
                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                gravity: 0.08,
                lifetime: 0.6 + Math.random() * 0.4,
                fadeStart: 0.4,
                friction: 0.94
            });
        }
    }
}

/**
 * Fireworks death - colorful ring burst with bright core
 */
function spawnFireworksDeath(k, x, y, color) {
    const chars = ['*', '+', 'x', 'X', '#'];
    const count = 12;
    const speed = 3;

    // Outer explosion ring
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speedMult = 0.7 + Math.random() * 0.6;
        const velocity = {
            x: Math.cos(angle) * speed * speedMult,
            y: Math.sin(angle) * speed * speedMult
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 12 + Math.random() * 8,
            color,
            velocity,
            gravity: 0.1,
            lifetime: 0.8 + Math.random() * 0.4,
            fadeStart: 0.3,
            friction: 0.94
        });
    }

    // Inner explosion core with bright color
    const coreCount = Math.floor(count / 2);
    for (let i = 0; i < coreCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedMult = 0.3 + Math.random() * 0.4;
        const velocity = {
            x: Math.cos(angle) * speed * speedMult * 0.5,
            y: Math.sin(angle) * speed * speedMult * 0.5
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 16 + Math.random() * 8,
            color: [255, 200, 100],
            velocity,
            gravity: 0.05,
            lifetime: 0.6 + Math.random() * 0.3,
            fadeStart: 0.2,
            friction: 0.9
        });
    }
}
