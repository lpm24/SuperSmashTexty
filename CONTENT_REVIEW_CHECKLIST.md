# Content Review Checklist - Systematic Review Order

**Purpose:** Guide systematic review of game content to ensure balance, variety, and fun
**Last Updated:** 2025-01-14 (Post-Architecture Refactor)

**Current Status:** Most foundation content implemented. Focus shifting to content expansion and balance tuning.

---

## 📋 Review Order (Foundation → Complexity)

### Phase 1: Foundation (Core Gameplay Loop)
**These define the basic player experience**

#### 1. **Starting Character** ✅ First Priority - **COMPLETED**
- [x] Review "The Survivor" stats and balance
- [x] Verify starting weapon (Basic Pistol) feels good
- [x] Check if starting stats create engaging early game
- [x] Ensure character theme fits narrative

**Decisions Made:**
- ✅ Health: 100 (good baseline)
- ✅ Speed: 150 pixels/second (baseline)
- ✅ Damage: 10 per projectile (balanced)
- ✅ Fire Rate: 1.5 shots/second (updated from 0.5 for better feel)
- ✅ Unique Ability: +10% XP gain (xpMultiplier: 1.1) - implemented
- ✅ Stat System: Backend uses raw values, display uses normalized scale (1-100)
- ✅ Visual: Single character `@` (clear and standard)

**Questions Answered:**
- ✅ Starting stats are balanced - not too weak, not too strong
- ✅ Basic Pistol feels satisfying with 1.5 shots/sec fire rate
- ✅ Early game should be engaging with +10% XP boost

---

#### 2. **Base Weapons (Priority Set)** ✅ Second Priority - **COMPLETED**
**Review the 5-7 weapons needed for MVP:**

- [x] **Basic Pistol** - Starting weapon, balanced baseline
- [x] **Spread Shotgun** - Close-range, high damage
- [x] **Rapid Fire SMG** - Fast, low damage per shot
- [x] **Explosive Launcher** - Slow, area damage
- [x] **Orbital Weapons** - Passive damage, unique playstyle
- [x] **Chain Lightning** - Multi-target, unique mechanic
- [x] **Beam/Laser** - Continuous damage, resource management

**Decisions Made:**
- ✅ **ASCII Conflicts Resolved:** Each weapon has distinct character
  - Basic Pistol: `•` (changed from `*`)
  - Spread Shotgun: `o` (pellets)
  - Rapid Fire SMG: `|`
  - Explosive Launcher: `O`
  - Orbital Weapons: `○`
  - Chain Lightning: `Z`
  - Beam/Laser: `│` or `═`
- ✅ **Unlock System:** 3 available from start, 4 unlockable
  - Start: Basic Pistol, Spread Shotgun, Rapid Fire SMG
  - Unlock: Orbital (Floor 1), Explosive/Chain (Floor 2), Beam (Floor 3)
- ✅ **Balance:** Weapons cover different ranges and playstyles
- ⚠️ **Beam/Laser:** Most complex, consider Phase 2 or simplification

**Questions Answered:**
- ✅ 7 weapons cover different playstyles (balanced, close-range, DPS, area, passive, multi-target, continuous)
- ⚠️ Minor redundancy: Beam/Laser might be too complex for MVP
- ✅ Unlock system: 3 start, 4 unlockable (good progression curve)

---

#### 3. **Enemy Archetypes (Floor 1-2)** ✅ Third Priority - **COMPLETED**
**Review early game enemies that teach core mechanics:**

**Floor 1 Enemies:**
- [x] **Basic Rusher** `▶` - Teaches melee threat
- [x] **Basic Shooter** `◈` - Teaches ranged threat
- [x] **Zombie** `☠` - Teaches swarm mechanics
- [x] **Slime** `●` - Teaches splitting mechanic
- [x] **Bat** `▼` - Teaches fast mover

**Floor 2 Enemies:**
- [x] **Charger** `→` - Teaches telegraphed attacks
- [x] **Turret** `┼` - Teaches stationary threat
- [x] **Heavy Tank** `█` - Teaches tank archetype
- [x] **Zippy** `◐` - Teaches evasion challenge
- [x] **Exploder** `◎` - Teaches area denial

**Decisions Made:**
- ✅ **Character Conflicts Resolved:**
  - Bat: Changed from `◈` to `▼` (avoids conflict with Basic Shooter)
  - Slime: Using `●` instead of `◉` (avoids conflict with Exploder `◎`)
  - Charger: Using `→` (arrow) vs Rusher `▶` (triangle) - arrow = faster
- ✅ **All Enemies Teach Core Mechanics:** Each enemy introduces new gameplay concept
- ✅ **Difficulty Progression:** Smooth curve from Floor 1 to Floor 2
- ✅ **Character Variety:** All enemies have distinct Unicode characters
- ✅ **Stats Defined:** Health, speed, damage ranges specified for balance

**Questions Answered:**
- ✅ Floor 1 enemies teach all core mechanics (melee, ranged, swarms, splitting, fast movement)
- ✅ Floor 2 difficulty jump is appropriate (builds on Floor 1, introduces advanced mechanics)
- ✅ Enemy count is good (5 per floor = good variety without overwhelming)

---

### Phase 2: Progression (Mid-Game Content)

#### 4. **Unlockable Characters (Priority Set)** ✅ Fourth Priority - **COMPLETED**
**Review first 3-4 unlockable characters:**

- [x] **The Scout** - Speed-focused character
- [x] **The Tank** - Defense-focused character
- [x] **The Sniper** - Damage-focused character
- [x] **The Pyro** - Elemental-focused character

**Decisions Made:**
- ✅ **Stats Updated:** All characters now use pixel-based values (matching Survivor system)
- ✅ **Weapon Integration:** Characters use priority weapons (SMG, Shotgun) or need weapon implementation
- ✅ **Character Differentiation:** Clear tradeoffs for each character
- ⚠️ **Implementation Notes:**
  - Scout: Dodge chance needs implementation
  - Sniper: Crit system needs implementation (might be Phase 2)
  - Pyro: DoT system needs implementation (might be Phase 2)
- ✅ **Unlock Requirements:** Simplified where needed (Floor completion vs complex tracking)

**Questions Answered:**
- ✅ 4 characters cover different playstyles (speed, tank, precision, area/DoT)
- ✅ Unlock requirements reasonable (Floor 2-3 completion, or simplified alternatives)
- ⚠️ Some unique abilities require new systems (crit, DoT) - may need Phase 2 implementation

---

#### 5. **Enemy Archetypes (Floor 3-4)** ✅ Fifth Priority - **COMPLETED**
**Review mid-game enemies that add complexity:**

**Floor 3 Enemies:**
- [x] **Mage** `✦` - Teaches special abilities
- [x] **Shield Bearer** `▓` - Teaches defensive enemies
- [x] **Golem** `◼` - Teaches high-health threats
- [x] **Wraith** `≈` - Teaches teleportation
- [x] **Spawner** `◔` - Teaches minion mechanics
- [x] **Buffer** `✚` - Teaches support enemies

**Floor 4 Enemies:**
- [x] **Healer** `✛` - Teaches priority targeting
- [x] **Teleporter** `◖` - Teaches disruption
- [x] **Freezer** `❄` - Teaches debuff mechanics
- [x] **Leech** `◗` - Teaches lifesteal threat

**Decisions Made:**
- ✅ **Character Conflicts Resolved:**
  - Teleporter: Changed from `◐` to `◖` (avoids conflict with Zippy)
  - Leech: Using `◗` (right half) vs Teleporter `◖` (left half) - good distinction
  - Buffer: `✚` (heavy plus) vs Healer `✛` (open cross) - distinct
  - Golem: Using `◼` (medium square) vs Heavy Tank `█` (full block) - distinction
- ✅ **Stats Defined:** Health, speed, damage ranges specified for all enemies
- ✅ **Mechanics Identified:** All new mechanics documented with implementation notes
- ⚠️ **Implementation Requirements:** Many mechanics need new systems (homing, blocking, buffing, healing, etc.)

**Questions Answered:**
- ✅ Floor 3-4 enemies add enough variety (10 new enemies with unique mechanics)
- ⚠️ Some special abilities are complex but readable in ASCII (homing, blocking, etc.)
- ✅ Enemy combinations create fun challenges (support + damage dealers, spawners + minions)

---

#### 6. **Bosses (Floors 1-3)** ✅ Sixth Priority - **COMPLETED**
**Review early/mid-game bosses:**

- [x] **Floor 1 Boss: The Gatekeeper** `G` or `GG`
- [x] **Floor 2 Boss: The Swarm Queen** `Q` or `QQ`
- [x] **Floor 3 Boss: The Twin Guardians** `▶` + `◈` (two entities)

**Decisions Made:**
- ✅ **Visual Presence:** Use double characters (`GG`, `QQ`) or larger font (28-32px) for bosses
- ✅ **Health Scaling:** Appropriate progression (500 → 800 → 1200 total)
- ✅ **Mechanics Defined:** Detailed mechanics for each boss with phases
- ✅ **Character Assignments:** Each boss has distinct character(s)
- ✅ **Rewards:** Good progression (weapon → character → upgrade unlock)

**Questions Answered:**
- ✅ Bosses feel like meaningful milestones (test learned skills, significant achievements)
- ✅ Boss mechanics readable in ASCII (double characters or larger font recommended)
- ✅ Rewards justify challenge (high XP/currency + unlocks proportional to difficulty)

---

### Phase 3: Advanced Content (Late Game)

#### 7. **Remaining Characters**
**Review characters 5-12:**

- [ ] **The Engineer** - Turret/deployable focus
- [ ] **The Mage** - Magic/elemental focus
- [ ] **The Ninja** - Stealth/agility focus
- [ ] **The Berserker** - Risk/reward focus
- [ ] **The Collector** - Progression focus
- [ ] **The Summoner** - Minion focus
- [ ] **The Ghost** - Phase/evasion focus

**Review Criteria:**
- Each character still offers unique value?
- No redundant characters?
- Unlock requirements varied and interesting?
- Character themes fit narrative?

**Questions to Answer:**
- Are there too many characters?
- Do later characters feel worth unlocking?
- Are character themes consistent?

---

#### 8. **Remaining Weapons**
**Review weapons 8-15:**

- [ ] **Boomerang** - Return mechanic
- [ ] **Sniper Rifle** - High damage, slow
- [ ] **Flame Thrower** - Close range, DoT
- [ ] **Seeking Missiles** - Homing mechanic
- [ ] **Bouncing Bullets** - Wall bounce
- [ ] **Saw Blade** - Continuous contact damage
- [ ] **Freeze Ray** - Slow/freeze mechanic
- [ ] **Poison Dart** - DoT mechanic

**Review Criteria:**
- Each weapon offers unique mechanic?
- No redundant weapons?
- Upgrade paths interesting?
- ASCII representation clear?

**Questions to Answer:**
- Are there too many similar weapons?
- Do all weapons have clear upgrade paths?
- Which weapons should be meta-unlocks vs. character-specific?

---

#### 9. **Bosses (Floors 4-6+)**
**Review late-game bosses:**

- [ ] **Floor 4 Boss: The Phase Master**
- [ ] **Floor 5 Boss: The Colossus**
- [ ] **Floor 6 Boss: The Elemental Chaos**
- [ ] **Floor 7+ Boss Ideas**

**Review Criteria:**
- Boss difficulty scales appropriately?
- Each boss feels unique and memorable?
- Boss mechanics readable in ASCII?
- Rewards scale with difficulty?

**Questions to Answer:**
- Do later bosses feel appropriately challenging?
- Are boss mechanics too complex for ASCII?
- Do bosses create memorable moments?

---

### Phase 4: Systems & Balance

#### 10. **Upgrade System**
**Review upgrade categories and balance:**

- [ ] **Weapon Upgrades** - Damage, fire rate, projectiles, special properties
- [ ] **Passive Stats** - Movement, defense, utility
- [ ] **Special Abilities** - Area effects, summons, utility powers
- [ ] **Upgrade Rarity/Tiers** - Common, uncommon, rare, legendary?

**Review Criteria:**
- Upgrades feel impactful?
- Multiple viable upgrade paths?
- Power scaling appropriate?
- Upgrade choices create interesting decisions?

**Questions to Answer:**
- Do upgrades create noticeable power increases?
- Are there any "must-have" upgrades that break balance?
- Do upgrade choices create meaningful decisions?

---

#### 11. **Synergy System**
**Review synergy combinations:**

- [ ] **Weapon Synergies** - Multi-shot + spread, piercing + chain, etc.
- [ ] **Passive Synergies** - Movement + dash, health + regen, etc.
- [ ] **Cross-Category Synergies** - Weapon + passive combinations
- [ ] **Evolution Upgrades** - Weapon transformation requirements

**Review Criteria:**
- Synergies feel rewarding to discover?
- Synergies don't break game balance?
- Evolution requirements clear and achievable?
- Multiple viable synergy paths?

**Questions to Answer:**
- Are synergies too powerful/weak?
- Do players need to know about synergies to enjoy the game?
- Are evolution requirements too strict/loose?

---

#### 12. **Enemy Scaling & Balance**
**Review enemy progression:**

- [ ] **Health/Damage Scaling** - Per floor, per room
- [ ] **Spawn Rate Scaling** - Enemy density progression
- [ ] **Enemy Variety Scaling** - When new types introduced
- [ ] **Elite Variants** - Stronger versions of enemies

**Review Criteria:**
- Difficulty curve feels smooth?
- Player power growth matches enemy scaling?
- Late game remains challenging?
- Elite variants feel different, not just stronger?

**Questions to Answer:**
- Does difficulty scale too fast/slow?
- Do elite variants add enough variety?
- Is late-game balance maintained with upgrades?

---

### Phase 5: Polish & Extras

#### 13. **Pickups & Loot**
**Review pickup system:**

- [ ] **XP Orbs** - Size variants, drop rates
- [ ] **Health Pickups** - Size variants, drop rates
- [ ] **Currency Pickups** - Size variants, drop rates
- [ ] **Special Pickups** - Shields, boosts, etc.
- [ ] **Chests** - Loot tables, rarity tiers

**Review Criteria:**
- Pickup rates feel balanced?
- Special pickups feel impactful?
- Chest rewards feel rewarding?
- Visual clarity in ASCII?

**Questions to Answer:**
- Are pickups frequent enough?
- Do special pickups create interesting moments?
- Are chest rewards worth the risk?

---

#### 14. **Room Types & Generation**
**Review room variety:**

- [ ] **Room Templates** - Open arena, corridor, maze, etc.
- [ ] **Special Rooms** - Treasure, challenge, safe rooms
- [ ] **Room Size Variation** - Small to large
- [ ] **Obstacle Placement** - Walls, barriers, cover

**Review Criteria:**
- Room variety sufficient?
- Each room type offers different gameplay?
- Room generation creates interesting layouts?
- Obstacles add tactical depth?

**Questions to Answer:**
- Do rooms feel varied enough?
- Do obstacles enhance or hinder gameplay?
- Are special rooms frequent enough?

---

#### 15. **Visual & ASCII Design**
**Review visual representation:**

- [ ] **ASCII Character Set** - Player, enemies, projectiles, effects
- [ ] **Color Coding** - Consistent color usage
- [ ] **Particle Effects** - Hit, explosion, heal, level up, death
- [ ] **Visual Clarity** - Readability in combat

**Review Criteria:**
- All entities clearly distinguishable?
- Color coding consistent and helpful?
- Effects readable in fast-paced combat?
- ASCII aesthetic maintained?

**Questions to Answer:**
- Can players quickly identify entities in combat?
- Do colors help or hinder readability?
- Are particle effects clear or cluttered?

---

## 🎯 Review Process

### For Each Section:
1. **Read the content** in CONTENT_BRAINSTORM.md
2. **Check the boxes** as you review
3. **Answer the questions** - discuss or note decisions
4. **Make changes** to CONTENT_BRAINSTORM.md as needed
5. **Note balance concerns** for later testing

### Review Principles:
- **Fun First:** Does it feel good to use/fight?
- **Clarity:** Is it readable in ASCII?
- **Variety:** Does it add something new?
- **Balance:** Does it fit the difficulty curve?
- **Theme:** Does it fit the narrative?

---

## 📝 Notes Section

Use this space to track decisions, concerns, and ideas during review:

### Decisions Made:
- 

### Balance Concerns:
- 

### Ideas to Explore:
- 

### Questions for Testing:
- 

---

## ✅ Completion Status

- [ ] Phase 1: Foundation (Items 1-3)
- [ ] Phase 2: Progression (Items 4-6)
- [ ] Phase 3: Advanced Content (Items 7-9)
- [ ] Phase 4: Systems & Balance (Items 10-12)
- [ ] Phase 5: Polish & Extras (Items 13-15)

**Start with Phase 1, Item 1: Starting Character**

