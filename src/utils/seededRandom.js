/**
 * Seeded Random Number Generator
 *
 * Uses the Mulberry32 algorithm for deterministic random number generation.
 * This ensures that the same seed always produces the same sequence of random numbers,
 * which is critical for multiplayer synchronization.
 *
 * Usage:
 *   const rng = new SeededRandom(12345);
 *   const value = rng.next(); // 0 to 1
 *   const num = rng.range(1, 10); // 1 to 9
 *   const choice = rng.choose(['a', 'b', 'c']); // random element
 */

export class SeededRandom {
    /**
     * Create a new seeded random number generator
     * @param {number} seed - The seed value (must be a 32-bit integer)
     */
    constructor(seed) {
        // Ensure seed is a 32-bit integer
        this.seed = seed >>> 0;
        this.originalSeed = this.seed;
    }

    /**
     * Generate the next random number (0 to 1, exclusive)
     * Uses Mulberry32 algorithm for high-quality deterministic randomness
     * @returns {number} Random number between 0 and 1
     */
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Generate a random integer in range [min, max)
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (exclusive)
     * @returns {number} Random integer
     */
    range(min, max) {
        if (max <= min) {
            console.warn(`SeededRandom.range: Invalid range [${min}, ${max}). Returning min.`);
            return min;
        }
        return Math.floor(min + this.next() * (max - min));
    }

    /**
     * Generate a random float in range [min, max)
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (exclusive)
     * @returns {number} Random float
     */
    rangeFloat(min, max) {
        return min + this.next() * (max - min);
    }

    /**
     * Choose a random element from an array
     * @param {Array} array - Array to choose from
     * @returns {*} Random element from array
     */
    choose(array) {
        if (!array || array.length === 0) return undefined;
        return array[this.range(0, array.length)];
    }

    /**
     * Shuffle an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle (modified in place)
     * @returns {Array} The shuffled array
     */
    shuffle(array) {
        const arr = [...array]; // Create copy to avoid mutation
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.range(0, i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Roll a probability check
     * @param {number} probability - Probability of success (0 to 1)
     * @returns {boolean} True if roll succeeds
     */
    probability(probability) {
        return this.next() < probability;
    }

    /**
     * Reset the RNG to its original seed
     */
    reset() {
        this.seed = this.originalSeed;
    }

    /**
     * Get current seed state (for saving/loading)
     * @returns {number} Current seed
     */
    getState() {
        return this.seed;
    }

    /**
     * Set seed state (for loading)
     * @param {number} state - Seed state to restore
     */
    setState(state) {
        this.seed = state >>> 0;
    }
}

/**
 * Create a seed from multiple components
 * Useful for creating deterministic seeds from game state
 * @param  {...number} components - Numbers to combine into a seed
 * @returns {number} Combined seed
 */
export function createSeed(...components) {
    let seed = 0;
    for (let i = 0; i < components.length; i++) {
        seed = ((seed << 5) - seed + components[i]) | 0;
    }
    return seed >>> 0;
}

/**
 * Create a seed from a string
 * @param {string} str - String to convert to seed
 * @returns {number} Seed value
 */
export function seedFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}
