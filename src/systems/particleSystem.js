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
 * Spawn blood splatter particles
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Blood splatter options
 */
export function spawnBloodSplatter(k, x, y, options = {}) {
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
    const {
        count = 12,
        color = [255, 100, 100],
        speed = 3,
        isBoss = false,
        isMiniboss = false
    } = options;

    const chars = ['*', '+', 'x', 'X', '#'];
    const actualCount = isBoss ? count * 2 : (isMiniboss ? count * 1.5 : count);
    const actualSpeed = isBoss ? speed * 1.5 : (isMiniboss ? speed * 1.2 : speed);

    // Outer explosion ring
    for (let i = 0; i < actualCount; i++) {
        const angle = (Math.PI * 2 * i) / actualCount;
        const speedMult = 0.7 + Math.random() * 0.6;
        const velocity = {
            x: Math.cos(angle) * actualSpeed * speedMult,
            y: Math.sin(angle) * actualSpeed * speedMult
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

    // Inner explosion core
    const coreCount = Math.floor(actualCount / 2);
    for (let i = 0; i < coreCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedMult = 0.3 + Math.random() * 0.4;
        const velocity = {
            x: Math.cos(angle) * actualSpeed * speedMult * 0.5,
            y: Math.sin(angle) * actualSpeed * speedMult * 0.5
        };

        createParticle(k, x, y, {
            char: chars[Math.floor(Math.random() * chars.length)],
            size: 16 + Math.random() * 8,
            color: [255, 200, 100], // Brighter core
            velocity,
            gravity: 0.05,
            lifetime: 0.6 + Math.random() * 0.3,
            fadeStart: 0.2,
            friction: 0.9
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
