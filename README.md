# SuperSmashTexty

An ASCII-style browser action roguelike that blends the arena-style chaos of Smash TV with the roguelike upgrade loops of Vampire Survivors.

## 🎮 Game Overview

**SuperSmashTexty** is a high-intensity power fantasy where players fight through procedurally generated arenas, collecting upgrades and unlocking persistent meta-progression. Characters are trapped in a malicious text program and must escape by progressing through the game.

### Key Features

- **Arena Combat:** Fast-paced, room-based combat with procedurally generated arenas
- **Roguelike Progression:** In-run upgrades and meta-progression between runs
- **ASCII Aesthetic:** Charming, readable monospace visual style
- **Browser-Based:** Playable directly in browser, no installation required
- **Autofire Combat:** Constant action focused on positioning and movement
- **Floor & Room System:** Progress through floors, each containing multiple challenge rooms

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SuperSmashTexty
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The game will open in your browser at `http://localhost:3000`

### Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally

### Project Structure

```
/
├── index.html          # Main HTML file
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite build configuration
├── src/
│   ├── main.js         # Entry point, KAPLAY initialization
│   ├── assets/         # Game assets (fonts, sprites, sounds)
│   ├── data/           # JSON data files (enemies, upgrades, etc.)
│   ├── systems/        # Game systems (combat, upgrades, etc.)
│   └── entities/       # Entity definitions (player, enemies, etc.)
└── dist/               # Production build output (gitignored)
```

## 🛠️ Technical Stack

- **Engine:** KAPLAY (ES Modules)
- **Rendering:** ASCII bitmap font atlas / monospace sprite sheet
- **Deployment:** GitHub Pages (static build)
- **Storage:** Browser localStorage for saves

## 📋 Development Status

✅ **Game Design Document Complete** - Design phase finished  
✅ **Phase 1: Core Prototype (COMPLETE)**
- ✅ Basic setup with KAPLAY
- ✅ Player entity with WASD movement
- ✅ Autofire weapon system with mouse aiming
- ✅ Projectile system
- ✅ Basic enemy AI
- ✅ Collision detection (player-enemy, projectile-enemy)
- ✅ Single room arena system
- ✅ XP collection and level-up system
- ✅ Upgrade draft system (3 choices on level-up)
- ✅ Immunity frames after taking damage
- ✅ Room completion logic
- ✅ Door spawning system

🎮 **Current Phase:** Phase 2 - Core Loop Development
- ✅ Door-based enemy spawning (enemies spawn from doors)
- ✅ Upgrade system expansion (multi-shot, piercing, crits, spread, defense)
- ✅ Room generation/templates (6 room templates with obstacles)
- ✅ Obstacle system (walls block everything, cover blocks movement but allows projectiles)
- ✅ Floor-based color progression (visual distinction between floors)
- ✅ Synergy system (8 upgrade combinations with special effects)

See `GAME_DESIGN_DOCUMENT.md` for complete design specifications and implementation roadmap.

## 📄 Documentation

- [Game Design Document](GAME_DESIGN_DOCUMENT.md) - Complete design specifications
- [Design Prompt](Game%20Design%20Doc%20Prompt%2020251112.txt) - Original design requirements

## 🎯 Project Goals

1. Create a playable prototype with core mechanics
2. Implement procedural room generation
3. Build upgrade and meta-progression systems
4. Deploy to GitHub Pages for easy access
