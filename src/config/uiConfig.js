/**
 * UI Configuration & Design System
 *
 * Centralized UI styling for consistent design across all game scenes
 */

// =============================================================================
// SIZE SYSTEM - Button Hierarchy
// =============================================================================

export const UI_SIZES = {
    // Button sizes - use these for consistent button dimensions
    BUTTON: {
        XS: { width: 80, height: 24 },    // Tab buttons, small actions
        SM: { width: 120, height: 30 },   // Secondary actions, back buttons
        MD: { width: 160, height: 36 },   // Standard actions
        LG: { width: 280, height: 45 },   // Primary CTAs (Play, Start, Confirm)
        XL: { width: 320, height: 50 }    // Full-width menu buttons
    },
    // Card sizes - use these for consistent card dimensions
    CARD: {
        FULL: { width: 340, height: 105 },  // Shop items, detailed cards
        HALF: { width: 165, height: 100 },  // Character select, dual-column
        ICON: { width: 60, height: 60 }     // Stat icons, cosmetic previews
    },
    // Progress bar sizes
    PROGRESS: {
        STANDARD: { width: 100, height: 8 },   // Upgrade progress
        WIDE: { width: 200, height: 12 },      // XP bars, loading
        NARROW: { width: 80, height: 6 }       // Inline stats
    }
};

// =============================================================================
// TYPOGRAPHY SCALE
// =============================================================================

export const UI_TEXT_SIZES = {
    H1: 24,              // Scene titles (was TITLE at 36, reduced for better fit)
    H2: 18,              // Section headers
    BODY: 16,            // Main content
    SMALL: 14,           // Descriptions
    TINY: 12,            // Labels, hints
    MICRO: 11,           // Stats, fine print
    // Legacy names (for backwards compatibility)
    TITLE: 36,           // Scene titles (legacy)
    HEADER: 24,          // Section headers (legacy)
    LABEL: 18,           // Important labels (legacy)
    BUTTON: 20,          // Button text (legacy)
    HUD: 16              // In-game HUD (legacy)
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
// SPACING - Standard spacing scale
// =============================================================================

export const UI_SPACING = {
    // Standard spacing scale
    XS: 4,                    // Extra small spacing
    SM: 8,                    // Small spacing
    MD: 16,                   // Medium spacing
    LG: 24,                   // Large spacing
    XL: 32,                   // Extra large spacing
    // Legacy spacing (for backwards compatibility)
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
    return `${current}/${max}`;
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
    MODAL: 1500,
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

// =============================================================================
// CURRENCY SYMBOLS (for rotating display)
// =============================================================================

export const CURRENCY_SYMBOLS = ['$', '₤', '€', '₿', '¥', '£', '¢', '₹'];

/**
 * Create background particle effects for menu scenes
 * @param {Object} k - Kaplay instance
 * @param {Object} options - Configuration options
 * @param {number} options.patternCount - Number of pulsing patterns (default: 12)
 * @param {number} options.particleCount - Number of falling particles (default: 20)
 * @param {boolean} options.includeCursorFollowers - Include cursor-following ships (default: false)
 */
export function createMenuParticles(k, options = {}) {
    const {
        patternCount = 12,
        particleCount = 20,
        includeCursorFollowers = false
    } = options;

    // Pulsing geometric ASCII patterns
    const patterns = ['◇', '◆', '○', '●', '□', '■', '△', '▲'];
    for (let i = 0; i < patternCount; i++) {
        const pattern = k.add([
            k.text(patterns[Math.floor(Math.random() * patterns.length)], { size: 20 }),
            k.pos(Math.random() * k.width(), Math.random() * k.height()),
            k.color(...UI_COLORS.BG_LIGHT),
            k.opacity(0.15),
            k.scale(1),
            k.z(UI_Z_LAYERS.PARTICLES)
        ]);

        pattern.pulseTime = Math.random() * Math.PI * 2;
        pattern.pulseSpeed = 1 + Math.random() * 2;

        pattern.onUpdate(() => {
            pattern.pulseTime += k.dt() * pattern.pulseSpeed;
            const scale = 0.8 + Math.sin(pattern.pulseTime) * 0.3;
            pattern.scale = k.vec2(scale, scale);
            pattern.opacity = 0.1 + Math.abs(Math.sin(pattern.pulseTime)) * 0.15;
        });
    }

    // Falling particles
    for (let i = 0; i < particleCount; i++) {
        const particle = k.add([
            k.text(['*', '+', '·', '˙'][Math.floor(Math.random() * 4)], { size: 12 }),
            k.pos(Math.random() * k.width(), Math.random() * k.height()),
            k.color(...UI_COLORS.BG_LIGHT),
            k.opacity(0.3 + Math.random() * 0.3),
            k.z(UI_Z_LAYERS.PARTICLES)
        ]);

        particle.speed = 10 + Math.random() * 20;
        particle.onUpdate(() => {
            particle.pos.y += particle.speed * k.dt();
            if (particle.pos.y > k.height()) {
                particle.pos.y = 0;
                particle.pos.x = Math.random() * k.width();
            }
        });
    }

    // Cursor-following ships/asteroids (optional easter egg)
    if (includeCursorFollowers) {
        const cursorFollowers = [];
        k.loop(5, () => {
            if (cursorFollowers.length < 3 && Math.random() < 0.3) {
                const shipChars = ['◄', '►', '▲', '▼', '◆', '●', '★'];
                const ship = k.add([
                    k.text(shipChars[Math.floor(Math.random() * shipChars.length)], { size: 16 }),
                    k.pos(Math.random() * k.width(), Math.random() * k.height()),
                    k.color(100 + Math.random() * 100, 100 + Math.random() * 100, 200 + Math.random() * 55),
                    k.opacity(0.4 + Math.random() * 0.2),
                    k.rotate(Math.random() * 360),
                    k.z(UI_Z_LAYERS.PARTICLES)
                ]);

                ship.followSpeed = 20 + Math.random() * 30;
                ship.rotationSpeed = 50 + Math.random() * 100;
                ship.lifetime = 15 + Math.random() * 10;

                ship.onUpdate(() => {
                    // Follow mouse cursor
                    const mousePos = k.mousePos();
                    const dir = mousePos.sub(ship.pos);
                    const dist = dir.len();

                    if (dist > 5) {
                        const normalized = dir.scale(1 / dist);
                        ship.pos = ship.pos.add(normalized.scale(ship.followSpeed * k.dt()));
                    }

                    // Rotate slowly
                    ship.angle += ship.rotationSpeed * k.dt();

                    // Fade out over lifetime
                    ship.lifetime -= k.dt();
                    if (ship.lifetime <= 0) {
                        k.destroy(ship);
                        const index = cursorFollowers.indexOf(ship);
                        if (index > -1) cursorFollowers.splice(index, 1);
                    }
                });

                cursorFollowers.push(ship);
            }
        });
    }
}

/**
 * ASCII block art definitions for sub-menu titles
 * Each title is rendered as multi-line ASCII art using block characters
 */
const ASCII_TITLES = {
    'CONTESTANTS': [
        ' ██████╗ ██████╗ ███╗   ██╗████████╗███████╗███████╗████████╗ █████╗ ███╗   ██╗████████╗███████╗',
        '██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██╔══██╗████╗  ██║╚══██╔══╝██╔════╝',
        '██║     ██║   ██║██╔██╗ ██║   ██║   █████╗  ███████╗   ██║   ███████║██╔██╗ ██║   ██║   ███████╗',
        '██║     ██║   ██║██║╚██╗██║   ██║   ██╔══╝  ╚════██║   ██║   ██╔══██║██║╚██╗██║   ██║   ╚════██║',
        '╚██████╗╚██████╔╝██║ ╚████║   ██║   ███████╗███████║   ██║   ██║  ██║██║ ╚████║   ██║   ███████║',
        ' ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝'
    ],
    'MERCH': [
        '███╗   ███╗███████╗██████╗  ██████╗██╗  ██╗',
        '████╗ ████║██╔════╝██╔══██╗██╔════╝██║  ██║',
        '██╔████╔██║█████╗  ██████╔╝██║     ███████║',
        '██║╚██╔╝██║██╔══╝  ██╔══██╗██║     ██╔══██║',
        '██║ ╚═╝ ██║███████╗██║  ██║╚██████╗██║  ██║',
        '╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝'
    ],
    'OPTIONS': [
        ' ██████╗ ██████╗ ████████╗██╗ ██████╗ ███╗   ██╗███████╗',
        '██╔═══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝',
        '██║   ██║██████╔╝   ██║   ██║██║   ██║██╔██╗ ██║███████╗',
        '██║   ██║██╔═══╝    ██║   ██║██║   ██║██║╚██╗██║╚════██║',
        '╚██████╔╝██║        ██║   ██║╚██████╔╝██║ ╚████║███████║',
        ' ╚═════╝ ╚═╝        ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝'
    ],
    'RATINGS AND RECORDS': [
        '██████╗  █████╗ ████████╗██╗███╗   ██╗ ██████╗ ███████╗    █████╗ ███╗   ██╗██████╗     ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗ ███████╗',
        '██╔══██╗██╔══██╗╚══██╔══╝██║████╗  ██║██╔════╝ ██╔════╝   ██╔══██╗████╗  ██║██╔══██╗    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝',
        '██████╔╝███████║   ██║   ██║██╔██╗ ██║██║  ███╗███████╗   ███████║██╔██╗ ██║██║  ██║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║███████╗',
        '██╔══██╗██╔══██║   ██║   ██║██║╚██╗██║██║   ██║╚════██║   ██╔══██║██║╚██╗██║██║  ██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║╚════██║',
        '██║  ██║██║  ██║   ██║   ██║██║ ╚████║╚██████╔╝███████║   ██║  ██║██║ ╚████║██████╔╝    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝███████║',
        '╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝   ╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝'
    ],
    'PROFILE': [
        '██████╗ ██████╗  ██████╗ ███████╗██╗██╗     ███████╗',
        '██╔══██╗██╔══██╗██╔═══██╗██╔════╝██║██║     ██╔════╝',
        '██████╔╝██████╔╝██║   ██║█████╗  ██║██║     █████╗  ',
        '██╔═══╝ ██╔══██╗██║   ██║██╔══╝  ██║██║     ██╔══╝  ',
        '██║     ██║  ██║╚██████╔╝██║     ██║███████╗███████╗',
        '╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚══════╝'
    ]
};

/**
 * Create an animated ASCII block art title with rainbow wave effect (similar to main menu title)
 * Uses multi-line ASCII art constructed from block characters
 * @param {Object} k - Kaplay instance
 * @param {string} text - Title text (will be converted to uppercase and matched to ASCII art)
 * @param {number} x - X position (center)
 * @param {number} y - Y position (center of title)
 * @param {number} fontSize - Font size (default: 8, smaller than main menu's 10)
 * @returns {Array} - Array of title line objects
 */
export function createAnimatedTitle(k, text, x, y, fontSize = 8) {
    // Helper function to convert HSL to RGB (same as main menu)
    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
        else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    // Get ASCII art for the title (use uppercase key)
    const titleKey = formatButtonText(text);
    const asciiTitle = ASCII_TITLES[titleKey];
    
    // Fallback to plain text if ASCII art not found
    if (!asciiTitle) {
        console.warn(`ASCII art not found for "${titleKey}", using plain text`);
        const title = k.add([
            k.text(titleKey, { size: fontSize * 2, font: 'monospace' }),
            k.pos(x, y),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT),
            'animatedTitle'
        ]);
        
        // Apply same animation
        let colorTime = 0;
        title.onUpdate(() => {
            colorTime += k.dt();
            const hue = (colorTime * 50) % 360;
            const color = hslToRgb(hue, 80, 60);
            title.color = k.rgb(...color);
            const offset = Math.sin(colorTime * 2) * 2;
            title.pos.y = y + offset;
        });
        return [title];
    }

    // Create animated ASCII title (same structure as main menu)
    const titleLines = [];
    const lineSpacing = 10; // Slightly tighter than main menu's 12
    const startY = y - (asciiTitle.length * lineSpacing) / 2;

    asciiTitle.forEach((line, index) => {
        const titleLine = k.add([
            k.text(line, { size: fontSize, font: 'monospace' }),
            k.pos(x, startY + index * lineSpacing),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT),
            'animatedTitle'
        ]);
        titleLines.push(titleLine);
    });

    // Animated color wave effect (same as main menu)
    let colorTime = 0;
    k.onUpdate(() => {
        colorTime += k.dt();
        titleLines.forEach((line, index) => {
            // Rainbow wave effect (same as main menu)
            const hue = (colorTime * 50 + index * 20) % 360;
            const color = hslToRgb(hue, 80, 60);
            line.color = k.rgb(...color);

            // Subtle floating animation (same as main menu)
            const offset = Math.sin(colorTime * 2 + index * 0.3) * 2;
            line.pos.y = startY + index * lineSpacing + offset;

            // Glitch effect (random chance, same as main menu)
            if (Math.random() < 0.001) {
                line.pos.x = x + (Math.random() - 0.5) * 10;
                k.wait(0.1, () => {
                    if (line.exists()) {
                        line.pos.x = x;
                    }
                });
            }
        });
    });

    return titleLines;
}

/**
 * Create a standardized credit indicator with rotating currency symbols
 * @param {Object} k - Kaplay instance
 * @param {number} currency - Current currency amount
 * @param {string} currencyName - Name of currency (e.g., "Credits")
 * @returns {Object} - Object with panel, icon, and text elements for updates
 */
export function createCreditIndicator(k, currency, currencyName) {
    // Currency symbols rotate with random duration between 2-5 seconds
    const getRandomInterval = () => 2.0 + Math.random() * 3.0; // Random between 2-5 seconds
    
    // Create measurement text to calculate panel width (with symbol placeholder, no currency name)
    const measurementText = k.add([
        k.text(`${CURRENCY_SYMBOLS[0]}: ${currency}`, { size: UI_TEXT_SIZES.LABEL }),
        k.pos(0, 0),
        k.opacity(0),
        k.fixed()
    ]);
    
    const panelWidth = measurementText.width + 30;
    const panelHeight = 40;
    
    k.destroy(measurementText);
    
    // Panel background
    const panel = k.add([
        k.rect(panelWidth, panelHeight),
        k.pos(k.width() - 20, 20),
        k.anchor('topright'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(2, k.rgb(...UI_COLORS.GOLD)),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_BACKGROUND)
    ]);
    
    // Currency text with rotating symbol only (no currency name)
    const text = k.add([
        k.text(`${CURRENCY_SYMBOLS[0]}: ${currency}`, { size: UI_TEXT_SIZES.LABEL }),
        k.pos(k.width() - 20 - panelWidth / 2, 40),
        k.anchor('center'),
        k.color(...UI_COLORS.GOLD),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_TEXT)
    ]);
    
    // Store rotation state and current currency on text
    text.symbolIndex = 0;
    text.timeSinceLastChange = 0;
    text.currentCurrency = currency;
    text.symbolChangeInterval = getRandomInterval(); // Initialize with random interval
    
    // Update currency amount
    const updateCurrency = (newCurrency) => {
        text.currentCurrency = newCurrency;
        text.text = `${CURRENCY_SYMBOLS[text.symbolIndex]}: ${newCurrency}`;
        // Recalculate panel width if needed
        const newWidth = text.width + 30;
        if (Math.abs(newWidth - panelWidth) > 10) {
            panel.width = newWidth;
            text.pos.x = k.width() - 20 - newWidth / 2;
        }
    };
    
    // Add update handler for rotating symbols
    text.onUpdate(() => {
        text.timeSinceLastChange += k.dt();
        if (text.timeSinceLastChange >= text.symbolChangeInterval) {
            text.timeSinceLastChange = 0;
            text.symbolIndex = (text.symbolIndex + 1) % CURRENCY_SYMBOLS.length;
            text.text = `${CURRENCY_SYMBOLS[text.symbolIndex]}: ${text.currentCurrency}`;
            // Get new random interval for next rotation
            text.symbolChangeInterval = getRandomInterval();
        }
    });
    
    return {
        panel,
        text,
        updateCurrency
    };
}

// =============================================================================
// STYLED TEXT HELPER
// =============================================================================

/**
 * Create styled text using the typography scale
 * @param {Object} k - Kaplay instance
 * @param {string} content - Text content
 * @param {Object} options - Configuration options
 * @param {string} options.level - Typography level: 'H1', 'H2', 'BODY', 'SMALL', 'TINY', 'MICRO'
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {string} options.anchor - Anchor point (default: 'center')
 * @param {Array} options.color - RGB color array (default: TEXT_PRIMARY)
 * @returns {Object} - The text game object
 */
export function createStyledText(k, content, options = {}) {
    const {
        level = 'BODY',
        x = 0,
        y = 0,
        anchor = 'center',
        color = UI_COLORS.TEXT_PRIMARY
    } = options;

    const size = UI_TEXT_SIZES[level] || UI_TEXT_SIZES.BODY;

    return k.add([
        k.text(content, { size }),
        k.pos(x, y),
        k.anchor(anchor),
        k.color(...color),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_TEXT)
    ]);
}

// =============================================================================
// PROGRESS BAR HELPER
// =============================================================================

/**
 * Create a progress bar
 * @param {Object} k - Kaplay instance
 * @param {Object} options - Configuration options
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {number} options.width - Bar width (default: 100)
 * @param {number} options.height - Bar height (default: 8)
 * @param {number} options.value - Current value (0-1)
 * @param {Array} options.fillColor - RGB color for filled portion
 * @param {Array} options.bgColor - RGB color for background
 * @returns {Object} - Object with bg, fill elements and update function
 */
export function createProgressBar(k, options = {}) {
    const {
        x = 0,
        y = 0,
        width = UI_SIZES.PROGRESS.STANDARD.width,
        height = UI_SIZES.PROGRESS.STANDARD.height,
        value = 0,
        fillColor = UI_COLORS.PRIMARY,
        bgColor = UI_COLORS.BG_DARK
    } = options;

    const clampedValue = Math.max(0, Math.min(1, value));

    // Background
    const bg = k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.anchor('topleft'),
        k.color(...bgColor),
        k.outline(1, k.rgb(60, 60, 80)),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_ELEMENTS)
    ]);

    // Fill
    const fillWidth = Math.max(0, (width - 2) * clampedValue);
    const fill = k.add([
        k.rect(fillWidth, height - 2),
        k.pos(x + 1, y + 1),
        k.anchor('topleft'),
        k.color(...fillColor),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
    ]);

    // Update function
    const updateValue = (newValue) => {
        const clamped = Math.max(0, Math.min(1, newValue));
        fill.width = Math.max(0, (width - 2) * clamped);
    };

    return {
        bg,
        fill,
        updateValue
    };
}