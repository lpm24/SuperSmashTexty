/**
 * Minimap UI Component
 *
 * Displays a compact or expanded view of the floor grid
 * Shows player position, visited rooms, and available paths
 *
 * Design: All states anchor to top-right with consistent margins
 */

import { playMenuNav } from './sounds.js';

/**
 * Minimap display modes
 */
const MINIMAP_MODE = {
    MINIMIZED: 'minimized',  // Just a map button
    OPEN: 'open',            // Small minimap (no legend)
    MAXIMIZED: 'maximized'   // Large minimap with legend
};

/**
 * UI Layout Constants
 */
const LAYOUT = {
    MARGIN_RIGHT: 12,      // Distance from right edge
    MARGIN_TOP: 32,        // Below credits counter (at y: 6)
    BUTTON_SIZE: 38,       // Minimized button size
    OPEN_WIDTH: 130,       // Open state width
    OPEN_HEIGHT: 85,       // Open state height
    MAX_MIN_WIDTH: 200,    // Maximized minimum width
    MAX_MIN_HEIGHT: 160,   // Maximized minimum height
    CELL_SIZE_SMALL: 11,   // Grid cell size for open state
    CELL_SIZE_LARGE: 16,   // Grid cell size for maximized state
    CORNER_RADIUS: 4,      // Rounded corner visual (simulated)
    Z_BASE: 900,           // Base z-index
    Z_TEXT: 901,           // Text z-index
    Z_ICON: 902,           // Icon/badge z-index
};

/**
 * Color Palette
 */
const COLORS = {
    BG_DARK: [18, 18, 28],
    BG_PANEL: [25, 25, 40],
    BG_HEADER: [35, 35, 55],
    BORDER: [80, 120, 180],
    BORDER_HOVER: [120, 160, 220],
    TEXT_TITLE: [200, 210, 255],
    TEXT_MUTED: [140, 140, 160],
    ICON_MAP: [130, 160, 220],
    BADGE_FLOOR: [255, 220, 80],
    CURRENT: [255, 255, 100],
    VISITED: [80, 220, 100],
    AVAILABLE: [120, 120, 140],
    BOSS: [255, 90, 90],
    HIDDEN: [50, 50, 70],
    CELL_BG: [30, 30, 45],
    CELL_BORDER: [45, 45, 60],
};

/**
 * Minimap UI Manager
 */
export class Minimap {
    constructor(k, floorMap) {
        this.k = k;
        this.floorMap = floorMap;
        this.mode = MINIMAP_MODE.MINIMIZED;
        this.elements = [];
        this.isHovered = false;
        this.destroyed = false;

        // Only render if floorMap is valid
        if (this.floorMap && typeof this.floorMap.getGridForMinimap === 'function') {
            this.render();
        }
    }

    /**
     * Get the right anchor X position (consistent for all states)
     */
    getRightX() {
        return this.k.width() - LAYOUT.MARGIN_RIGHT;
    }

    /**
     * Get the top Y position (consistent for all states)
     */
    getTopY() {
        return LAYOUT.MARGIN_TOP;
    }

    /**
     * Cycle through minimap modes: minimized → open → maximized → minimized
     */
    toggle() {
        if (this.destroyed) return;

        try {
            playMenuNav();
        } catch (e) {
            console.warn('[Minimap] Sound playback failed:', e);
        }

        if (this.mode === MINIMAP_MODE.MINIMIZED) {
            this.mode = MINIMAP_MODE.OPEN;
        } else if (this.mode === MINIMAP_MODE.OPEN) {
            this.mode = MINIMAP_MODE.MAXIMIZED;
        } else {
            this.mode = MINIMAP_MODE.MINIMIZED;
        }

        this.update();
    }

    /**
     * Update minimap display
     */
    update() {
        if (this.destroyed) return;
        this.clear();
        this.render();
    }

    /**
     * Clear all minimap elements
     */
    clear() {
        this.elements.forEach(el => {
            try {
                if (el && el.exists()) {
                    this.k.destroy(el);
                }
            } catch (e) {
                // Element may have been destroyed by scene transition
            }
        });
        this.elements = [];
    }

    /**
     * Render minimap based on current mode
     */
    render() {
        if (this.destroyed) return;

        if (this.mode === MINIMAP_MODE.MINIMIZED) {
            this.renderMinimized();
        } else if (this.mode === MINIMAP_MODE.OPEN) {
            this.renderOpen();
        } else {
            this.renderMaximized();
        }
    }

    /**
     * Create a clickable background panel with hover effect
     */
    createPanel(width, height, x, y) {
        const bg = this.k.add([
            this.k.rect(width, height),
            this.k.pos(x, y),
            this.k.anchor('topright'),
            this.k.color(...COLORS.BG_PANEL),
            this.k.outline(2, this.k.rgb(...COLORS.BORDER)),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_BASE),
            this.k.area(),
            this.k.opacity(0.95),
            'minimap'
        ]);

        bg.onHover(() => {
            bg.outline.color = this.k.rgb(...COLORS.BORDER_HOVER);
            bg.outline.width = 3;
        });

        bg.onHoverEnd(() => {
            bg.outline.color = this.k.rgb(...COLORS.BORDER);
            bg.outline.width = 2;
        });

        bg.onClick(() => this.toggle());
        this.elements.push(bg);
        return bg;
    }

    /**
     * Render minimized state - compact map button
     */
    renderMinimized() {
        const x = this.getRightX();
        const y = this.getTopY();
        const size = LAYOUT.BUTTON_SIZE;

        // Button background
        this.createPanel(size, size, x, y);

        // Calculate center of button (panel anchored topright, so center is left and down from anchor)
        const centerX = x - size / 2;
        const centerY = y + size / 2;

        // Map icon
        const icon = this.k.add([
            this.k.text('◧', { size: 22 }),
            this.k.pos(centerX, centerY),
            this.k.anchor('center'),
            this.k.color(...COLORS.ICON_MAP),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_TEXT),
            'minimap'
        ]);
        this.elements.push(icon);

        // Floor number badge (top-left corner of button)
        const badge = this.k.add([
            this.k.text(`F${this.floorMap.floor}`, { size: 9 }),
            this.k.pos(x - size + 4, y + 4),
            this.k.anchor('topleft'),
            this.k.color(...COLORS.BADGE_FLOOR),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_ICON),
            'minimap'
        ]);
        this.elements.push(badge);
    }

    /**
     * Render open state - compact minimap without legend
     */
    renderOpen() {
        const x = this.getRightX();
        const y = this.getTopY();
        const width = LAYOUT.OPEN_WIDTH;
        const height = LAYOUT.OPEN_HEIGHT;
        const cellSize = LAYOUT.CELL_SIZE_SMALL;
        const grid = this.floorMap.getGridForMinimap();

        // Safety check for empty grid
        if (!grid || grid.length === 0 || !grid[0]) {
            this.renderMinimized();
            return;
        }

        // Background panel
        this.createPanel(width, height, x, y);

        // Header bar
        const headerHeight = 18;
        const header = this.k.add([
            this.k.rect(width - 4, headerHeight),
            this.k.pos(x - 2, y + 2),
            this.k.anchor('topright'),
            this.k.color(...COLORS.BG_HEADER),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_TEXT),
            'minimap'
        ]);
        this.elements.push(header);

        // Title
        const title = this.k.add([
            this.k.text(`Floor ${this.floorMap.floor}`, { size: 10 }),
            this.k.pos(x - width / 2, y + 2 + headerHeight / 2),
            this.k.anchor('center'),
            this.k.color(...COLORS.TEXT_TITLE),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_ICON),
            'minimap'
        ]);
        this.elements.push(title);

        // Grid area
        const gridWidth = grid[0].length * cellSize;
        const gridHeight = grid.length * cellSize;
        const gridStartX = x - width / 2 - gridWidth / 2;
        const gridStartY = y + headerHeight + 8;

        this.renderGrid(grid, gridStartX, gridStartY, cellSize, false);

        // Room counter at bottom
        const counter = this.k.add([
            this.k.text(`${this.floorMap.getVisitedCount()}/${this.floorMap.getTotalRooms()} rooms`, { size: 8 }),
            this.k.pos(x - width / 2, y + height - 8),
            this.k.anchor('center'),
            this.k.color(...COLORS.TEXT_MUTED),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_TEXT),
            'minimap'
        ]);
        this.elements.push(counter);
    }

    /**
     * Render maximized state - full minimap with legend
     */
    renderMaximized() {
        const x = this.getRightX();
        const y = this.getTopY();
        const cellSize = LAYOUT.CELL_SIZE_LARGE;
        const grid = this.floorMap.getGridForMinimap();

        // Safety check for empty grid
        if (!grid || grid.length === 0 || !grid[0]) {
            this.renderMinimized();
            return;
        }

        // Calculate dimensions based on grid
        const gridWidth = grid[0].length * cellSize;
        const gridHeight = grid.length * cellSize;
        const legendHeight = 70;
        const headerHeight = 26;
        const padding = 16;

        const width = Math.max(LAYOUT.MAX_MIN_WIDTH, gridWidth + padding * 2);
        const height = Math.max(LAYOUT.MAX_MIN_HEIGHT, gridHeight + headerHeight + legendHeight + padding);

        // Ensure it stays on screen (left edge)
        const safeWidth = Math.min(width, this.k.width() - LAYOUT.MARGIN_RIGHT - 10);

        // Background panel
        this.createPanel(safeWidth, height, x, y);

        // Header bar
        const header = this.k.add([
            this.k.rect(safeWidth - 4, headerHeight),
            this.k.pos(x - 2, y + 2),
            this.k.anchor('topright'),
            this.k.color(...COLORS.BG_HEADER),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_TEXT),
            'minimap'
        ]);
        this.elements.push(header);

        // Title with room count
        const title = this.k.add([
            this.k.text(`FLOOR ${this.floorMap.floor}  ·  ${this.floorMap.getVisitedCount()}/${this.floorMap.getTotalRooms()}`, { size: 11 }),
            this.k.pos(x - safeWidth / 2, y + 2 + headerHeight / 2),
            this.k.anchor('center'),
            this.k.color(...COLORS.TEXT_TITLE),
            this.k.fixed(),
            this.k.z(LAYOUT.Z_ICON),
            'minimap'
        ]);
        this.elements.push(title);

        // Grid area (centered)
        const actualGridWidth = Math.min(gridWidth, safeWidth - padding * 2);
        const gridStartX = x - safeWidth / 2 - actualGridWidth / 2;
        const gridStartY = y + headerHeight + 12;

        this.renderGrid(grid, gridStartX, gridStartY, cellSize, true);

        // Legend section
        const legendY = gridStartY + gridHeight + 12;
        this.renderLegend(x - safeWidth + padding, legendY);
    }

    /**
     * Render the room grid
     */
    renderGrid(grid, startX, startY, cellSize, showBackground) {
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = grid[row][col];
                const cellX = startX + col * cellSize;
                const cellY = startY + row * cellSize;

                if (cell.type === 'empty') continue;

                // Cell background (only in maximized)
                if (showBackground) {
                    const cellBg = this.k.add([
                        this.k.rect(cellSize - 2, cellSize - 2),
                        this.k.pos(cellX, cellY),
                        this.k.anchor('topleft'),
                        this.k.color(...COLORS.CELL_BG),
                        this.k.outline(1, this.k.rgb(...COLORS.CELL_BORDER)),
                        this.k.fixed(),
                        this.k.z(LAYOUT.Z_TEXT),
                        'minimap'
                    ]);
                    this.elements.push(cellBg);
                }

                // Cell icon
                const { char, color } = this.getCellDisplay(cell);
                if (char) {
                    const fontSize = showBackground ? 12 : 9;
                    const cellText = this.k.add([
                        this.k.text(char, { size: fontSize }),
                        this.k.pos(cellX + cellSize / 2 - 1, cellY + cellSize / 2 - 1),
                        this.k.anchor('center'),
                        this.k.color(...color),
                        this.k.fixed(),
                        this.k.z(LAYOUT.Z_ICON),
                        'minimap'
                    ]);
                    this.elements.push(cellText);
                }
            }
        }
    }

    /**
     * Get display character and color for a cell
     */
    getCellDisplay(cell) {
        switch (cell.type) {
            case 'current':
                return { char: '★', color: COLORS.CURRENT };
            case 'visited':
                return cell.room.isBossRoom
                    ? { char: 'B', color: COLORS.BOSS }
                    : { char: '●', color: COLORS.VISITED };
            case 'revealed':
                return cell.room.isBossRoom
                    ? { char: 'B', color: [...COLORS.BOSS.map(c => Math.min(255, c + 50))] }
                    : { char: '◦', color: COLORS.AVAILABLE };
            case 'hidden':
                return { char: '·', color: COLORS.HIDDEN };
            default:
                return { char: '', color: [100, 100, 100] };
        }
    }

    /**
     * Render the legend section
     */
    renderLegend(startX, startY) {
        const legends = [
            { char: '★', label: 'Current', color: COLORS.CURRENT },
            { char: '●', label: 'Cleared', color: COLORS.VISITED },
            { char: '◦', label: 'Available', color: COLORS.AVAILABLE },
            { char: 'B', label: 'Boss', color: COLORS.BOSS }
        ];

        // Arrange in 2x2 grid for compact layout
        const colWidth = 80;
        const rowHeight = 14;

        legends.forEach((legend, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const itemX = startX + col * colWidth;
            const itemY = startY + row * rowHeight;

            const symbol = this.k.add([
                this.k.text(legend.char, { size: 10 }),
                this.k.pos(itemX, itemY),
                this.k.anchor('topleft'),
                this.k.color(...legend.color),
                this.k.fixed(),
                this.k.z(LAYOUT.Z_ICON),
                'minimap'
            ]);
            this.elements.push(symbol);

            const label = this.k.add([
                this.k.text(legend.label, { size: 8 }),
                this.k.pos(itemX + 14, itemY + 1),
                this.k.anchor('topleft'),
                this.k.color(...COLORS.TEXT_MUTED),
                this.k.fixed(),
                this.k.z(LAYOUT.Z_ICON),
                'minimap'
            ]);
            this.elements.push(label);
        });
    }

    /**
     * Cleanup - destroy all minimap elements
     */
    destroy() {
        this.destroyed = true;
        this.clear();
    }
}

/**
 * Create and initialize minimap
 */
export function createMinimap(k, floorMap) {
    return new Minimap(k, floorMap);
}
