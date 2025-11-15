/**
 * Minimap UI Component
 *
 * Displays a compact or expanded view of the floor grid
 * Shows player position, visited rooms, and available paths
 */

import { playMenuNav } from './sounds.js';

/**
 * Minimap display modes
 */
const MINIMAP_MODE = {
    COMPACT: 'compact',
    EXPANDED: 'expanded'
};

/**
 * Minimap UI Manager
 */
export class Minimap {
    constructor(k, floorMap) {
        this.k = k;
        this.floorMap = floorMap;
        this.mode = MINIMAP_MODE.COMPACT;
        this.elements = [];

        // Position
        this.compactPos = { x: k.width() - 120, y: 30 };
        this.expandedPos = { x: k.width() - 250, y: 30 };

        this.render();
    }

    /**
     * Toggle between compact and expanded modes
     */
    toggle() {
        try {
            playMenuNav();
        } catch (e) {
            console.warn('[Minimap] Sound playback failed:', e);
        }
        this.mode = this.mode === MINIMAP_MODE.COMPACT ? MINIMAP_MODE.EXPANDED : MINIMAP_MODE.COMPACT;

        // Delay update to next frame to avoid destroying elements during click event
        this.k.wait(0, () => {
            this.update();
        });
    }

    /**
     * Update minimap display
     */
    update() {
        this.clear();
        this.render();
    }

    /**
     * Clear all minimap elements
     */
    clear() {
        this.elements.forEach(el => {
            if (el.exists()) {
                this.k.destroy(el);
            }
        });
        this.elements = [];
    }

    /**
     * Render minimap based on current mode
     */
    render() {
        if (this.mode === MINIMAP_MODE.COMPACT) {
            this.renderCompact();
        } else {
            this.renderExpanded();
        }
    }

    /**
     * Render compact minimap (always visible, small)
     */
    renderCompact() {
        const { x, y } = this.compactPos;
        const cellSize = 12;
        const grid = this.floorMap.getGridForMinimap();

        // Background
        const bg = this.k.add([
            this.k.rect(140, 80),
            this.k.pos(x - 10, y - 10),
            this.k.anchor('topleft'),
            this.k.color(20, 20, 30),
            this.k.outline(2, this.k.rgb(100, 150, 200)),
            this.k.fixed(),
            this.k.z(900),
            this.k.area(),
            'minimap'
        ]);

        bg.onClick(() => this.toggle());
        this.elements.push(bg);

        // Title
        const title = this.k.add([
            this.k.text(`Floor ${this.floorMap.floor}`, { size: 10 }),
            this.k.pos(x + 60, y),
            this.k.anchor('center'),
            this.k.color(200, 200, 255),
            this.k.fixed(),
            this.k.z(901),
            'minimap'
        ]);
        this.elements.push(title);

        // Grid
        const startY = y + 15;
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = grid[row][col];
                const cellX = x + col * cellSize;
                const cellY = startY + row * cellSize;

                let char = '▫';
                let color = [100, 100, 100];

                switch (cell.type) {
                    case 'current':
                        char = '★';
                        color = [255, 255, 100];
                        break;
                    case 'visited':
                        char = cell.room.isBossRoom ? 'B' : '●';
                        color = cell.room.isBossRoom ? [255, 100, 100] : [100, 255, 100];
                        break;
                    case 'revealed':
                        char = cell.room.isBossRoom ? 'B' : '▫';
                        color = cell.room.isBossRoom ? [255, 150, 150] : [150, 150, 150];
                        break;
                    case 'hidden':
                        char = '▪';
                        color = [60, 60, 80];
                        break;
                    case 'empty':
                        char = ' ';
                        break;
                }

                if (char !== ' ') {
                    const cellText = this.k.add([
                        this.k.text(char, { size: 10 }),
                        this.k.pos(cellX, cellY),
                        this.k.anchor('topleft'),
                        this.k.color(...color),
                        this.k.fixed(),
                        this.k.z(901),
                        'minimap'
                    ]);
                    this.elements.push(cellText);
                }
            }
        }

        // Room counter
        const roomText = this.k.add([
            this.k.text(`${this.floorMap.getVisitedCount()}/${this.floorMap.getTotalRooms()}`, { size: 9 }),
            this.k.pos(x + 60, y + 65),
            this.k.anchor('center'),
            this.k.color(180, 180, 180),
            this.k.fixed(),
            this.k.z(901),
            'minimap'
        ]);
        this.elements.push(roomText);

        // Click hint
        const hint = this.k.add([
            this.k.text('(click)', { size: 8 }),
            this.k.pos(x + 60, y + 75),
            this.k.anchor('center'),
            this.k.color(120, 120, 140),
            this.k.fixed(),
            this.k.z(901),
            'minimap'
        ]);
        this.elements.push(hint);
    }

    /**
     * Render expanded minimap (toggled on)
     */
    renderExpanded() {
        const { x, y } = this.expandedPos;
        const cellSize = 18;
        const grid = this.floorMap.getGridForMinimap();

        const width = Math.max(220, grid[0].length * cellSize + 40);
        const height = Math.max(180, grid.length * cellSize + 100);

        // Background
        const bg = this.k.add([
            this.k.rect(width, height),
            this.k.pos(x, y),
            this.k.anchor('topleft'),
            this.k.color(15, 15, 25),
            this.k.outline(3, this.k.rgb(100, 150, 255)),
            this.k.fixed(),
            this.k.z(900),
            this.k.area(),
            'minimap'
        ]);

        bg.onClick(() => this.toggle());
        this.elements.push(bg);

        // Title bar
        const titleBg = this.k.add([
            this.k.rect(width, 30),
            this.k.pos(x, y),
            this.k.anchor('topleft'),
            this.k.color(30, 30, 50),
            this.k.fixed(),
            this.k.z(901),
            'minimap'
        ]);
        this.elements.push(titleBg);

        const title = this.k.add([
            this.k.text(`FLOOR ${this.floorMap.floor} - ROOM ${this.floorMap.getVisitedCount()}/${this.floorMap.getTotalRooms()}`, { size: 12 }),
            this.k.pos(x + width / 2, y + 15),
            this.k.anchor('center'),
            this.k.color(200, 220, 255),
            this.k.fixed(),
            this.k.z(902),
            'minimap'
        ]);
        this.elements.push(title);

        // Grid
        const gridStartX = x + 20;
        const gridStartY = y + 50;

        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = grid[row][col];
                const cellX = gridStartX + col * cellSize;
                const cellY = gridStartY + row * cellSize;

                // Cell background
                let bgColor = [30, 30, 40];
                let borderColor = [50, 50, 60];

                if (cell.type !== 'empty') {
                    const cellBg = this.k.add([
                        this.k.rect(cellSize - 2, cellSize - 2),
                        this.k.pos(cellX, cellY),
                        this.k.anchor('topleft'),
                        this.k.color(...bgColor),
                        this.k.outline(1, this.k.rgb(...borderColor)),
                        this.k.fixed(),
                        this.k.z(901),
                        'minimap'
                    ]);
                    this.elements.push(cellBg);
                }

                // Cell icon
                let char = '';
                let color = [100, 100, 100];

                switch (cell.type) {
                    case 'current':
                        char = '★';
                        color = [255, 255, 100];
                        break;
                    case 'visited':
                        char = cell.room.isBossRoom ? 'B' : '●';
                        color = cell.room.isBossRoom ? [255, 100, 100] : [100, 255, 100];
                        break;
                    case 'revealed':
                        char = cell.room.isBossRoom ? 'B' : '▫';
                        color = cell.room.isBossRoom ? [255, 150, 150] : [150, 150, 150];
                        break;
                    case 'hidden':
                        char = '▪';
                        color = [80, 80, 100];
                        break;
                }

                if (char) {
                    const cellText = this.k.add([
                        this.k.text(char, { size: 14 }),
                        this.k.pos(cellX + cellSize / 2, cellY + cellSize / 2),
                        this.k.anchor('center'),
                        this.k.color(...color),
                        this.k.fixed(),
                        this.k.z(902),
                        'minimap'
                    ]);
                    this.elements.push(cellText);
                }
            }
        }

        // Legend
        const legendY = gridStartY + grid.length * cellSize + 20;
        const legends = [
            { char: '★', label: 'Current Room', color: [255, 255, 100] },
            { char: '●', label: 'Cleared Room', color: [100, 255, 100] },
            { char: '▫', label: 'Available Room', color: [150, 150, 150] },
            { char: 'B', label: 'Boss Room', color: [255, 100, 100] }
        ];

        legends.forEach((legend, i) => {
            const itemX = x + 20;
            const itemY = legendY + i * 15;

            const symbol = this.k.add([
                this.k.text(legend.char, { size: 10 }),
                this.k.pos(itemX, itemY),
                this.k.anchor('topleft'),
                this.k.color(...legend.color),
                this.k.fixed(),
                this.k.z(902),
                'minimap'
            ]);
            this.elements.push(symbol);

            const label = this.k.add([
                this.k.text(legend.label, { size: 9 }),
                this.k.pos(itemX + 20, itemY),
                this.k.anchor('topleft'),
                this.k.color(180, 180, 200),
                this.k.fixed(),
                this.k.z(902),
                'minimap'
            ]);
            this.elements.push(label);
        });

        // Close hint
        const hint = this.k.add([
            this.k.text('(click to close)', { size: 9 }),
            this.k.pos(x + width / 2, y + height - 10),
            this.k.anchor('center'),
            this.k.color(120, 120, 140),
            this.k.fixed(),
            this.k.z(902),
            'minimap'
        ]);
        this.elements.push(hint);
    }

    /**
     * Cleanup - destroy all minimap elements
     */
    destroy() {
        this.clear();
    }
}

/**
 * Create and initialize minimap
 */
export function createMinimap(k, floorMap) {
    return new Minimap(k, floorMap);
}
