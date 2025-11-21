/**
 * Floor Map System - Smash TV Style Room Grid
 *
 * Generates a grid-based floor layout with:
 * - Start room on the left
 * - Boss room on the right
 * - Procedurally connected rooms in between
 * - Guaranteed path from start to boss
 * - No backtracking (can only go right, up, down)
 */

import { getWeightedRoomTemplate } from './roomGeneration.js';
import { getRandomEnemyType } from './enemySpawn.js';

/**
 * Room node in the grid
 */
class RoomNode {
    constructor(x, y, type = 'combat') {
        this.position = { x, y };
        this.type = type; // 'start', 'combat', 'boss'
        this.template = null; // Room template (assigned later)
        this.connections = {
            up: false,
            down: false,
            right: false
            // Note: No 'left' - backtracking not allowed
        };
        this.visited = false;
        this.cleared = false;
        this.enemyTypes = [];
        this.isBossRoom = type === 'boss';
    }

    /**
     * Get position key for this room
     */
    getKey() {
        return `${this.position.x},${this.position.y}`;
    }

    /**
     * Get adjacent position for a given direction
     */
    getAdjacentPosition(direction) {
        const { x, y } = this.position;
        switch (direction) {
            case 'up': return { x, y: y - 1 };
            case 'down': return { x, y: y + 1 };
            case 'right': return { x: x + 1, y };
            default: return null;
        }
    }
}

/**
 * Floor Map - manages the entire grid of rooms for a floor
 */
export class FloorMap {
    constructor(floor, width = 6, height = 3, rng = null) {
        this.floor = floor;
        this.width = width;
        this.height = height;
        this.grid = []; // 2D array of RoomNodes (or null)
        this.rooms = new Map(); // Map of "x,y" -> RoomNode
        this.startPosition = null;
        this.bossPosition = null;
        this.currentPosition = null;
        this.visitedRooms = new Set();
        this.rng = rng; // Seeded RNG for multiplayer synchronization

        this.generate();
    }

    /**
     * Get a random number (0-1) using seeded RNG if available, otherwise Math.random
     * @returns {number} Random number between 0 and 1
     */
    random() {
        return this.rng ? this.rng.next() : Math.random();
    }

    /**
     * Get a random integer in range [min, max)
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (exclusive)
     * @returns {number} Random integer
     */
    randomRange(min, max) {
        return this.rng ? this.rng.range(min, max) : Math.floor(Math.random() * (max - min)) + min;
    }

    /**
     * Generate the floor map
     */
    generate() {
        // Initialize empty grid
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

        // Step 1: Place start and boss rooms
        const midRow = Math.floor(this.height / 2);
        this.startPosition = { x: 0, y: midRow };

        // Boss can be in any row on the rightmost column
        const bossRow = this.height === 1 ? 0 : this.randomRange(0, this.height);
        this.bossPosition = { x: this.width - 1, y: bossRow };

        // Create start room
        const startRoom = new RoomNode(0, midRow, 'start');
        this.setRoom(0, midRow, startRoom);

        // Create boss room
        const bossRoom = new RoomNode(this.width - 1, bossRow, 'boss');
        this.setRoom(this.width - 1, bossRow, bossRoom);

        // Step 2: Generate guaranteed main path from start to boss
        this.generateMainPath();

        // Step 3: Add branch rooms for choices (20-40% additional rooms)
        this.addBranchRooms();

        // Step 4: Establish connections between adjacent rooms
        this.establishConnections();

        // Step 5: Assign room templates and enemy types
        this.assignRoomProperties();

        // Step 6: Validate the map
        this.validate();

        // Set current position to start
        this.currentPosition = { ...this.startPosition };
        this.markRoomVisited(this.startPosition.x, this.startPosition.y);
    }

    /**
     * Generate the main guaranteed path from start to boss
     */
    generateMainPath() {
        const path = this.findPath(this.startPosition, this.bossPosition);

        // Create rooms along the path
        for (const pos of path) {
            if (!this.getRoom(pos.x, pos.y)) {
                const room = new RoomNode(pos.x, pos.y, 'combat');
                this.setRoom(pos.x, pos.y, room);
            }
        }
    }

    /**
     * Find a path from start to end using simple pathfinding
     * Only moves RIGHT, UP, or DOWN
     */
    findPath(start, end) {
        const path = [];
        let current = { ...start };

        while (current.x < end.x || current.y !== end.y) {
            path.push({ ...current });

            // Prefer moving right
            if (current.x < end.x) {
                // Occasionally move up/down to reach target row
                if (current.y !== end.y && this.random() < 0.3) {
                    current.y += current.y < end.y ? 1 : -1;
                } else {
                    current.x += 1;
                }
            } else {
                // Move vertically to reach target row
                current.y += current.y < end.y ? 1 : -1;
            }
        }

        path.push({ ...end });
        return path;
    }

    /**
     * Add branch rooms to create choices for the player
     */
    addBranchRooms() {
        const maxBranches = Math.floor((this.width * this.height) * 0.3); // 30% of grid
        let branchesAdded = 0;

        // Try to add branches adjacent to existing rooms
        for (let x = 1; x < this.width - 1; x++) {
            for (let y = 0; y < this.height; y++) {
                if (branchesAdded >= maxBranches) break;

                // Skip if room already exists
                if (this.getRoom(x, y)) continue;

                // Check if adjacent to an existing room (to the left)
                const hasLeftNeighbor = x > 0 && this.getRoom(x - 1, y);
                if (hasLeftNeighbor && this.random() < 0.5) {
                    const room = new RoomNode(x, y, 'combat');
                    this.setRoom(x, y, room);
                    branchesAdded++;
                }
            }
        }
    }

    /**
     * Establish connections between adjacent rooms
     */
    establishConnections() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const room = this.getRoom(x, y);
                if (!room) continue;

                // Check right
                if (x < this.width - 1 && this.getRoom(x + 1, y)) {
                    room.connections.right = true;
                }

                // Check up
                if (y > 0 && this.getRoom(x, y - 1)) {
                    room.connections.up = true;
                }

                // Check down
                if (y < this.height - 1 && this.getRoom(x, y + 1)) {
                    room.connections.down = true;
                }
            }
        }
    }

    /**
     * Assign room templates and enemy types based on floor
     */
    assignRoomProperties() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const room = this.getRoom(x, y);
                if (!room) continue;

                // Assign template (except boss room which uses special template)
                if (room.type !== 'boss') {
                    room.template = getWeightedRoomTemplate(this.floor, this.rng);
                }

                // Assign enemy types for combat rooms
                if (room.type === 'combat') {
                    const enemyCount = this.randomRange(3, 6); // 3-5 enemy types
                    room.enemyTypes = [];
                    for (let i = 0; i < enemyCount; i++) {
                        // Use seeded RNG for multiplayer consistency
                        room.enemyTypes.push(getRandomEnemyType(this.floor, this.rng));
                    }
                }
            }
        }
    }

    /**
     * Validate the map (ensure boss is reachable)
     */
    validate() {
        // BFS to check if boss is reachable from start
        const visited = new Set();
        const queue = [this.startPosition];
        visited.add(`${this.startPosition.x},${this.startPosition.y}`);

        while (queue.length > 0) {
            const pos = queue.shift();
            const room = this.getRoom(pos.x, pos.y);

            if (!room) continue;

            // Check if we reached the boss
            if (room.type === 'boss') {
                console.log('[FloorMap] Validation passed: Boss is reachable');
                return true;
            }

            // Add connected rooms to queue
            const directions = ['up', 'down', 'right'];
            for (const dir of directions) {
                if (room.connections[dir]) {
                    const nextPos = room.getAdjacentPosition(dir);
                    const key = `${nextPos.x},${nextPos.y}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push(nextPos);
                    }
                }
            }
        }

        console.error('[FloorMap] Validation failed: Boss is not reachable!');
        return false;
    }

    /**
     * Get room at position
     */
    getRoom(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.grid[y][x];
    }

    /**
     * Set room at position
     */
    setRoom(x, y, room) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        this.grid[y][x] = room;
        this.rooms.set(room.getKey(), room);
    }

    /**
     * Get current room
     */
    getCurrentRoom() {
        return this.getRoom(this.currentPosition.x, this.currentPosition.y);
    }

    /**
     * Get available exits from current room (unvisited only)
     */
    getAvailableExits() {
        const room = this.getCurrentRoom();
        if (!room) return [];

        const exits = [];
        const directions = ['up', 'down', 'right'];

        for (const dir of directions) {
            if (room.connections[dir]) {
                const nextPos = room.getAdjacentPosition(dir);
                const nextRoom = this.getRoom(nextPos.x, nextPos.y);

                // Only include if room exists and hasn't been visited
                if (nextRoom && !nextRoom.visited) {
                    exits.push({
                        direction: dir,
                        position: nextPos,
                        room: nextRoom
                    });
                }
            }
        }

        return exits;
    }

    /**
     * Mark room as visited
     */
    markRoomVisited(x, y) {
        const room = this.getRoom(x, y);
        if (room) {
            room.visited = true;
            this.visitedRooms.add(room.getKey());
        }
    }

    /**
     * Mark room as cleared
     */
    markRoomCleared(x, y) {
        const room = this.getRoom(x, y);
        if (room) {
            room.cleared = true;
        }
    }

    /**
     * Move to adjacent room
     */
    moveToRoom(direction) {
        const currentRoom = this.getCurrentRoom();
        if (!currentRoom || !currentRoom.connections[direction]) {
            console.warn(`[FloorMap] Cannot move ${direction} from current position`);
            return false;
        }

        const nextPos = currentRoom.getAdjacentPosition(direction);
        const nextRoom = this.getRoom(nextPos.x, nextPos.y);

        if (!nextRoom) {
            console.warn(`[FloorMap] No room found at ${nextPos.x}, ${nextPos.y}`);
            return false;
        }

        // Update current position
        this.currentPosition = nextPos;
        this.markRoomVisited(nextPos.x, nextPos.y);

        console.log(`[FloorMap] Moved to room (${nextPos.x}, ${nextPos.y})`);
        return true;
    }

    /**
     * Get total number of rooms
     */
    getTotalRooms() {
        return this.rooms.size;
    }

    /**
     * Get number of visited rooms
     */
    getVisitedCount() {
        return this.visitedRooms.size;
    }

    /**
     * Get grid for minimap display
     */
    getGridForMinimap() {
        const minimapGrid = [];

        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                const room = this.getRoom(x, y);

                if (!room) {
                    row.push({ type: 'empty' });
                } else if (x === this.currentPosition.x && y === this.currentPosition.y) {
                    row.push({ type: 'current', room });
                } else if (room.visited) {
                    row.push({ type: 'visited', room });
                } else if (this.isRoomRevealed(x, y)) {
                    row.push({ type: 'revealed', room });
                } else {
                    row.push({ type: 'hidden' });
                }
            }
            minimapGrid.push(row);
        }

        return minimapGrid;
    }

    /**
     * Check if a room should be revealed on minimap
     * (adjacent to visited rooms)
     */
    isRoomRevealed(x, y) {
        const room = this.getRoom(x, y);
        if (!room) return false;

        // Check if any adjacent room is visited
        const directions = [
            { dx: -1, dy: 0 }, // left (shows rooms behind)
            { dx: 1, dy: 0 },  // right
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 }   // down
        ];

        for (const { dx, dy } of directions) {
            const adjRoom = this.getRoom(x + dx, y + dy);
            if (adjRoom && adjRoom.visited) {
                return true;
            }
        }

        return false;
    }

    /**
     * Debug: Print grid to console
     */
    debugPrint() {
        console.log(`\n[FloorMap] Floor ${this.floor} - ${this.width}x${this.height}`);
        console.log(`Start: (${this.startPosition.x}, ${this.startPosition.y})`);
        console.log(`Boss: (${this.bossPosition.x}, ${this.bossPosition.y})`);
        console.log(`Current: (${this.currentPosition.x}, ${this.currentPosition.y})`);
        console.log(`Rooms: ${this.getTotalRooms()}, Visited: ${this.getVisitedCount()}\n`);

        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                const room = this.getRoom(x, y);
                if (!room) {
                    row += '[ ]';
                } else if (room.type === 'start') {
                    row += '[S]';
                } else if (room.type === 'boss') {
                    row += '[B]';
                } else if (x === this.currentPosition.x && y === this.currentPosition.y) {
                    row += '[★]';
                } else if (room.visited) {
                    row += '[●]';
                } else {
                    row += '[R]';
                }
                row += ' ';
            }
            console.log(row);
        }

        // Show connections
        console.log('\nConnections:');
        for (const [key, room] of this.rooms) {
            const connections = [];
            if (room.connections.up) connections.push('↑');
            if (room.connections.down) connections.push('↓');
            if (room.connections.right) connections.push('→');
            console.log(`  (${room.position.x}, ${room.position.y}): ${connections.join(', ') || 'none'}`);
        }
    }
}

/**
 * Helper function to create a floor map for a given floor number
 * @param {number} floor - Floor number
 * @param {SeededRandom} rng - Optional seeded RNG for multiplayer synchronization
 * @returns {FloorMap} Generated floor map
 */
export function generateFloorMap(floor, rng = null) {
    // Adjust grid size based on floor for more complex layouts per floor
    // Floor 1: 4x3 (small), Floor 2: 5x3, Floor 3: 6x4, etc.
    const width = Math.min(3 + floor, 10); // 4-10 columns
    const height = Math.min(2 + Math.floor(floor / 2), 6); // 3-6 rows

    const floorMap = new FloorMap(floor, width, height, rng);
    floorMap.debugPrint();

    return floorMap;
}
