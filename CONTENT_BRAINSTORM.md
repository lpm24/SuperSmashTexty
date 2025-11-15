# SuperSmashTexty - Content Brainstorming

**Last Updated:** 2025-01-14
**Purpose:** Brainstorming and notes for game content (weapons, enemies, characters, bosses, upgrades, etc.)

**Implementation Status Note:** Many items in this brainstorm have been implemented as of January 2025 architecture refactor:
- ✅ **21 Enemy types** implemented in `src/data/enemies.js`
- ✅ **4 Bosses, 5 Minibosses** implemented in `src/data/bosses.js` and `src/data/minibosses.js`
- ✅ **7 Weapon types** implemented in `src/data/weapons.js`
- ✅ **8 Synergy combinations** implemented in `src/systems/synergies.js`
- ✅ **Character system** with multiple unlockable characters
- 🔄 **Content expansion ongoing** - see `DEVELOPMENT_PRIORITIES.md` for current focus

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

#### 1. **Basic Rusher** (Floor 1+) ✅ PRIORITY
- **Character:** `▶` (right-pointing triangle, Unicode U+25B6) or `►` (black right triangle)
- **Alternatives:** `>`, `m`, `M`
- **Stats:** Low health (20-30), medium speed (80-100 px/s), melee damage (8-10)
- **Behavior:** Direct charge at player
- **Variants:**
  - **Fast Rusher:** Higher speed, lower health
  - **Armored Rusher:** Higher health, slower speed
  - **Pack Rusher:** Spawns in groups, swarm behavior

**Review:**
- ✅ **Teaches:** Melee threat, direct pursuit, basic dodging
- ✅ **Character:** `▶` is clear and shows direction (forward charge)
- ✅ **Difficulty:** Perfect starter enemy - simple, predictable
- ✅ **Balance:** Low health = easy to kill, teaches combat basics
- 💡 **Consider:** Should be first enemy player encounters

#### 2. **Zombie** (Floor 1+) ✅ PRIORITY
- **Character:** `☠` (skull and crossbones, Unicode U+2620) or `Z`
- **Alternatives:** `Z`, `z`, `■` (block)
- **Stats:** Medium health (40-50), slow speed (40-60 px/s), melee damage (10-12)
- **Behavior:** Slow but persistent pursuit, spawns in groups
- **Variants:**
  - **Fast Zombie:** Higher speed variant
  - **Tank Zombie:** Very high health, very slow

**Review:**
- ✅ **Teaches:** Swarm mechanics, group management, slow but persistent threat
- ✅ **Character:** `☠` is very thematic and distinct - perfect for zombie
- ✅ **Difficulty:** Slower than rusher but more health - teaches prioritization
- ✅ **Balance:** Group spawns create challenge without being overwhelming
- 💡 **Consider:** Great for teaching "kill weak enemies first" strategy

#### 3. **Charger** (Floor 2+) ✅ PRIORITY
- **Character:** `→` (right arrow, Unicode U+2192) or `►` (black right triangle)
- **Alternatives:** `>`, `C`, `▲` (triangle)
- **Stats:** Low health (15-25), very high speed (150-200 px/s), high melee damage (15-20)
- **Behavior:** Charges in straight line, brief pause after charge
- **Variants:**
  - **Multi-Charger:** Charges multiple times
  - **Explosive Charger:** Explodes on death

**Review:**
- ✅ **Teaches:** Telegraphed attacks, dodge timing, high-speed threats
- ⚠️ **Character Conflict:** Similar to Basic Rusher `▶` - consider different style
- ✅ **Difficulty:** Step up from Floor 1 - faster, more damage, but predictable
- ✅ **Balance:** Brief pause after charge = learning opportunity
- 💡 **Consider:** Use `→` (arrow) for charger, `▶` (triangle) for rusher - arrow = faster

#### 4. **Slime** (Floor 1+) ✅ PRIORITY
- **Character:** `●` (black circle, Unicode U+25CF) - blob shape
- **Alternatives:** `○`, `o`, `O`, `◯` (large circle)
- **Note:** Using `●` instead of `◉` to avoid conflict with Exploder `◎`
- **Stats:** Very low health (10-15), slow speed (30-50 px/s), splits on death
- **Behavior:** Slow movement, splits into smaller slimes when killed
- **Variants:**
  - **Large Slime:** Higher health, splits into more pieces
  - **Fast Slime:** Higher speed variant

**Review:**
- ✅ **Teaches:** Splitting mechanic, area damage, multi-target management
- ✅ **Character:** `◉` is distinct blob shape - perfect for slime
- ✅ **Character:** Using `●` (black circle) - distinct from Exploder `◎` (bullseye)
- ✅ **Difficulty:** Easy to kill but creates more enemies - teaches consequences
- ✅ **Balance:** Low health makes splitting manageable
- 💡 **Consider:** Great teaching moment: "killing can create more problems"

#### 5. **Spider** (Floor 2+)
- **Character:** `◆` (black diamond, Unicode U+25C6) or `◇` (white diamond)
- **Alternatives:** `S`, `8`, `✧` (white four-pointed star)
- **Stats:** Low health, high speed, erratic movement
- **Behavior:** Zigzag movement pattern, hard to predict
- **Variants:**
  - **Web Spider:** Slows player on contact
  - **Jumping Spider:** Leaps toward player

### Ranged Shooters

#### 6. **Basic Shooter** (Floor 1+) ✅ PRIORITY
- **Character:** `◈` (white diamond containing black small diamond, Unicode U+25C8)
- **Alternatives:** `s`, `S`, `◆` (black diamond)
- **Stats:** Low health (25-35), medium speed (60-80 px/s), ranged attack (damage: 6-8)
- **Behavior:** Maintains distance, fires projectiles
- **Variants:**
  - **Rapid Shooter:** Faster fire rate
  - **Sniper:** Slower fire rate, higher damage, longer range

**Review:**
- ✅ **Teaches:** Ranged threat, projectile dodging, positioning
- ✅ **Character:** `◈` is distinct from rusher `▶` - good visual variety
- ✅ **Difficulty:** Introduces ranged combat after melee
- ✅ **Balance:** Low health but maintains distance - teaches kiting
- 💡 **Consider:** Should appear after Basic Rusher to teach new mechanic

#### 7. **Turret** (Floor 2+) ✅ PRIORITY
- **Character:** `┼` (box drawing cross, Unicode U+253C) or `╋` (heavy cross)
- **Alternatives:** `T`, `+`, `✚` (heavy plus)
- **Stats:** Medium health (50-70), no movement, high damage (12-15 per shot)
- **Behavior:** Stationary, fires in player direction
- **Variants:**
  - **Multi-Turret:** Fires in multiple directions
  - **Rapid Turret:** Very fast fire rate

**Review:**
- ✅ **Teaches:** Stationary threats, cover usage, priority targeting
- ✅ **Character:** `┼` (cross) is perfect for stationary turret - very distinct
- ✅ **Difficulty:** New mechanic - stationary but dangerous
- ✅ **Balance:** No movement = easy to avoid, but high damage = must prioritize
- 💡 **Consider:** Great for teaching "kill dangerous stationary targets first"

#### 8. **Archer** (Floor 2+)
- **Character:** `◄` (black left triangle, Unicode U+25C4) or `►` (right triangle)
- **Alternatives:** `A`, `>`, `→` (arrow)
- **Stats:** Low health, slow movement, high damage projectile
- **Behavior:** Fires slow but powerful arrows, tries to maintain distance
- **Variants:**
  - **Multi-Archer:** Fires multiple arrows
  - **Poison Archer:** Arrows apply poison

#### 9. **Mage** (Floor 3+) ✅ PRIORITY
- **Character:** `✦` (four-pointed star, Unicode U+2726) or `★` (black star)
- **Alternatives:** `M`, `@`, `✧` (white four-pointed star), `◆` (diamond)
- **Stats:** Medium health (60-80), slow movement (40-60 px/s), magic attacks (damage: 10-15)
- **Behavior:** Fires homing projectiles or area spells
- **Variants:**
  - **Fire Mage:** Explosive projectiles
  - **Ice Mage:** Slowing projectiles
  - **Lightning Mage:** Chain lightning attacks

**Review:**
- ✅ **Teaches:** Special abilities, homing projectiles, area spells
- ✅ **Character:** `✦` (star) is perfect for magic - distinct and thematic
- ✅ **Difficulty:** New mechanic - homing projectiles require different dodging
- ✅ **Balance:** Medium health but special attacks = priority target
- 💡 **Consider:** Homing projectiles need implementation - might be Phase 2

#### 10. **Drone** (Floor 3+)
- **Character:** `◊` (lozenge, Unicode U+25CA) or `◇` (white diamond)
- **Alternatives:** `D`, `+`, `▲` (triangle), `▼` (down triangle)
- **Stats:** Low health, high speed, rapid fire
- **Behavior:** Flies in patterns, fires continuously
- **Variants:**
  - **Bomber Drone:** Explodes on death
  - **Shield Drone:** Has temporary shield

### Tanks

#### 11. **Heavy Tank** (Floor 2+) ✅ PRIORITY
- **Character:** `█` (full block, Unicode U+2588) or `▓` (dark shade)
- **Alternatives:** `H`, `■` (black square), `◼` (black medium square)
- **Stats:** Very high health (100-150), slow speed (30-50 px/s), high damage (20-25)
- **Behavior:** Slow pursuit, powerful melee or ranged attacks
- **Variants:**
  - **Armored Tank:** Even higher health, slower
  - **Cannon Tank:** Ranged attacks instead of melee

**Review:**
- ✅ **Teaches:** Tank archetype, high health enemies, sustained damage
- ✅ **Character:** `█` (full block) is perfect - looks heavy and solid
- ✅ **Difficulty:** First "tank" enemy - teaches patience and sustained combat
- ✅ **Balance:** Slow = easy to avoid, but high health = takes time to kill
- 💡 **Consider:** Good introduction to "bullet sponge" concept

#### 12. **Shield Bearer** (Floor 3+) ✅ PRIORITY
- **Character:** `▓` (dark shade, Unicode U+2593) or `▒` (medium shade)
- **Alternatives:** `S`, `█` (full block), `◼` (black medium square)
- **Stats:** High health (80-100), slow speed (30-50 px/s), blocks projectiles from front
- **Behavior:** Faces player, blocks shots, advances slowly
- **Variants:**
  - **Multi-Shield:** Blocks from multiple directions
  - **Shield Wall:** Multiple shield bearers form wall

**Review:**
- ✅ **Teaches:** Defensive enemies, flanking, positioning for weak points
- ✅ **Character:** `▓` (dark shade) suggests armor/shield - distinct from Heavy Tank `█`
- ✅ **Difficulty:** New mechanic - can't just shoot from front
- ✅ **Balance:** High health + blocking = requires strategy, not just damage
- 💡 **Consider:** Blocking system needs implementation - may need directional hit detection

#### 13. **Golem** (Floor 3+) ✅ PRIORITY
- **Character:** `◼` (black medium square, Unicode U+25FC) or `█` (full block)
- **Alternatives:** `G`, `■` (black square), `▓` (dark shade)
- **Stats:** Extremely high health (200-300), very slow (20-40 px/s), high damage (25-35)
- **Behavior:** Slow but relentless pursuit
- **Variants:**
  - **Stone Golem:** Highest health variant
  - **Fire Golem:** Explodes on death

**Review:**
- ✅ **Teaches:** High-health threats, sustained combat, patience
- ⚠️ **Character Conflict:** Similar to Heavy Tank `█` - consider `◼` (medium square) for distinction
- ✅ **Difficulty:** Escalation of tank concept - even more health
- ✅ **Balance:** Very slow = easy to avoid, but extremely high health = long fight
- 💡 **Consider:** Should feel like a mini-boss - significant health pool

### Fast Movers

#### 14. **Zippy** (Floor 2+) ✅ PRIORITY
- **Character:** `◐` (circle with left half black, Unicode U+25D0) or `◑` (right half)
- **Alternatives:** `z`, `Z`, `◒` (lower half), `◓` (upper half)
- **Stats:** Very low health (5-10), very high speed (180-220 px/s), low damage (4-6)
- **Behavior:** Erratic high-speed movement, hard to hit
- **Variants:**
  - **Teleporter:** Teleports short distances
  - **Phantom:** Brief invulnerability periods

**Review:**
- ✅ **Teaches:** Evasion challenge, tracking fast targets, precision aiming
- ✅ **Character:** `◐` (half circle) suggests speed/movement - distinct
- ✅ **Difficulty:** Hard to hit but weak - teaches "fast doesn't mean dangerous"
- ✅ **Balance:** Very low health = one hit kill, but hard to hit
- 💡 **Consider:** Good for teaching "some enemies are annoying but not threatening"

#### 15. **Bat** (Floor 1+) ✅ PRIORITY
- **Character:** `▼` (black down triangle, Unicode U+25BC) or `▲` (up triangle)
- **Alternatives:** `b`, `B`, `◊` (lozenge), `◈` (conflicts with Basic Shooter - avoid)
- **Stats:** Very low health (8-12), high speed (120-150 px/s), low damage (5-7)
- **Behavior:** Flies in swooping patterns
- **Variants:**
  - **Vampire Bat:** Lifesteal on hit
  - **Swarm Bat:** Spawns in large groups

**Review:**
- ✅ **Teaches:** Fast mover, pattern movement, tracking fast targets
- ✅ **Character:** Using `▼` (down triangle) - distinct from Basic Shooter `◈` - triangle suggests flying
- ✅ **Difficulty:** Very fast but very weak - teaches "speed vs health" tradeoff
- ✅ **Balance:** Low damage means mistakes aren't fatal
- 💡 **Consider:** Use `▼` or `▲` for bat (triangle = flying), keep `◈` for shooter

#### 16. **Wraith** (Floor 3+) ✅ PRIORITY
- **Character:** `≈` (almost equal, Unicode U+2248) or `~` (tilde)
- **Alternatives:** `W`, `∿` (sine wave), `◐` (half circle)
- **Stats:** Low health (15-25), very high speed (200-250 px/s), medium damage (12-15)
- **Behavior:** Phases through walls, teleports
- **Variants:**
  - **Shadow Wraith:** Brief invisibility
  - **Phase Wraith:** Can't be hit while phasing

**Review:**
- ✅ **Teaches:** Teleportation, phase mechanics, unpredictable movement
- ✅ **Character:** `≈` (wave) suggests ethereal/phase - distinct and thematic
- ✅ **Difficulty:** Advanced movement mechanic - hard to predict
- ✅ **Balance:** Low health but teleportation = hard to hit
- 💡 **Consider:** Phase through walls needs implementation - collision system modification

### Special Abilities

#### 17. **Exploder** (Floor 2+) ✅ PRIORITY
- **Character:** `◎` (bullseye, Unicode U+25CE) or `●` (black circle)
- **Alternatives:** `E`, `*`, `◉` (fisheye), `◯` (large circle)
- **Stats:** Low health (20-30), medium speed (70-90 px/s), explodes on death (area damage: 15-20)
- **Behavior:** Charges player, explodes on contact or death
- **Variants:**
  - **Chain Exploder:** Explosion triggers nearby exploders
  - **Mega Exploder:** Larger explosion radius

**Review:**
- ✅ **Teaches:** Area denial, death effects, positioning importance
- ✅ **Character:** `◎` (bullseye) is distinct from slime `◉` - good separation
- ✅ **Difficulty:** New mechanic - death has consequences
- ✅ **Balance:** Low health = easy to kill, but explosion = teaches caution
- 💡 **Consider:** Great for teaching "killing enemies can be dangerous"

#### 18. **Spawner** (Floor 3+) ✅ PRIORITY
- **Character:** `◔` (circle with upper right quadrant black, Unicode U+25D4) or `◕` (three-quarter)
- **Alternatives:** `P`, `@`, `◉` (fisheye), `○` (white circle)
- **Stats:** Medium health (70-90), slow speed (30-50 px/s), spawns minions
- **Behavior:** Periodically spawns smaller enemies (every 5-10 seconds)
- **Variants:**
  - **Rapid Spawner:** Spawns more frequently
  - **Elite Spawner:** Spawns stronger minions

**Review:**
- ✅ **Teaches:** Minion mechanics, priority targeting, spawn management
- ✅ **Character:** `◔` (partial circle) suggests spawning/creation - distinct
- ✅ **Difficulty:** New mechanic - creates more enemies if not killed quickly
- ✅ **Balance:** Medium health but spawns = must prioritize or face swarm
- 💡 **Consider:** Great for teaching "kill spawners first" strategy

#### 19. **Buffer** (Floor 3+) ✅ PRIORITY
- **Character:** `✚` (heavy plus, Unicode U+271A) or `+` (plus)
- **Alternatives:** `B`, `✛` (open center cross), `✜` (heavy open center cross)
- **Stats:** Low health (30-40), slow speed (40-60 px/s), buffs nearby enemies
- **Behavior:** Stays near other enemies, grants buffs (speed +20%, damage +15%)
- **Variants:**
  - **Speed Buffer:** Increases enemy speed
  - **Damage Buffer:** Increases enemy damage
  - **Shield Buffer:** Grants shields to nearby enemies

**Review:**
- ✅ **Teaches:** Support enemies, priority targeting, buff mechanics
- ⚠️ **Character Conflict:** Similar to Healer `✛` - consider different style
- ✅ **Difficulty:** New mechanic - makes other enemies stronger
- ✅ **Balance:** Low health = easy to kill, but buffs others = high priority
- 💡 **Consider:** Buff system needs implementation - enemy stat modification

#### 20. **Healer** (Floor 4+) ✅ PRIORITY
- **Character:** `✛` (open center cross, Unicode U+271B) or `✝` (latin cross)
- **Alternatives:** `H`, `+`, `✚` (heavy plus - conflicts with Buffer), `✞` (shadowed white latin cross)
- **Stats:** Medium health (60-80), slow speed (30-50 px/s), heals nearby enemies (+10-15 HP per heal)
- **Behavior:** Stays near other enemies, periodically heals them (every 3-5 seconds)
- **Variants:**
  - **Rapid Healer:** Heals more frequently
  - **Area Healer:** Heals all enemies in large radius

**Review:**
- ✅ **Teaches:** Priority targeting, healing mechanics, support enemy management
- ✅ **Character:** `✛` (open cross) distinct from Buffer `✚` (heavy plus) - good separation
- ✅ **Difficulty:** New mechanic - enemies can heal, must kill healer first
- ✅ **Balance:** Medium health but heals others = highest priority target
- 💡 **Consider:** Healing system needs implementation - enemy health restoration

#### 21. **Teleporter** (Floor 3+) ✅ PRIORITY
- **Character:** `◖` (left half black circle, Unicode U+25D6) or `◗` (right half) - represents phase shift
- **Alternatives:** `T`, `~`, `≈` (almost equal), `◐` (conflicts with Zippy - avoid)
- **Stats:** Low health (20-30), medium speed (80-100 px/s), teleports player
- **Behavior:** Teleports player to random location when close (within 50-80 pixels)
- **Variants:**
  - **Swap Teleporter:** Swaps positions with player
  - **Trap Teleporter:** Teleports player into danger

**Review:**
- ✅ **Teaches:** Disruption mechanics, player control loss, positioning importance
- ✅ **Character:** Using `◖` (left half black circle) - distinct from Zippy `◐` - good separation
- ✅ **Difficulty:** New mechanic - disrupts player positioning
- ✅ **Balance:** Low health = easy to kill, but teleport = annoying/disruptive
- 💡 **Consider:** Teleporting player might be frustrating - test carefully

#### 22. **Shielder** (Floor 3+)
- **Character:** `◯` (large circle, Unicode U+25EF) or `○` (white circle)
- **Alternatives:** `S`, `●` (black circle), `◉` (fisheye)
- **Stats:** Low health, medium speed, creates shields
- **Behavior:** Creates temporary shields for nearby enemies
- **Variants:**
  - **Personal Shielder:** Only shields itself
  - **Group Shielder:** Shields multiple enemies

#### 23. **Freezer** (Floor 4+) ✅ PRIORITY
- **Character:** `❄` (snowflake, Unicode U+2744) or `❅` (tight trifoliate snowflake)
- **Alternatives:** `F`, `❆` (heavy chevron snowflake), `◇` (diamond - ice crystal)
- **Stats:** Medium health (50-70), slow speed (40-60 px/s), slows player (-30% to -50% speed)
- **Behavior:** Slows player movement when nearby (within 60-100 pixels)
- **Variants:**
  - **Area Freezer:** Slows in large area
  - **Freeze Ray:** Fires slowing projectiles

**Review:**
- ✅ **Teaches:** Debuff mechanics, player stat modification, area denial
- ✅ **Character:** `❄` (snowflake) is perfect for ice - very thematic and distinct
- ✅ **Difficulty:** New mechanic - reduces player mobility
- ✅ **Balance:** Medium health but slows player = dangerous in groups
- 💡 **Consider:** Slow effect needs implementation - player speed modification

#### 24. **Leech** (Floor 4+) ✅ PRIORITY
- **Character:** `◗` (right half black circle, Unicode U+25D7) or `◖` (left half - conflicts with Teleporter)
- **Alternatives:** `L`, `~`, `≈` (almost equal), `◐` (half circle - conflicts with Zippy)
- **Stats:** Low health (25-35), medium speed (70-90 px/s), lifesteal (5-10 HP per hit)
- **Behavior:** Steals health from player on contact, heals itself
- **Variants:**
  - **Vampire Leech:** High lifesteal (10-15 HP per hit)
  - **Area Leech:** Drains health from area

**Review:**
- ✅ **Teaches:** Lifesteal threat, enemy healing, contact danger
- ✅ **Character:** `◗` (right half circle) suggests draining - distinct from Teleporter `◖`
- ✅ **Difficulty:** New mechanic - enemies can heal from player
- ✅ **Balance:** Low health but lifesteal = dangerous if allowed to hit
- 💡 **Consider:** Lifesteal system needs implementation - enemy heals on hit

### Floor-Specific Enemy Introductions

#### Floor 1 Enemies (Teaching Core Mechanics):
1. **Basic Rusher** `▶` - Teaches: Melee threat, direct pursuit
2. **Basic Shooter** `◈` - Teaches: Ranged threat, projectile dodging
3. **Zombie** `☠` - Teaches: Swarm mechanics, group management
4. **Slime** `●` - Teaches: Splitting mechanic, consequences
5. **Bat** `▼` - Teaches: Fast mover, pattern tracking

**Floor 1 Review:**
- ✅ **Mechanics Covered:** Melee, ranged, swarms, splitting, fast movement
- ✅ **Progression:** Simple → Complex (rusher → shooter → groups → splitting → fast)
- ✅ **Character Variety:** All distinct Unicode characters
- ✅ **Difficulty Curve:** Gentle introduction to all core mechanics

#### Floor 2 Enemies (Advanced Mechanics):
1. **Charger** `→` - Teaches: Telegraphed attacks, dodge timing
2. **Turret** `┼` - Teaches: Stationary threats, priority targeting
3. **Heavy Tank** `█` - Teaches: Tank archetype, sustained damage
4. **Zippy** `◐` - Teaches: Evasion challenge, precision aiming
5. **Exploder** `◎` - Teaches: Area denial, death effects

**Floor 2 Review:**
- ✅ **Mechanics Covered:** Advanced movement, stationary threats, tanks, evasion, area effects
- ✅ **Progression:** Builds on Floor 1, introduces new challenge types
- ✅ **Character Variety:** All distinct, visually clear
- ✅ **Difficulty Curve:** Appropriate step up from Floor 1

#### Floor 3 Enemies (Advanced Mechanics):
1. **Mage** `✦` - Teaches: Special abilities, homing projectiles
2. **Shield Bearer** `▓` - Teaches: Defensive enemies, flanking
3. **Golem** `◼` - Teaches: High-health threats, sustained combat
4. **Wraith** `≈` - Teaches: Teleportation, phase mechanics
5. **Spawner** `◔` - Teaches: Minion mechanics, priority targeting
6. **Buffer** `✚` - Teaches: Support enemies, buff mechanics

**Floor 3 Review:**
- ✅ **Mechanics Covered:** Special abilities, defense, high health, teleportation, spawning, buffing
- ✅ **Progression:** Builds on Floor 1-2, introduces complex mechanics
- ✅ **Character Variety:** All distinct Unicode characters
- ✅ **Difficulty Curve:** Appropriate escalation from Floor 2
- ⚠️ **Implementation:** Some mechanics need new systems (homing, blocking, buffing, spawning)

#### Floor 4 Enemies (Support & Debuff Mechanics):
1. **Healer** `✛` - Teaches: Priority targeting, healing mechanics
2. **Teleporter** `◖` - Teaches: Disruption, player control loss
3. **Freezer** `❄` - Teaches: Debuff mechanics, player stat modification
4. **Leech** `◗` - Teaches: Lifesteal threat, enemy healing

**Floor 4 Review:**
- ✅ **Mechanics Covered:** Healing, disruption, debuffs, lifesteal
- ✅ **Progression:** Focuses on support and player-affecting mechanics
- ✅ **Character Variety:** All distinct, visually clear
- ✅ **Difficulty Curve:** Appropriate step up from Floor 3
- ⚠️ **Implementation:** All mechanics need new systems (healing, teleport, slow, lifesteal)

#### Floor 5+ Enemies:
- **Elite variants:** Stronger versions of existing enemies
- **Combinations:** Mixed enemy types with synergies
- **New unique types:** Additional enemy archetypes

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

### Unlockable Characters (Priority Set)

#### 2. **The Scout** ✅ PRIORITY
- **Character:** `>` (yellow) or `▶` (right triangle)
- **Starting Stats:**
  - Health: 75 (25% less than Survivor)
  - Speed: 200 pixels/second (33% faster than Survivor's 150)
  - Damage: 8 (20% less than Survivor)
- **Starting Weapon:** Rapid Fire SMG
  - Fire Rate: 3.0 shots/second
  - Damage: 6 per projectile
  - Projectile Speed: 350 pixels/second
- **Unique Ability:** +20% movement speed (stacks with base), +10% dodge chance
- **Theme:** Fast and agile, relies on speed
- **Unlock:** Complete Floor 2

**Review:**
- ✅ **Playstyle:** Speed-focused, hit-and-run, kiting specialist
- ✅ **Weapon Match:** Rapid Fire SMG fits speed theme - constant damage while moving
- ✅ **Unique Ability:** Speed boost is impactful, dodge chance adds survivability
- ✅ **Differentiation:** Clear tradeoff - less health/damage for more speed
- ✅ **Unlock Requirement:** Complete Floor 2 - reasonable, early unlock
- 💡 **Consider:** Dodge chance might need implementation (invulnerability frames on dodge?)

#### 3. **The Tank** ✅ PRIORITY
- **Character:** `█` (gray) or `▓` (dark shade)
- **Starting Stats:**
  - Health: 150 (50% more than Survivor)
  - Speed: 100 pixels/second (33% slower than Survivor's 150)
  - Damage: 12 (20% more than Survivor)
- **Starting Weapon:** Spread Shotgun
  - Fire Rate: 0.8 shots/second
  - Damage: 8 per pellet (3-5 pellets = 24-40 total)
  - Projectile Speed: 250 pixels/second
- **Unique Ability:** +25% max health (stacks = 187.5 total), +15% damage reduction
- **Theme:** Slow but durable, can take hits
- **Unlock:** Complete Floor 3

**Review:**
- ✅ **Playstyle:** Tank/defense-focused, can take hits, close-range powerhouse
- ✅ **Weapon Match:** Spread Shotgun fits tank theme - high damage, close range, aggressive
- ✅ **Unique Ability:** Health boost + damage reduction = very tanky, impactful
- ✅ **Differentiation:** Clear tradeoff - less speed for more health/defense
- ✅ **Unlock Requirement:** Complete Floor 3 - reasonable progression
- 💡 **Consider:** Very slow speed might feel frustrating - consider 110-120 px/s instead of 100?

#### 4. **The Sniper** ✅ PRIORITY
- **Character:** `^` (cyan) or `▲` (up triangle)
- **Starting Stats:**
  - Health: 80 (20% less than Survivor)
  - Speed: 120 pixels/second (20% slower than Survivor's 150)
  - Damage: 20 (100% more than Survivor - but weapon-dependent)
- **Starting Weapon:** Sniper Rifle
  - Fire Rate: 0.4 shots/second (very slow)
  - Damage: 20 per projectile (very high)
  - Projectile Speed: 500 pixels/second (very fast)
  - Piercing: Yes (passes through enemies)
- **Unique Ability:** +50% crit chance (base 5% → 7.5%), +25% crit damage (base 200% → 250%)
- **Theme:** High damage, precision-focused
- **Unlock:** Defeat 100 enemies with headshots/crits OR complete Floor 3

**Review:**
- ✅ **Playstyle:** Precision-focused, high damage, slow but powerful
- ✅ **Weapon Match:** Sniper Rifle fits sniper theme - slow, high damage, piercing
- ⚠️ **Unique Ability:** Crit system needs implementation - might be complex for MVP
- ✅ **Differentiation:** Clear tradeoff - low health/speed for high damage
- ⚠️ **Unlock Requirement:** "Defeat 100 enemies with crits" requires crit system - consider simpler unlock
- 💡 **Consider:** Alternative unlock: "Complete Floor 3" or "Deal 5000 total damage in one run"

#### 5. **The Pyro** ✅ PRIORITY
- **Character:** `&` (orange/red) or `★` (star - fire theme)
- **Starting Stats:**
  - Health: 90 (10% less than Survivor)
  - Speed: 150 pixels/second (same as Survivor)
  - Damage: 12 (20% more than Survivor - but weapon-dependent)
- **Starting Weapon:** Flame Thrower
  - Fire Rate: Continuous (damage over time)
  - Damage: 8 per tick (continuous while active)
  - Range: Short (100-150 pixels)
  - Area Effect: Yes (hits multiple enemies)
- **Unique Ability:** Fire damage deals +25% damage over time (DoT effect)
- **Theme:** Fire and explosions specialist
- **Unlock:** Deal 1000 fire/explosive damage in one run OR complete Floor 2

**Review:**
- ✅ **Playstyle:** Close-range area damage, DoT specialist, aggressive
- ⚠️ **Weapon Match:** Flame Thrower is complex - requires continuous damage system
- ⚠️ **Unique Ability:** DoT system needs implementation - might be Phase 2
- ✅ **Differentiation:** Unique playstyle with area/DoT focus
- ⚠️ **Unlock Requirement:** "Deal 1000 fire damage" requires fire damage tracking - consider simpler unlock
- 💡 **Consider:** Alternative unlock: "Complete Floor 2" or "Use Explosive Launcher 50 times"
- 💡 **Consider:** Might be better as Phase 2 character if DoT system isn't ready

---

## 🎯 Priority Characters Review Summary

### Review Questions Answered:

#### 1. Do these 4 characters cover different playstyles?
✅ **Yes** - Excellent variety:
- **Speed:** The Scout (hit-and-run, kiting)
- **Tank:** The Tank (defense, can take hits)
- **Precision:** The Sniper (high damage, slow but powerful)
- **Area/DoT:** The Pyro (close-range area damage, DoT)

#### 2. Are unlock requirements too easy/hard?
✅ **Reasonable:**
- **The Scout:** Complete Floor 2 - Early unlock, good for variety
- **The Tank:** Complete Floor 3 - Mid-game unlock, appropriate
- **The Sniper:** Complete Floor 3 (simplified) - Alternative to complex crit tracking
- **The Pyro:** Complete Floor 2 (simplified) - Alternative to complex damage tracking

#### 3. Do unique abilities create meaningful choices?
⚠️ **Mixed:**
- ✅ **The Scout:** Speed boost + dodge - impactful, needs dodge implementation
- ✅ **The Tank:** Health boost + damage reduction - very impactful
- ⚠️ **The Sniper:** Crit system - impactful but requires crit system (Phase 2?)
- ⚠️ **The Pyro:** DoT system - impactful but requires DoT system (Phase 2?)

### Character Comparison:

| Character | Health | Speed | Damage | Weapon | Ability Complexity |
|-----------|--------|-------|--------|--------|-------------------|
| Survivor | 100 | 150 | 10 | Pistol | Simple (+10% XP) |
| Scout | 75 | 200 | 8 | SMG | Medium (dodge) |
| Tank | 150 | 100 | 12 | Shotgun | Simple (stats) |
| Sniper | 80 | 120 | 20 | Sniper | Complex (crit) |
| Pyro | 90 | 150 | 12 | Flamethrower | Complex (DoT) |

### Implementation Priority:

**Phase 1 (MVP):**
1. ✅ The Survivor (already implemented)
2. ⏳ The Scout (needs dodge system)
3. ⏳ The Tank (simple stats, easy to implement)

**Phase 2 (After MVP):**
4. The Sniper (needs crit system)
5. The Pyro (needs DoT system)

### Recommendations:

1. ✅ **Stats System:** All characters use pixel-based values (consistent)
2. ✅ **Weapon Integration:** Scout and Tank use priority weapons (SMG, Shotgun)
3. ⚠️ **Weapon Implementation:** Sniper and Pyro need weapons implemented (Sniper Rifle, Flame Thrower)
4. ⚠️ **System Requirements:** Some abilities need new systems (dodge, crit, DoT)
5. ✅ **Unlock Simplification:** Floor completion unlocks are better than complex tracking

---

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

### Boss Design Principles
- **Visual Presence:** Bosses should feel larger/more important than regular enemies
- **Character Options:** 
  - Single character (larger font)
  - Double character (`GG`)
  - Triple character (`GGG`)
  - **Armor Representation:** Parentheses `(G)` or brackets `[G]` for armor
  - **Multi-Line:** Two or three lines for larger presence
- **Armor System:** 
  - **Cosmetic:** Parentheses for visual only
  - **Functional:** Armor has health, reduces damage, can be destroyed
  - **Directional:** Left `(` and right `)` armor can be destroyed independently
- **Mechanics:** Each boss should test different skills learned on that floor
- **Difficulty:** Appropriate escalation - Floor 1 < Floor 2 < Floor 3
- **Rewards:** Significant rewards to justify challenge

**See `BOSS_VISUAL_DESIGN.md` for detailed multi-line and armor design concepts**

---

### Floor 1 Boss: **The Gatekeeper** ✅ PRIORITY
- **Visual Design:**
  - **Option 1 (Simple):** `(GG)` - Single line with armor parentheses
  - **Option 2 (Two-Line):** 
    ```
     (G)
    (GG)
    ```
    - Top: Upper armor/shield
    - Bottom: Core body
  - **Option 3 (Three-Line):**
    ```
     (G)
    (GGG)
     (G)
    ```
    - Maximum presence for Floor 1
- **Character:** `G` (core, red) with `(` `)` armor (gray/white)
- **Alternatives:** `█` (full block), `◼` (medium square), `[` `]` (brackets for heavy armor)
- **Health:** 500 (5x average enemy health)
- **Armor Health:** 100-150 (optional - separate from boss health)
- **Speed:** 60-80 pixels/second (slow, deliberate)
- **Damage:** 15-20 per hit (melee) or 10-12 per projectile
- **Mechanics:**
  - **Spawn Minions:** Spawns Basic Rusher or Basic Shooter every 5-8 seconds (2-3 minions at a time)
  - **Charge Attack:** Charges at player every 10 seconds (telegraphed, brief windup)
  - **Radial Burst:** Fires projectiles in 8 directions (N, NE, E, SE, S, SW, W, NW) every 6-8 seconds
  - **Phase 1 (100-75% HP):** Basic attacks, slower spawn rate
  - **Phase 2 (75-50% HP):** Faster attacks, more frequent spawns
  - **Phase 3 (50-0% HP):** Enraged - faster movement, more frequent attacks
- **Rewards:** 
  - XP: 100-150 (high for Floor 1)
  - Currency: 50-75
  - Potential: Weapon unlock (Spread Shotgun or Rapid Fire SMG)

**Review:**
- ✅ **Mechanics:** Combines multiple enemy types (spawner + charger + shooter) - good first boss
- ✅ **Character:** `G` is clear, but consider larger Unicode block for "boss presence"
- ✅ **Difficulty:** Appropriate for Floor 1 - challenging but beatable with basic weapons
- ✅ **Phases:** Simple 3-phase system - teaches boss phase concept
- ✅ **Rewards:** Good rewards for first boss - feels rewarding
- ✅ **Visual Design:** Using `(GG)` or two-line design for armor representation
- ✅ **Armor Mechanics:** Parentheses represent armor - can degrade visually and functionally
- ✅ **Multi-Line Option:** Two-line design `(G)/(GG)` adds presence without clutter
- 💡 **Armor Degradation:** `(GG)` → `(GG` → `GG` → `G` as armor is destroyed
- 💡 **Directional Damage:** Left armor `(` and right armor `)` can be destroyed independently
- 💡 **Gameplay:** Armor could reduce damage by 25-50%, destroyed armor = weak point

---

### Floor 2 Boss: **The Swarm Queen** ✅ PRIORITY
- **Visual Design:**
  - **Option 1 (Single-Line):** `(QQ)` - Queen with armor
  - **Option 2 (Two-Line with Swarm):**
    ```
    (QQ)
    o o o
    ```
    - Top: Queen (armored, large)
    - Bottom: Spawned minions (dynamic, appear/disappear)
  - **Option 3 (Three-Line Swarm):**
    ```
     (Q)
    (QQQ)
    o o o o
    ```
    - Maximum swarm presence
- **Character:** `Q` (core, purple) with `(` `)` armor, minions `o` (small circles)
- **Alternatives:** `◉` (fisheye), `◎` (bullseye), `●` (black circle)
- **Health:** 800 (8x average enemy health, 1.6x Floor 1 boss)
- **Armor Health:** 150-200 (optional - separate from boss health)
- **Speed:** 40-60 pixels/second (very slow, moves to position)
- **Damage:** 10-12 per hit (low direct damage, relies on minions)
- **Mechanics:**
  - **Continuous Spawning:** Spawns Bat or Slime every 3-5 seconds (up to 5-8 minions active)
  - **Escalating Spawns:** Spawn rate increases as health decreases
    - 100-66% HP: Spawn every 5 seconds
    - 66-33% HP: Spawn every 3 seconds
    - 33-0% HP: Spawn every 2 seconds
  - **Death Explosion:** On death, spawns 8-12 minions in burst
  - **Positioning:** Moves to center of room, tries to maintain distance from player
- **Rewards:**
  - XP: 200-300 (high for Floor 2)
  - Currency: 100-150
  - Character Unlock: The Scout (speed-focused character)

**Review:**
- ✅ **Mechanics:** Focuses on swarm management - tests crowd control skills
- ✅ **Character:** `Q` is clear, but consider more distinctive Unicode for "queen" feel
- ✅ **Difficulty:** Appropriate escalation - more complex than Floor 1 boss
- ✅ **Unique Mechanic:** Escalating spawns create tension - gets harder as fight progresses
- ✅ **Rewards:** Character unlock is great reward - gives player new option
- ✅ **Visual Design:** Using `(QQ)` or two-line with minions for swarm representation
- ✅ **Swarm Visualization:** Minions on second line show active swarm visually
- ✅ **Dynamic Minions:** Bottom line updates as minions spawn/despawn
- 💡 **Armor Degradation:** `(QQ)` → `(QQ` → `QQ` → `Q` as armor destroyed
- 💡 **Minion Display:** Second line shows 3-5 minions `o o o` - updates dynamically
- 💡 **Death Explosion:** Final burst of minions shown on second line before fade

---

### Floor 3 Boss: **The Twin Guardians** ✅ PRIORITY
- **Visual Design:**
  - **Option 1 (Side-by-Side):** `(▶) (◈)` - Two bosses with armor, side-by-side
  - **Option 2 (Two-Line Stacked):**
    ```
    (▶)
    (◈)
    ```
    - Top: Melee Guardian (red, armored)
    - Bottom: Ranged Guardian (blue, armored)
  - **Option 3 (Coordinated Formation):**
    ```
     (▶)
    (◈)
    ```
    - Melee in front (top)
    - Ranged behind (bottom)
    - Shows tactical positioning
- **Character:** 
  - Guardian 1 (Melee): `▶` (red triangle) with `(` `)` armor
  - Guardian 2 (Ranged): `◈` (blue diamond) with `(` `)` armor
- **Alternatives:** `→` (red arrow), `✦` (blue star), `◼` (red square) + `◼` (blue square)
- **Health:** 600 each (1200 total - 2.4x Floor 1 boss, 1.5x Floor 2 boss)
- **Armor Health:** 100-150 each (optional - separate from guardian health)
- **Speed:** 
  - Melee Guardian: 100-120 pixels/second (faster, aggressive)
  - Ranged Guardian: 60-80 pixels/second (slower, maintains distance)
- **Damage:**
  - Melee Guardian: 20-25 per hit (high melee damage)
  - Ranged Guardian: 12-15 per projectile (moderate ranged damage)
- **Mechanics:**
  - **Dual Boss System:** Two bosses that work together
  - **Melee Guardian (Red):** Charges player, melee attacks, faster movement
  - **Ranged Guardian (Blue):** Maintains distance, fires projectiles, slower movement
  - **Coordination:** Ranged guardian positions behind melee, creates crossfire
  - **Enrage System:** When one dies, the other enrages:
    - +50% movement speed
    - +50% attack speed
    - +25% damage
    - Health regen: +5 HP/second (optional)
  - **Phase 1 (Both Alive):** Standard attacks, coordination
  - **Phase 2 (One Dead):** Enraged survivor, more aggressive
- **Rewards:**
  - XP: 300-400 (high for Floor 3)
  - Currency: 150-200
  - Upgrade Unlock: Rare upgrade option or permanent stat boost

**Review:**
- ✅ **Mechanics:** Dual boss system is unique and challenging - tests multi-target management
- ✅ **Character:** Two distinct characters (red/blue) - clear visual distinction
- ✅ **Difficulty:** Appropriate escalation - more complex than previous bosses
- ✅ **Enrage System:** Creates interesting dynamic - kill order matters
- ✅ **Rewards:** Upgrade unlock is good reward - permanent progression
- ✅ **Visual Design:** Using side-by-side `(▶) (◈)` or two-line stacked for dual boss
- ✅ **Armor System:** Each guardian has independent armor - can be destroyed separately
- ✅ **Visual Feedback:** Armor degradation shows progress: `(▶) (◈)` → `(▶) ◈` → `▶ ◈`
- 💡 **Armor Mechanics:** Destroying one guardian's armor creates weak point
- 💡 **Strategic Choice:** Should players kill melee or ranged first? Both strategies viable
- 💡 **Enrage Visual:** Surviving guardian's armor could change color/style when enraged
- 💡 **Consider:** Enrage might be too strong - test balance carefully

---

## 🎯 Priority Bosses Review Summary

### Review Questions Answered:

#### 1. Do bosses feel like meaningful milestones?
✅ **Yes** - Each boss:
- **Floor 1:** Tests all core mechanics learned (melee, ranged, dodging)
- **Floor 2:** Tests swarm management and crowd control
- **Floor 3:** Tests multi-target management and strategy
- All feel like significant achievements

#### 2. Are boss mechanics readable in ASCII?
✅ **Yes, with considerations:**
- **Single Character:** Clear but may lack presence
- **Double Character (`GG`):** Better presence, still readable
- **Triple Character (`GGG`):** Maximum presence, but may be cluttered
- **Recommendation:** Start with double character or larger font (28-32px)

#### 3. Do rewards justify the challenge?
✅ **Yes:**
- **Floor 1:** High XP/currency + potential weapon unlock
- **Floor 2:** High XP/currency + character unlock (The Scout)
- **Floor 3:** High XP/currency + upgrade unlock
- All rewards feel proportional to difficulty

### Boss Comparison:

| Boss | Health | Armor | Mechanics | Complexity | Visual |
|------|--------|-------|-----------|------------|--------|
| Gatekeeper | 500 | 100-150 | Spawn + Charge + Radial | Medium | `(GG)` or two-line |
| Swarm Queen | 800 | 150-200 | Escalating Spawns | Medium-High | `(QQ)` + minions |
| Twin Guardians | 600 each | 100-150 each | Dual Boss + Enrage | High | `(▶) (◈)` side-by-side |

### Implementation Priority:

**Phase 1 (MVP):**
1. ⏳ **The Gatekeeper** - Simple mechanics, good first boss
2. ⏳ **The Swarm Queen** - Requires spawn system (already needed for Spawner enemy)

**Phase 2 (After MVP):**
3. **The Twin Guardians** - More complex, dual boss system

### Recommendations:

1. ✅ **Visual Presence:** Use armor parentheses `(GG)` or multi-line designs for bosses
2. ✅ **Armor System:** Start cosmetic (visual only), add functional armor in Phase 2
3. ✅ **Multi-Line Design:** Two-line bosses add presence without clutter
4. ✅ **Health Scaling:** Appropriate progression (500 → 800 → 1200 total)
5. ✅ **Mechanics:** Each boss tests different skills
6. ✅ **Rewards:** Good progression (weapon → character → upgrade)
7. ⚠️ **Implementation:** Some mechanics need systems (spawning, enrage, dual boss, armor)
8. 💡 **Directional Damage:** Armor system enables directional targeting (Phase 2+)

---

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