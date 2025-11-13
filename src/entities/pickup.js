// Pickup entity definitions
export function createXPPickup(k, x, y, value) {
    const pickup = k.add([
        k.text('+', { size: 16 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(100, 255, 100),
        k.area(),
        'xpPickup'
    ]);

    pickup.value = value;
    pickup.lifetime = 10; // seconds before despawning
    pickup.age = 0;
    pickup.collected = false;

    // Visual effect - slight pulsing
    let pulseDir = 1;
    pickup.onUpdate(() => {
        if (k.paused) {
            // Still allow animation during pause for visual feedback
            const pulse = Math.sin(pickup.age * 5) * 0.2;
            pickup.scale = k.vec2(1 + pulse);
            return;
        }
        
        pickup.age += k.dt();
        
        // Pulse animation
        const pulse = Math.sin(pickup.age * 5) * 0.2;
        pickup.scale = k.vec2(1 + pulse);
        
        // Despawn after lifetime
        if (pickup.age >= pickup.lifetime) {
            k.destroy(pickup);
        }
    });

    return pickup;
}

