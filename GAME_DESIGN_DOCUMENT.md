# ASCII Roguelike Arena Shooter – Game Design Document

**Project Name:** SuperSmashTexty
**Version:** 1.1.0 (Architecture Refactor Complete)
**Last Updated:** 2025-01-14
**Status:** Phase 3 In Development - Post-Architecture Refactor

---

## 1. Core Concept

### Vision Statement
An ASCII-style browser action roguelike that blends the arena-style chaos of Smash TV with the roguelike upgrade loops of Vampire Survivors. Players experience a high-intensity power fantasy where they mow down hordes of enemies with escalating abilities, all while trapped within a malicious text program.

### Emotional Tone & Core Fantasy
- **Intensity:** High-intensity chaos over methodical survival
- **Combat Feel:** Autofiring weapons create constant action and screen-filling mayhem
- **Power Fantasy:** Players start vulnerable but rapidly escalate into unstoppable forces through upgrades and meta-progression
- **Player Experience:** The satisfaction of watching your character transform from struggling survivor to screen-clearing powerhouse

### Setting & Narrative

#### Theme Options
The game design supports multiple thematic interpretations:

**Option 1: Sci-Fi Text Program Theme**
- **Aesthetic:** Sci-fi with ASCII visual style
- **Narrative Premise:** Different characters are being sucked into a malicious text program and must escape by progressing through the game
- **World Context:** The game itself is the "prison" - characters fight through procedurally generated arenas within this corrupted digital space
- **Visual Metaphor:** ASCII characters represent both the game's aesthetic and the narrative conceit (characters trapped in text)

**Option 2: Abstract Clock Face Theme**
- **Aesthetic:** Abstract, clock-inspired design with ASCII visual style
- **Narrative Premise:** Abstract concept where floors are tied to hours on a clock face
- **World Context:** Floors represent hours on a clock (1-12), creating a cyclical or time-based progression structure
- **Floor Structure:** Each floor corresponds to an hour position on a clock face
  - Floor 1 = 1 o'clock
  - Floor 2 = 2 o'clock
  - ...continuing through 12 o'clock
  - Potential for 12-floor cycles or extended progression beyond 12
- **Visual Metaphor:** Clock face structure provides thematic framework for floor progression
- **Thematic Elements:** Time-based imagery, cyclical progression, abstract temporal concepts
- **Design Note:** Implementation should accommodate either theme through data-driven content and flexible narrative presentation

#### Theme Flexibility
- **Modular Design:** Core gameplay systems are theme-agnostic
- **Data-Driven:** Themes implemented through JSON data (enemy types, room descriptions, narrative text)
- **Visual System:** ASCII aesthetic works for both themes with different character sets and color palettes
- **Narrative Light:** Light narrative approach allows theme to be swapped without major code changes

### Key Pillars
- **Arena Combat:** Fast-paced, room-based combat with procedurally generated arenas
- **Roguelike Progression:** In-run upgrades and meta-progression between runs
- **ASCII Aesthetic:** Charming, readable monospace visual style that reinforces the narrative
- **Browser-Based:** Playable directly in browser, no installation required

---

## 2. Gameplay Loop

### Core Loop Structure
1. **Start Run:** Player selects character (if unlocked) and begins in first arena
2. **Combat Phase:** Fight waves of enemies, collect XP and loot
3. **Level Up:** Choose from upgrade draft (pick 1 of 3 random power-ups)
4. **Room Progression:** Clear room, move to next procedurally generated arena
5. **Escalation:** Difficulty and enemy density increase with each room
6. **Run End:** Player dies or completes final room/boss
7. **Meta Progression:** Earn persistent currency, unlock new content

### Run Structure
- **Floor-Based Progression:** Runs are organized into floors, each containing multiple rooms
- **Room-Based Progression:** Each floor consists of multiple rooms/arenas that must be cleared
- **Room Completion:** Clear all enemies or survive for X seconds to unlock exit
- **Floor Progression:** Complete all rooms on a floor to advance to the next floor
- **Difficulty Scaling:** Each room increases enemy spawn rate, variety, and health; floors provide major difficulty jumps
- **Boss Rooms:** Periodic challenge rooms with unique mechanics (typically at floor transitions)

### Session Flow
- **Pre-Run:** Character selection, meta-upgrade review, optional difficulty modifiers
- **In-Run:** Continuous combat with upgrade choices every few levels
- **Post-Run:** Results screen, currency earned, unlock notifications, return to menu

---

## 3. Combat & Controls

### Core Combat Mechanics
- **Autofire:** Weapons fire automatically toward mouse cursor or gamepad aim direction
- **Movement:** WASD or arrow keys for character movement
- **Aim:** Mouse cursor position or right-stick (gamepad) determines firing direction
- **No Manual Fire:** Focus on positioning and movement, not trigger discipline

### Control Scheme
**Keyboard + Mouse (Primary):**
- **Movement:** WASD or Arrow Keys
- **Aim:** Mouse cursor position (relative to player)
- **Pause/Menu:** ESC or P
- **Interact:** E (for chests, upgrades, etc.)

**Gamepad (Optional):**
- **Movement:** Left stick or D-pad
- **Aim:** Right stick direction
- **Pause/Menu:** Start/Options button
- **Interact:** A/X button

### Combat Feel
- **Constant Action:** Autofire ensures player is always engaged
- **Positioning Focus:** Success comes from movement and positioning, not aim
- **Screen Coverage:** Upgrades allow weapons to cover more screen area
- **Juicy Feedback:** Screen shake, color flashes, particle effects on hits

---

## 4. Procedural Generation

### Room Structure
- **Arena Layout:** Each room is a procedurally generated arena
- **Four-Door System:** Rooms have up to four doors (one on each side: North, South, East, West)
- **Door Placement:** Doors positioned on room edges, allowing entry/exit
- **Room Templates:** Mix of template-based and fully procedural room generation
- **Optional Integration:** Consider rot.js for advanced dungeon generation if needed

### Enemy Spawning System
- **Door-Based Spawning:** Enemies spawn from doors in continuous streams
- **Spawn Pattern:** Enemies emerge from doors somewhat randomly but maintain continuous action
- **Spawn Rate:** Scales with room difficulty and floor progression
- **Spawn Variety:** Different enemy types spawn from different doors or in mixed waves
- **Room Completion:** All enemies must be cleared (or survive timer) to unlock exit doors

### Room Generation
- **Size Variation:** Rooms vary in size (small arenas to large open spaces)
- **Obstacle Placement:** Optional walls, barriers, or cover elements
- **Pickup Spawns:** XP orbs, health pickups, and loot spawn during/after combat
- **Exit Logic:** Exit doors unlock when room is cleared

### Floor Structure
- **Floor Composition:** Each floor contains multiple rooms
- **Room Count:** Variable number of rooms per floor (e.g., 3-5 rooms)
- **Floor Boss:** One boss room per floor (typically final room of floor)
- **Progression:** Complete all rooms on floor to access next floor
- **Theme Integration:**
  - **Clock Face Theme:** Floors represent hours on a clock (1-12 floors = 12 hours)
    - Floor 1 = 1 o'clock, Floor 2 = 2 o'clock, etc.
    - Potential for 12-floor cycles or extended progression beyond 12
  - **Flexible Count:** Floor count configurable per theme (12 for clock, variable for other themes)
  - **Thematic Naming:** Floor names/descriptions can be theme-specific (e.g., "Hour 1", "Hour 2" for clock theme)
- **Flexible Floor System:** Floor structure is data-driven, allowing different thematic interpretations

### Procedural Variety
- **Layout Templates:** Mix of room shapes (square, rectangular, L-shaped, etc.)
- **Enemy Composition:** Weighted random selection of enemy types per room
- **Difficulty Scaling:** Later rooms/floors feature more complex layouts and enemy combinations
- **Special Rooms:** Occasional mini-boss rooms or challenge rooms with unique mechanics

---

## 4.5. Enemy Design & Combat Encounters

### Enemy Archetypes

#### Melee Rushers
- **Behavior:** Fast movement, direct charge toward player
- **Threat:** Close-range damage, forces player to keep moving
- **Variants:** Basic rushers, fast rushers, armored rushers

#### Ranged Shooters
- **Behavior:** Maintain distance, fire projectiles at player
- **Threat:** Constant pressure, forces dodging
- **Variants:** Basic shooters, rapid-fire, sniper types

#### Tanks
- **Behavior:** Slow but high health, high damage
- **Threat:** Bullet sponges, dangerous if allowed to close distance
- **Variants:** Heavy tanks, shield bearers

#### Fast Movers
- **Behavior:** High speed, erratic movement patterns
- **Threat:** Hard to hit, can quickly close distance
- **Variants:** Zippy enemies, teleporters

#### Special Abilities
- **Behavior:** Unique mechanics (explosive on death, area denial, buffing allies)
- **Threat:** Tactical complications, require priority targeting
- **Variants:** Exploders, spawners, buffers, debuffers

### Enemy Behavior Patterns
- **Spawn System:** Enemies spawn from room doors in continuous streams
- **Movement:** Mix of direct pursuit, pattern movement, and tactical positioning
- **Attack Patterns:** Some enemies have simple attacks, others have patterns or special abilities
- **Aggression:** Continuous pressure maintains high-intensity combat feel

### Enemy Scaling System
- **Health/Damage Scaling:** Enemies gain more health and deal more damage as floors/rooms progress
- **New Enemy Types:** New enemy archetypes introduced at specific floors
- **Spawn Rate Scaling:** More enemies spawn simultaneously in later rooms/floors
- **Balance Considerations:** Scaling balanced between rooms, floors, and meta-progression to maintain challenge curve

### Boss Design

#### Boss Frequency
- **Floor Bosses:** One unique boss per floor (typically final room)
- **Mini-Bosses:** Optional unique mini-boss rooms that can spawn randomly
- **Boss Variety:** Each boss has unique mechanics and attack patterns

#### Boss Types
- **Combat-Focused Bosses:** Pure combat/movement challenges
  - High health, aggressive attacks
  - Focus on positioning and dodging
  - Screen-filling attacks requiring movement skill

- **Tactical/Puzzle Bosses:** More strategic encounters
  - Bullet-hell patterns requiring pattern recognition
  - Puzzle-like mechanics (weak points, phases, environmental interactions)
  - Mix of movement and tactical thinking

#### Boss Mechanics
- **Unique Abilities:** Each boss has signature attacks and behaviors
- **Phases:** Bosses may have multiple phases with different attack patterns
- **Environmental Interaction:** Some bosses interact with room layout or spawn adds
- **Rewards:** Bosses grant significant XP, currency, and potential unique drops
- **Armor System:** Bosses have armor that reduces incoming damage (30-35% reduction). Armor takes reduced damage and protects boss health. Visual representation shows armor degradation.

### Design Notes
- Enemy system designed to accommodate future enemy types and archetypes
- Balance between enemy types ensures varied combat encounters
- Scaling system allows for long-term progression while maintaining challenge
- Boss variety keeps encounters fresh and tests different player skills

---

## 5. In-Run Upgrades (Vampire Survivors Style)

### Leveling System
- **Level-Up Triggers:** Players level up based on:
  - **Room Completion:** Each room cleared grants level(s)
  - **Floor Progression:** Advancing to a new floor grants bonus level(s)
  - **Difficulty Scaling:** Harder rooms/floors grant more XP/levels
- **Upgrade Draft:** Upon leveling, player chooses 1 upgrade from 3 randomly selected options
- **Pacing:** Leveling frequency balanced to provide steady power growth without overwhelming choices

### Upgrade Categories

#### Weapon Upgrades
- **Damage:** Increase weapon damage output
- **Fire Rate:** Reduce time between shots
- **Spread/Pattern:** Change projectile spread (single → multi-shot → spread patterns)
- **Projectile Count:** Add additional projectiles per shot
- **Projectile Properties:** Size, speed, pierce, bounce, homing
- **Weapon Evolution:** Synergy upgrades that transform base weapons into evolved forms

#### Passive Stats
- **Movement Speed:** Increase character movement velocity
- **Health/Max HP:** Increase survivability
- **Defense/Damage Reduction:** Reduce incoming damage
- **Pickup Radius:** Increase range for collecting XP, loot, and items
- **XP Gain:** Multiplier for experience earned
- **Luck/Crit Chance:** Increase critical hit probability or rare drop rates

#### Special Abilities
- **Shields/Barriers:** Temporary or permanent defensive abilities
- **Explosions/AOE:** Area-of-effect damage on hit or on timer
- **Summons/Helpers:** Deployable allies or automated weapons
- **Utility Powers:** Dash, teleport, slow-time, etc.

#### Synergies & Evolutions
- **Weapon Combinations:** Combining specific weapon upgrades unlocks evolved forms
- **Passive Synergies:** Stacking certain passives creates new effects
- **Cross-Category Synergies:** Weapon + Passive combinations create unique abilities

### Starting Weapons
- **Default:** Single bullet weapon (basic projectile)
- **Character Variants:** Different characters may start with different base weapons
- **Meta Unlocks:** Starting weapon can be modified through meta-progression

### Weapon System
- **Base Weapons:** Unlocked through meta-progression (persistent unlocks)
- **Run-Specific Upgrades:** Each run allows players to upgrade/modify their equipped weapon
- **Weapon Variety:** Multiple base weapon types available (unlocked via meta-progression)
- **Flexibility:** Players can experiment with different weapon + upgrade combinations each run
- **Projectile Range:** Projectiles have maximum range (~750 pixels) to differentiate weapons and prevent infinite range exploits

### Design Notes
- All upgrade categories should be available and expandable
- System designed to accommodate future upgrade types and categories
- Balance considerations: ensure all upgrade paths feel viable and fun
- Power scaling: upgrades should create noticeable power increases while maintaining challenge

---

## 6. Meta Progression & Unlocks

### Persistent Currency
- **Currency Name:** TBD (e.g., "Credits", "Cells", "Data Fragments")
- **Earning:** Earned at end of each run based on:
  - Rooms cleared
  - Floors reached
  - Enemies defeated
  - Performance bonuses
- **Storage:** Persisted via browser localStorage

### Unlockable Content

#### Characters
- **Starting Character:** One character available by default
- **Unlockable Characters:** Multiple unlockable characters with unique characteristics
- **Character Differentiation:** Characters differ in:
  - Starting stats (health, speed, damage)
  - Starting weapons
  - Unique abilities or passives
  - Visual representation (different ASCII characters)
- **Character Themes:** Thematically related to their starting stats/weapon/abilities
- **Character-Specific Progression:** Character-specific achievements and unlocks (importance TBD)

#### Base Weapons
- **Starting Weapon:** Single bullet (default)
- **Weapon Unlocks:** New base weapon types available for selection at run start
- **Weapon Variety:** Different weapon archetypes (spread, rapid-fire, explosive, etc.)
- **Unlock Requirements:** Spend currency or achieve specific milestones

#### Permanent Upgrades
- **Stat Boosts:** Permanent increases to starting stats (health, damage, speed)
- **Starting Bonuses:** Begin runs with additional resources or upgrades
- **Quality of Life:** Unlock convenience features (auto-pickup, better UI, etc.)

#### Progression Systems
- **Unlock Trees:** Structured progression paths for unlocks
- **Milestone Rewards:** Achievements or goals that unlock content
- **Difficulty Modifiers:** Optional challenge modes that increase rewards

### Save System
- **Storage Method:** Browser localStorage
- **Data Format:** JSON structure for easy export/import
- **Backup Feature:** Optional JSON export/import for save backups
- **Data Structure:** Designed to be versioned and extensible

### Design Considerations
- **Balance:** Meta-progression should feel rewarding without making runs trivial
- **Pacing:** Early unlocks should be frequent; later unlocks require more investment
- **Flexibility:** System designed to accommodate future unlock types
- **Replayability:** Multiple viable progression paths encourage experimentation

---

## 6.5. Character Design

### Character Roster
- **Starting Character:** One default character available from the start
- **Unlockable Characters:** Multiple characters unlockable through meta-progression
- **Character Count:** TBD (expandable roster)

### Character Differentiation
Each character is unique in multiple ways:

#### Starting Stats
- **Health:** Different base/max health values
- **Speed:** Different movement speeds
- **Damage:** Different base damage output
- **Other Stats:** Potential unique stat modifiers

#### Starting Weapons
- **Weapon Type:** Each character starts with a different base weapon
- **Weapon Properties:** Unique weapon characteristics (fire rate, spread, projectile type)
- **Weapon Theme:** Starting weapon thematically matches character

#### Unique Abilities/Passives
- **Starting Passives:** Characters may have unique passive abilities
- **Special Mechanics:** Character-specific gameplay mechanics
- **Synergy Potential:** Some characters may synergize better with certain upgrade paths

#### Visual Representation
- **ASCII Character:** Each character represented by a unique ASCII character
- **Color Coding:** Different colors to distinguish characters
- **Visual Identity:** Consistent visual representation throughout game

### Character Progression
- **Character-Specific Achievements:** Achievements tied to specific characters
- **Character-Specific Unlocks:** Unlocks that are character-specific (importance TBD)
- **Progression Tracking:** Track character-specific stats and milestones

### Character Themes
- **Thematic Design:** Character themes relate to their starting stats/weapon/abilities
- **Narrative Integration:** Characters fit the "trapped in text program" narrative
- **Visual Themes:** ASCII representation reinforces character identity

### Design Notes
- Characters provide different starting points and playstyles
- Character variety encourages replayability and experimentation
- System designed to accommodate future character additions
- Character-specific content adds depth but importance is TBD (can be expanded later)

---

## 7. Visual & Interface Design

### ASCII Aesthetic
- **Rendering Method:** Bitmap font atlas or monospace sprite sheet (each glyph is a sprite)
- **Character Set:** Standard ASCII characters for entities, enemies, and environment
- **Color System:** Simple tinting and scaling allow color emphasis
  - Red for enemies
  - Gold/yellow for loot and pickups
  - Green for health/positive effects
  - Blue for player/projectiles
  - White/gray for environment
- **Visual Clarity:** Consistent monospace layout ensures readability
- **Contrast:** Color palette emphasizes legibility and contrast

### Visual Effects
- **ASCII Particles:** Use characters like `*`, `+`, `#` for sparks, explosions, and effects
- **Camera Shake:** Screen shake on hits, explosions, and significant events
- **Color Flashes:** Brief color overlays for damage, power-ups, and important events
- **Animation:** Simple frame-based or tween animations for character movement and effects

### Interface Elements

#### In-Game HUD
- **Health Bar:** Visual representation of current/max health
- **Level Display:** Current player level with decimal progress (e.g., "Level: 1.5" = level 1, 50% to next)
- **XP Display:** Current XP and XP needed for next level
- **Room/Floor Counter:** Compact display (e.g., "F1 R1" for Floor 1 Room 1)
- **Currency Display:** Persistent currency earned this run (if applicable)
- **Pause Overlay:** Visual indication when game is paused (dark overlay + "PAUSED" text)

#### Upgrade Selection UI
- **Upgrade Draft Screen:** Pause gameplay to show 3 upgrade options
- **Upgrade Cards:** Visual representation of each upgrade with:
  - Upgrade name
  - Icon/visual representation
  - Description of effect
  - Current stat values (if applicable)
- **Selection Method:** Click/tap or number keys (1, 2, 3) to select

#### Menu Systems
- **Main Menu:** Start game, character selection, meta-progression shop
- **Pause Menu:** Resume, settings, quit to menu
- **Results Screen:** Run summary, currency earned, unlocks, return to menu
- **Meta-Progression Menu:** Unlock trees, character selection, permanent upgrades

### Narrative Presentation
- **Light Narrative:** Narrative elements are minimal and unobtrusive
- **ASCII Art Integration:** Use ASCII art for story presentation when needed
- **Communication Methods:** Explore best ways to communicate narrative in ASCII style:
  - Text-based story screens
  - ASCII art cutscenes
  - Environmental storytelling through room design
  - Character descriptions/flavor text
- **Narrative Timing:** Story elements may appear between runs, at character unlock, or in special rooms

### Design Principles
- **Readability First:** ASCII characters must be clearly distinguishable
- **Color Coding:** Consistent color usage helps players quickly identify elements
- **Minimal UI:** Keep HUD elements unobtrusive but informative
- **Feedback:** Visual and audio feedback for all player actions
- **Consistency:** Maintain consistent visual language throughout
- **Narrative Integration:** Light narrative that doesn't interrupt gameplay flow

---

## 8. Technical Implementation (KAPLAY Stack)

### Engine & Framework
- **Primary Engine:** KAPLAY (ES Modules)
- **Language:** JavaScript (optional TypeScript support)
- **Why KAPLAY:**
  - Lightweight, expressive 2D engine
  - Excellent for fast-paced arena shooters
  - Handles collisions, physics, and entities easily
  - Native browser support, perfect for GitHub Pages
  - Real-time action games with good feedback systems
  - Actively maintained successor to Kaboom.js

### Project Structure
```
/
├── index.html
├── vite.config.js                 # Vite build configuration
├── src/
│   ├── main.js                    # Entry point, KAPLAY initialization
│   ├── config/
│   │   └── constants.js           # ✅ Centralized game configuration (tuning, balancing)
│   ├── core/                      # ✅ Multiplayer-ready architecture
│   │   ├── GameState.js           # ✅ Centralized, serializable game state
│   │   ├── InputManager.js        # ✅ Deterministic input handling with frame history
│   │   └── NetworkManager.js      # ✅ Network abstraction layer (local mode by default)
│   ├── data/                      # ✅ Data-driven content (pure data, no logic)
│   │   ├── enemies.js             # ✅ 21 enemy type definitions
│   │   ├── bosses.js              # ✅ 4 boss definitions with mechanics
│   │   ├── minibosses.js          # ✅ 5 miniboss definitions
│   │   ├── weapons.js             # ✅ Weapon definitions
│   │   ├── unlocks.js             # ✅ Character and achievement unlocks
│   │   └── achievements.js        # ✅ Achievement definitions
│   ├── scenes/
│   │   ├── menu.js                # ✅ Main menu scene
│   │   ├── game.js                # ✅ Main game scene (orchestrates all systems)
│   │   ├── gameOver.js            # ✅ Game over scene
│   │   ├── characterSelect.js     # ✅ Character selection scene
│   │   ├── shop.js                # ✅ Meta-progression shop
│   │   ├── settings.js            # ✅ Settings/options menu
│   │   ├── statistics.js          # ✅ Statistics and achievements display
│   │   └── upgradeDraft.js        # ✅ Upgrade selection UI
│   ├── assets/
│   │   ├── fonts/                 # ASCII bitmap font atlas (future)
│   │   ├── sprites/               # Sprite-based ASCII (future)
│   │   └── sounds/                # Audio files (future)
│   ├── systems/
│   │   ├── combat.js              # ✅ Autofire, collisions, damage calculations
│   │   ├── progression.js         # ✅ XP, leveling, upgrade draft
│   │   ├── upgrades.js            # ✅ Upgrade system and effects
│   │   ├── synergies.js           # ✅ Upgrade synergy system (8 combinations)
│   │   ├── roomGeneration.js      # ✅ Procedural room generation with templates
│   │   ├── enemySpawn.js          # ✅ Weighted enemy selection by floor
│   │   ├── metaProgression.js     # ✅ Save/load and persistent progression
│   │   ├── achievementChecker.js  # ✅ Achievement tracking and unlock logic
│   │   └── settings.js            # ✅ Settings persistence and management
│   └── entities/
│       ├── player.js              # ✅ Player entity with character stats and abilities
│       ├── enemy.js               # ✅ Enemy entity (21 types)
│       ├── boss.js                # ✅ Boss entity with multi-layer defense system
│       ├── miniboss.js            # ✅ Miniboss entity
│       ├── projectile.js          # ✅ Projectile entity with piercing and range
│       ├── pickup.js              # ✅ XP pickups
│       ├── door.js                # ✅ Door entity
│       └── obstacle.js            # ✅ Obstacle entity (walls/cover)
└── dist/                          # Production build output (gitignored)
```

### Rendering System
- **ASCII Rendering:** Bitmap font atlas or monospace sprite sheet
- **Sprite System:** Each ASCII character is a sprite in KAPLAY
- **Tinting:** Use KAPLAY's color/tint system for visual variety
- **Scaling:** Optional scaling for emphasis (larger enemies, effects)
- **Camera:** Fixed camera or scrolling view for room transitions
- **Batching:** KAPLAY's batched rendering ensures 60fps performance

### Input Handling
- **Keyboard:** WASD/Arrow keys for movement, ESC/P for pause
- **Mouse:** Cursor position for aiming, click for interactions
- **Gamepad:** Gamepad API support for optional controller input
  - Left stick/D-pad: movement
  - Right stick: aim direction
  - Buttons: pause, interact

### RNG & Procedural Systems
- **RNG Library:** Deterministic RNG using `alea` or `seedrandom`
- **Room Generation:**
  - Template-based rooms from JSON data
  - Optional: rot.js integration for advanced dungeon generation
  - Weighted random selection for room types and enemy spawns
- **Loot System:**
  - Weighted random selection for drops and chest rewards
  - Defined in JSON data files for easy balancing

### Data Management

#### Data-Driven Content System
- **JavaScript Data Modules:** All game content defined in `src/data/` as JavaScript modules
  - **enemies.js:** 21 enemy type definitions with stats and behaviors
  - **bosses.js:** 4 boss definitions with unique mechanics (armor, shields, regeneration)
  - **minibosses.js:** 5 miniboss definitions
  - **weapons.js:** Weapon type definitions
  - **unlocks.js:** Character and meta-progression unlocks
  - **achievements.js:** Achievement definitions and unlock criteria
  - **Content is pure data** - no logic, only configuration objects
  - Easy to modify and balance by editing data files
  - Scalable for future content additions

#### Constants System
- **Centralized Configuration:** `src/config/constants.js` contains all tunable game values
  - **13 Configuration Sections:** GAME_CONFIG, PLAYER_CONFIG, COMBAT_CONFIG, ENEMY_CONFIG, etc.
  - **Easy Balancing:** All magic numbers centralized for easy game tuning
  - **Helper Functions:** Utility functions for common calculations
  - **Single Source of Truth:** All systems reference constants for consistent behavior

#### Core Architecture (Multiplayer-Ready)
- **GameState (src/core/GameState.js):**
  - Centralized state management for all game data
  - Fully serializable (JSON-ready) for network synchronization
  - Singleton pattern for global access
  - Stores player state, enemy data, room info, progression, etc.
  - Designed for deterministic gameplay (same state = same result)

- **InputManager (src/core/InputManager.js):**
  - Deterministic input handling with frame history
  - Collects inputs without directly modifying state
  - Input buffer system for rollback/replay support
  - Abstracts input sources (keyboard, gamepad, network)
  - Frame-by-frame input recording for multiplayer sync

- **NetworkManager (src/core/NetworkManager.js):**
  - Network abstraction layer for future multiplayer
  - Currently in "local mode" (single-player)
  - Interface ready for WebRTC/WebSocket implementation
  - State synchronization methods prepared
  - Game remains single-player by default, multiplayer is opt-in future feature

#### Theme System
- **Theme Configuration:** Theme-specific data (floor names, narrative text, visual elements)
- **Theme-Agnostic Code:** Core systems work with any theme through data-driven approach
- **Theme Switching:** Themes can be swapped by changing configuration and data files
- **Multiple Themes:** Support for both Sci-Fi and Clock Face themes (or others)

#### Save System
- **localStorage:** Browser-based persistent data storage
- **JSON Export/Import:** Manual backup/restore functionality
- **Versioned Data Structure:** Save system handles future data structure changes
- **Meta-Progression:** Persistent currency, unlocks, achievements, and statistics

### Performance Targets
- **Resolution:** 800×600 or 1024×768 logical resolution
- **Frame Rate:** 60fps target
- **Optimization:**
  - ASCII atlas and KAPLAY's batched rendering
  - Efficient entity management
  - Object pooling for projectiles and effects
  - Culling off-screen entities

### Development Workflow
- **Bundler:** Optional Vite or ESBuild for development
  - Hot reload during development
  - Code splitting and optimization
- **Build Process:** Static build (HTML + JS + assets) for GitHub Pages
- **No Backend:** Fully client-side, no server required

---

## 9. Hosting & Deployment (GitHub Pages)

### Deployment Strategy
- **Platform:** GitHub Pages (static site hosting)
- **Build Output:** Static files (HTML, JS, CSS, assets)
- **No Backend Required:** Fully client-side game logic and save data
- **Direct Launch:** Game playable directly from browser, no installation

### Repository Structure
- **Source Files:** Development files in `/src`
- **Build Output:** Production files in `/dist` or root
- **GitHub Pages:** Configured to serve from `/dist` or root directory
- **Assets:** All game assets included in build

### Build Process
1. **Development:** Use bundler (Vite/ESBuild) for hot reload
2. **Build:** Generate optimized static build
3. **Deploy:** Push to GitHub, GitHub Pages serves automatically
4. **Update:** Simple git push updates live game

### Save Data Considerations
- **localStorage:** Browser-based saves work across sessions
- **No Server:** All save data stored client-side
- **Backup Feature:** JSON export/import allows manual backups
- **Cross-Device:** Save data is device-specific (by design)

### Future Considerations
- **CDN:** Optional CDN for faster asset loading
- **Analytics:** Optional analytics integration (privacy-conscious)
- **Updates:** Version checking for save data compatibility

---

## 10. Future Features / Extensions

### Potential Additions

#### Multiplayer (Architecture Ready!)
- **Synchronous Co-op:** Windows/browser synchronous multiplayer
- **Architecture Complete:** GameState, InputManager, and NetworkManager in place
- **Network Layer:** Implement WebRTC or WebSocket for state synchronization
- **Deterministic Gameplay:** Input recording and state serialization ready for network sync
- **Single-Player First:** Game remains fully functional offline; multiplayer is opt-in
- **Implementation Timeline:** Major feature requiring weeks of work (future priority)

#### Content Expansion
- **Additional Enemy Types:** More enemy archetypes and unique mechanics beyond current 21
- **More Upgrade Categories:** New upgrade types beyond initial categories
- **More Synergies:** Expand beyond current 8 upgrade combinations
- **Character-Specific Mechanics:** Unique abilities or playstyles per character
- **More Room Templates:** Expand beyond current 6 room templates
- **Balance Tuning:** Continuous refinement of enemy stats, spawn rates, and difficulty scaling

#### Gameplay Features
- **Challenge Modes:** Time trials, endless mode, daily challenges
- **Sound Design:** Music and sound effects (optional, can be added later)
- **Advanced Room Generation:** More complex procedural generation with rot.js
- **Multi-Weapon System:** Ability to equip multiple weapons simultaneously
- **Environmental Hazards:** Traps, moving obstacles, interactive elements
- **Story Mode:** Optional narrative elements between runs

### Design Philosophy
- **Modular Systems:** All systems designed to accommodate future additions
- **Data-Driven:** Content additions primarily require data file updates, not logic changes
- **Multiplayer-Ready:** Architecture prepared for synchronous co-op, but single-player always works
- **Iterative Development:** Focus on playable prototype first, then expand
- **Player Feedback:** Future features informed by playtesting and player feedback

### Technical Extensibility
- **Data-Driven Content:** Easily add new enemies, upgrades, weapons via `src/data/` modules
- **Constants System:** All tunable values centralized in `src/config/constants.js`
- **Component System:** KAPLAY's component system allows easy feature additions
- **Save Data Versioning:** Save system designed to handle future data structure changes
- **Performance Headroom:** Optimizations leave room for additional features
- **Network-Ready:** State management and input handling ready for multiplayer implementation

---

## 11. Implementation Priorities & Development Roadmap

### Phase 1: Core Prototype (MVP)
**Goal:** Playable prototype with core mechanics

1. **Basic Setup** ✅
   - ✅ KAPLAY project structure
   - ✅ ASCII rendering system
   - ✅ Basic input handling (WASD + mouse)

2. **Core Combat** ✅
   - ✅ Player character with movement
   - ✅ Autofire weapon system
   - ✅ Basic projectile system
   - ✅ Simple enemy (one type)
   - ✅ Collision detection

3. **Room System** ✅
   - ✅ Single room arena
   - ✅ Basic door spawning system
   - ✅ Room completion logic

4. **Basic Progression** ✅
   - ✅ XP collection
   - ✅ Simple level-up system
   - ✅ Basic upgrade draft (3 choices)

5. **Gameplay Polish** ✅
   - ✅ Immunity frames after taking damage
   - ✅ Visual feedback systems

### Phase 2: Core Loop
**Goal:** Complete gameplay loop

1. **Room & Floor System** ✅
   - ✅ Multiple rooms per floor
   - ✅ Floor progression
   - ✅ Room generation (basic templates)
   - ✅ Obstacle system (walls and cover)
   - ✅ Door-based room transitions

2. **Enemy System** ✅
   - ✅ Multiple enemy types
   - ✅ Door-based spawning
   - ✅ Enemy scaling
   - ✅ Boss and miniboss entities

3. **Upgrade System** ✅
   - ✅ Multiple upgrade categories
   - ✅ Upgrade effects implementation
   - ✅ Synergy system (8 combinations)
   - ✅ Weapon variety and differentiation

4. **Meta Progression** ✅
   - ✅ Currency system (Credits)
   - ✅ Complete save/load system
   - ✅ Unlock system (characters, weapons, upgrades)
   - ✅ Shop UI for purchases
   - ✅ Statistics tracking
   - ✅ Achievement system

### Phase 2.5: Architecture Refactor ✅
**Goal:** Prepare architecture for future multiplayer (COMPLETED January 2025)

1. **Constants System** ✅
   - ✅ Centralized game configuration (`src/config/constants.js`)
   - ✅ 13 configuration sections for easy tuning
   - ✅ All magic numbers consolidated
   - ✅ Helper functions for common calculations

2. **Data-Driven Content** ✅
   - ✅ Extracted enemies to `src/data/enemies.js` (21 types)
   - ✅ Extracted bosses to `src/data/bosses.js` (4 bosses)
   - ✅ Extracted minibosses to `src/data/minibosses.js` (5 types)
   - ✅ Extracted weapons to `src/data/weapons.js`
   - ✅ Content as pure data, separated from logic

3. **Core Architecture** ✅
   - ✅ GameState: Centralized, serializable state management
   - ✅ InputManager: Deterministic input with frame history
   - ✅ NetworkManager: Network abstraction layer (local mode)
   - ✅ Multiplayer-ready architecture while maintaining single-player

4. **Documentation & Cleanup** ✅
   - ✅ Comprehensive file headers for all modules
   - ✅ Inline comments for complex logic
   - ✅ Organized imports (Entity, System, Data, Config, Core)
   - ✅ Zero dead code or unused imports
   - ✅ Updated all documentation files

### Phase 3: Content & Polish 🔄
**Goal:** Feature-complete game

1. **Content Expansion** 🔄
   - ✅ Character selection system
   - ✅ Multiple weapon types
   - ✅ Boss and miniboss implementation
   - 🔄 More enemy types and variants
   - 🔄 Additional upgrades and synergies
   - 🔄 More character variety

2. **Procedural Generation** 🔄
   - ✅ Room generation system
   - ✅ Room templates and variety
   - 🔄 Advanced generation patterns
   - 🔄 Better enemy spawn patterns
   - 🔄 More room variety

3. **UI/UX** ✅
   - ✅ Complete menu systems (main, character select, shop, settings, statistics)
   - ✅ Upgrade selection UI
   - ✅ Results screen
   - ✅ Meta-progression shop
   - ✅ Settings/options menu
   - ✅ Achievement display

4. **Polish** 🔄
   - 🔄 Visual effects enhancement
   - 🔄 Camera shake improvements
   - 🔄 Particle effects expansion
   - 🔄 Balance tuning
   - 🔄 Performance optimization

### Phase 4: Deployment
**Goal:** Live game on GitHub Pages

1. **Build System**
   - Production build setup
   - Asset optimization
   - GitHub Pages configuration

2. **Testing**
   - Cross-browser testing
   - Performance optimization
   - Bug fixes

3. **Documentation**
   - Player-facing documentation
   - Development notes
   - Update README

### Design Decisions to Finalize During Development
- **Theme Selection:** Choose between Sci-Fi Text Program or Clock Face theme (or implement both as options)
- **Theme Implementation:** Ensure all systems are theme-agnostic and data-driven
- Currency name
- Specific character designs and themes
- Exact scaling formulas for difficulty
- Room count per floor
- Specific upgrade balance values
- Boss designs and mechanics
- Narrative presentation methods
- Clock face theme specifics (12-floor cycles, extended progression, etc.)

### Development Philosophy
- **Iterative:** Build playable versions early and often
- **Test-Driven:** Playtest frequently to validate design decisions
- **Data-Driven:** Content in data modules, logic in systems, configuration in constants
- **Modular:** Build systems that can be extended independently
- **Theme-Agnostic:** Core systems work with any theme; themes are data/config, not code
- **Architecture-First:** Invest in solid architecture early for long-term maintainability
- **Multiplayer-Ready:** Build with multiplayer in mind, but single-player always works
- **Clean Codebase:** Comprehensive documentation, zero dead code, organized structure

---

