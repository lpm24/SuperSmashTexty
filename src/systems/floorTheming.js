/**
 * Floor Theming System
 *
 * Adds cosmetic floor decorations that vary by floor theme.
 * Decorations are purely visual and don't impact gameplay clarity.
 */

// Floor theme definitions
const FLOOR_THEMES = {
    city: {
        name: 'Urban Streets',
        floors: [1],
        decorations: [
            // Road markings
            { char: '─', pattern: 'horizontal_lines', density: 'medium', opacity: 0.15 },
            { char: '│', pattern: 'vertical_lines', density: 'low', opacity: 0.12 },
            // Manholes and drains
            { char: '◎', pattern: 'scattered', count: 3, opacity: 0.18 },
            { char: '⊞', pattern: 'scattered', count: 2, opacity: 0.15 },
            // Sidewalk cracks
            { char: '╱', pattern: 'random', count: 8, opacity: 0.1 },
            { char: '╲', pattern: 'random', count: 8, opacity: 0.1 }
        ],
        baseColor: [60, 60, 70]
    },
    mechanical: {
        name: 'Industrial Complex',
        floors: [2],
        decorations: [
            // Metal plating
            { char: '▬', pattern: 'horizontal_lines', density: 'high', opacity: 0.12 },
            { char: '▭', pattern: 'grid', spacing: 80, opacity: 0.15 },
            // Grates and vents
            { char: '▦', pattern: 'scattered', count: 4, opacity: 0.18 },
            { char: '▩', pattern: 'scattered', count: 3, opacity: 0.16 },
            // Pipes and bolts
            { char: '○', pattern: 'corners', opacity: 0.2 },
            { char: '●', pattern: 'edges', count: 12, opacity: 0.14 }
        ],
        baseColor: [70, 65, 60]
    },
    futuristic: {
        name: 'Cyber Station',
        floors: [3],
        decorations: [
            // Glass paneling seams
            { char: '┃', pattern: 'vertical_lines', density: 'medium', opacity: 0.13 },
            { char: '━', pattern: 'horizontal_lines', density: 'medium', opacity: 0.13 },
            // Tech panels
            { char: '▢', pattern: 'grid', spacing: 100, opacity: 0.12 },
            { char: '◇', pattern: 'scattered', count: 5, opacity: 0.15 },
            // Holographic markers
            { char: '◈', pattern: 'corners', opacity: 0.18 },
            { char: '✦', pattern: 'scattered', count: 6, opacity: 0.14 }
        ],
        baseColor: [55, 65, 80]
    },
    alien: {
        name: 'Alien Vessel',
        floors: [4],
        decorations: [
            // Organic patterns
            { char: '≈', pattern: 'wavy_lines', density: 'medium', opacity: 0.12 },
            { char: '~', pattern: 'random', count: 15, opacity: 0.1 },
            // Bio-tech interfaces
            { char: '◉', pattern: 'scattered', count: 4, opacity: 0.16 },
            { char: '◎', pattern: 'grid', spacing: 120, opacity: 0.13 },
            // Strange symbols
            { char: '⚛', pattern: 'corners', opacity: 0.17 },
            { char: '◬', pattern: 'scattered', count: 5, opacity: 0.14 }
        ],
        baseColor: [65, 55, 75]
    }
};

/**
 * Get theme for current floor
 * @param {number} floor - Current floor number
 * @returns {object} - Floor theme configuration
 */
export function getFloorTheme(floor) {
    for (const [key, theme] of Object.entries(FLOOR_THEMES)) {
        if (theme.floors.includes(floor)) {
            return { key, ...theme };
        }
    }
    // Default to first available theme or city theme
    return { key: 'city', ...FLOOR_THEMES.city };
}

/**
 * Generate floor decorations for the current room
 * @param {object} k - Kaplay instance
 * @param {number} floor - Current floor
 * @param {number} roomWidth - Room width
 * @param {number} roomHeight - Room height
 * @returns {Array} - Array of decoration objects to add to scene
 */
export function generateFloorDecorations(k, floor, roomWidth = 800, roomHeight = 600) {
    const theme = getFloorTheme(floor);
    const decorations = [];
    const margin = 30; // Keep decorations away from edges

    theme.decorations.forEach(deco => {
        const baseColor = theme.baseColor;
        const color = k.rgb(
            baseColor[0] + (Math.random() - 0.5) * 20,
            baseColor[1] + (Math.random() - 0.5) * 20,
            baseColor[2] + (Math.random() - 0.5) * 20
        );

        switch (deco.pattern) {
            case 'horizontal_lines': {
                const spacing = deco.density === 'high' ? 40 : deco.density === 'medium' ? 80 : 120;
                for (let y = margin; y < roomHeight - margin; y += spacing) {
                    decorations.push({
                        char: deco.char,
                        x: roomWidth / 2,
                        y: y + (Math.random() - 0.5) * 20,
                        color: color,
                        opacity: deco.opacity,
                        size: 12
                    });
                }
                break;
            }
            case 'vertical_lines': {
                const spacing = deco.density === 'high' ? 40 : deco.density === 'medium' ? 80 : 120;
                for (let x = margin; x < roomWidth - margin; x += spacing) {
                    decorations.push({
                        char: deco.char,
                        x: x + (Math.random() - 0.5) * 20,
                        y: roomHeight / 2,
                        color: color,
                        opacity: deco.opacity,
                        size: 12
                    });
                }
                break;
            }
            case 'wavy_lines': {
                const spacing = 60;
                for (let y = margin; y < roomHeight - margin; y += spacing) {
                    for (let x = margin; x < roomWidth - margin; x += 40) {
                        decorations.push({
                            char: deco.char,
                            x: x + Math.sin(y * 0.05) * 15,
                            y: y,
                            color: color,
                            opacity: deco.opacity,
                            size: 10
                        });
                    }
                }
                break;
            }
            case 'grid': {
                const spacing = deco.spacing || 80;
                for (let y = margin; y < roomHeight - margin; y += spacing) {
                    for (let x = margin; x < roomWidth - margin; x += spacing) {
                        decorations.push({
                            char: deco.char,
                            x: x + (Math.random() - 0.5) * 10,
                            y: y + (Math.random() - 0.5) * 10,
                            color: color,
                            opacity: deco.opacity,
                            size: 14
                        });
                    }
                }
                break;
            }
            case 'scattered': {
                const count = deco.count || 5;
                for (let i = 0; i < count; i++) {
                    decorations.push({
                        char: deco.char,
                        x: margin + Math.random() * (roomWidth - margin * 2),
                        y: margin + Math.random() * (roomHeight - margin * 2),
                        color: color,
                        opacity: deco.opacity,
                        size: 16
                    });
                }
                break;
            }
            case 'random': {
                const count = deco.count || 10;
                for (let i = 0; i < count; i++) {
                    decorations.push({
                        char: deco.char,
                        x: margin + Math.random() * (roomWidth - margin * 2),
                        y: margin + Math.random() * (roomHeight - margin * 2),
                        color: color,
                        opacity: deco.opacity,
                        size: 10 + Math.random() * 6
                    });
                }
                break;
            }
            case 'corners': {
                const positions = [
                    { x: margin + 40, y: margin + 40 },
                    { x: roomWidth - margin - 40, y: margin + 40 },
                    { x: margin + 40, y: roomHeight - margin - 40 },
                    { x: roomWidth - margin - 40, y: roomHeight - margin - 40 }
                ];
                positions.forEach(pos => {
                    decorations.push({
                        char: deco.char,
                        x: pos.x,
                        y: pos.y,
                        color: color,
                        opacity: deco.opacity,
                        size: 18
                    });
                });
                break;
            }
            case 'edges': {
                const count = deco.count || 8;
                const perSide = Math.floor(count / 4);
                // Top edge
                for (let i = 0; i < perSide; i++) {
                    decorations.push({
                        char: deco.char,
                        x: (roomWidth / perSide) * i + roomWidth / (perSide * 2),
                        y: margin + 20,
                        color: color,
                        opacity: deco.opacity,
                        size: 12
                    });
                }
                // Bottom edge
                for (let i = 0; i < perSide; i++) {
                    decorations.push({
                        char: deco.char,
                        x: (roomWidth / perSide) * i + roomWidth / (perSide * 2),
                        y: roomHeight - margin - 20,
                        color: color,
                        opacity: deco.opacity,
                        size: 12
                    });
                }
                // Left edge
                for (let i = 0; i < perSide; i++) {
                    decorations.push({
                        char: deco.char,
                        x: margin + 20,
                        y: (roomHeight / perSide) * i + roomHeight / (perSide * 2),
                        color: color,
                        opacity: deco.opacity,
                        size: 12
                    });
                }
                // Right edge
                for (let i = 0; i < perSide; i++) {
                    decorations.push({
                        char: deco.char,
                        x: roomWidth - margin - 20,
                        y: (roomHeight / perSide) * i + roomHeight / (perSide * 2),
                        color: color,
                        opacity: deco.opacity,
                        size: 12
                    });
                }
                break;
            }
        }
    });

    return decorations;
}

/**
 * Render floor decorations in the game scene
 * @param {object} k - Kaplay instance
 * @param {number} floor - Current floor
 * @param {number} roomWidth - Room width
 * @param {number} roomHeight - Room height
 */
export function renderFloorDecorations(k, floor, roomWidth = 800, roomHeight = 600) {
    const decorations = generateFloorDecorations(k, floor, roomWidth, roomHeight);

    decorations.forEach(deco => {
        k.add([
            k.text(deco.char, { size: deco.size }),
            k.pos(deco.x, deco.y),
            k.color(deco.color),
            k.opacity(deco.opacity),
            k.z(0), // Behind everything else
            'floorDecoration'
        ]);
    });
}
