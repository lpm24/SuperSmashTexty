/**
 * Room Generation System
 *
 * Handles procedural room generation and layout:
 * - Room templates with obstacle layouts
 * - Weighted random template selection by floor
 * - Two obstacle types: walls (block all) and cover (block movement only)
 * - Floor-based color theming
 * - Safe spawn zone enforcement
 * - Progressive complexity (more obstacles on higher floors)
 * - Obstacle boundary constraints
 * - Room-to-room variation
 */

// Room configuration
const ROOM_WIDTH = 800;
const ROOM_HEIGHT = 600;
const ROOM_MARGIN = 20;

// Track last used template to avoid repetition
let lastRoomTemplate = null;

/**
 * Room template definitions
 * Each template defines:
 * - obstacles: Array of {x, y, width, height, type, char}
 *   - type: 'wall' (blocks everything) or 'cover' (blocks movement, projectiles pass)
 * - spawnDoors: Optional door position overrides
 * - name: Template identifier
 */

export const ROOM_TEMPLATES = {
    empty: {
        name: 'Empty Room',
        obstacles: [],
        spawnDoors: null // Use default positions
    },
    centerPillar: {
        name: 'Center Pillar',
        obstacles: [
            // Offset from exact center to avoid player spawn (player spawns at 400, 300)
            { x: 400, y: 200, width: 60, height: 60, type: 'wall', char: '#' },
            { x: 400, y: 400, width: 60, height: 60, type: 'wall', char: '#' }
        ],
        spawnDoors: null
    },
    corners: {
        name: 'Corner Cover',
        obstacles: [
            { x: 150, y: 150, width: 40, height: 40, type: 'cover', char: '█' },
            { x: 650, y: 150, width: 40, height: 40, type: 'cover', char: '█' },
            { x: 150, y: 450, width: 40, height: 40, type: 'cover', char: '█' },
            { x: 650, y: 450, width: 40, height: 40, type: 'cover', char: '█' }
        ],
        spawnDoors: null
    },
    hallway: {
        name: 'Hallway',
        obstacles: [
            { x: 200, y: 250, width: 400, height: 20, type: 'wall', char: '#' },
            { x: 200, y: 330, width: 400, height: 20, type: 'wall', char: '#' }
        ],
        spawnDoors: null
    },
    cross: {
        name: 'Cross Pattern',
        obstacles: [
            { x: 350, y: 200, width: 100, height: 20, type: 'wall', char: '#' },
            { x: 390, y: 200, width: 20, height: 200, type: 'wall', char: '#' }
        ],
        spawnDoors: null
    },
    scattered: {
        name: 'Scattered Obstacles',
        obstacles: [
            { x: 250, y: 200, width: 30, height: 30, type: 'cover', char: '█' },
            { x: 550, y: 250, width: 30, height: 30, type: 'cover', char: '█' },
            { x: 350, y: 400, width: 50, height: 30, type: 'wall', char: '#' },
            { x: 150, y: 350, width: 30, height: 50, type: 'wall', char: '#' }
        ],
        spawnDoors: null
    }
};

/**
 * Constrain obstacle position to stay within room boundaries
 * @param {number} x - Obstacle center x position
 * @param {number} y - Obstacle center y position
 * @param {number} width - Obstacle width
 * @param {number} height - Obstacle height
 * @returns {object} - Clamped {x, y} position
 */
export function constrainObstacleToRoom(x, y, width, height) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Calculate boundaries (accounting for obstacle size)
    const minX = ROOM_MARGIN + halfWidth;
    const maxX = ROOM_WIDTH - ROOM_MARGIN - halfWidth;
    const minY = ROOM_MARGIN + halfHeight;
    const maxY = ROOM_HEIGHT - ROOM_MARGIN - halfHeight;

    // Clamp position
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));

    return { x: clampedX, y: clampedY };
}

// Get color scheme for floor (visual progression)
export function getFloorColors(k, floor) {
    // Color progression: darker/more intense as floors increase
    const baseHue = (floor * 30) % 360; // Rotate hue per floor
    const saturation = Math.min(100 + floor * 5, 150);
    const brightness = Math.max(150 - floor * 5, 100);

    return {
        wallColor: k.rgb(
            Math.floor(brightness * 0.6),
            Math.floor(brightness * 0.4),
            Math.floor(brightness * 0.5)
        ),
        obstacleColor: k.rgb(
            Math.floor(brightness * 0.7),
            Math.floor(brightness * 0.5),
            Math.floor(brightness * 0.6)
        ),
        coverColor: k.rgb(
            Math.floor(brightness * 0.8),
            Math.floor(brightness * 0.6),
            Math.floor(brightness * 0.7)
        )
    };
}

// Get random room template
export function getRandomRoomTemplate(rng = null) {
    const templates = Object.keys(ROOM_TEMPLATES);
    const randomIndex = rng
        ? rng.range(0, templates.length)
        : Math.floor(Math.random() * templates.length);
    const randomKey = templates[randomIndex];
    return {
        key: randomKey,
        ...ROOM_TEMPLATES[randomKey]
    };
}

// Get weighted random room template (can favor certain templates)
// Avoids repeating the same template consecutively
// @param {number} floor - Floor number (for difficulty scaling)
// @param {SeededRandom} rng - Optional seeded RNG for multiplayer synchronization
export function getWeightedRoomTemplate(floor, rng = null) {
    const templates = Object.keys(ROOM_TEMPLATES);

    // Filter out the last template to avoid repetition
    const availableTemplates = lastRoomTemplate
        ? templates.filter(key => key !== lastRoomTemplate)
        : templates;

    // If somehow we filtered everything (shouldn't happen), use all templates
    const templatePool = availableTemplates.length > 0 ? availableTemplates : templates;

    // Select random template from pool
    const randomIndex = rng
        ? rng.range(0, templatePool.length)
        : Math.floor(Math.random() * templatePool.length);
    const randomKey = templatePool[randomIndex];

    // Update last template tracker
    lastRoomTemplate = randomKey;

    return {
        key: randomKey,
        ...ROOM_TEMPLATES[randomKey]
    };
}

// Reset room template history (call when starting new run)
export function resetRoomTemplateHistory() {
    lastRoomTemplate = null;
}

// Get room template by specific key (for multiplayer sync)
export function getRoomTemplateByKey(key) {
    if (!ROOM_TEMPLATES[key]) {
        console.warn(`Unknown room template key: ${key}, falling back to empty`);
        return {
            key: 'empty',
            ...ROOM_TEMPLATES.empty
        };
    }

    // Update last template tracker for consistency
    lastRoomTemplate = key;

    return {
        key: key,
        ...ROOM_TEMPLATES[key]
    };
}

