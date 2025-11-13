# Room Generation System

## Overview

The room generation system uses a **hybrid approach** combining manually designed templates with procedural variations. This provides:
- **Consistency**: Hand-crafted room layouts ensure quality and playability
- **Variety**: Random template selection prevents repetition
- **Scalability**: Easy to add new templates without code changes

## How It Works

### Template-Based System

Room templates are defined in `src/systems/roomGeneration.js` as JavaScript objects. Each template includes:

- **name**: Display name for the template
- **obstacles**: Array of obstacle definitions
- **spawnDoors**: Optional custom door positions (null = use defaults)

### Obstacle Types

1. **Walls** (`type: 'wall'`)
   - Block both movement and projectiles
   - Solid obstacles that create chokepoints
   - Visual: Darker color, solid appearance

2. **Cover** (`type: 'cover'`)
   - Block movement but allow projectiles to pass over
   - Tactical positioning elements
   - Visual: Lighter color, distinct from walls

### Current Room Templates

1. **Empty Room**: No obstacles (baseline)
2. **Center Pillar**: Single wall in the center
3. **Corner Cover**: Four cover pieces in corners
4. **Hallway**: Two parallel walls creating a hallway
5. **Cross Pattern**: Central cross-shaped wall structure
6. **Scattered Obstacles**: Mix of walls and cover scattered throughout

### Floor Color Progression

Colors change based on floor number to provide visual progression:
- **Walls**: Darker, more intense as floors increase
- **Obstacles**: Floor-specific color schemes
- **Cover**: Distinct from walls but follows floor theme

Color calculation:
- Brightness decreases with floor (darker = deeper)
- Hue rotates per floor for variety
- Saturation increases slightly for intensity

## Adding New Templates

To add a new room template:

1. Open `src/systems/roomGeneration.js`
2. Add a new entry to `ROOM_TEMPLATES`:

```javascript
myNewTemplate: {
    name: 'My Template Name',
    obstacles: [
        { x: 200, y: 300, width: 50, height: 50, type: 'wall', char: '#' },
        { x: 600, y: 200, width: 40, height: 40, type: 'cover', char: '█' }
    ],
    spawnDoors: null // or custom positions
}
```

3. The template will automatically be included in random selection

## Future Enhancements

### Procedural Variations
- Random rotation of templates
- Scaling obstacle sizes
- Random obstacle placement within templates
- Template combinations

### Weighted Selection
- Favor certain templates based on floor
- Difficulty-based template selection
- Unlock new templates as player progresses

### Advanced Generation
- JSON-based templates (external data files)
- rot.js integration for complex dungeon generation
- Room connectivity system
- Template themes matching game themes

## Technical Details

### Collision Detection
- Manual AABB (Axis-Aligned Bounding Box) collision
- Separate X/Y movement checks for smooth sliding
- Applied to both player and enemies

### Projectile Interaction
- Walls: Destroy projectiles on contact
- Cover: Projectiles pass through (no collision)
- Handled via KAPLAY's collision system with tags

### Performance
- Templates are lightweight (just data)
- Obstacles use `k.fixed()` for rendering optimization
- Collision checks only against active obstacles


