/**
 * Spatial Grid System
 *
 * Divides the game world into a grid of cells to efficiently query nearby entities.
 * Instead of checking all entities (O(n)), we only check entities in nearby cells.
 *
 * Performance improvement:
 * - Without grid: Check all N entities = O(n)
 * - With grid: Check only entities in nearby cells = O(1) average case
 *
 * Example:
 * - 100 entities spread across 10x10 grid = ~1 entity per cell
 * - Query nearby entities: Check 9 cells (3x3) = ~9 entities instead of 100
 * - 11x speedup!
 */

export class SpatialGrid {
    /**
     * Create a spatial grid
     * @param {number} cellSize - Size of each grid cell in pixels (default: 128)
     */
    constructor(cellSize = 128) {
        this.cellSize = cellSize;
        this.cells = new Map(); // Map of "x,y" -> Set of entities
        this.entityToCell = new Map(); // Map of entity -> "x,y" for fast removal
    }

    /**
     * Get the cell key for a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} Cell key "x,y"
     */
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Insert an entity into the grid
     * @param {Object} entity - Entity with pos.x and pos.y
     */
    insert(entity) {
        if (!entity || !entity.pos) return;

        const key = this.getCellKey(entity.pos.x, entity.pos.y);

        // Create cell if it doesn't exist
        if (!this.cells.has(key)) {
            this.cells.set(key, new Set());
        }

        // Add entity to cell
        this.cells.get(key).add(entity);

        // Track which cell this entity is in
        this.entityToCell.set(entity, key);
    }

    /**
     * Remove an entity from the grid
     * @param {Object} entity - Entity to remove
     */
    remove(entity) {
        if (!entity) return;

        const key = this.entityToCell.get(entity);
        if (!key) return;

        // Remove from cell
        const cell = this.cells.get(key);
        if (cell) {
            cell.delete(entity);
            // Clean up empty cells to save memory
            if (cell.size === 0) {
                this.cells.delete(key);
            }
        }

        // Remove tracking
        this.entityToCell.delete(entity);
    }

    /**
     * Update an entity's position in the grid
     * Call this when an entity moves
     * @param {Object} entity - Entity that moved
     */
    update(entity) {
        if (!entity || !entity.pos) return;

        const oldKey = this.entityToCell.get(entity);
        const newKey = this.getCellKey(entity.pos.x, entity.pos.y);

        // Only update if entity changed cells
        if (oldKey !== newKey) {
            this.remove(entity);
            this.insert(entity);
        }
    }

    /**
     * Get all entities within a radius of a point
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} radius - Search radius
     * @returns {Array} Array of entities within radius
     */
    getNearby(x, y, radius) {
        const results = [];

        // Calculate which cells to check
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerKey = this.getCellKey(x, y);
        const [cx, cy] = centerKey.split(',').map(Number);

        // Check this cell and all surrounding cells within radius
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                const cell = this.cells.get(key);

                if (cell) {
                    // Add all entities from this cell
                    results.push(...cell);
                }
            }
        }

        return results;
    }

    /**
     * Get all entities in a bounding box
     * @param {number} minX - Minimum X coordinate
     * @param {number} minY - Minimum Y coordinate
     * @param {number} maxX - Maximum X coordinate
     * @param {number} maxY - Maximum Y coordinate
     * @returns {Array} Array of entities in bounding box
     */
    getInBounds(minX, minY, maxX, maxY) {
        const results = [];

        // Calculate cell range
        const minCellX = Math.floor(minX / this.cellSize);
        const minCellY = Math.floor(minY / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const maxCellY = Math.floor(maxY / this.cellSize);

        // Check all cells in range
        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);

                if (cell) {
                    results.push(...cell);
                }
            }
        }

        return results;
    }

    /**
     * Get all entities at a specific position (same cell)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array} Array of entities in the same cell
     */
    getAt(x, y) {
        const key = this.getCellKey(x, y);
        const cell = this.cells.get(key);
        return cell ? [...cell] : [];
    }

    /**
     * Clear all entities from the grid
     */
    clear() {
        this.cells.clear();
        this.entityToCell.clear();
    }

    /**
     * Get statistics about the grid (for debugging)
     * @returns {Object} Grid statistics
     */
    getStats() {
        let totalEntities = 0;
        let maxEntitiesInCell = 0;
        let minEntitiesInCell = Infinity;

        this.cells.forEach(cell => {
            const count = cell.size;
            totalEntities += count;
            maxEntitiesInCell = Math.max(maxEntitiesInCell, count);
            minEntitiesInCell = Math.min(minEntitiesInCell, count);
        });

        return {
            cellCount: this.cells.size,
            totalEntities,
            averageEntitiesPerCell: this.cells.size > 0 ? (totalEntities / this.cells.size).toFixed(2) : 0,
            maxEntitiesInCell,
            minEntitiesInCell: minEntitiesInCell === Infinity ? 0 : minEntitiesInCell,
            cellSize: this.cellSize
        };
    }
}

/**
 * Helper function to rebuild a spatial grid from entity array
 * @param {SpatialGrid} grid - Grid to rebuild
 * @param {Array} entities - Array of entities to insert
 */
export function rebuildGrid(grid, entities) {
    grid.clear();
    entities.forEach(entity => grid.insert(entity));
}
