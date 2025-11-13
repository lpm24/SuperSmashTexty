# Content Review Checklist - Systematic Review Order

**Purpose:** Guide systematic review of game content to ensure balance, variety, and fun

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

#### 3. **Enemy Archetypes (Floor 1-2)** ✅ Third Priority
**Review early game enemies that teach core mechanics:**

**Floor 1 Enemies:**
- [ ] **Basic Rusher** - Teaches melee threat
- [ ] **Basic Shooter** - Teaches ranged threat
- [ ] **Zombie** - Teaches swarm mechanics
- [ ] **Slime** - Teaches splitting mechanic
- [ ] **Bat** - Teaches fast mover

**Floor 2 Enemies:**
- [ ] **Charger** - Teaches telegraphed attacks
- [ ] **Turret** - Teaches stationary threat
- [ ] **Heavy Tank** - Teaches tank archetype
- [ ] **Zippy** - Teaches evasion challenge
- [ ] **Exploder** - Teaches area denial

**Review Criteria:**
- Each enemy teaches something?
- Difficulty progression smooth?
- Enemy variety sufficient?
- ASCII characters distinguishable?
- Behavior patterns clear and readable?

**Questions to Answer:**
- Do Floor 1 enemies teach all core mechanics?
- Is Floor 2 difficulty jump appropriate?
- Are there too many/few enemy types per floor?

---

### Phase 2: Progression (Mid-Game Content)

#### 4. **Unlockable Characters (Priority Set)** 
**Review first 3-4 unlockable characters:**

- [ ] **The Scout** - Speed-focused character
- [ ] **The Tank** - Defense-focused character
- [ ] **The Sniper** - Damage-focused character
- [ ] **The Pyro** - Elemental-focused character

**Review Criteria:**
- Each character offers unique playstyle?
- Starting weapons match character theme?
- Unique abilities feel impactful?
- Unlock requirements reasonable?
- Character differentiation clear?

**Questions to Answer:**
- Do these 4 characters cover different playstyles?
- Are unlock requirements too easy/hard?
- Do unique abilities create meaningful choices?

---

#### 5. **Enemy Archetypes (Floor 3-4)**
**Review mid-game enemies that add complexity:**

**Floor 3 Enemies:**
- [ ] **Mage** - Teaches special abilities
- [ ] **Shield Bearer** - Teaches defensive enemies
- [ ] **Golem** - Teaches high-health threats
- [ ] **Wraith** - Teaches teleportation
- [ ] **Spawner** - Teaches minion mechanics
- [ ] **Buffer** - Teaches support enemies

**Floor 4 Enemies:**
- [ ] **Healer** - Teaches priority targeting
- [ ] **Teleporter** - Teaches disruption
- [ ] **Freezer** - Teaches debuff mechanics
- [ ] **Leech** - Teaches lifesteal threat

**Review Criteria:**
- New mechanics introduced gradually?
- Enemy combinations create interesting challenges?
- Difficulty scaling appropriate?
- Special abilities readable and fair?

**Questions to Answer:**
- Do Floor 3-4 enemies add enough variety?
- Are special abilities too complex for ASCII representation?
- Do enemy combinations create fun challenges?

---

#### 6. **Bosses (Floors 1-3)**
**Review early/mid-game bosses:**

- [ ] **Floor 1 Boss: The Gatekeeper**
- [ ] **Floor 2 Boss: The Swarm Queen**
- [ ] **Floor 3 Boss: The Twin Guardians**

**Review Criteria:**
- Each boss has unique mechanics?
- Boss difficulty appropriate for floor?
- Boss fights feel epic but fair?
- Rewards feel rewarding?
- ASCII representation clear and readable?

**Questions to Answer:**
- Do bosses feel like meaningful milestones?
- Are boss mechanics readable in ASCII?
- Do rewards justify the challenge?

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

