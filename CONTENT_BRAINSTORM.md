# SuperSmashTexty - Content Brainstorming

**Last Updated:** 2025-01-XX  
**Purpose:** Brainstorming and notes for game content (weapons, enemies, characters, bosses, upgrades, etc.)

**Character Set Note:** Using Unicode symbols for better visual variety. See `CHARACTER_SET_GUIDE.md` for full character options and alternatives.

---

## 🎯 Weapons

### Base Weapon Archetypes

#### 1. **Basic Pistol** (Starting Weapon) ✅ PRIORITY
- **Character:** `•` (bullet point, Unicode U+2022) 
- **Alternatives:** `·` (middle dot), `▪` (black small square), `*` (asterisk fallback)
- **Properties:** 
  - Single projectile, straight shot
  - Fire Rate: 1.5 shots/second (updated from 1.0)
  - Damage: 10 per projectile
  - Projectile Speed: 300 pixels/second
  - Range: Medium (lifetime: 2 seconds = ~600 pixels)
- **Upgrade Paths:** Multi-shot, spread, rapid fire, piercing
- **Starting Character:** The Survivor (default)
- **Unlock:** Available from start

**Review:**
- ✅ **Distinct Feel:** Balanced baseline, straightforward
- ✅ **Playstyle:** Versatile, works at any range
- ✅ **Upgrade Paths:** Clear progression (single → multi → spread)
- ✅ **Character:** `•` (Unicode bullet) is clear and readable
- ✅ **Balance:** Good baseline for comparison
- ✅ **Updated:** Using Unicode `•` instead of `*` for better distinction

#### 2. **Spread Shotgun** ✅ PRIORITY
- **Character:** `◦` (white bullet, Unicode U+25E6) for pellets
- **Alternatives:** `o` (lowercase o), `○` (white circle), `●` (black circle)
- **Properties:** 
  - Fires 3-5 projectiles in a cone pattern
  - Fire Rate: 0.8 shots/second (slower than pistol)
  - Damage: 8 per pellet (total: 24-40 damage per shot)
  - Projectile Speed: 250 pixels/second (slightly slower)
  - Range: Short-medium (close-range focused)
  - Spread Angle: 30-45 degrees
- **Upgrade Paths:** More pellets (3→5→7), wider spread, tighter spread, explosive pellets
- **Unlock:** Available from start OR complete Floor 1

**Review:**
- ✅ **Distinct Feel:** Close-range powerhouse, high burst damage
- ✅ **Playstyle:** Aggressive, requires getting close
- ✅ **Character:** Using `◦` (white bullet) for pellets - distinct from pistol `•`
- ✅ **Balance:** High damage offset by slow fire rate and close range
- ✅ **Upgrade Paths:** Clear progression (more pellets, better spread)
- 💡 **Consider:** Should this be unlockable or available from start? (Recommend: available from start for variety)

#### 3. **Rapid Fire SMG** ✅ PRIORITY
- **Character:** `│` (box drawing vertical, Unicode U+2502)
- **Alternatives:** `|` (vertical bar), `┃` (heavy vertical), `·` (middle dot for rapid fire)
- **Properties:** 
  - Single projectile per shot
  - Fire Rate: 3.0 shots/second (very fast)
  - Damage: 6 per projectile (lower per shot, high DPS)
  - Projectile Speed: 350 pixels/second (fast)
  - Range: Medium-long
- **Upgrade Paths:** Damage boost, fire rate boost, ricochet, chain lightning
- **Unlock:** Available from start OR complete Floor 1

**Review:**
- ✅ **Distinct Feel:** High DPS, constant stream of bullets
- ✅ **Playstyle:** Sustained damage, good for kiting
- ✅ **Character:** `│` (box drawing vertical) is distinct and more visible than basic `|`
- ✅ **Balance:** Lower per-shot damage, but high total DPS
- ✅ **Upgrade Paths:** Can scale damage or fire rate
- 💡 **Consider:** `-` (horizontal) might be less visible than `|` (vertical)

#### 4. **Explosive Launcher** ✅ PRIORITY
- **Character:** `●` (black circle, Unicode U+25CF) or `◉` (fisheye, Unicode U+25C9)
- **Alternatives:** `O` (uppercase O), `◎` (bullseye), `○` (white circle)
- **Properties:** 
  - Single projectile, explodes on impact
  - Fire Rate: 0.6 shots/second (slow)
  - Damage: 25 base + 15 area damage (total: 40+ to groups)
  - Projectile Speed: 200 pixels/second (slow, visible)
  - Range: Medium
  - Explosion Radius: 40-50 pixels
- **Upgrade Paths:** Larger explosion radius, multiple explosions, fire trail, cluster bombs
- **Unlock:** Complete Floor 2 OR available from start

**Review:**
- ✅ **Distinct Feel:** Area damage, great for groups
- ✅ **Playstyle:** Tactical, requires leading targets, positioning
- ✅ **Character:** `●` or `◉` (black circle/fisheye) is clear and distinct (avoid `@` to not conflict with player)
- ✅ **Balance:** High damage but slow and requires good aim
- ✅ **Upgrade Paths:** Can scale radius or add effects
- 💡 **Consider:** Explosion visual effect needed (particles: `*`, `+`, `#`)

#### 5. **Beam/Laser** ✅ PRIORITY
- **Character:** `═` (double horizontal, Unicode U+2550) or `│` (vertical, Unicode U+2502)
- **Alternatives:** `─` (single horizontal), `█` (full block), `▓` (dark shade)
- **Properties:** 
  - Continuous beam while firing
  - Fire Rate: N/A (continuous)
  - Damage: 15 per tick (damage over time while beam active)
  - Range: Long (extends to edge of screen or max range)
  - Energy/Heat: Drains over time, needs cooldown
- **Upgrade Paths:** Wider beam, piercing, chain to nearby enemies, freeze effect
- **Unlock:** Complete Floor 2 OR meta-unlock

**Review:**
- ✅ **Distinct Feel:** Unique continuous damage mechanic
- ⚠️ **Playstyle:** Requires different implementation (not projectile-based)
- ⚠️ **ASCII:** `═` or `─` might be hard to see - consider `│` or thicker line
- ⚠️ **Complexity:** More complex than other weapons (energy system needed)
- 💡 **Consider:** Might be better as Phase 2 weapon, or simplify to "charged shot" instead
- 💡 **Alternative:** Make it a "charged shot" that fires a long beam projectile

#### 6. **Boomerang**
- **ASCII:** `◄` or `►`
- **Properties:** Returns to player, hits enemies on way out and back
- **Upgrade Paths:** Multiple boomerangs, longer range, homing, electric trail

#### 7. **Orbital Weapons** ✅ PRIORITY
- **Character:** `○` (white circle, Unicode U+25CB) or `◯` (large circle, Unicode U+25EF)
- **Alternatives:** `●` (black circle), `◉` (fisheye), `O` (uppercase O)
- **Properties:** 
  - Orbs rotate around player at fixed radius
  - Damage: 12 per contact (continuous while enemy touches orb)
  - Rotation Speed: 180 degrees/second (adjustable)
  - Orbit Radius: 40-50 pixels from player
  - Starting Orbs: 1-2
- **Upgrade Paths:** More orbs (1→2→3→4), faster rotation, larger orbs, homing orbs
- **Unlock:** Complete Floor 1 OR meta-unlock

**Review:**
- ✅ **Distinct Feel:** Passive damage, unique playstyle
- ✅ **Playstyle:** Defensive, encourages close combat
- ✅ **ASCII:** `○` or `●` is clear and distinct
- ✅ **Balance:** Good for defense, less offensive than other weapons
- ✅ **Upgrade Paths:** Clear progression (more orbs = more damage)
- 💡 **Consider:** Should this be a weapon or a special ability? (Recommend: weapon, but unique)

#### 8. **Sniper Rifle**
- **ASCII:** `→` or `─`
- **Properties:** Very slow fire rate, very high damage, piercing
- **Upgrade Paths:** Faster fire rate, multi-pierce, explosive rounds, crit chance

#### 9. **Flame Thrower**
- **ASCII:** `~` or `≈`
- **Properties:** Short range, continuous damage, area effect
- **Upgrade Paths:** Longer range, wider spread, burn damage over time, ignite explosions

#### 10. **Chain Lightning** ✅ PRIORITY
- **Character:** `⚡` (lightning bolt, Unicode U+26A1) - perfect for lightning!
- **Alternatives:** `Z` (letter Z - lightning shape), `~` (tilde - wave), `≈` (almost equal - ripple)
- **Properties:** 
  - Single projectile that chains to nearby enemies
  - Fire Rate: 1.2 shots/second
  - Damage: 12 base, -2 per jump (12→10→8→6)
  - Projectile Speed: 400 pixels/second (fast)
  - Range: Medium
  - Chain Range: 60-80 pixels between enemies
  - Max Jumps: 3 (starting), up to 5-7 with upgrades
- **Upgrade Paths:** More jumps (3→5→7), longer chain range, stun effect, damage boost per jump
- **Unlock:** Complete Floor 2 OR meta-unlock

**Review:**
- ✅ **Distinct Feel:** Multi-target, great for groups
- ✅ **Playstyle:** Excellent for crowd control, positioning matters
- ✅ **Character:** `⚡` (lightning bolt Unicode) is perfect for lightning! Clear and thematic
- ✅ **Balance:** Good for groups, weaker on single targets
- ✅ **Upgrade Paths:** Can scale jumps or damage
- 💡 **Consider:** Visual effect for chain (draw line between targets?)

#### 11. **Seeking Missiles**
- **ASCII:** `^` or `▲`
- **Properties:** Homing projectiles, slower than bullets
- **Upgrade Paths:** Faster missiles, more missiles, cluster missiles, explosive

#### 12. **Bouncing Bullets**
- **ASCII:** `*`
- **Properties:** Bullets bounce off walls, multiple bounces
- **Upgrade Paths:** More bounces, damage boost per bounce, piercing + bounce

#### 13. **Saw Blade**
- **ASCII:** `◊` or `◆`
- **Properties:** Spinning projectile, continuous damage while in contact
- **Upgrade Paths:** Multiple saws, larger size, homing, returns to player

#### 14. **Freeze Ray**
- **ASCII:** `❄` or `*`
- **Properties:** Slows/freezes enemies, moderate damage
- **Upgrade Paths:** Longer freeze duration, area freeze, shatter on death, damage boost

#### 15. **Poison Dart**
- **ASCII:** `•` (green)
- **Properties:** Damage over time effect, moderate initial damage
- **Upgrade Paths:** Longer poison duration, poison spreads, area poison, crit chance

### Weapon Evolution Ideas
- **Pistol → Dual Pistols → Quad Pistols → Bullet Hell**
- **Shotgun → Double Barrel → Spread Master → Screen Clearer**
- **SMG → Chain Gun → Minigun → Death Spinner**
- **Launcher → Rocket Launcher → Cluster Launcher → Nuke Launcher**
- **Beam → Wide Beam → Split Beam → Death Ray**

---

## 🎯 Priority Weapons Review Summary

### Review Questions Answered:

#### 1. Do these 7 weapons cover different playstyles?
✅ **Yes** - Good variety:
- **Balanced:** Basic Pistol (versatile)
- **Close-Range:** Spread Shotgun (aggressive)
- **Sustained DPS:** Rapid Fire SMG (kiting)
- **Area Damage:** Explosive Launcher (tactical)
- **Passive Defense:** Orbital Weapons (defensive)
- **Multi-Target:** Chain Lightning (crowd control)
- **Continuous:** Beam/Laser (unique, but complex)

#### 2. Are there any redundant weapons?
⚠️ **Minor Issues:**
- **Beam/Laser** might be too complex for MVP - consider simplifying or moving to Phase 2
- **Spread Shotgun** and **Basic Pistol** both use `*` - need different ASCII
- All other weapons are distinct

#### 3. Which weapons should be unlockable vs. available from start?

**Recommendation:**

**Available from Start (3 weapons):**
1. ✅ **Basic Pistol** - Starting weapon
2. ✅ **Spread Shotgun** - Early variety, simple mechanic
3. ✅ **Rapid Fire SMG** - Early variety, simple mechanic

**Unlockable (4 weapons):**
4. 🔓 **Orbital Weapons** - Unlock: Complete Floor 1 (unique mechanic)
5. 🔓 **Explosive Launcher** - Unlock: Complete Floor 2 (area damage)
6. 🔓 **Chain Lightning** - Unlock: Complete Floor 2 (multi-target)
7. 🔓 **Beam/Laser** - Unlock: Complete Floor 3 OR meta-unlock (complex, Phase 2?)

### Character Assignments (Creative Unicode Options):

| Weapon | Primary | Alternatives | Notes |
|--------|---------|--------------|-------|
| Basic Pistol | `•` | `·`, `▪`, `*` | Bullet point - clean and simple |
| Spread Shotgun | `◦` | `o`, `○`, `●` | White bullets for pellets - distinct from pistol |
| Rapid Fire SMG | `│` | `|`, `┃`, `·` | Box drawing vertical - thicker, more visible |
| Explosive Launcher | `●` | `◉`, `◎`, `O` | Black circle - heavy, explosive feel |
| Orbital Weapons | `○` | `◯`, `◉`, `●` | Hollow circle - orbital feel |
| Chain Lightning | `⚡` | `Z`, `~`, `≈` | Lightning bolt - perfect for lightning! |
| Beam/Laser | `═` | `│`, `█`, `▓` | Double line - thick beam feel |

**Character Set:** Using Unicode symbols for better visual variety and distinction
**Fallbacks:** Basic ASCII alternatives available if Unicode rendering fails

### Implementation Priority:

**Phase 1 (MVP):**
1. ✅ Basic Pistol (already implemented)
2. ⏳ Spread Shotgun (multi-projectile system)
3. ⏳ Rapid Fire SMG (fast fire rate)
4. ⏳ Orbital Weapons (unique rotation system)

**Phase 2 (After MVP):**
5. Explosive Launcher (explosion system)
6. Chain Lightning (chain targeting system)
7. Beam/Laser (continuous damage system - most complex)

### Balance Considerations:

- **DPS Comparison (approximate):**
  - Basic Pistol: 15 DPS (1.5 × 10)
  - Spread Shotgun: 20-32 DPS (0.8 × 24-40)
  - Rapid Fire SMG: 18 DPS (3.0 × 6)
  - Explosive Launcher: 24+ DPS (0.6 × 40+, area)
  - Orbital Weapons: Variable (depends on contact time)
  - Chain Lightning: 14-36 DPS (1.2 × 12-30, multi-target)
  - Beam/Laser: 15+ DPS (continuous, variable)

- **Range Comparison:**
  - Short: Spread Shotgun
  - Medium: Basic Pistol, Explosive Launcher, Chain Lightning
  - Medium-Long: Rapid Fire SMG
  - Long: Beam/Laser
  - Melee: Orbital Weapons

### Recommendations:

1. ✅ **ASCII Conflicts Resolved:** Use distinct characters for each weapon
2. ✅ **Unlock System:** 3 start, 4 unlockable (good progression)
3. ⚠️ **Beam/Laser Complexity:** Consider simplifying or moving to Phase 2
4. ✅ **Balance:** Weapons cover different ranges and playstyles
5. ✅ **Upgrade Paths:** All weapons have clear upgrade progression

---

## 👾 Enemies

### Melee Rushers

#### 1. **Basic Rusher** (Floor 1+)
- **Character:** `▶` (right-pointing triangle, Unicode U+25B6) or `►` (black right triangle)
- **Alternatives:** `>`, `m`, `M`
- **Stats:** Low health, medium speed, melee damage
- **Behavior:** Direct charge at player
- **Variants:**
  - **Fast Rusher:** Higher speed, lower health
  - **Armored Rusher:** Higher health, slower speed
  - **Pack Rusher:** Spawns in groups, swarm behavior

#### 2. **Zombie** (Floor 1+)
- **Character:** `☠` (skull and crossbones, Unicode U+2620) or `Z`
- **Alternatives:** `Z`, `z`, `■` (block)
- **Stats:** Medium health, slow speed, melee damage
- **Behavior:** Slow but persistent pursuit, spawns in groups
- **Variants:**
  - **Fast Zombie:** Higher speed variant
  - **Tank Zombie:** Very high health, very slow

#### 3. **Charger** (Floor 2+)
- **Character:** `→` (right arrow, Unicode U+2192) or `►` (black right triangle)
- **Alternatives:** `>`, `C`, `▲` (triangle)
- **Stats:** Low health, very high speed, high melee damage
- **Behavior:** Charges in straight line, brief pause after charge
- **Variants:**
  - **Multi-Charger:** Charges multiple times
  - **Explosive Charger:** Explodes on death

#### 4. **Slime** (Floor 1+)
- **Character:** `◉` (fisheye, Unicode U+25C9) or `●` (black circle)
- **Alternatives:** `○`, `o`, `O`, `◯` (large circle)
- **Stats:** Very low health, slow speed, splits on death
- **Behavior:** Slow movement, splits into smaller slimes when killed
- **Variants:**
  - **Large Slime:** Higher health, splits into more pieces
  - **Fast Slime:** Higher speed variant

#### 5. **Spider** (Floor 2+)
- **Character:** `◆` (black diamond, Unicode U+25C6) or `◇` (white diamond)
- **Alternatives:** `S`, `8`, `✧` (white four-pointed star)
- **Stats:** Low health, high speed, erratic movement
- **Behavior:** Zigzag movement pattern, hard to predict
- **Variants:**
  - **Web Spider:** Slows player on contact
  - **Jumping Spider:** Leaps toward player

### Ranged Shooters

#### 6. **Basic Shooter** (Floor 1+)
- **Character:** `◈` (white diamond containing black small diamond, Unicode U+25C8)
- **Alternatives:** `s`, `S`, `◆` (black diamond)
- **Stats:** Low health, medium speed, ranged attack
- **Behavior:** Maintains distance, fires projectiles
- **Variants:**
  - **Rapid Shooter:** Faster fire rate
  - **Sniper:** Slower fire rate, higher damage, longer range

#### 7. **Turret** (Floor 2+)
- **Character:** `┼` (box drawing cross, Unicode U+253C) or `╋` (heavy cross)
- **Alternatives:** `T`, `+`, `✚` (heavy plus)
- **Stats:** Medium health, no movement, high damage
- **Behavior:** Stationary, fires in player direction
- **Variants:**
  - **Multi-Turret:** Fires in multiple directions
  - **Rapid Turret:** Very fast fire rate

#### 8. **Archer** (Floor 2+)
- **Character:** `◄` (black left triangle, Unicode U+25C4) or `►` (right triangle)
- **Alternatives:** `A`, `>`, `→` (arrow)
- **Stats:** Low health, slow movement, high damage projectile
- **Behavior:** Fires slow but powerful arrows, tries to maintain distance
- **Variants:**
  - **Multi-Archer:** Fires multiple arrows
  - **Poison Archer:** Arrows apply poison

#### 9. **Mage** (Floor 3+)
- **Character:** `✦` (four-pointed star, Unicode U+2726) or `★` (black star)
- **Alternatives:** `M`, `@`, `✧` (white four-pointed star), `◆` (diamond)
- **Stats:** Medium health, slow movement, magic attacks
- **Behavior:** Fires homing projectiles or area spells
- **Variants:**
  - **Fire Mage:** Explosive projectiles
  - **Ice Mage:** Slowing projectiles
  - **Lightning Mage:** Chain lightning attacks

#### 10. **Drone** (Floor 3+)
- **Character:** `◊` (lozenge, Unicode U+25CA) or `◇` (white diamond)
- **Alternatives:** `D`, `+`, `▲` (triangle), `▼` (down triangle)
- **Stats:** Low health, high speed, rapid fire
- **Behavior:** Flies in patterns, fires continuously
- **Variants:**
  - **Bomber Drone:** Explodes on death
  - **Shield Drone:** Has temporary shield

### Tanks

#### 11. **Heavy Tank** (Floor 2+)
- **Character:** `█` (full block, Unicode U+2588) or `▓` (dark shade)
- **Alternatives:** `H`, `■` (black square), `◼` (black medium square)
- **Stats:** Very high health, slow speed, high damage
- **Behavior:** Slow pursuit, powerful melee or ranged attacks
- **Variants:**
  - **Armored Tank:** Even higher health, slower
  - **Cannon Tank:** Ranged attacks instead of melee

#### 12. **Shield Bearer** (Floor 3+)
- **Character:** `▓` (dark shade, Unicode U+2593) or `▒` (medium shade)
- **Alternatives:** `S`, `█` (full block), `◼` (black medium square)
- **Stats:** High health, slow speed, blocks projectiles from front
- **Behavior:** Faces player, blocks shots, advances slowly
- **Variants:**
  - **Multi-Shield:** Blocks from multiple directions
  - **Shield Wall:** Multiple shield bearers form wall

#### 13. **Golem** (Floor 3+)
- **Character:** `◼` (black medium square, Unicode U+25FC) or `█` (full block)
- **Alternatives:** `G`, `■` (black square), `▓` (dark shade)
- **Stats:** Extremely high health, very slow, high damage
- **Behavior:** Slow but relentless pursuit
- **Variants:**
  - **Stone Golem:** Highest health variant
  - **Fire Golem:** Explodes on death

### Fast Movers

#### 14. **Zippy** (Floor 2+)
- **Character:** `◐` (circle with left half black, Unicode U+25D0) or `◑` (right half)
- **Alternatives:** `z`, `Z`, `◒` (lower half), `◓` (upper half)
- **Stats:** Very low health, very high speed, low damage
- **Behavior:** Erratic high-speed movement, hard to hit
- **Variants:**
  - **Teleporter:** Teleports short distances
  - **Phantom:** Brief invulnerability periods

#### 15. **Bat** (Floor 1+)
- **Character:** `◈` (white diamond containing black small diamond) or `◊` (lozenge)
- **Alternatives:** `b`, `B`, `▼` (down triangle), `▲` (up triangle)
- **Stats:** Very low health, high speed, low damage
- **Behavior:** Flies in swooping patterns
- **Variants:**
  - **Vampire Bat:** Lifesteal on hit
  - **Swarm Bat:** Spawns in large groups

#### 16. **Wraith** (Floor 3+)
- **Character:** `≈` (almost equal, Unicode U+2248) or `~` (tilde)
- **Alternatives:** `W`, `∿` (sine wave), `◐` (half circle)
- **Stats:** Low health, very high speed, medium damage
- **Behavior:** Phases through walls, teleports
- **Variants:**
  - **Shadow Wraith:** Brief invisibility
  - **Phase Wraith:** Can't be hit while phasing

### Special Abilities

#### 17. **Exploder** (Floor 2+)
- **Character:** `◉` (fisheye, Unicode U+25C9) or `●` (black circle)
- **Alternatives:** `E`, `*`, `◎` (bullseye), `◯` (large circle)
- **Stats:** Low health, medium speed, explodes on death
- **Behavior:** Charges player, explodes on contact or death
- **Variants:**
  - **Chain Exploder:** Explosion triggers nearby exploders
  - **Mega Exploder:** Larger explosion radius

#### 18. **Spawner** (Floor 3+)
- **Character:** `◔` (circle with upper right quadrant black, Unicode U+25D4) or `◕` (three-quarter)
- **Alternatives:** `P`, `@`, `◉` (fisheye), `○` (white circle)
- **Stats:** Medium health, slow speed, spawns minions
- **Behavior:** Periodically spawns smaller enemies
- **Variants:**
  - **Rapid Spawner:** Spawns more frequently
  - **Elite Spawner:** Spawns stronger minions

#### 19. **Buffer** (Floor 3+)
- **Character:** `✚` (heavy plus, Unicode U+271A) or `+` (plus)
- **Alternatives:** `B`, `✛` (open center cross), `✜` (heavy open center cross)
- **Stats:** Low health, slow speed, buffs nearby enemies
- **Behavior:** Stays near other enemies, grants buffs
- **Variants:**
  - **Speed Buffer:** Increases enemy speed
  - **Damage Buffer:** Increases enemy damage
  - **Shield Buffer:** Grants shields to nearby enemies

#### 20. **Healer** (Floor 4+)
- **Character:** `✛` (open center cross, Unicode U+271B) or `✚` (heavy plus)
- **Alternatives:** `H`, `+`, `✝` (latin cross), `✞` (shadowed white latin cross)
- **Stats:** Medium health, slow speed, heals nearby enemies
- **Behavior:** Stays near other enemies, periodically heals them
- **Variants:**
  - **Rapid Healer:** Heals more frequently
  - **Area Healer:** Heals all enemies in large radius

#### 21. **Teleporter** (Floor 3+)
- **Character:** `◐` (circle with left half black) or `◑` (right half) - represents phase shift
- **Alternatives:** `T`, `~`, `≈` (almost equal), `◖` (left half black circle)
- **Stats:** Low health, medium speed, teleports player
- **Behavior:** Teleports player to random location when close
- **Variants:**
  - **Swap Teleporter:** Swaps positions with player
  - **Trap Teleporter:** Teleports player into danger

#### 22. **Shielder** (Floor 3+)
- **Character:** `◯` (large circle, Unicode U+25EF) or `○` (white circle)
- **Alternatives:** `S`, `●` (black circle), `◉` (fisheye)
- **Stats:** Low health, medium speed, creates shields
- **Behavior:** Creates temporary shields for nearby enemies
- **Variants:**
  - **Personal Shielder:** Only shields itself
  - **Group Shielder:** Shields multiple enemies

#### 23. **Freezer** (Floor 4+)
- **Character:** `❄` (snowflake, Unicode U+2744) or `❅` (tight trifoliate snowflake)
- **Alternatives:** `F`, `❆` (heavy chevron snowflake), `◇` (diamond - ice crystal)
- **Stats:** Medium health, slow speed, slows player
- **Behavior:** Slows player movement when nearby
- **Variants:**
  - **Area Freezer:** Slows in large area
  - **Freeze Ray:** Fires slowing projectiles

#### 24. **Leech** (Floor 4+)
- **Character:** `◖` (left half black circle, Unicode U+25D6) or `◗` (right half)
- **Alternatives:** `L`, `~`, `≈` (almost equal), `◐` (half circle)
- **Stats:** Low health, medium speed, lifesteal
- **Behavior:** Steals health from player on contact
- **Variants:**
  - **Vampire Leech:** High lifesteal
  - **Area Leech:** Drains health from area

### Floor-Specific Enemy Introductions
- **Floor 1:** Basic Rusher, Basic Shooter, Zombie, Slime, Bat
- **Floor 2:** Charger, Turret, Heavy Tank, Zippy, Exploder
- **Floor 3:** Mage, Shield Bearer, Golem, Wraith, Spawner, Buffer
- **Floor 4:** Healer, Teleporter, Freezer, Leech
- **Floor 5+:** Elite variants, combinations, new unique types

---

## 👤 Characters

### Starting Character

#### 1. **The Survivor** (Default)
- **ASCII:** `@` (white/blue)
- **Starting Stats:**
  - Health: 100
  - Speed: 150 (pixels/second) - baseline movement speed
  - Damage: 10 (per projectile)
- **Starting Weapon:** Basic Pistol
  - Fire Rate: 1.5 shots/second (medium rate, responsive feel)
  - Projectile Speed: 300 pixels/second
  - Projectile: Single `•` or `*`, straight shot
- **Unique Ability:** +10% XP gain (xpMultiplier: 1.1) - *Implemented: gives starter slight edge*
- **Theme:** Generic survivor, trapped in the program
- **Unlock:** Available from start

**Review Notes:**
- ✅ Health 100 is good baseline - not too weak, not too strong
- ✅ Damage 10 matches current implementation - feels balanced
- ✅ ASCII `@` is clear and standard - good visual identity
- ⚠️ Speed system: Code uses pixel-based (150), brainstorm had normalized (5) - standardized to pixels
- ✅ Fire rate: Updated to 1.5 shots/sec for better responsive feel
- ✅ Unique ability: Implemented +10% XP gain (xpMultiplier: 1.1)
- ✅ Stat normalization: Backend uses raw values, display uses normalized scale (1-100)

### Unlockable Characters

#### 2. **The Scout**
- **ASCII:** `>` (yellow)
- **Starting Stats:**
  - Health: 75
  - Speed: 7
  - Damage: 8
- **Starting Weapon:** Rapid Fire SMG
- **Unique Ability:** +20% movement speed, +10% dodge chance
- **Theme:** Fast and agile, relies on speed
- **Unlock:** Complete Floor 2

#### 3. **The Tank**
- **ASCII:** `█` (gray)
- **Starting Stats:**
  - Health: 150
  - Speed: 3
  - Damage: 12
- **Starting Weapon:** Spread Shotgun
- **Unique Ability:** +25% max health, +15% damage reduction
- **Theme:** Slow but durable, can take hits
- **Unlock:** Complete Floor 3

#### 4. **The Sniper**
- **ASCII:** `^` (cyan)
- **Starting Stats:**
  - Health: 80
  - Speed: 4
  - Damage: 20
- **Starting Weapon:** Sniper Rifle
- **Unique Ability:** +50% crit chance, +25% crit damage
- **Theme:** High damage, precision-focused
- **Unlock:** Defeat 100 enemies with headshots/crits

#### 5. **The Pyro**
- **ASCII:** `&` (orange/red)
- **Starting Stats:**
  - Health: 90
  - Speed: 5
  - Damage: 12
- **Starting Weapon:** Flame Thrower
- **Unique Ability:** Fire damage deals +25% damage over time
- **Theme:** Fire and explosions specialist
- **Unlock:** Deal 1000 fire/explosive damage in one run

#### 6. **The Engineer**
- **ASCII:** `#` (green)
- **Starting Stats:**
  - Health: 100
  - Speed: 4
  - Damage: 10
- **Starting Weapon:** Turret (deployable)
- **Unique Ability:** Can deploy temporary turrets, +20% upgrade effectiveness
- **Theme:** Tech-focused, uses gadgets
- **Unlock:** Complete Floor 5

#### 7. **The Mage**
- **ASCII:** `@` (purple)
- **Starting Stats:**
  - Health: 85
  - Speed: 5
  - Damage: 11
- **Starting Weapon:** Chain Lightning
- **Unique Ability:** +30% magic damage, abilities cost less energy
- **Theme:** Magic and elemental attacks
- **Unlock:** Collect 50 upgrade picks

#### 8. **The Ninja**
- **ASCII:** `*` (black/dark gray)
- **Starting Stats:**
  - Health: 70
  - Speed: 6
  - Damage: 13
- **Starting Weapon:** Boomerang
- **Unique Ability:** +15% dodge chance, brief invisibility on kill
- **Theme:** Stealth and agility, hit-and-run
- **Unlock:** Complete a run without taking damage for 5 consecutive rooms

#### 9. **The Berserker**
- **ASCII:** `!` (red)
- **Starting Stats:**
  - Health: 120
  - Speed: 6
  - Damage: 15
- **Starting Weapon:** Melee weapon (close range, high damage)
- **Unique Ability:** Damage increases as health decreases, +10% speed per 10% health lost
- **Theme:** High risk, high reward, gets stronger when hurt
- **Unlock:** Complete a run with less than 25% health remaining

#### 10. **The Collector**
- **ASCII:** `$` (gold)
- **Starting Stats:**
  - Health: 95
  - Speed: 5
  - Damage: 10
- **Starting Weapon:** Basic Pistol
- **Unique Ability:** +50% XP gain, +25% currency drops, +20% pickup radius
- **Theme:** Focused on progression and collection
- **Unlock:** Collect 10,000 total XP across all runs

#### 11. **The Summoner**
- **ASCII:** `+` (blue)
- **Starting Stats:**
  - Health: 90
  - Speed: 4
  - Damage: 9
- **Starting Weapon:** Orbital Weapons
- **Unique Ability:** Can summon temporary minions, minions deal +20% damage
- **Theme:** Commands allies and orbital weapons
- **Unlock:** Defeat 500 enemies with summoned minions/orbitals

#### 12. **The Ghost**
- **ASCII:** `~` (white/transparent)
- **Starting Stats:**
  - Health: 80
  - Speed: 7
  - Damage: 10
- **Starting Weapon:** Freeze Ray
- **Unique Ability:** Can phase through enemies, brief invulnerability on dash
- **Theme:** Ethereal, can pass through obstacles
- **Unlock:** Complete Floor 6

### Character Themes (Sci-Fi Text Program)
- Characters are "trapped in the program" - each represents a different data type or program function
- Survivor = Generic data
- Scout = Fast processing thread
- Tank = Heavy data structure
- Sniper = Precision function
- Pyro = Destructive process
- Engineer = System utility
- Mage = Corrupted data
- Ninja = Hidden process
- Berserker = Error handler
- Collector = Data aggregator
- Summoner = Process spawner
- Ghost = Memory leak

### Character Themes (Clock Face)
- Characters represent different times or concepts
- Survivor = 12 o'clock (starting point)
- Scout = 3 o'clock (fast forward)
- Tank = 6 o'clock (heavy, bottom)
- Sniper = 9 o'clock (precision)
- Pyro = Fire/energy concepts
- Engineer = Mechanical time
- Mage = Mystical time
- Ninja = Shadow time
- Berserker = Rage/time pressure
- Collector = Accumulated time
- Summoner = Time multiplication
- Ghost = Lost time

---

## 👑 Bosses

### Floor 1 Boss: **The Gatekeeper**
- **ASCII:** `G` (large, red)
- **Health:** 500
- **Mechanics:**
  - Spawns basic enemies periodically
  - Charges at player every 10 seconds
  - Fires projectiles in 8 directions
- **Rewards:** High XP, currency, potential weapon unlock

### Floor 2 Boss: **The Swarm Queen**
- **ASCII:** `Q` (large, purple)
- **Health:** 800
- **Mechanics:**
  - Continuously spawns small enemies
  - Moves slowly but spawns faster as health decreases
  - Explodes on death, spawning many minions
- **Rewards:** High XP, currency, character unlock

### Floor 3 Boss: **The Twin Guardians**
- **ASCII:** `T` (two, red/blue)
- **Health:** 600 each (1200 total)
- **Mechanics:**
  - Two bosses that work together
  - One melee, one ranged
  - When one dies, the other enrages (faster, stronger)
- **Rewards:** High XP, currency, upgrade unlock

### Floor 4 Boss: **The Phase Master**
- **ASCII:** `P` (large, purple)
- **Health:** 1000
- **Mechanics:**
  - Teleports around room
  - Phases in and out (invulnerable during phase)
  - Fires homing projectiles
  - Creates phase rifts that damage player
- **Rewards:** High XP, currency, unique weapon

### Floor 5 Boss: **The Colossus**
- **ASCII:** `█` (very large, dark red)
- **Health:** 2000
- **Mechanics:**
  - Very slow movement
  - High damage attacks
  - Spawns turrets
  - Has weak points that take extra damage
- **Rewards:** High XP, currency, character unlock

### Floor 6 Boss: **The Elemental Chaos**
- **ASCII:** `@` (large, multicolor)
- **Health:** 1500
- **Mechanics:**
  - Cycles through fire, ice, lightning phases
  - Each phase has different attack patterns
  - Fire: Explosive attacks
  - Ice: Slowing attacks
  - Lightning: Chain attacks
- **Rewards:** High XP, currency, elemental weapon

### Floor 7+ Boss Ideas
- **The Data Corruptor:** Corrupts player's upgrades temporarily
- **The Time Keeper:** Manipulates game speed
- **The Replicator:** Creates copies of itself
- **The Void:** Pulls player toward it, creates black holes
- **The Final Boss:** Multi-phase epic encounter

---

## ⚡ Upgrades & Synergies

### Weapon Upgrade Categories

#### Damage Upgrades
- **+10% Damage** → **+25% Damage** → **+50% Damage** → **+100% Damage**
- **Critical Hit Chance:** +5% → +10% → +20% → +50%
- **Critical Hit Damage:** +50% → +100% → +200%

#### Fire Rate Upgrades
- **+10% Fire Rate** → **+25% Fire Rate** → **+50% Fire Rate** → **+100% Fire Rate**
- **Auto-Fire Speed:** Reduces delay between shots

#### Projectile Upgrades
- **+1 Projectile** → **+2 Projectiles** → **+3 Projectiles**
- **Spread Pattern:** Single → Double → Triple → Spread → Full Circle
- **Projectile Size:** +25% → +50% → +100%
- **Projectile Speed:** +25% → +50% → +100%

#### Special Properties
- **Piercing:** Projectiles pass through 1 enemy → 2 → 3 → All
- **Ricochet:** Bounces off walls 1 time → 2 → 3
- **Homing:** Slight homing → Strong homing → Perfect homing
- **Explosive:** Explodes on impact, +25% radius → +50% → +100%
- **Chain:** Jumps to 1 nearby enemy → 2 → 3 → 5
- **Freeze:** Slows enemies → Freezes → Shatters frozen enemies
- **Poison:** Damage over time → Longer duration → Spreads to nearby enemies

### Passive Stat Upgrades

#### Movement
- **+10% Movement Speed** → **+25%** → **+50%** → **+100%**
- **Dash Ability:** Short dash with cooldown → Faster dash → Multiple charges

#### Defense
- **+10 Max Health** → **+25** → **+50** → **+100**
- **+10% Damage Reduction** → **+25%** → **+50%**
- **Regeneration:** +1 HP/sec → +2 → +5
- **Shield:** Temporary shield on hit → Permanent shield → Multiple shields

#### Utility
- **+25% Pickup Radius** → **+50%** → **+100%** → **+200%**
- **+10% XP Gain** → **+25%** → **+50%** → **+100%**
- **+10% Luck** → **+25%** → **+50%** (affects drops, crits)

### Special Abilities

#### Area Effects
- **Explosion on Kill:** Small explosion → Medium → Large
- **Chain Lightning on Hit:** Jumps to 1 enemy → 2 → 3
- **Poison Cloud on Kill:** Small cloud → Medium → Large

#### Summons
- **Orbital Weapons:** 1 orb → 2 → 3 → 4 → 5
- **Turret:** Deployable turret → 2 turrets → Auto-turrets
- **Minions:** Temporary minion → 2 minions → Permanent minions

#### Utility Powers
- **Slow Time:** Brief slow-mo → Longer duration → Lower cooldown
- **Teleport:** Short range teleport → Longer range → Multiple charges
- **Invisibility:** Brief invisibility → Longer duration → Lower cooldown

### Synergy Combinations

#### Weapon Synergies
- **Multi-Shot + Spread = Shotgun Master:** Fires many projectiles in wide spread
- **Piercing + Chain = Chain Master:** Pierces through enemies, chains to others
- **Homing + Explosive = Seeker Missiles:** Homing explosive projectiles
- **Rapid Fire + Multi-Shot = Bullet Hell:** Constant stream of projectiles
- **Orbital + Explosive = Orbital Bombs:** Orbs explode on contact

#### Passive Synergies
- **Movement Speed + Dash = Speed Demon:** Extremely fast movement
- **Health + Regeneration = Tank:** High survivability
- **XP Gain + Pickup Radius = Collector:** Rapid progression

#### Cross-Category Synergies
- **Damage + Crit Chance + Crit Damage = Crit Master:** High crit build
- **Fire Rate + Multi-Shot + Spread = Screen Clearer:** Covers entire screen
- **Piercing + Explosive + Chain = Destruction:** Maximum area damage
- **Orbital + Summon + Damage = Army:** Multiple sources of damage

### Evolution Upgrades
- **Pistol Evolution:** Requires Multi-Shot + Fire Rate → **Dual Pistols** → Requires more upgrades → **Quad Pistols** → **Bullet Hell**
- **Shotgun Evolution:** Requires Spread + Damage → **Double Barrel** → **Spread Master** → **Screen Clearer**
- **SMG Evolution:** Requires Fire Rate + Multi-Shot → **Chain Gun** → **Minigun** → **Death Spinner**

---

## 🎁 Pickups & Loot

### XP Orbs
- **Small XP:** `•` (yellow, small)
- **Medium XP:** `○` (yellow, medium)
- **Large XP:** `●` (yellow, large)
- **Mega XP:** `★` (gold, very large)

### Health Pickups
- **Small Health:** `+` (green, small, +10 HP)
- **Medium Health:** `+` (green, medium, +25 HP)
- **Large Health:** `+` (green, large, +50 HP)
- **Full Health:** `♥` (green, full restore)

### Currency Pickups
- **Small Currency:** `$` (gold, small)
- **Medium Currency:** `$` (gold, medium)
- **Large Currency:** `$` (gold, large)

### Special Pickups
- **Shield:** `○` (blue, temporary shield)
- **Speed Boost:** `↑` (yellow, temporary speed boost)
- **Damage Boost:** `!` (red, temporary damage boost)
- **Multi-Pickup:** `*` (rainbow, multiple effects)

### Chests
- **Wooden Chest:** `[` `]` (brown, common loot)
- **Iron Chest:** `[` `]` (gray, uncommon loot)
- **Gold Chest:** `[` `]` (gold, rare loot)
- **Legendary Chest:** `[` `]` (purple, very rare loot)

---

## 🏠 Room Types & Themes

### Room Templates

#### Open Arena
- Large open space, minimal obstacles
- Good for kiting and movement

#### Corridor Room
- Long narrow room
- Forces close combat

#### Maze Room
- Multiple walls and corridors
- Strategic positioning important

#### Central Platform
- Platform in center, enemies spawn around edges
- Defensive positioning

#### Multi-Level
- Multiple platforms/levels
- Vertical combat

#### Spiral Room
- Spiral path through room
- Forces movement pattern

#### Four Corners
- Four distinct areas
- Enemies spawn from each corner

### Special Rooms

#### Treasure Room
- Few enemies, many chests
- High reward, low risk

#### Challenge Room
- High enemy density
- Bonus rewards for completion

#### Boss Room
- Unique layout for boss encounter
- Larger than normal rooms

#### Safe Room
- No enemies, healing station
- Rest between floors

---

## 🎨 Visual & ASCII Ideas

### Character Sets (Unicode Enhanced)

#### Player Characters:
- **Primary:** `@` (at sign)
- **Alternatives:** `>`, `^`, `*`, `#`, `&`, `$`, `+`

#### Enemy Characters (Updated):
- **Melee Rushers:** `▶`, `→`, `☠`, `◉`, `◆`
- **Ranged Shooters:** `◈`, `┼`, `◄`, `✦`, `◊`
- **Tanks:** `█`, `▓`, `◼`
- **Fast Movers:** `◐`, `◈`, `≈`
- **Special:** `◉`, `◔`, `✚`, `✛`, `◐`, `◯`, `❄`, `◖`

#### Projectiles (Weapons):
- **Bullets:** `•`, `◦`, `·`, `▪`
- **Beams:** `│`, `═`, `█`, `▓`
- **Explosives:** `●`, `◉`, `◎`, `O`
- **Energy:** `⚡`, `★`, `☆`, `◆`, `◇`
- **Orbitals:** `○`, `◯`, `◉`

#### Effects (Particles):
- **Hit:** `✱`, `✲`, `✳`
- **Explosion:** `✴`, `✵`, `✶`, `✷`, `✸`
- **Heal:** `✚`, `✛`, `✜`, `✝`
- **Level Up:** `★`, `☆`, `✦`, `✧`
- **Death:** `≈`, `~`, `∿`
- **Status:** `❄`, `⚡`, `•`, `●`

#### Environment:
- **Walls:** `█`, `▓`, `▒`, `░`
- **Lines:** `│`, `─`, `═`, `║`
- **Corners:** `┼`, `├`, `┤`, `┬`, `┴`
- **Containers:** `[`, `]`, `{`, `}`

### Color Coding
- **Player:** White, Blue, Cyan (friendly)
- **Enemies:** Red, Dark Red, Orange (hostile)
- **Projectiles:** Blue, Cyan, Yellow (player), Red (enemy)
- **Pickups:** Yellow/Gold (XP, currency), Green (health), Blue (shields)
- **Bosses:** Purple, Dark Red, Multicolor (special)
- **Environment:** Gray, White, Dark Gray (neutral)

### Particle Effects (Unicode Enhanced)

#### Hit Effects:
- **Hit:** `✱` (heavy asterisk, Unicode U+2731) or `*` (asterisk)
- **Alternatives:** `✲` (open center asterisk), `✳` (eight spoked asterisk)

#### Explosions:
- **Explosion:** `✴` (eight pointed black star, Unicode U+2734) or `✵` (eight pointed pinwheel)
- **Alternatives:** `*`, `+`, `#`, `✶` (six pointed black star), `✷` (eight pointed rectilinear star)
- **Heavy Explosion:** `✸` (heavy eight pointed rectilinear star)

#### Healing & Positive:
- **Heal:** `✚` (heavy plus, Unicode U+271A) or `+` (plus)
- **Alternatives:** `✛` (open center cross), `✜` (heavy open center cross), `✝` (latin cross)
- **Strong Heal:** `✞` (shadowed white latin cross)

#### Level Up & Power:
- **Level Up:** `★` (black star, Unicode U+2605) or `☆` (white star)
- **Alternatives:** `✦` (four-pointed star), `✧` (white four-pointed star), `*`
- **Power Up:** `◆` (black diamond), `◇` (white diamond)

#### Death & Negative:
- **Death:** `≈` (almost equal, Unicode U+2248) or `~` (tilde)
- **Alternatives:** `*`, `∿` (sine wave), `◐` (half circle fade)

#### Status Effects:
- **Freeze:** `❄` (snowflake, Unicode U+2744) or `❅` (tight trifoliate snowflake)
- **Lightning:** `⚡` (lightning bolt, Unicode U+26A1)
- **Poison:** `•` (bullet, green-tinted) or `·` (middle dot)
- **Burn:** `●` (black circle, orange/red-tinted) or `◉` (fisheye)

---

## 📝 Notes & Ideas

### Gameplay Mechanics
- **Combo System:** Chain kills for bonus XP
- **Time Bonuses:** Faster room completion = bonus rewards
- **Perfect Rooms:** Complete room without taking damage = bonus
- **Elite Enemies:** Rare stronger variants with better drops
- **Environmental Hazards:** Traps, moving obstacles, lava, etc.

### Meta-Progression Ideas
- **Prestige System:** Reset progress for permanent bonuses
- **Achievement System:** Unlock rewards for milestones
- **Daily Challenges:** Special runs with modifiers
- **Endless Mode:** Infinite floors after completing main game
- **Character Mastery:** Unlock character-specific upgrades

### Content Expansion
- **Seasonal Events:** Special enemies/weapons during events
- **Community Challenges:** Global goals
- **Mod Support:** Allow custom content (future)
- **More Themes:** Additional theme options beyond Sci-Fi/Clock

### Balance Considerations
- **Power Scaling:** Ensure upgrades feel impactful
- **Difficulty Curve:** Smooth progression through floors
- **Build Variety:** Multiple viable upgrade paths
- **Early Game:** Not too difficult for new players
- **Late Game:** Remains challenging with upgrades

---

## 🎯 Priority Content (For Initial Release)

### Must-Have Weapons (5-7)
1. Basic Pistol (starting)
2. Spread Shotgun
3. Rapid Fire SMG
4. Explosive Launcher
5. Orbital Weapons
6. Chain Lightning
7. Beam/Laser

### Must-Have Enemies (15-20)
- Floor 1: Basic Rusher, Basic Shooter, Zombie, Slime, Bat
- Floor 2: Charger, Turret, Heavy Tank, Zippy, Exploder
- Floor 3: Mage, Shield Bearer, Golem, Wraith, Spawner
- Floor 4: Healer, Teleporter, Freezer

### Must-Have Characters (5-7)
1. The Survivor (starting)
2. The Scout
3. The Tank
4. The Sniper
5. The Pyro
6. The Engineer
7. The Mage

### Must-Have Bosses (6)
- One boss per floor for floors 1-6

### Core Upgrades
- Damage, Fire Rate, Multi-Shot, Spread, Piercing, Movement Speed, Health, Pickup Radius

---

**This document is a living brainstorming space. Add, modify, or remove ideas as the game develops!**