// Door entity definition
export function createDoor(k, x, y, direction) {
    // Create a group to hold door parts
    // Add a rect component so area() has a shape to work with
    const doorGroup = k.add([
        k.rect(40, 40),
        k.pos(x, y),
        k.anchor('center'),
        k.area(),
        k.opacity(0), // Make the rect invisible (only used for collision)
        k.fixed(),
        'door'
    ]);

    doorGroup.direction = direction;
    doorGroup.open = false;
    doorGroup.isSpawnDoor = false;
    doorGroup.blocked = false; // NEW: Blocked state for doors that don't lead anywhere
    doorGroup.gridDirection = null; // NEW: Which grid direction this door represents
    doorGroup.parts = []; // Store door visual parts

    // Function to update door appearance based on state
    doorGroup.updateVisual = () => {
        // Remove old parts
        doorGroup.parts.forEach(part => {
            if (part.exists()) k.destroy(part);
        });
        doorGroup.parts = [];

        // Determine color based on state
        let color;
        if (doorGroup.blocked) {
            color = k.rgb(80, 80, 80);  // Gray when blocked
        } else if (doorGroup.open) {
            color = k.rgb(100, 255, 100);  // Green when open
        } else if (doorGroup.isSpawnDoor) {
            color = k.rgb(200, 50, 50);  // Red for spawn doors
        } else {
            color = k.rgb(200, 200, 100);  // Yellow for closed exit doors
        }

        if (direction === 'north' || direction === 'south') {
            // Horizontal doors (top and bottom)
            // Use box drawing characters for a nice doorway look
            const doorChars = doorGroup.blocked ? '███' : (doorGroup.open ? '▬▬▬' : '▀▀▀');

            const doorText = k.add([
                k.text(doorChars, { size: 24 }),
                k.pos(x, y),
                k.anchor('center'),
                k.color(color),
                k.fixed(),
                k.z(100)
            ]);
            doorGroup.parts.push(doorText);

            // Add decorative corners
            const leftCorner = k.add([
                k.text(doorGroup.open ? '╞' : '╔', { size: 20 }),
                k.pos(x - 35, y),
                k.anchor('center'),
                k.color(color),
                k.fixed(),
                k.z(100)
            ]);
            doorGroup.parts.push(leftCorner);

            const rightCorner = k.add([
                k.text(doorGroup.open ? '╡' : '╗', { size: 20 }),
                k.pos(x + 35, y),
                k.anchor('center'),
                k.color(color),
                k.fixed(),
                k.z(100)
            ]);
            doorGroup.parts.push(rightCorner);

        } else {
            // Vertical doors (left and right sides)
            // Stack characters vertically for proper door appearance
            const doorChars = doorGroup.blocked ? ['█', '█', '█'] : (doorGroup.open ? ['║', '║', '║'] : ['┃', '┃', '┃']);
            const spacing = 16; // Vertical spacing between characters

            for (let i = 0; i < doorChars.length; i++) {
                const offsetY = (i - 1) * spacing; // Center around y position
                const doorPart = k.add([
                    k.text(doorChars[i], { size: 24 }),
                    k.pos(x, y + offsetY),
                    k.anchor('center'),
                    k.color(color),
                    k.fixed(),
                    k.z(100)
                ]);
                doorGroup.parts.push(doorPart);
            }

            // Add decorative top and bottom
            const topDecor = k.add([
                k.text(doorGroup.open ? '╥' : '╦', { size: 20 }),
                k.pos(x, y - spacing * 1.5),
                k.anchor('center'),
                k.color(color),
                k.fixed(),
                k.z(100)
            ]);
            doorGroup.parts.push(topDecor);

            const bottomDecor = k.add([
                k.text(doorGroup.open ? '╨' : '╩', { size: 20 }),
                k.pos(x, y + spacing * 1.5),
                k.anchor('center'),
                k.color(color),
                k.fixed(),
                k.z(100)
            ]);
            doorGroup.parts.push(bottomDecor);
        }

        // Add 'X' overlay for blocked doors
        if (doorGroup.blocked) {
            const blockedMarker = k.add([
                k.text('X', { size: 28 }),
                k.pos(x, y),
                k.anchor('center'),
                k.color(255, 100, 100),
                k.fixed(),
                k.z(101)
            ]);
            doorGroup.parts.push(blockedMarker);
        }
    };

    // Override color setter to update all parts
    Object.defineProperty(doorGroup, 'color', {
        get: () => doorGroup._color,
        set: (newColor) => {
            doorGroup._color = newColor;
            doorGroup.parts.forEach(part => {
                if (part.exists()) {
                    part.color = newColor;
                }
            });
        }
    });

    // Override text setter to maintain compatibility
    Object.defineProperty(doorGroup, 'text', {
        get: () => doorGroup._text || '=',
        set: (newText) => {
            doorGroup._text = newText;
            // Don't actually update visuals - updateVisual() handles this
        }
    });

    // Cleanup handler to prevent memory leaks
    doorGroup.onDestroy(() => {
        // Destroy all visual parts when door is destroyed
        doorGroup.parts.forEach(part => {
            if (part.exists()) {
                k.destroy(part);
            }
        });
        doorGroup.parts = [];
    });

    // Initial visual setup
    doorGroup.updateVisual();

    return doorGroup;
}
