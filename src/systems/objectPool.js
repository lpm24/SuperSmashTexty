/**
 * Object Pooling System
 *
 * Generic object pooling for performance optimization.
 * Reuses game objects instead of creating/destroying them repeatedly.
 *
 * Usage:
 * - Create a pool with a factory function and reset function
 * - Use acquire() to get an object from the pool
 * - Use release(obj) to return an object to the pool
 * - Use clear() to destroy all pooled objects
 */

export class ObjectPool {
    /**
     * Create a new object pool
     * @param {Object} k - Kaplay instance
     * @param {Function} createFn - Function to create a new object: (k) => object
     * @param {Function} resetFn - Function to reset an object for reuse: (obj, ...args) => void
     * @param {number} initialSize - Number of objects to pre-create
     */
    constructor(k, createFn, resetFn, initialSize = 0) {
        this.k = k;
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = new Set();

        // Pre-warm the pool
        for (let i = 0; i < initialSize; i++) {
            const obj = this.createFn(k);
            obj.hidden = true;
            if (obj.paused !== undefined) obj.paused = true;
            this.pool.push(obj);
        }
    }

    /**
     * Acquire an object from the pool (or create a new one if empty)
     * @param {...any} args - Arguments to pass to the reset function
     * @returns {Object} - The acquired object
     */
    acquire(...args) {
        let obj;

        if (this.pool.length > 0) {
            // Reuse from pool
            obj = this.pool.pop();
            obj.hidden = false;
            if (obj.paused !== undefined) obj.paused = false;
        } else {
            // Create new object
            obj = this.createFn(this.k);
        }

        // Reset/initialize the object with provided arguments
        if (this.resetFn) {
            this.resetFn(obj, ...args);
        }

        // Track as active
        this.active.add(obj);
        obj._pooled = true;

        return obj;
    }

    /**
     * Release an object back to the pool
     * @param {Object} obj - The object to release
     */
    release(obj) {
        if (!obj || !obj._pooled) return;

        // Check if object still exists (wasn't destroyed externally)
        if (!obj.exists || !obj.exists()) {
            this.active.delete(obj);
            return;
        }

        // Hide the object instead of destroying it
        obj.hidden = true;
        if (obj.paused !== undefined) obj.paused = true;

        // Move off-screen to prevent accidental collisions
        if (obj.pos) {
            obj.pos.x = -9999;
            obj.pos.y = -9999;
        }

        // Remove from active tracking
        this.active.delete(obj);

        // Add back to pool
        this.pool.push(obj);
    }

    /**
     * Clear all objects (both pooled and active)
     */
    clear() {
        // Destroy all pooled objects
        for (const obj of this.pool) {
            if (obj.exists && obj.exists()) {
                this.k.destroy(obj);
            }
        }
        this.pool = [];

        // Destroy all active objects
        for (const obj of this.active) {
            if (obj.exists && obj.exists()) {
                this.k.destroy(obj);
            }
        }
        this.active.clear();
    }

    /**
     * Get the current pool size
     * @returns {number} - Number of objects in the pool
     */
    getPoolSize() {
        return this.pool.length;
    }

    /**
     * Get the current number of active objects
     * @returns {number} - Number of active objects
     */
    getActiveCount() {
        return this.active.size;
    }

    /**
     * Prewarm the pool with a specific number of objects
     * @param {number} count - Number of objects to add to the pool
     */
    prewarm(count) {
        for (let i = 0; i < count; i++) {
            const obj = this.createFn(this.k);
            obj.hidden = true;
            if (obj.paused !== undefined) obj.paused = true;
            obj._pooled = true;
            // Move off-screen
            if (obj.pos) {
                obj.pos.x = -9999;
                obj.pos.y = -9999;
            }
            this.pool.push(obj);
        }
    }
}

// Pool manager to hold all object pools
const pools = {
    projectiles: null,
    particles: null
};

/**
 * Initialize object pools for the game
 * @param {Object} k - Kaplay instance
 */
export function initObjectPools(k) {
    // Projectile pool
    pools.projectiles = new ObjectPool(
        k,
        // Create function
        (k) => {
            const proj = k.add([
                k.text('*', { size: 16 }),
                k.pos(-9999, -9999),
                k.anchor('center'),
                k.color(255, 255, 100),
                k.rotate(0),
                k.area(),
                'projectile'
            ]);
            proj.hidden = true;
            return proj;
        },
        // Reset function
        (proj, x, y, direction, speed, damage, piercing, obstaclePiercing, isCrit, maxRange) => {
            proj.pos.x = x;
            proj.pos.y = y;
            proj.damage = damage;
            proj.piercing = piercing || 0;
            proj.obstaclePiercing = obstaclePiercing || 0;
            proj.piercedEnemies = new Set();
            proj.piercedObstacles = new Set();
            proj.isCrit = isCrit || false;
            proj.maxRange = maxRange || 750;
            proj.distanceTraveled = 0;
            proj.direction = direction;
            proj.speed = speed;
            proj.isBoomerang = false;
            proj.isReturning = false;
            proj.ownerPlayer = null;
            proj.returnSpeedMultiplier = 1.2;
            proj.isExplosive = false;
            proj.isChainLightning = false;
            proj.isEnemyProjectile = false;
            proj.isBossProjectile = false;
            proj.isReflected = false;
            proj.reflectionCount = 0;
            proj.chainedEnemies = null;
            proj.chainJumps = 0;
            proj.ownerSlotIndex = undefined;
            proj.burnDamage = null;
            proj.burnDuration = null;

            // Reset visuals
            proj.text = '*';
            proj.color = isCrit ? k.rgb(255, 200, 0) : k.rgb(255, 255, 100);
            const angle = (Math.atan2(direction.y, direction.x) * (180 / Math.PI)) + 90;
            proj.angle = angle;
        },
        50 // Pre-create 50 projectiles
    );

    // Particle pool
    pools.particles = new ObjectPool(
        k,
        // Create function
        (k) => {
            const particle = k.add([
                k.text('*', { size: 12 }),
                k.pos(-9999, -9999),
                k.anchor('center'),
                k.color(255, 255, 255),
                k.z(100),
                'particle'
            ]);
            particle.hidden = true;
            return particle;
        },
        // Reset function
        (particle, x, y, options = {}) => {
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

            particle.pos.x = x;
            particle.pos.y = y;
            particle.text = char;
            // Note: KAPLAY text size can't be changed dynamically, so we use default
            particle.color = k.rgb(...color);
            particle.z = zIndex;
            particle.opacity = 1;

            // Physics properties
            particle.velocity = { x: velocity.x, y: velocity.y };
            particle.gravity = gravity;
            particle.friction = friction;
            particle.lifetime = lifetime;
            particle.fadeStart = fadeStart;
            particle.age = 0;
            particle.initialOpacity = 1.0;
        },
        100 // Pre-create 100 particles
    );
}

/**
 * Get the projectile pool
 * @returns {ObjectPool|null} - The projectile pool
 */
export function getProjectilePool() {
    return pools.projectiles;
}

/**
 * Get the particle pool
 * @returns {ObjectPool|null} - The particle pool
 */
export function getParticlePool() {
    return pools.particles;
}

/**
 * Clear all object pools
 */
export function clearAllPools() {
    if (pools.projectiles) {
        pools.projectiles.clear();
        pools.projectiles = null;
    }
    if (pools.particles) {
        pools.particles.clear();
        pools.particles = null;
    }
}

/**
 * Get pool statistics for debugging
 * @returns {Object} - Pool statistics
 */
export function getPoolStats() {
    return {
        projectiles: pools.projectiles ? {
            pooled: pools.projectiles.getPoolSize(),
            active: pools.projectiles.getActiveCount()
        } : null,
        particles: pools.particles ? {
            pooled: pools.particles.getPoolSize(),
            active: pools.particles.getActiveCount()
        } : null
    };
}
