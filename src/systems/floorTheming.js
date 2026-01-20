/**
 * Floor Theming System
 *
 * Adds cosmetic floor decorations that vary by floor theme.
 * Each floor has a distinct personality with unique:
 * - Visual decorations and patterns
 * - Color schemes
 * - Environmental storytelling
 * Decorations are purely visual and don't impact gameplay clarity.
 */

// Floor theme definitions - Each floor tells a story
const FLOOR_THEMES = {
    city: {
        name: 'Urban Streets',
        description: 'Abandoned city blocks overrun by chaos',
        floors: [1],
        decorations: [
            // Road markings - faded crosswalks and lanes
            { char: '─', pattern: 'horizontal_lines', density: 'medium', opacity: 0.18 },
            { char: '│', pattern: 'vertical_lines', density: 'low', opacity: 0.15 },
            // Manholes and storm drains
            { char: '◎', pattern: 'scattered', count: 4, opacity: 0.22 },
            { char: '⊞', pattern: 'scattered', count: 3, opacity: 0.18 },
            // Debris and cracks in pavement
            { char: '╱', pattern: 'random', count: 12, opacity: 0.12 },
            { char: '╲', pattern: 'random', count: 12, opacity: 0.12 },
            // Trash and litter
            { char: '□', pattern: 'random', count: 6, opacity: 0.1 },
            // Broken glass reflections
            { char: '·', pattern: 'scattered', count: 15, opacity: 0.08 }
        ],
        baseColor: [55, 55, 65], // Cool gray asphalt
        ambientColor: [70, 70, 80] // Dim streetlight glow
    },
    mechanical: {
        name: 'Industrial Complex',
        description: 'Rusted factories and hazardous machinery',
        floors: [2],
        decorations: [
            // Heavy metal plating - factory floor
            { char: '▬', pattern: 'horizontal_lines', density: 'high', opacity: 0.15 },
            { char: '▭', pattern: 'grid', spacing: 70, opacity: 0.18 },
            // Grates and ventilation
            { char: '▦', pattern: 'scattered', count: 5, opacity: 0.22 },
            { char: '▩', pattern: 'scattered', count: 4, opacity: 0.2 },
            // Rivets and bolts
            { char: '●', pattern: 'edges', count: 16, opacity: 0.16 },
            { char: '○', pattern: 'corners', opacity: 0.24 },
            // Oil stains and rust
            { char: '▪', pattern: 'random', count: 10, opacity: 0.1 },
            // Caution markings
            { char: '⚠', pattern: 'scattered', count: 2, opacity: 0.15 },
            // Pipes running along floor
            { char: '═', pattern: 'horizontal_lines', density: 'low', opacity: 0.12 }
        ],
        baseColor: [75, 60, 50], // Rusty brown-orange
        ambientColor: [90, 75, 60] // Warm industrial lighting
    },
    futuristic: {
        name: 'Cyber Station',
        description: 'High-tech facility with malfunctioning systems',
        floors: [3],
        decorations: [
            // Clean panel seams - futuristic flooring
            { char: '┃', pattern: 'vertical_lines', density: 'medium', opacity: 0.16 },
            { char: '━', pattern: 'horizontal_lines', density: 'medium', opacity: 0.16 },
            // Holographic floor panels
            { char: '▢', pattern: 'grid', spacing: 90, opacity: 0.14 },
            { char: '◇', pattern: 'scattered', count: 6, opacity: 0.18 },
            // Data nodes and access points
            { char: '◈', pattern: 'corners', opacity: 0.22 },
            { char: '✦', pattern: 'scattered', count: 8, opacity: 0.16 },
            // Circuit traces
            { char: '┼', pattern: 'grid', spacing: 150, opacity: 0.1 },
            // Flickering indicators
            { char: '◆', pattern: 'random', count: 5, opacity: 0.12 },
            // Light strips
            { char: '▏', pattern: 'edges', count: 20, opacity: 0.15 }
        ],
        baseColor: [45, 55, 75], // Cool blue steel
        ambientColor: [60, 80, 120] // Neon blue glow
    },
    alien: {
        name: 'Alien Vessel',
        description: 'Otherworldly organic ship interior',
        floors: [4],
        decorations: [
            // Organic pulsing patterns
            { char: '≈', pattern: 'wavy_lines', density: 'medium', opacity: 0.15 },
            { char: '~', pattern: 'random', count: 20, opacity: 0.12 },
            // Bio-luminescent nodes
            { char: '◉', pattern: 'scattered', count: 5, opacity: 0.2 },
            { char: '◎', pattern: 'grid', spacing: 110, opacity: 0.16 },
            // Alien symbols and markings
            { char: '⚛', pattern: 'corners', opacity: 0.2 },
            { char: '◬', pattern: 'scattered', count: 6, opacity: 0.16 },
            // Membrane textures
            { char: '∿', pattern: 'random', count: 12, opacity: 0.1 },
            // Spore-like particles
            { char: '°', pattern: 'scattered', count: 15, opacity: 0.08 },
            // Veins/tendrils pattern
            { char: '╭', pattern: 'random', count: 8, opacity: 0.12 },
            { char: '╮', pattern: 'random', count: 8, opacity: 0.12 }
        ],
        baseColor: [60, 45, 70], // Deep purple organic
        ambientColor: [80, 60, 100] // Bioluminescent purple glow
    },
    // Future floors (5+) - extend the theming
    void: {
        name: 'The Void',
        description: 'Reality breaks down at the edge of existence',
        floors: [5, 6, 7, 8],
        decorations: [
            // Static and glitches
            { char: '░', pattern: 'random', count: 25, opacity: 0.15 },
            { char: '▒', pattern: 'random', count: 15, opacity: 0.12 },
            // Fragmented reality
            { char: '◊', pattern: 'scattered', count: 8, opacity: 0.18 },
            { char: '▣', pattern: 'grid', spacing: 120, opacity: 0.14 },
            // Dimensional tears
            { char: '※', pattern: 'corners', opacity: 0.2 },
            { char: '✧', pattern: 'scattered', count: 10, opacity: 0.16 },
            // Entropy patterns
            { char: '⋮', pattern: 'random', count: 20, opacity: 0.1 },
            { char: '⋯', pattern: 'random', count: 20, opacity: 0.1 }
        ],
        baseColor: [35, 30, 45], // Deep void purple-black
        ambientColor: [50, 40, 70] // Eldritch glow
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
