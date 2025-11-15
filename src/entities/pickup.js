// Pickup entity definitions
import { PICKUP_CONFIG } from '../config/constants.js';
import { POWERUP_WEAPONS } from '../systems/powerupWeapons.js';
import { registerPickup, isHost, isMultiplayerActive } from '../systems/multiplayerGame.js';

export function createXPPickup(k, x, y, value) {
    const pickup = k.add([
        k.text('+', { size: 16 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...PICKUP_CONFIG.XP_COLOR),
        k.area(),
        'xpPickup'
    ]);

    pickup.value = value;
    pickup.lifetime = PICKUP_CONFIG.XP_LIFETIME;
    pickup.age = 0;
    pickup.collected = false;

    // Magnetization state
    pickup.magnetizing = false; // Whether this pickup is being pulled toward player
    pickup.magnetizeSpeed = 0; // Current magnetization speed (for acceleration)
    pickup.targetPlayer = null; // Reference to player being magnetized to

    // Visual effect - slight pulsing
    let pulseDir = 1;
    pickup.onUpdate(() => {
        if (k.paused) {
            // Still allow animation during pause for visual feedback
            const pulse = Math.sin(pickup.age * PICKUP_CONFIG.XP_PULSE_SPEED) * PICKUP_CONFIG.XP_PULSE_AMOUNT;
            pickup.scale = k.vec2(1 + pulse);
            return;
        }

        pickup.age += k.dt();

        // Pulse animation
        const pulse = Math.sin(pickup.age * PICKUP_CONFIG.XP_PULSE_SPEED) * PICKUP_CONFIG.XP_PULSE_AMOUNT;
        pickup.scale = k.vec2(1 + pulse);

        // Magnetization movement - once magnetizing starts, it never stops
        if (pickup.magnetizing && pickup.targetPlayer && pickup.targetPlayer.exists()) {
            // Calculate direction to player
            const dirToPlayer = k.vec2(
                pickup.targetPlayer.pos.x - pickup.pos.x,
                pickup.targetPlayer.pos.y - pickup.pos.y
            );
            const distance = dirToPlayer.len();

            if (distance > 0) {
                // Normalize direction
                const dir = dirToPlayer.scale(1 / distance);

                // Accelerate magnetization speed
                pickup.magnetizeSpeed = Math.min(
                    pickup.magnetizeSpeed + PICKUP_CONFIG.MAGNETIZE_ACCELERATION * k.dt(),
                    PICKUP_CONFIG.MAGNETIZE_SPEED
                );

                // Move toward player
                pickup.pos = pickup.pos.add(dir.scale(pickup.magnetizeSpeed * k.dt()));
            }
        }

        // Despawn after lifetime
        if (pickup.age >= pickup.lifetime) {
            k.destroy(pickup);
        }
    });

    // Multiplayer: Register pickup for network sync if host
    pickup.pickupType = 'xp'; // Mark type for sync
    if (isMultiplayerActive() && isHost()) {
        registerPickup(pickup);
    }

    return pickup;
}

// Currency icons for different types of money
const CURRENCY_ICONS = ['$', '€', '¥', '£', '₹', '₽', '₩', '₪'];

// Get a random currency icon
export function getRandomCurrencyIcon() {
    return CURRENCY_ICONS[Math.floor(Math.random() * CURRENCY_ICONS.length)];
}

// Create a currency pickup that can be collected for money
export function createCurrencyPickup(k, x, y, value, icon = null) {
    // Use provided icon or random one
    const currencyIcon = icon || getRandomCurrencyIcon();

    const pickup = k.add([
        k.text(currencyIcon, { size: 9 }), // Reduced from 18 to 9 (50% smaller)
        k.pos(x, y),
        k.anchor('center'),
        k.color(...PICKUP_CONFIG.CURRENCY_COLOR),
        k.area(),
        'currencyPickup'
    ]);

    pickup.value = value;
    pickup.lifetime = PICKUP_CONFIG.CURRENCY_LIFETIME;
    pickup.age = 0;
    pickup.collected = false;

    // Magnetization state
    pickup.magnetizing = false;
    pickup.magnetizeSpeed = 0;
    pickup.targetPlayer = null;

    // Visual effect - slight pulsing with rotation
    pickup.onUpdate(() => {
        if (k.paused) {
            // Still allow animation during pause for visual feedback
            const pulse = Math.sin(pickup.age * PICKUP_CONFIG.CURRENCY_PULSE_SPEED) * PICKUP_CONFIG.CURRENCY_PULSE_AMOUNT;
            pickup.scale = k.vec2(1 + pulse);
            return;
        }

        pickup.age += k.dt();

        // Pulse animation
        const pulse = Math.sin(pickup.age * PICKUP_CONFIG.CURRENCY_PULSE_SPEED) * PICKUP_CONFIG.CURRENCY_PULSE_AMOUNT;
        pickup.scale = k.vec2(1 + pulse);

        // Magnetization movement - once magnetizing starts, it never stops
        if (pickup.magnetizing && pickup.targetPlayer && pickup.targetPlayer.exists()) {
            // Calculate direction to player
            const dirToPlayer = k.vec2(
                pickup.targetPlayer.pos.x - pickup.pos.x,
                pickup.targetPlayer.pos.y - pickup.pos.y
            );
            const distance = dirToPlayer.len();

            if (distance > 0) {
                // Normalize direction
                const dir = dirToPlayer.scale(1 / distance);

                // Accelerate magnetization speed
                pickup.magnetizeSpeed = Math.min(
                    pickup.magnetizeSpeed + PICKUP_CONFIG.MAGNETIZE_ACCELERATION * k.dt(),
                    PICKUP_CONFIG.MAGNETIZE_SPEED
                );

                // Move toward player
                pickup.pos = pickup.pos.add(dir.scale(pickup.magnetizeSpeed * k.dt()));
            }
        }

        // Despawn after lifetime
        if (pickup.age >= pickup.lifetime) {
            k.destroy(pickup);
        }
    });

    // Multiplayer: Register pickup for network sync if host
    pickup.pickupType = 'currency'; // Mark type for sync
    if (isMultiplayerActive() && isHost()) {
        registerPickup(pickup);
    }

    return pickup;
}

// Create a powerup weapon pickup that can be collected for temporary weapon
export function createPowerupWeaponPickup(k, x, y, powerupKey) {
    const powerup = POWERUP_WEAPONS[powerupKey];
    if (!powerup) return null;

    const pickup = k.add([
        k.text(powerup.icon, { size: 24 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...powerup.color),
        k.area(),
        'powerupWeaponPickup'
    ]);

    pickup.powerupKey = powerupKey;
    pickup.lifetime = PICKUP_CONFIG.CURRENCY_LIFETIME; // Same lifetime as currency
    pickup.age = 0;
    pickup.collected = false;

    // Magnetization state
    pickup.magnetizing = false;
    pickup.magnetizeSpeed = 0;
    pickup.targetPlayer = null;

    // Visual effect - pulsing and rotating
    pickup.onUpdate(() => {
        if (k.paused) {
            // Still allow animation during pause for visual feedback
            const pulse = Math.sin(pickup.age * 4) * 0.15;
            pickup.scale = k.vec2(1 + pulse);
            pickup.angle = Math.sin(pickup.age * 2) * 10;
            return;
        }

        pickup.age += k.dt();

        // Pulse animation (more pronounced than other pickups)
        const pulse = Math.sin(pickup.age * 4) * 0.15;
        pickup.scale = k.vec2(1 + pulse);

        // Gentle rotation
        pickup.angle = Math.sin(pickup.age * 2) * 10;

        // Magnetization movement - once magnetizing starts, it never stops
        if (pickup.magnetizing && pickup.targetPlayer && pickup.targetPlayer.exists()) {
            // Calculate direction to player
            const dirToPlayer = k.vec2(
                pickup.targetPlayer.pos.x - pickup.pos.x,
                pickup.targetPlayer.pos.y - pickup.pos.y
            );
            const distance = dirToPlayer.len();

            if (distance > 0) {
                // Normalize direction
                const dir = dirToPlayer.scale(1 / distance);

                // Accelerate magnetization speed
                pickup.magnetizeSpeed = Math.min(
                    pickup.magnetizeSpeed + PICKUP_CONFIG.MAGNETIZE_ACCELERATION * k.dt(),
                    PICKUP_CONFIG.MAGNETIZE_SPEED
                );

                // Move toward player
                pickup.pos = pickup.pos.add(dir.scale(pickup.magnetizeSpeed * k.dt()));
            }
        }

        // Despawn after lifetime
        if (pickup.age >= pickup.lifetime) {
            k.destroy(pickup);
        }
    });

    // Multiplayer: Register pickup for network sync if host
    pickup.pickupType = 'powerup'; // Mark type for sync
    if (isMultiplayerActive() && isHost()) {
        registerPickup(pickup);
    }

    return pickup;
}
