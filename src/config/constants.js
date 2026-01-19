/**
 * Game Constants & Configuration
 *
 * Centralized configuration for all game values.
 * This makes balancing easier and prepares for multiplayer where
 * constants may need to be synchronized across clients.
 */

// =============================================================================
// GAME WINDOW & RENDERING
// =============================================================================

export const GAME_CONFIG = {
    // Canvas dimensions
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    CANVAS_SCALE: 1,

    // Background
    BACKGROUND_COLOR: [0, 0, 0],

    // Debug mode
    DEBUG_MODE: false,
};

// =============================================================================
// PLAYER BASE STATS
// =============================================================================

export const PLAYER_CONFIG = {
    // Collision & physics
    COLLISION_SIZE: 12, // Approximate player hitbox radius

    // Pickup system
    BASE_PICKUP_RADIUS: 30, // Base pickup radius in pixels

    // Immunity frames (i-frames after taking damage)
    INVULNERABILITY_DURATION: 1.0, // Seconds of immunity after hit
    IMMUNITY_FLASH_RATE: 10, // Flashes per second during immunity

    // Visual feedback
    NORMAL_COLOR: [100, 150, 255],
    HIT_COLOR: [255, 100, 100],
    IMMUNITY_ALPHA: 0.3, // Transparency during flash

    // Movement boundaries
    ROOM_MARGIN: 20, // Distance from edge of screen
};

// =============================================================================
// PROGRESSION SYSTEM
// =============================================================================

export const PROGRESSION_CONFIG = {
    // XP & Leveling (flattened curve: higher early, lower scaling)
    BASE_XP_TO_NEXT_LEVEL: 15,
    XP_SCALING_FACTOR: 1.25, // Multiplier per level for XP requirements

    // Starting stats
    STARTING_LEVEL: 1,
    STARTING_XP: 0,

    // Level up notification
    LEVEL_UP_NOTIFICATION_Y: 100, // Y position of level up text
    LEVEL_UP_NOTIFICATION_DURATION: 0.5, // Seconds before showing upgrade draft
};

// =============================================================================
// CHARACTER ABILITIES (Multipliers & Bonuses)
// =============================================================================

export const CHARACTER_ABILITIES = {
    // The Survivor
    SURVIVOR_XP_BOOST: 1.1, // +10% XP gain

    // The Scout
    SCOUT_SPEED_BOOST: 1.2, // +20% speed
    SCOUT_DODGE_CHANCE: 0.1, // 10% dodge chance

    // The Tank
    TANK_HEALTH_BOOST: 1.25, // +25% health
    TANK_DAMAGE_REDUCTION: 0.15, // 15% damage reduction

    // The Sniper
    SNIPER_CRIT_CHANCE_MULTIPLIER: 1.5, // +50% to base crit chance
    SNIPER_CRIT_DAMAGE_MULTIPLIER: 1.25, // +25% to crit damage

    // The Pyro
    PYRO_FIRE_DOT_MULTIPLIER: 1.25, // +25% fire DoT damage
};

// =============================================================================
// COMBAT SYSTEM
// =============================================================================

export const COMBAT_CONFIG = {
    // Damage
    MIN_DAMAGE: 1, // Minimum damage that can be dealt

    // Knockback distances
    KNOCKBACK_ENEMY: 20, // Regular enemy knockback
    KNOCKBACK_ENEMY_FROM_PROJECTILE: 15, // Enemy hit by projectile
    KNOCKBACK_MINIBOSS: 25, // Miniboss knockback
    KNOCKBACK_BOSS: 10, // Boss knockback (heavier)
    KNOCKBACK_BOSS_FROM_PROJECTILE: 10, // Boss hit by projectile

    // Base enemy damage values
    BASE_ENEMY_DAMAGE: 10,
    BASE_MINIBOSS_DAMAGE: 15,
    BASE_BOSS_DAMAGE: 18,

    // Enemy scaling per floor
    ENEMY_HP_SCALING_PER_FLOOR: 0.3, // +30% HP per floor
    ENEMY_DAMAGE_SCALING_PER_FLOOR: 0.15, // +15% damage per floor (new)
    ENEMY_SPEED_SCALING_PER_FLOOR: 0.1, // +10% speed per floor

    // Boss enrage multiplier
    BOSS_ENRAGE_DAMAGE_MULTIPLIER: 1.25, // +25% damage when enraged

    // Multi-shot delays
    MULTISHOT_STAGGER_DELAY: 0.02, // Delay between projectiles in multi-shot

    // Visual feedback durations
    HIT_FLASH_DURATION: 0.1, // How long hit flash lasts
    EXPLOSION_VISUAL_DURATION: 0.2, // How long explosion effect shows
    CHAIN_VISUAL_DURATION: 0.1, // How long chain lightning visual shows

    // Critical hit visuals
    CRIT_COLOR: [255, 200, 0], // Gold color for crits
    HIT_COLOR: [255, 255, 255], // White color for normal hits
};

// =============================================================================
// WEAPON SYSTEMS (for special weapon types)
// =============================================================================

export const WEAPON_CONFIG = {
    // Orbital weapons
    ORBITAL_CONTACT_COOLDOWN: 0.2, // Seconds between orbital hits on same enemy
    BASE_ORBIT_RADIUS: 45, // Distance from player
    BASE_ROTATION_SPEED: 180, // Degrees per second

    // Explosive weapons
    BASE_EXPLOSION_RADIUS: 50, // Area damage radius
    BASE_EXPLOSION_DAMAGE: 15, // Area damage amount

    // Chain lightning
    BASE_CHAIN_RANGE: 70, // Distance between chain jumps
    BASE_CHAIN_JUMPS: 3, // Number of times it can chain
    BASE_CHAIN_DAMAGE_REDUCTION: 0.15, // 15% damage reduction per jump
    CHAIN_COLLISION_DELAY: 0.01, // Small delay for collision detection

    // Range fallback
    DEFAULT_WEAPON_RANGE: 750, // Default projectile range if not specified
};

// =============================================================================
// MULTIPLAYER (Future - Placeholder)
// =============================================================================

export const MULTIPLAYER_CONFIG = {
    // Player limits
    MIN_PLAYERS: 1,
    MAX_PLAYERS: 4,

    // Default mode
    DEFAULT_MODE: 'singleplayer', // 'singleplayer' | 'coop'

    // Network (future)
    TICK_RATE: 60, // Server tick rate
    CLIENT_PREDICTION: true, // Enable client-side prediction
    INTERPOLATION_DELAY: 100, // Milliseconds of interpolation buffer
};

// =============================================================================
// PICKUPS & LOOT
// =============================================================================

export const PICKUP_CONFIG = {
    // XP Pickups
    XP_LIFETIME: 10, // Seconds before XP despawns
    XP_PULSE_SPEED: 5, // Speed of pulse animation
    XP_PULSE_AMOUNT: 0.2, // Amount of pulse scaling (0.2 = 20% scale change)
    XP_COLOR: [100, 200, 255], // Light blue

    // Currency Pickups
    CURRENCY_LIFETIME: 15, // Seconds before currency despawns (longer than XP)
    CURRENCY_PULSE_SPEED: 4, // Speed of pulse animation
    CURRENCY_PULSE_AMOUNT: 0.15, // Amount of pulse scaling
    CURRENCY_COLOR: [255, 215, 0], // Gold

    // Magnetization
    MAGNETIZE_SPEED: 800, // Max speed at which pickups move toward player when magnetized (pixels/second)
    MAGNETIZE_ACCELERATION: 600, // Acceleration of magnetized pickups (pixels/second²)
    COLLECTION_RADIUS: 20, // Distance at which pickups are automatically collected
};

// =============================================================================
// PERFORMANCE & OPTIMIZATION
// =============================================================================

export const PERFORMANCE_CONFIG = {
    // Object pooling (future)
    PROJECTILE_POOL_SIZE: 100,
    PARTICLE_POOL_SIZE: 200,

    // Spatial partitioning (future)
    GRID_CELL_SIZE: 100, // Size of spatial grid cells

    // Max entities (safety limits)
    MAX_PROJECTILES: 500,
    MAX_ENEMIES: 300, // Increased for 3x enemy count
    MAX_PICKUPS: 600, // Increased for 3x pickups
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get XP required for next level
 * @param {number} currentLevel - Current player level
 * @returns {number} XP required to reach next level
 */
export function getXPForNextLevel(currentLevel) {
    return Math.floor(
        PROGRESSION_CONFIG.BASE_XP_TO_NEXT_LEVEL *
        Math.pow(PROGRESSION_CONFIG.XP_SCALING_FACTOR, currentLevel - 1)
    );
}

/**
 * Calculate damage after defense reduction
 * @param {number} baseDamage - Base damage before reduction
 * @param {number} defense - Flat defense reduction
 * @param {number} damageReduction - Percentage damage reduction (0-1)
 * @returns {number} Final damage (minimum 1)
 */
export function calculateDamageAfterDefense(baseDamage, defense = 0, damageReduction = 0) {
    const afterReduction = baseDamage * (1 - damageReduction);
    return Math.max(COMBAT_CONFIG.MIN_DAMAGE, afterReduction - defense);
}

/**
 * Check if an attack is a critical hit
 * @param {number} critChance - Critical hit chance (0-1)
 * @param {Object} rng - Optional seeded RNG for multiplayer consistency
 * @returns {boolean} Whether the attack is a crit
 */
export function rollCriticalHit(critChance, rng = null) {
    const roll = rng ? rng.next() : Math.random();
    return roll < critChance;
}

/**
 * Calculate critical hit damage
 * @param {number} baseDamage - Base damage
 * @param {number} critMultiplier - Critical damage multiplier (default 2.0 = 200%)
 * @returns {number} Critical damage
 */
export function calculateCriticalDamage(baseDamage, critMultiplier = 2.0) {
    return Math.floor(baseDamage * critMultiplier);
}
