/**
 * UI Configuration & Design System
 *
 * Centralized UI styling for consistent design across all game scenes
 */

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const UI_TEXT_SIZES = {
    TITLE: 36,           // Scene titles
    HEADER: 24,          // Section headers
    LABEL: 18,           // Important labels
    BODY: 16,            // Descriptions, stats
    SMALL: 14,           // Hints, secondary info
    BUTTON: 20,          // Button text
    HUD: 16              // In-game HUD
};

// =============================================================================
// COLORS
// =============================================================================

export const UI_COLORS = {
    // Primary Actions
    PRIMARY: [80, 180, 80],           // Green - Start, Confirm
    PRIMARY_HOVER: [120, 220, 120],

    // Secondary Actions
    SECONDARY: [80, 120, 200],        // Blue - Info, Navigate
    SECONDARY_HOVER: [120, 160, 255],

    // Tertiary Actions
    TERTIARY: [180, 80, 180],         // Purple - Special
    TERTIARY_HOVER: [220, 120, 220],

    // Shop/Currency
    GOLD: [200, 150, 50],             // Gold - Shop, Currency
    GOLD_HOVER: [240, 190, 90],

    // Neutral
    NEUTRAL: [100, 100, 120],         // Gray - Settings, Cancel
    NEUTRAL_HOVER: [140, 140, 160],

    // Destructive
    DANGER: [180, 50, 50],            // Red - Quit, Delete
    DANGER_HOVER: [220, 90, 90],

    // Status Colors
    SUCCESS: [100, 255, 100],         // Green - Success messages
    WARNING: [255, 200, 100],         // Orange - Warnings
    ERROR: [255, 100, 100],           // Red - Errors
    INFO: [100, 200, 255],            // Blue - Info messages

    // Text Colors
    TEXT_PRIMARY: [255, 255, 255],    // White - Primary text
    TEXT_SECONDARY: [200, 200, 200],  // Light gray - Secondary text
    TEXT_TERTIARY: [150, 150, 150],   // Medium gray - Tertiary text
    TEXT_DISABLED: [100, 100, 100],   // Dark gray - Disabled text

    // Background Colors
    BG_DARK: [20, 20, 30],            // Dark background
    BG_MEDIUM: [40, 40, 50],          // Medium background
    BG_LIGHT: [60, 60, 70],           // Light background
    BG_DISABLED: [60, 60, 60],        // Disabled background

    // UI Element Colors
    BORDER: [150, 180, 255],          // Standard border
    BORDER_HOVER: [255, 255, 255],    // Hovered border
    BORDER_ACTIVE: [100, 200, 255],   // Active border

    // HUD Colors
    HEALTH_FULL: [100, 255, 100],     // Green health
    HEALTH_MEDIUM: [255, 255, 100],   // Yellow health
    HEALTH_LOW: [255, 100, 100],      // Red health
    XP_BAR: [100, 200, 255],          // Blue XP bar

    // Boss/Enemy Colors
    BOSS_NAME: [255, 200, 100],       // Gold for boss names
    MINIBOSS_NAME: [255, 150, 100],   // Orange for miniboss names
};

// =============================================================================
// SPACING
// =============================================================================

export const UI_SPACING = {
    BUTTON_VERTICAL: 65,      // Vertical spacing between menu buttons
    BUTTON_HORIZONTAL: 20,    // Horizontal spacing between buttons
    ITEM_SPACING: 50,         // Spacing between list items
    SECTION_SPACING: 100,     // Spacing between major sections
    CONTENT_MARGIN: 40,       // Margin from screen edges
    PADDING_SMALL: 10,        // Small padding
    PADDING_MEDIUM: 20,       // Medium padding
    PADDING_LARGE: 40         // Large padding
};

// =============================================================================
// BUTTON DEFAULTS
// =============================================================================

export const UI_BUTTON = {
    WIDTH: 300,
    HEIGHT: 50,
    BORDER_WIDTH: 2,
    HOVER_SCALE: 1.05,
    TRANSITION_TIME: 0.15
};

// =============================================================================
// TERMINOLOGY (Standardized)
// =============================================================================

export const UI_TERMS = {
    HEALTH: 'HP',             // Use "HP" not "Health"
    EXPERIENCE: 'XP',         // Use "XP" not "Experience"
    LEVEL: 'Level',           // Capitalize
    FLOOR: 'Floor',           // Capitalize
    ROOM: 'Room',             // Capitalize
    CURRENCY: 'Silver',       // Default currency name (can be overridden)
    DAMAGE: 'Damage',
    SPEED: 'Speed',
    BOSS: 'BOSS',             // ALL CAPS for emphasis
    MINIBOSS: 'MINIBOSS'
};

// =============================================================================
// TEXT FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format button text (ALL CAPS)
 */
export function formatButtonText(text) {
    return text.toUpperCase();
}

/**
 * Format section header (Title Case)
 */
export function formatHeader(text) {
    return text.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Format status text (ALL CAPS)
 */
export function formatStatus(text) {
    return text.toUpperCase();
}

/**
 * Format stat label (Sentence case)
 */
export function formatStatLabel(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format floor and room display
 */
export function formatFloorRoom(floor, room, abbreviated = false) {
    if (abbreviated) {
        return `F${floor} R${room}`;
    }
    return `Floor ${floor}, Room ${room}`;
}

/**
 * Format health display
 */
export function formatHealth(current, max) {
    return `${UI_TERMS.HEALTH}: ${current}/${max}`;
}

/**
 * Format XP display
 */
export function formatXP(current, max) {
    return `${UI_TERMS.XP}: ${current}/${max}`;
}

// =============================================================================
// Z-LAYER SYSTEM
// =============================================================================

export const UI_Z_LAYERS = {
    BACKGROUND: 0,
    GAME_ENTITIES: 10,
    PARTICLES: 50,
    UI_BACKGROUND: 100,
    UI_ELEMENTS: 200,
    UI_TEXT: 300,
    OVERLAY: 500,
    MODAL: 1000,
    TOOLTIP: 2000,
    PAUSE_MENU: 2001,
    DEBUG: 9999
};

// =============================================================================
// ANIMATION TIMINGS
// =============================================================================

export const UI_ANIMATIONS = {
    FAST: 0.1,
    NORMAL: 0.2,
    SLOW: 0.3,
    PULSE_SPEED: 2,
    WAVE_SPEED: 1
};
