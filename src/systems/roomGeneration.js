// Room generation system - handles room templates and procedural generation

// Room template definitions
// Each template defines:
// - obstacles: Array of {x, y, width, height, type, color}
//   - type: 'wall' (impassable, blocks projectiles) or 'cover' (impassable, projectiles pass over)
// - spawnDoors: Array of {x, y, direction} - can override default positions
// - name: Template name for identification

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
export function getRandomRoomTemplate() {
    const templates = Object.keys(ROOM_TEMPLATES);
    const randomKey = templates[Math.floor(Math.random() * templates.length)];
    return {
        key: randomKey,
        ...ROOM_TEMPLATES[randomKey]
    };
}

// Get weighted random room template (can favor certain templates)
export function getWeightedRoomTemplate(floor) {
    // Simple implementation - can be expanded with weights
    // For now, all templates have equal weight
    return getRandomRoomTemplate();
}

