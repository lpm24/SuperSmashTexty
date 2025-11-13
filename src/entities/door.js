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

    // Note: Door interaction is handled in game scene via proximity check
    // This onClick is kept for potential future use

    return door;
}

