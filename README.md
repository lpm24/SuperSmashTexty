# SuperSmashTexty

An ASCII-style browser action roguelike that blends the arena-style chaos of Smash TV with the roguelike upgrade loops of Vampire Survivors.

## 🎮 Game Overview

**SuperSmashTexty** is a high-intensity power fantasy where players fight through procedurally generated arenas, collecting upgrades and unlocking persistent meta-progression. Players take on the role of contestants in a deadly game show, fighting through studio floors against increasingly powerful show staff and executives.

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

The game will open in your browser at `http://localhost:3010`

### Multiplayer Setup (Local Development)

For local multiplayer testing, you need to run the PeerJS server:

```bash
npx peerjs --port 9000
```

This starts a local PeerJS signaling server on port 9000. The game automatically detects if you're running on localhost and will use this local server. When deployed to GitHub Pages, it automatically switches to the PeerJS cloud service.

**Note:** The multiplayer system automatically handles environment detection:
- **Localhost** → Uses local PeerJS server (localhost:9000)
- **GitHub Pages** → Uses PeerJS cloud service (cloud.peerjs.com)

### Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally
- `npx peerjs --port 9000` - Start local PeerJS server for multiplayer testing

### Project Structure

```
/
├── index.html          # Main HTML file
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite build configuration
├── src/
│   ├── main.js         # Entry point, KAPLAY initialization
│   ├── assets/         # Game assets (fonts, sprites, sounds)
│   ├── config/         # Game configuration and constants
│   │   └── constants.js    # Centralized game config (tuning, balancing)
│   ├── core/           # Core architecture (multiplayer-ready)
│   │   ├── GameState.js    # Centralized, serializable game state
│   │   ├── InputManager.js # Deterministic input handling
│   │   └── NetworkManager.js # Network abstraction layer
│   ├── data/           # Data-driven content (enemies, bosses, weapons, unlocks)
│   │   ├── enemies.js      # 21 enemy type definitions
│   │   ├── bosses.js       # Boss definitions with mechanics
│   │   ├── minibosses.js   # Miniboss definitions
│   │   ├── weapons.js      # Weapon definitions
│   │   └── unlocks.js      # Character and achievement unlocks
│   ├── scenes/         # Game scenes (menu, game, shop, settings, etc.)
│   ├── systems/        # Game systems (combat, progression, spawning, etc.)
│   └── entities/       # Entity factories (player, enemies, bosses, etc.)
└── dist/               # Production build output (gitignored)
```

## 🛠️ Technical Stack

- **Engine:** KAPLAY v3001.0.19 (ES Modules)
- **Build Tool:** Vite v5.0.0 with hot module replacement
- **Rendering:** ASCII bitmap font atlas / monospace sprite sheet
- **Multiplayer:** PeerJS v1.5.4 (WebRTC P2P networking)
  - Auto-detects environment (localhost vs production)
  - Uses local PeerJS server for development
  - Uses PeerJS cloud service for GitHub Pages deployment
  - Supports up to 4 players via invite code system
- **Architecture:**
  - **Data-Driven:** Content separated from logic (21 enemies, 4 bosses, 5 minibosses)
  - **State Management:** Centralized, serializable GameState for multiplayer support
  - **Input System:** Deterministic input handling with frame history
  - **Network Layer:** P2P multiplayer with host-authoritative game state
- **Deployment:** GitHub Pages (static build)
- **Storage:** Browser localStorage for saves and settings

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

✅ **Phase 2: Core Loop Development (COMPLETE)**
- ✅ Door-based enemy spawning (enemies spawn from doors)
- ✅ Upgrade system expansion (multi-shot, piercing, crits, spread, defense)
- ✅ Room generation/templates (6 room templates with obstacles)
- ✅ Obstacle system (walls block everything, cover blocks movement but allows projectiles)
- ✅ Floor-based color progression (visual distinction between floors)
- ✅ Synergy system (8 upgrade combinations with special effects)
- ✅ Meta progression system (currency, save/load, unlocks, results screen)
- ✅ Shop UI (purchase permanent upgrades, characters, and weapons with currency)
- ✅ Settings/Options menu (audio, controls, visual, gameplay settings with persistence)
- ✅ Statistics & Achievements system (lifetime stats tracking, achievement unlocks, progress display)
- ✅ UI improvements (pause overlay, compact HUD, level/XP decimal display)
- ✅ Boss armor system with proper damage reduction
- ✅ Projectile range limits for weapon differentiation

🎮 **Current Phase:** Phase 3 - Content & Polish
- ✅ Character selection system with unlockable characters
- ✅ Multiple weapon types (pistol, SMG, shotgun, sniper, etc.)
- ✅ Boss and miniboss entities with unique mechanics
- ✅ Achievement system with tracking and rewards
- ✅ Complete menu system (main menu, character select, shop, settings, statistics)
- ✅ Room generation system with procedural variety
- ✅ Enhanced combat system with multiple upgrade paths
- ✅ Game show theme implementation (enemies, bosses, menus themed as TV show staff)
- 🔄 Content expansion (more enemies, upgrades, synergies)
- 🔄 Advanced procedural generation improvements
- 🔄 Visual effects and polish
- 🔄 Balance tuning and gameplay refinement

See `GAME_DESIGN_DOCUMENT.md` for complete design specifications and implementation roadmap.

## 🏗️ Architecture & Code Quality

**Recent Major Refactor (2025-01):**
- ✅ **Constants System**: Centralized game configuration for easy tuning
- ✅ **Data-Driven Content**: Enemies, bosses, and weapons as pure data
- ✅ **Multiplayer-Ready Architecture**: State, Input, and Network managers
- ✅ **Comprehensive Documentation**: File headers and inline comments throughout
- ✅ **Clean Codebase**: Zero dead code, organized imports, clear structure
- ✅ **Future-Proof**: Ready for Windows/browser synchronous co-op multiplayer
- ✅ **Game Show Theme**: Complete re-theming of enemies, bosses, and menus with TV show aesthetic

The codebase follows best practices with:
- Separation of concerns (entities, systems, data, core)
- Single source of truth (centralized GameState)
- Deterministic systems (reproducible gameplay)
- Fully serializable state (JSON-ready for network sync)

## 📄 Documentation

- [Game Design Document](GAME_DESIGN_DOCUMENT.md) - Complete design specifications
- [Design Prompt](Game%20Design%20Doc%20Prompt%2020251112.txt) - Original design requirements
- [Development Priorities](DEVELOPMENT_PRIORITIES.md) - Current development focus and priorities
- [Git Workflow Guide](GIT_WORKFLOW.md) - Git automation and workflow documentation

## 🎯 Project Goals

1. Create a playable prototype with core mechanics
2. Implement procedural room generation
3. Build upgrade and meta-progression systems
4. Deploy to GitHub Pages for easy access
