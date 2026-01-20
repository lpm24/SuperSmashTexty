/**
 * Room Generation System
 *
 * Handles procedural room generation and layout:
 * - Room templates with obstacle layouts
 * - Weighted random template selection by floor
 * - Two obstacle types: walls (block all) and cover (block movement only)
 * - Explosive barrel placement for tactical gameplay
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
 * - barrels: Array of {x, y} positions for explosive barrels
 * - spawnDoors: Optional door position overrides
 * - name: Template identifier
 * - floorAffinity: Array of floor numbers this template favors (optional)
 */

export const ROOM_TEMPLATES = {
    // === FLOOR 1: Urban Streets - Simple layouts, learning experience ===
    empty: {
        name: 'Empty Room',
        obstacles: [],
        barrels: [],
        spawnDoors: null,
        floorAffinity: [1]
    },
    streetCorners: {
        name: 'Street Corners',
        obstacles: [
            { x: 150, y: 150, width: 50, height: 50, type: 'cover', char: '▣' },
            { x: 650, y: 150, width: 50, height: 50, type: 'cover', char: '▣' },
            { x: 150, y: 450, width: 50, height: 50, type: 'cover', char: '▣' },
            { x: 650, y: 450, width: 50, height: 50, type: 'cover', char: '▣' }
        ],
        barrels: [
            { x: 300, y: 200 },
            { x: 500, y: 400 }
        ],
        spawnDoors: null,
        floorAffinity: [1]
    },
    alleyway: {
        name: 'Alleyway',
        obstacles: [
            { x: 200, y: 200, width: 30, height: 200, type: 'wall', char: '█' },
            { x: 600, y: 200, width: 30, height: 200, type: 'wall', char: '█' }
        ],
        barrels: [
            { x: 250, y: 250 },
            { x: 550, y: 350 }
        ],
        spawnDoors: null,
        floorAffinity: [1]
    },

    // === FLOOR 2: Industrial Complex - More cover, hazards ===
    factoryFloor: {
        name: 'Factory Floor',
        obstacles: [
            { x: 200, y: 180, width: 80, height: 40, type: 'wall', char: '▬' },
            { x: 600, y: 180, width: 80, height: 40, type: 'wall', char: '▬' },
            { x: 200, y: 420, width: 80, height: 40, type: 'wall', char: '▬' },
            { x: 600, y: 420, width: 80, height: 40, type: 'wall', char: '▬' },
            { x: 400, y: 300, width: 60, height: 60, type: 'wall', char: '◼' }
        ],
        barrels: [
            { x: 150, y: 300 },
            { x: 650, y: 300 },
            { x: 400, y: 200 },
            { x: 400, y: 400 }
        ],
        spawnDoors: null,
        floorAffinity: [2]
    },
    assemblyLine: {
        name: 'Assembly Line',
        obstacles: [
            { x: 250, y: 250, width: 300, height: 25, type: 'wall', char: '═' },
            { x: 250, y: 350, width: 300, height: 25, type: 'wall', char: '═' }
        ],
        barrels: [
            { x: 150, y: 300 },
            { x: 650, y: 300 },
            { x: 400, y: 150 },
            { x: 400, y: 450 }
        ],
        spawnDoors: null,
        floorAffinity: [2]
    },
    storageYard: {
        name: 'Storage Yard',
        obstacles: [
            { x: 180, y: 180, width: 50, height: 50, type: 'cover', char: '▦' },
            { x: 620, y: 180, width: 50, height: 50, type: 'cover', char: '▦' },
            { x: 180, y: 420, width: 50, height: 50, type: 'cover', char: '▦' },
            { x: 620, y: 420, width: 50, height: 50, type: 'cover', char: '▦' },
            { x: 320, y: 300, width: 40, height: 40, type: 'cover', char: '▦' },
            { x: 480, y: 300, width: 40, height: 40, type: 'cover', char: '▦' }
        ],
        barrels: [
            { x: 250, y: 250 },
            { x: 550, y: 250 },
            { x: 250, y: 350 },
            { x: 550, y: 350 },
            { x: 400, y: 200 }
        ],
        spawnDoors: null,
        floorAffinity: [2]
    },

    // === FLOOR 3: Cyber Station - Tech layouts, precision required ===
    serverRoom: {
        name: 'Server Room',
        obstacles: [
            { x: 200, y: 150, width: 30, height: 300, type: 'wall', char: '║' },
            { x: 350, y: 150, width: 30, height: 300, type: 'wall', char: '║' },
            { x: 500, y: 150, width: 30, height: 300, type: 'wall', char: '║' },
            { x: 650, y: 150, width: 30, height: 300, type: 'wall', char: '║' }
        ],
        barrels: [
            { x: 275, y: 200 },
            { x: 425, y: 400 },
            { x: 575, y: 250 }
        ],
        spawnDoors: null,
        floorAffinity: [3]
    },
    controlCenter: {
        name: 'Control Center',
        obstacles: [
            { x: 400, y: 200, width: 120, height: 80, type: 'wall', char: '▢' },
            { x: 200, y: 350, width: 60, height: 60, type: 'cover', char: '◇' },
            { x: 600, y: 350, width: 60, height: 60, type: 'cover', char: '◇' }
        ],
        barrels: [
            { x: 300, y: 200 },
            { x: 500, y: 200 },
            { x: 400, y: 450 }
        ],
        spawnDoors: null,
        floorAffinity: [3]
    },
    dataVault: {
        name: 'Data Vault',
        obstacles: [
            { x: 250, y: 200, width: 40, height: 40, type: 'wall', char: '◈' },
            { x: 550, y: 200, width: 40, height: 40, type: 'wall', char: '◈' },
            { x: 250, y: 400, width: 40, height: 40, type: 'wall', char: '◈' },
            { x: 550, y: 400, width: 40, height: 40, type: 'wall', char: '◈' },
            { x: 400, y: 300, width: 100, height: 100, type: 'wall', char: '◉' }
        ],
        barrels: [
            { x: 180, y: 300 },
            { x: 620, y: 300 }
        ],
        spawnDoors: null,
        floorAffinity: [3]
    },

    // === FLOOR 4: Alien Vessel - Organic, unpredictable ===
    hiveCluster: {
        name: 'Hive Cluster',
        obstacles: [
            { x: 300, y: 180, width: 50, height: 50, type: 'cover', char: '◎' },
            { x: 500, y: 180, width: 50, height: 50, type: 'cover', char: '◎' },
            { x: 200, y: 300, width: 50, height: 50, type: 'cover', char: '◎' },
            { x: 600, y: 300, width: 50, height: 50, type: 'cover', char: '◎' },
            { x: 300, y: 420, width: 50, height: 50, type: 'cover', char: '◎' },
            { x: 500, y: 420, width: 50, height: 50, type: 'cover', char: '◎' }
        ],
        barrels: [
            { x: 400, y: 180 },
            { x: 400, y: 420 },
            { x: 250, y: 300 },
            { x: 550, y: 300 }
        ],
        spawnDoors: null,
        floorAffinity: [4]
    },
    bioLab: {
        name: 'Bio Lab',
        obstacles: [
            { x: 300, y: 250, width: 200, height: 30, type: 'wall', char: '≡' },
            { x: 300, y: 350, width: 200, height: 30, type: 'wall', char: '≡' },
            { x: 400, y: 300, width: 30, height: 130, type: 'wall', char: '‖' }
        ],
        barrels: [
            { x: 200, y: 200 },
            { x: 600, y: 200 },
            { x: 200, y: 400 },
            { x: 600, y: 400 },
            { x: 400, y: 150 },
            { x: 400, y: 450 }
        ],
        spawnDoors: null,
        floorAffinity: [4]
    },
    xenoNest: {
        name: 'Xeno Nest',
        obstacles: [
            { x: 400, y: 300, width: 80, height: 80, type: 'wall', char: '⚛' },
            { x: 250, y: 200, width: 35, height: 35, type: 'cover', char: '◬' },
            { x: 550, y: 200, width: 35, height: 35, type: 'cover', char: '◬' },
            { x: 250, y: 400, width: 35, height: 35, type: 'cover', char: '◬' },
            { x: 550, y: 400, width: 35, height: 35, type: 'cover', char: '◬' }
        ],
        barrels: [
            { x: 180, y: 150 },
            { x: 620, y: 150 },
            { x: 180, y: 450 },
            { x: 620, y: 450 }
        ],
        spawnDoors: null,
        floorAffinity: [4]
    },

    // === Universal templates (work on any floor) ===
    centerPillar: {
        name: 'Center Pillar',
        obstacles: [
            { x: 400, y: 200, width: 60, height: 60, type: 'wall', char: '#' },
            { x: 400, y: 400, width: 60, height: 60, type: 'wall', char: '#' }
        ],
        barrels: [
            { x: 250, y: 300 },
            { x: 550, y: 300 }
        ],
        spawnDoors: null,
        floorAffinity: null // Works on all floors
    },
    corners: {
        name: 'Corner Cover',
        obstacles: [
            { x: 150, y: 150, width: 40, height: 40, type: 'cover', char: '█' },
            { x: 650, y: 150, width: 40, height: 40, type: 'cover', char: '█' },
            { x: 150, y: 450, width: 40, height: 40, type: 'cover', char: '█' },
            { x: 650, y: 450, width: 40, height: 40, type: 'cover', char: '█' }
        ],
        barrels: [
            { x: 400, y: 200 },
            { x: 400, y: 400 }
        ],
        spawnDoors: null,
        floorAffinity: null
    },
    hallway: {
        name: 'Hallway',
        obstacles: [
            { x: 200, y: 250, width: 400, height: 20, type: 'wall', char: '#' },
            { x: 200, y: 330, width: 400, height: 20, type: 'wall', char: '#' }
        ],
        barrels: [
            { x: 150, y: 290 },
            { x: 650, y: 290 }
        ],
        spawnDoors: null,
        floorAffinity: null
    },
    cross: {
        name: 'Cross Pattern',
        obstacles: [
            { x: 350, y: 200, width: 100, height: 20, type: 'wall', char: '#' },
            { x: 390, y: 200, width: 20, height: 200, type: 'wall', char: '#' }
        ],
        barrels: [
            { x: 250, y: 200 },
            { x: 550, y: 200 },
            { x: 250, y: 400 },
            { x: 550, y: 400 }
        ],
        spawnDoors: null,
        floorAffinity: null
    },
    barrelRoom: {
        name: 'Barrel Room',
        obstacles: [
            { x: 400, y: 300, width: 50, height: 50, type: 'cover', char: '▣' }
        ],
        barrels: [
            // Strategic barrel cluster - chain reaction opportunity!
            { x: 250, y: 200 },
            { x: 300, y: 200 },
            { x: 275, y: 250 },
            { x: 500, y: 400 },
            { x: 550, y: 400 },
            { x: 525, y: 350 },
            // Corner barrels
            { x: 150, y: 150 },
            { x: 650, y: 450 }
        ],
        spawnDoors: null,
        floorAffinity: null
    },
    scattered: {
        name: 'Scattered Obstacles',
        obstacles: [
            { x: 250, y: 200, width: 30, height: 30, type: 'cover', char: '█' },
            { x: 550, y: 250, width: 30, height: 30, type: 'cover', char: '█' },
            { x: 350, y: 400, width: 50, height: 30, type: 'wall', char: '#' },
            { x: 150, y: 350, width: 30, height: 50, type: 'wall', char: '#' }
        ],
        barrels: [
            { x: 450, y: 200 },
            { x: 250, y: 400 },
            { x: 600, y: 350 }
        ],
        spawnDoors: null,
        floorAffinity: null
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
// Each floor has a distinct color palette matching its theme
export function getFloorColors(k, floor) {
    // Floor-specific color palettes matching floorTheming.js
    const floorPalettes = {
        1: { // Urban Streets - cool gray asphalt tones
            wall: [55, 55, 65],
            obstacle: [70, 70, 80],
            cover: [85, 85, 95]
        },
        2: { // Industrial Complex - rusty brown-orange tones
            wall: [75, 60, 50],
            obstacle: [90, 70, 55],
            cover: [100, 80, 65]
        },
        3: { // Cyber Station - cool blue steel tones
            wall: [45, 55, 75],
            obstacle: [55, 70, 95],
            cover: [65, 85, 115]
        },
        4: { // Alien Vessel - deep purple organic tones
            wall: [60, 45, 70],
            obstacle: [75, 55, 85],
            cover: [90, 65, 100]
        },
        5: { // The Void - eldritch purple-black tones
            wall: [35, 30, 45],
            obstacle: [45, 38, 55],
            cover: [55, 45, 65]
        }
    };

    // Get palette for current floor (default to void for floor 5+)
    const palette = floorPalettes[Math.min(floor, 5)] || floorPalettes[5];

    return {
        wallColor: k.rgb(...palette.wall),
        obstacleColor: k.rgb(...palette.obstacle),
        coverColor: k.rgb(...palette.cover)
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

// Get weighted random room template (favors floor-specific templates)
// Avoids repeating the same template consecutively
// @param {number} floor - Floor number (for difficulty scaling and template selection)
// @param {SeededRandom} rng - Optional seeded RNG for multiplayer synchronization
export function getWeightedRoomTemplate(floor, rng = null) {
    const allTemplates = Object.keys(ROOM_TEMPLATES);

    // Filter out the last template to avoid repetition
    const availableTemplates = lastRoomTemplate
        ? allTemplates.filter(key => key !== lastRoomTemplate)
        : allTemplates;

    // Separate floor-specific and universal templates
    const floorSpecific = [];
    const universal = [];

    availableTemplates.forEach(key => {
        const template = ROOM_TEMPLATES[key];
        if (template.floorAffinity === null) {
            universal.push(key);
        } else if (template.floorAffinity.includes(floor)) {
            floorSpecific.push(key);
        }
    });

    // 70% chance to use floor-specific template if available
    const useFloorSpecific = floorSpecific.length > 0 &&
        ((rng ? rng.next() : Math.random()) < 0.7);

    const templatePool = useFloorSpecific ? floorSpecific :
        (universal.length > 0 ? universal : availableTemplates);

    // If somehow we filtered everything (shouldn't happen), use all templates
    const finalPool = templatePool.length > 0 ? templatePool : allTemplates;

    // Select random template from pool
    const randomIndex = rng
        ? rng.range(0, finalPool.length)
        : Math.floor(Math.random() * finalPool.length);
    const randomKey = finalPool[randomIndex];

    // Update last template tracker
    lastRoomTemplate = randomKey;

    return {
        key: randomKey,
        ...ROOM_TEMPLATES[randomKey]
    };
}

/**
 * Get barrel spawn positions for a room template
 * @param {string} templateKey - Template key
 * @param {SeededRandom} rng - Optional seeded RNG
 * @param {number} floor - Floor number (affects barrel count)
 * @returns {Array} - Array of {x, y} barrel positions
 */
export function getBarrelPositions(templateKey, rng = null, floor = 1) {
    const template = ROOM_TEMPLATES[templateKey];
    if (!template || !template.barrels || template.barrels.length === 0) {
        return [];
    }

    // Base barrel positions from template
    let positions = [...template.barrels];

    // On higher floors, potentially add extra barrels
    if (floor >= 2) {
        const extraChance = rng ? rng.next() : Math.random();
        if (extraChance < 0.3 + (floor * 0.1)) {
            // Add a random extra barrel
            const extraX = 100 + (rng ? rng.next() : Math.random()) * 600;
            const extraY = 100 + (rng ? rng.next() : Math.random()) * 400;
            positions.push({ x: extraX, y: extraY });
        }
    }

    // On floor 1, reduce barrels to help new players
    if (floor === 1) {
        const reduceChance = rng ? rng.next() : Math.random();
        if (reduceChance < 0.5 && positions.length > 1) {
            positions = positions.slice(0, Math.ceil(positions.length / 2));
        }
    }

    return positions;
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

