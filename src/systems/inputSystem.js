/**
 * Input System
 * Handles gamepad controllers (Backbone, Xbox, PlayStation, etc.) and touch controls
 *
 * Features:
 * - Gamepad support with dual analog sticks
 * - Virtual touch joysticks for mobile devices
 * - Left stick/joystick for movement
 * - Right stick/joystick for aiming and auto-fire
 */

// Deadzone for analog sticks (ignore small movements)
const STICK_DEADZONE = 0.15;

// Touch joystick configuration
const JOYSTICK_SIZE = 120;
const JOYSTICK_KNOB_SIZE = 50;
const JOYSTICK_OPACITY = 0.5;
const JOYSTICK_ACTIVE_OPACITY = 0.7;

// Input state
const inputState = {
    // Initialization flags (prevent duplicate setup)
    systemInitialized: false,
    touchInitialized: false,

    // Gamepad state
    gamepadConnected: false,
    gamepadIndex: null,

    // Movement (left stick or left touch joystick)
    moveX: 0,
    moveY: 0,

    // Aim (right stick or right touch joystick)
    aimX: 0,
    aimY: 0,
    aimActive: false, // True when right stick is being used

    // Touch joystick state
    touchEnabled: false,
    leftTouch: null,  // Touch identifier for left joystick
    rightTouch: null, // Touch identifier for right joystick
    leftJoystickCenter: null,
    rightJoystickCenter: null,

    // UI elements (set by initTouchControls)
    leftJoystickBase: null,
    leftJoystickKnob: null,
    rightJoystickBase: null,
    rightJoystickKnob: null,

    // Kaplay instance
    k: null
};

/**
 * Apply deadzone to a value
 */
function applyDeadzone(value, deadzone = STICK_DEADZONE) {
    if (Math.abs(value) < deadzone) return 0;
    // Scale the value to go from 0 at deadzone edge to 1 at full tilt
    const sign = value > 0 ? 1 : -1;
    return sign * (Math.abs(value) - deadzone) / (1 - deadzone);
}

/**
 * Initialize the input system
 * @param {Object} k - Kaplay instance
 */
export function initInputSystem(k) {
    inputState.k = k;

    // Prevent duplicate initialization of event listeners
    if (inputState.systemInitialized) {
        return;
    }
    inputState.systemInitialized = true;

    // Listen for gamepad connections
    window.addEventListener('gamepadconnected', (e) => {
        console.log('[InputSystem] Gamepad connected:', e.gamepad.id);
        inputState.gamepadConnected = true;
        inputState.gamepadIndex = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('[InputSystem] Gamepad disconnected:', e.gamepad.id);
        if (e.gamepad.index === inputState.gamepadIndex) {
            inputState.gamepadConnected = false;
            inputState.gamepadIndex = null;
        }
    });

    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            console.log('[InputSystem] Found existing gamepad:', gamepads[i].id);
            inputState.gamepadConnected = true;
            inputState.gamepadIndex = gamepads[i].index;
            break;
        }
    }

    // Detect touch device
    inputState.touchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    console.log('[InputSystem] Initialized. Gamepad:', inputState.gamepadConnected, 'Touch:', inputState.touchEnabled);
}

/**
 * Update gamepad input state (call each frame)
 */
export function updateGamepadInput() {
    if (!inputState.gamepadConnected || inputState.gamepadIndex === null) {
        return;
    }

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[inputState.gamepadIndex];

    if (!gamepad) {
        inputState.gamepadConnected = false;
        inputState.gamepadIndex = null;
        return;
    }

    // Standard gamepad mapping:
    // axes[0] = Left stick X (-1 left, 1 right)
    // axes[1] = Left stick Y (-1 up, 1 down)
    // axes[2] = Right stick X (-1 left, 1 right)
    // axes[3] = Right stick Y (-1 up, 1 down)

    // Left stick - movement
    inputState.moveX = applyDeadzone(gamepad.axes[0] || 0);
    inputState.moveY = applyDeadzone(gamepad.axes[1] || 0);

    // Right stick - aiming
    const rawAimX = applyDeadzone(gamepad.axes[2] || 0);
    const rawAimY = applyDeadzone(gamepad.axes[3] || 0);

    inputState.aimX = rawAimX;
    inputState.aimY = rawAimY;

    // Aim is active if right stick is being used
    inputState.aimActive = Math.abs(rawAimX) > 0 || Math.abs(rawAimY) > 0;
}

/**
 * Initialize touch controls with virtual joysticks
 * @param {Object} k - Kaplay instance
 */
export function initTouchControls(k) {
    if (!inputState.touchEnabled) return;

    // Clean up existing joysticks first (in case of scene reload)
    cleanupTouchJoysticks();

    // Prevent duplicate touch event listeners
    if (inputState.touchInitialized) {
        // Just recreate the visual elements, don't re-add event listeners
        createJoystickVisuals(k);
        return;
    }
    inputState.touchInitialized = true;

    createJoystickVisuals(k);

    // Touch event handlers (only added once)
    const canvas = k.canvas;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    console.log('[InputSystem] Touch controls initialized');
}

/**
 * Create joystick visual elements
 * @param {Object} k - Kaplay instance
 */
function createJoystickVisuals(k) {
    const screenWidth = k.width();
    const screenHeight = k.height();

    // Left joystick (bottom left quarter of screen)
    const leftCenterX = screenWidth * 0.15;
    const leftCenterY = screenHeight * 0.75;

    // Right joystick (bottom right quarter of screen)
    const rightCenterX = screenWidth * 0.85;
    const rightCenterY = screenHeight * 0.75;

    // Create left joystick base
    inputState.leftJoystickBase = k.add([
        k.circle(JOYSTICK_SIZE / 2),
        k.pos(leftCenterX, leftCenterY),
        k.anchor('center'),
        k.color(100, 100, 100),
        k.opacity(JOYSTICK_OPACITY),
        k.fixed(),
        k.z(1000),
        'touchJoystick'
    ]);

    // Create left joystick knob
    inputState.leftJoystickKnob = k.add([
        k.circle(JOYSTICK_KNOB_SIZE / 2),
        k.pos(leftCenterX, leftCenterY),
        k.anchor('center'),
        k.color(200, 200, 200),
        k.opacity(JOYSTICK_OPACITY),
        k.fixed(),
        k.z(1001),
        'touchJoystick'
    ]);

    // Create right joystick base
    inputState.rightJoystickBase = k.add([
        k.circle(JOYSTICK_SIZE / 2),
        k.pos(rightCenterX, rightCenterY),
        k.anchor('center'),
        k.color(100, 100, 100),
        k.opacity(JOYSTICK_OPACITY),
        k.fixed(),
        k.z(1000),
        'touchJoystick'
    ]);

    // Create right joystick knob
    inputState.rightJoystickKnob = k.add([
        k.circle(JOYSTICK_KNOB_SIZE / 2),
        k.pos(rightCenterX, rightCenterY),
        k.anchor('center'),
        k.color(255, 100, 100),
        k.opacity(JOYSTICK_OPACITY),
        k.fixed(),
        k.z(1001),
        'touchJoystick'
    ]);

    inputState.leftJoystickCenter = { x: leftCenterX, y: leftCenterY };
    inputState.rightJoystickCenter = { x: rightCenterX, y: rightCenterY };
}

/**
 * Handle touch start
 */
function handleTouchStart(e) {
    e.preventDefault();

    const k = inputState.k;
    const rect = k.canvas.getBoundingClientRect();
    const scaleX = k.width() / rect.width;
    const scaleY = k.height() / rect.height;

    for (const touch of e.changedTouches) {
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        // Check if touch is on left side (movement joystick)
        if (x < k.width() / 2 && inputState.leftTouch === null) {
            inputState.leftTouch = touch.identifier;
            inputState.leftJoystickCenter = { x, y };

            // Move joystick base to touch position
            if (inputState.leftJoystickBase) {
                inputState.leftJoystickBase.pos.x = x;
                inputState.leftJoystickBase.pos.y = y;
                inputState.leftJoystickBase.opacity = JOYSTICK_ACTIVE_OPACITY;
            }
            if (inputState.leftJoystickKnob) {
                inputState.leftJoystickKnob.pos.x = x;
                inputState.leftJoystickKnob.pos.y = y;
                inputState.leftJoystickKnob.opacity = JOYSTICK_ACTIVE_OPACITY;
            }
        }
        // Check if touch is on right side (aim joystick)
        else if (x >= k.width() / 2 && inputState.rightTouch === null) {
            inputState.rightTouch = touch.identifier;
            inputState.rightJoystickCenter = { x, y };

            // Move joystick base to touch position
            if (inputState.rightJoystickBase) {
                inputState.rightJoystickBase.pos.x = x;
                inputState.rightJoystickBase.pos.y = y;
                inputState.rightJoystickBase.opacity = JOYSTICK_ACTIVE_OPACITY;
            }
            if (inputState.rightJoystickKnob) {
                inputState.rightJoystickKnob.pos.x = x;
                inputState.rightJoystickKnob.pos.y = y;
                inputState.rightJoystickKnob.opacity = JOYSTICK_ACTIVE_OPACITY;
            }

            inputState.aimActive = true;
        }
    }
}

/**
 * Handle touch move
 */
function handleTouchMove(e) {
    e.preventDefault();

    const k = inputState.k;
    const rect = k.canvas.getBoundingClientRect();
    const scaleX = k.width() / rect.width;
    const scaleY = k.height() / rect.height;

    for (const touch of e.changedTouches) {
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        // Left joystick (movement)
        if (touch.identifier === inputState.leftTouch && inputState.leftJoystickCenter) {
            const dx = x - inputState.leftJoystickCenter.x;
            const dy = y - inputState.leftJoystickCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = JOYSTICK_SIZE / 2;

            // Clamp to joystick radius
            const clampedDistance = Math.min(distance, maxDistance);
            const angle = Math.atan2(dy, dx);

            // Update knob position
            if (inputState.leftJoystickKnob) {
                inputState.leftJoystickKnob.pos.x = inputState.leftJoystickCenter.x + Math.cos(angle) * clampedDistance;
                inputState.leftJoystickKnob.pos.y = inputState.leftJoystickCenter.y + Math.sin(angle) * clampedDistance;
            }

            // Calculate normalized movement (-1 to 1)
            const normalizedDistance = clampedDistance / maxDistance;
            inputState.moveX = Math.cos(angle) * normalizedDistance;
            inputState.moveY = Math.sin(angle) * normalizedDistance;
        }

        // Right joystick (aim)
        if (touch.identifier === inputState.rightTouch && inputState.rightJoystickCenter) {
            const dx = x - inputState.rightJoystickCenter.x;
            const dy = y - inputState.rightJoystickCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = JOYSTICK_SIZE / 2;

            // Clamp to joystick radius
            const clampedDistance = Math.min(distance, maxDistance);
            const angle = Math.atan2(dy, dx);

            // Update knob position
            if (inputState.rightJoystickKnob) {
                inputState.rightJoystickKnob.pos.x = inputState.rightJoystickCenter.x + Math.cos(angle) * clampedDistance;
                inputState.rightJoystickKnob.pos.y = inputState.rightJoystickCenter.y + Math.sin(angle) * clampedDistance;
            }

            // Calculate normalized aim (-1 to 1)
            const normalizedDistance = clampedDistance / maxDistance;
            inputState.aimX = Math.cos(angle) * normalizedDistance;
            inputState.aimY = Math.sin(angle) * normalizedDistance;
            inputState.aimActive = normalizedDistance > 0.1;
        }
    }
}

/**
 * Handle touch end
 */
function handleTouchEnd(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
        // Left joystick released
        if (touch.identifier === inputState.leftTouch) {
            inputState.leftTouch = null;
            inputState.moveX = 0;
            inputState.moveY = 0;

            // Reset knob to center
            if (inputState.leftJoystickKnob && inputState.leftJoystickCenter) {
                inputState.leftJoystickKnob.pos.x = inputState.leftJoystickCenter.x;
                inputState.leftJoystickKnob.pos.y = inputState.leftJoystickCenter.y;
            }
            if (inputState.leftJoystickBase) {
                inputState.leftJoystickBase.opacity = JOYSTICK_OPACITY;
            }
            if (inputState.leftJoystickKnob) {
                inputState.leftJoystickKnob.opacity = JOYSTICK_OPACITY;
            }
        }

        // Right joystick released
        if (touch.identifier === inputState.rightTouch) {
            inputState.rightTouch = null;
            inputState.aimX = 0;
            inputState.aimY = 0;
            inputState.aimActive = false;

            // Reset knob to center
            if (inputState.rightJoystickKnob && inputState.rightJoystickCenter) {
                inputState.rightJoystickKnob.pos.x = inputState.rightJoystickCenter.x;
                inputState.rightJoystickKnob.pos.y = inputState.rightJoystickCenter.y;
            }
            if (inputState.rightJoystickBase) {
                inputState.rightJoystickBase.opacity = JOYSTICK_OPACITY;
            }
            if (inputState.rightJoystickKnob) {
                inputState.rightJoystickKnob.opacity = JOYSTICK_OPACITY;
            }
        }
    }
}

/**
 * Get movement input (from gamepad or touch)
 * @returns {{ x: number, y: number }} Movement direction (-1 to 1)
 */
export function getMovementInput() {
    return {
        x: inputState.moveX,
        y: inputState.moveY
    };
}

/**
 * Get aim input (from gamepad or touch)
 * @returns {{ x: number, y: number, active: boolean }} Aim direction (-1 to 1) and whether aim is active
 */
export function getAimInput() {
    return {
        x: inputState.aimX,
        y: inputState.aimY,
        active: inputState.aimActive
    };
}

/**
 * Check if gamepad is connected
 * @returns {boolean}
 */
export function isGamepadConnected() {
    return inputState.gamepadConnected;
}

/**
 * Check if touch controls are enabled
 * @returns {boolean}
 */
export function isTouchEnabled() {
    return inputState.touchEnabled;
}

/**
 * Check if any alternative input is being used (gamepad or touch)
 * @returns {boolean}
 */
export function isUsingAlternativeInput() {
    return inputState.gamepadConnected ||
           inputState.leftTouch !== null ||
           inputState.rightTouch !== null;
}

/**
 * Hide touch joysticks (e.g., when not in game)
 */
export function hideTouchJoysticks() {
    if (inputState.leftJoystickBase) inputState.leftJoystickBase.hidden = true;
    if (inputState.leftJoystickKnob) inputState.leftJoystickKnob.hidden = true;
    if (inputState.rightJoystickBase) inputState.rightJoystickBase.hidden = true;
    if (inputState.rightJoystickKnob) inputState.rightJoystickKnob.hidden = true;
}

/**
 * Show touch joysticks
 */
export function showTouchJoysticks() {
    if (inputState.leftJoystickBase) inputState.leftJoystickBase.hidden = false;
    if (inputState.leftJoystickKnob) inputState.leftJoystickKnob.hidden = false;
    if (inputState.rightJoystickBase) inputState.rightJoystickBase.hidden = false;
    if (inputState.rightJoystickKnob) inputState.rightJoystickKnob.hidden = false;
}

/**
 * Clean up touch joystick visuals (call when leaving game scene)
 * Note: Does not remove event listeners as they persist across scenes
 */
export function cleanupTouchJoysticks() {
    const k = inputState.k;
    if (!k) return;

    // Destroy joystick entities if they exist
    try {
        k.get('touchJoystick').forEach(j => {
            if (j && j.exists()) k.destroy(j);
        });
    } catch (e) {
        // Ignore errors if entities are already destroyed
    }

    inputState.leftJoystickBase = null;
    inputState.leftJoystickKnob = null;
    inputState.rightJoystickBase = null;
    inputState.rightJoystickKnob = null;
    inputState.leftTouch = null;
    inputState.rightTouch = null;
    inputState.moveX = 0;
    inputState.moveY = 0;
    inputState.aimX = 0;
    inputState.aimY = 0;
    inputState.aimActive = false;
}
