/**
 * Pathfinding System
 *
 * Provides intelligent pathfinding for enemies:
 * - A* pathfinding for obstacle avoidance
 * - Different behaviors: direct, smart, perimeter
 * - Grid-based navigation with obstacle detection
 */

const GRID_SIZE = 32; // Size of each grid cell for pathfinding
const MAX_PATH_LENGTH = 100; // Max path nodes to prevent infinite loops

/**
 * Simple priority queue for A* algorithm
 */
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.elements.shift()?.element;
    }

    isEmpty() {
        return this.elements.length === 0;
    }
}

/**
 * Get grid coordinate from world position
 */
function worldToGrid(x, y) {
    return {
        gx: Math.floor(x / GRID_SIZE),
        gy: Math.floor(y / GRID_SIZE)
    };
}

/**
 * Get world position from grid coordinate (center of cell)
 */
function gridToWorld(gx, gy) {
    return {
        x: gx * GRID_SIZE + GRID_SIZE / 2,
        y: gy * GRID_SIZE + GRID_SIZE / 2
    };
}

/**
 * Check if a grid cell is walkable
 */
function isCellWalkable(k, gx, gy, gridWidth, gridHeight) {
    // Out of bounds
    if (gx < 0 || gy < 0 || gx >= gridWidth || gy >= gridHeight) {
        return false;
    }

    // Check if there's an obstacle at this grid cell
    const worldPos = gridToWorld(gx, gy);
    const obstacles = k.get('obstacle');

    for (const obstacle of obstacles) {
        if (!obstacle.exists()) continue;

        // Check if cell overlaps with obstacle
        const halfSize = GRID_SIZE / 2;
        const cellLeft = worldPos.x - halfSize;
        const cellRight = worldPos.x + halfSize;
        const cellTop = worldPos.y - halfSize;
        const cellBottom = worldPos.y + halfSize;

        const obstacleLeft = obstacle.pos.x - obstacle.width / 2;
        const obstacleRight = obstacle.pos.x + obstacle.width / 2;
        const obstacleTop = obstacle.pos.y - obstacle.height / 2;
        const obstacleBottom = obstacle.pos.y + obstacle.height / 2;

        // Check overlap
        if (cellRight > obstacleLeft && cellLeft < obstacleRight &&
            cellBottom > obstacleTop && cellTop < obstacleBottom) {
            return false; // Cell overlaps obstacle
        }
    }

    return true;
}

/**
 * Manhattan distance heuristic for A*
 */
function heuristic(a, b) {
    return Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy);
}

/**
 * A* pathfinding algorithm
 * Returns array of waypoints from start to goal
 */
export function findPath(k, startX, startY, goalX, goalY) {
    const roomWidth = k.width();
    const roomHeight = k.height();
    const gridWidth = Math.ceil(roomWidth / GRID_SIZE);
    const gridHeight = Math.ceil(roomHeight / GRID_SIZE);

    const start = worldToGrid(startX, startY);
    const goal = worldToGrid(goalX, goalY);

    // If start or goal is not walkable, return empty path
    if (!isCellWalkable(k, start.gx, start.gy, gridWidth, gridHeight) ||
        !isCellWalkable(k, goal.gx, goal.gy, gridWidth, gridHeight)) {
        return [];
    }

    const frontier = new PriorityQueue();
    frontier.enqueue(start, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();

    const getKey = (node) => `${node.gx},${node.gy}`;

    cameFrom.set(getKey(start), null);
    costSoFar.set(getKey(start), 0);

    let iterations = 0;
    const maxIterations = gridWidth * gridHeight; // Safety limit

    while (!frontier.isEmpty() && iterations < maxIterations) {
        iterations++;
        const current = frontier.dequeue();

        // Reached goal
        if (current.gx === goal.gx && current.gy === goal.gy) {
            break;
        }

        // Check neighbors (4-directional: up, down, left, right)
        const neighbors = [
            { gx: current.gx + 1, gy: current.gy },
            { gx: current.gx - 1, gy: current.gy },
            { gx: current.gx, gy: current.gy + 1 },
            { gx: current.gx, gy: current.gy - 1 },
            // Diagonals for smoother paths
            { gx: current.gx + 1, gy: current.gy + 1 },
            { gx: current.gx + 1, gy: current.gy - 1 },
            { gx: current.gx - 1, gy: current.gy + 1 },
            { gx: current.gx - 1, gy: current.gy - 1 }
        ];

        for (const next of neighbors) {
            if (!isCellWalkable(k, next.gx, next.gy, gridWidth, gridHeight)) {
                continue;
            }

            // Diagonal movement costs more
            const isDiagonal = next.gx !== current.gx && next.gy !== current.gy;
            const moveCost = isDiagonal ? 1.4 : 1.0;
            const newCost = costSoFar.get(getKey(current)) + moveCost;

            const nextKey = getKey(next);
            if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
                costSoFar.set(nextKey, newCost);
                const priority = newCost + heuristic(next, goal);
                frontier.enqueue(next, priority);
                cameFrom.set(nextKey, current);
            }
        }
    }

    // Reconstruct path
    const path = [];
    let current = goal;

    while (current && cameFrom.has(getKey(current))) {
        const worldPos = gridToWorld(current.gx, current.gy);
        path.unshift(worldPos);
        current = cameFrom.get(getKey(current));

        if (path.length > MAX_PATH_LENGTH) {
            break; // Safety limit
        }
    }

    return path;
}

/**
 * Get next move direction using A* pathfinding
 * Returns a vector for the next move
 */
export function getSmartMoveDirection(k, enemy, targetX, targetY) {
    // Update path periodically or if we don't have one
    if (!enemy.pathfindingPath || enemy.pathfindingTimer <= 0) {
        enemy.pathfindingPath = findPath(k, enemy.pos.x, enemy.pos.y, targetX, targetY);
        enemy.pathfindingTimer = 0.5; // Recalculate path every 0.5 seconds
        enemy.pathfindingWaypointIndex = 0;
    }

    enemy.pathfindingTimer -= k.dt();

    // If we have a path, follow it
    if (enemy.pathfindingPath && enemy.pathfindingPath.length > 0) {
        const waypoint = enemy.pathfindingPath[enemy.pathfindingWaypointIndex];

        if (waypoint) {
            const toWaypoint = k.vec2(
                waypoint.x - enemy.pos.x,
                waypoint.y - enemy.pos.y
            );
            const distanceToWaypoint = toWaypoint.len();

            // Reached waypoint, move to next
            if (distanceToWaypoint < GRID_SIZE / 2) {
                enemy.pathfindingWaypointIndex++;

                // Reached end of path, recalculate
                if (enemy.pathfindingWaypointIndex >= enemy.pathfindingPath.length) {
                    enemy.pathfindingPath = null;
                    enemy.pathfindingTimer = 0;
                }
            }

            // Move toward waypoint
            if (distanceToWaypoint > 0) {
                return toWaypoint.unit();
            }
        }
    }

    // No path available, move directly toward target (fallback)
    const toTarget = k.vec2(targetX - enemy.pos.x, targetY - enemy.pos.y);
    const distance = toTarget.len();
    if (distance > 0) {
        return toTarget.unit();
    }

    return k.vec2(0, 0);
}

/**
 * Get perimeter movement direction
 * Enemy walks around the edge of the map
 */
export function getPerimeterMoveDirection(k, enemy) {
    const roomWidth = k.width();
    const roomHeight = k.height();
    const margin = 40; // Distance from edge

    // Initialize perimeter mode if not set
    if (!enemy.perimeterMode) {
        enemy.perimeterMode = {
            side: 'top', // top, right, bottom, left
            targetX: enemy.pos.x,
            targetY: margin
        };
    }

    const perim = enemy.perimeterMode;
    const speed = enemy.speed * k.dt();
    const threshold = 20; // Distance to target before switching sides

    // Calculate distance to current target
    const toTarget = k.vec2(perim.targetX - enemy.pos.x, perim.targetY - enemy.pos.y);
    const distanceToTarget = toTarget.len();

    // Reached target, switch to next side
    if (distanceToTarget < threshold) {
        switch (perim.side) {
            case 'top':
                perim.side = 'right';
                perim.targetX = roomWidth - margin;
                perim.targetY = margin;
                break;
            case 'right':
                perim.side = 'bottom';
                perim.targetX = roomWidth - margin;
                perim.targetY = roomHeight - margin;
                break;
            case 'bottom':
                perim.side = 'left';
                perim.targetX = margin;
                perim.targetY = roomHeight - margin;
                break;
            case 'left':
                perim.side = 'top';
                perim.targetX = margin;
                perim.targetY = margin;
                break;
        }
    }

    // Move toward target
    if (distanceToTarget > 0) {
        return toTarget.unit();
    }

    return k.vec2(0, 0);
}
