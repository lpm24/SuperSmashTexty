// Pickup entity definitions
import { PICKUP_CONFIG } from '../config/constants.js';

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

    return pickup;
}

