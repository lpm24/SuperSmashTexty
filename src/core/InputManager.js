/**
 * Input Manager
 *
 * Handles input from local and remote players.
 * Decouples input collection from game logic for:
 * - Deterministic gameplay
 * - Multiplayer support
 * - Input recording/replay
 * - Client prediction
 *
 * Input Flow:
 * 1. Collect inputs from keyboard/mouse (local player)
 * 2. Queue inputs with timestamps
 * 3. Game logic processes inputs each frame
 * 4. (Future) Send local inputs to server, receive remote inputs
 */

/**
 * Input state for a single player in a single frame
 */
export class PlayerInput {
    constructor(playerId, frameNumber, timestamp) {
        this.playerId = playerId;
        this.frameNumber = frameNumber;
        this.timestamp = timestamp;

        // Movement input (-1, 0, 1 for each axis)
        this.moveX = 0;
        this.moveY = 0;

        // Aim input (world coordinates)
        this.aimX = 0;
        this.aimY = 0;

        // Action flags
        this.firing = false;
        this.pause = false;
        this.interact = false; // For doors, chests, etc.
    }

    /**
     * Serialize input to JSON
     */
    toJSON() {
        return {
            playerId: this.playerId,
            frameNumber: this.frameNumber,
            timestamp: this.timestamp,
            moveX: this.moveX,
            moveY: this.moveY,
            aimX: this.aimX,
            aimY: this.aimY,
            firing: this.firing,
            pause: this.pause,
            interact: this.interact
        };
    }

    /**
     * Create PlayerInput from JSON
     */
    static fromJSON(json) {
        const input = new PlayerInput(json.playerId, json.frameNumber, json.timestamp);
        Object.assign(input, json);
        return input;
    }
}

/**
 * Input Manager
 * Collects and manages inputs from all players
 */
export class InputManager {
    constructor() {
        // Current frame number
        this.frameNumber = 0;

        // Input queues per player
        this.inputQueues = new Map(); // playerId -> PlayerInput[]

        // Current inputs for this frame (one per player)
        this.currentInputs = new Map(); // playerId -> PlayerInput

        // Input history for rollback (keep last N frames)
        this.inputHistory = []; // Array of Map<playerId, PlayerInput>
        this.maxHistoryFrames = 120; // Keep 2 seconds at 60fps

        // Keyboard state tracking
        this.keysPressed = new Set();

        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mousePressed = false;
    }

    /**
     * Initialize input manager with KAPLAY context
     */
    init(k) {
        this.k = k;
        this.setupKeyboardListeners();
        this.setupMouseListeners();
    }

    /**
     * Setup keyboard event listeners
     */
    setupKeyboardListeners() {
        const k = this.k;

        // Movement keys
        const movementKeys = ['w', 'a', 's', 'd', 'up', 'down', 'left', 'right'];

        movementKeys.forEach(key => {
            k.onKeyPress(key, () => {
                this.keysPressed.add(key);
            });

            k.onKeyRelease(key, () => {
                this.keysPressed.delete(key);
            });
        });

        // Pause
        k.onKeyPress('escape', () => {
            this.onPausePressed();
        });

        // Interact (for doors, etc.)
        k.onKeyPress('space', () => {
            this.onInteractPressed();
        });
        k.onKeyPress('e', () => {
            this.onInteractPressed();
        });
    }

    /**
     * Setup mouse event listeners
     */
    setupMouseListeners() {
        const k = this.k;

        k.onMouseMove((pos) => {
            this.mouseX = pos.x;
            this.mouseY = pos.y;
        });

        k.onMousePress(() => {
            this.mousePressed = true;
        });

        k.onMouseRelease(() => {
            this.mousePressed = false;
        });
    }

    /**
     * Collect input for local player
     */
    collectLocalInput(playerId) {
        const input = new PlayerInput(playerId, this.frameNumber, Date.now());

        // Movement input
        input.moveX = this.getMoveX();
        input.moveY = this.getMoveY();

        // Aim input
        input.aimX = this.mouseX;
        input.aimY = this.mouseY;

        // Firing (for now, always fire if autofire)
        // In the future, this could be mouse button
        input.firing = true;

        return input;
    }

    /**
     * Get horizontal movement input (-1, 0, 1)
     */
    getMoveX() {
        let moveX = 0;
        if (this.keysPressed.has('a') || this.keysPressed.has('left')) {
            moveX -= 1;
        }
        if (this.keysPressed.has('d') || this.keysPressed.has('right')) {
            moveX += 1;
        }
        return moveX;
    }

    /**
     * Get vertical movement input (-1, 0, 1)
     */
    getMoveY() {
        let moveY = 0;
        if (this.keysPressed.has('w') || this.keysPressed.has('up')) {
            moveY -= 1;
        }
        if (this.keysPressed.has('s') || this.keysPressed.has('down')) {
            moveY += 1;
        }
        return moveY;
    }

    /**
     * Called when pause key is pressed
     */
    onPausePressed() {
        // Handle pause in game logic
        // For now, just set a flag
        this.pauseRequested = true;
    }

    /**
     * Called when interact key is pressed
     */
    onInteractPressed() {
        this.interactRequested = true;
    }

    /**
     * Queue input for a player
     * Used for remote player inputs received from network
     */
    queueInput(input) {
        if (!this.inputQueues.has(input.playerId)) {
            this.inputQueues.set(input.playerId, []);
        }
        this.inputQueues.get(input.playerId).push(input);
    }

    /**
     * Get inputs for all players for current frame
     * This is called each game tick
     */
    getInputsForFrame(playerIds) {
        const inputs = new Map();

        for (const playerId of playerIds) {
            // Check if we have queued input for this player
            const queue = this.inputQueues.get(playerId);
            let input;

            if (queue && queue.length > 0) {
                // Get next input from queue (for remote players)
                input = queue.shift();
            } else {
                // Collect local input (for local player)
                input = this.collectLocalInput(playerId);
            }

            inputs.set(playerId, input);
        }

        // Save current inputs
        this.currentInputs = inputs;

        // Add to history
        this.inputHistory.push(new Map(inputs));
        if (this.inputHistory.length > this.maxHistoryFrames) {
            this.inputHistory.shift();
        }

        this.frameNumber++;

        return inputs;
    }

    /**
     * Get input for specific player in current frame
     */
    getPlayerInput(playerId) {
        return this.currentInputs.get(playerId);
    }

    /**
     * Get input history for rollback/replay
     */
    getInputHistory() {
        return this.inputHistory;
    }

    /**
     * Clear input state
     */
    clear() {
        this.frameNumber = 0;
        this.inputQueues.clear();
        this.currentInputs.clear();
        this.inputHistory = [];
        this.keysPressed.clear();
        this.pauseRequested = false;
        this.interactRequested = false;
    }

    /**
     * Reset frame-specific flags
     */
    resetFrameFlags() {
        this.pauseRequested = false;
        this.interactRequested = false;
    }
}

/**
 * Singleton Input Manager
 */
class InputManagerSingleton {
    constructor() {
        this.inputManager = null;
    }

    /**
     * Initialize input manager
     */
    init(k) {
        this.inputManager = new InputManager();
        this.inputManager.init(k);
        return this.inputManager;
    }

    /**
     * Get current input manager
     */
    getManager() {
        if (!this.inputManager) {
            throw new Error('InputManager not initialized! Call InputManager.init() first.');
        }
        return this.inputManager;
    }

    /**
     * Clear input manager
     */
    clear() {
        if (this.inputManager) {
            this.inputManager.clear();
        }
        this.inputManager = null;
    }
}

// Export singleton instance
export const inputManager = new InputManagerSingleton();
