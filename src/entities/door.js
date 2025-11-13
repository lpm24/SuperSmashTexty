// Door entity definition
export function createDoor(k, x, y, direction) {
    const door = k.add([
        k.text('=', { size: 24 }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(200, 200, 100),
        k.area(),
        k.fixed(),
        'door'
    ]);

    door.direction = direction; // 'north', 'south', 'east', 'west'
    door.open = false;
    door.isSpawnDoor = false; // Default to exit door

    // Note: Door interaction is handled in game scene via proximity check
    // Spawn doors are red and closed, exit doors are green and open

    return door;
}

