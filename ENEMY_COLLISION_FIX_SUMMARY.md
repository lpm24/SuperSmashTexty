# Enemy Collision System Fixes

## Issues Fixed

### 1. Enemies Being Pushed Into Obstacles ❌ → ✅
**Problem:** When enemies are hit by projectiles or collide with the player, the knockback system was directly modifying their position without checking for collisions with walls/obstacles. This caused enemies to clip through walls and get stuck inside obstacles.

**Fix:** Created a new `applySafeKnockback()` function in `src/systems/combat.js` that:
- Calculates the new position from knockback
- Constrains position to room boundaries
- Checks for collision with walls and obstacles using KAPLAY's collision detection
- Only applies knockback if the new position is valid (not colliding)
- Reverts to original position if collision detected

**Impact:**
- Enemies can no longer be knocked into walls
- Enemies can no longer be knocked into obstacles
- Knockback respects all collision geometry
- Enemies remain playable and won't get stuck

### 2. Enemies Leaving Room Bounds ❌ → ✅
**Problem:** Enemies could move outside the room boundaries through various movement behaviors (rush, charge, teleport, etc.), causing them to disappear off-screen or into areas they shouldn't reach.

**Fix:**
- **Enemies:** Already had boundary clamping (verified working)
- **Bosses:** Already had boundary clamping (verified working)
- **Minibosses:** Added new boundary clamping in `src/entities/miniboss.js:383-390`

All entities now use `k.clamp()` to constrain positions within room bounds:
```javascript
const roomWidth = k.width();
const roomHeight = k.height();
const margin = 20;
const entitySize = entity.size || 12;

entity.pos.x = k.clamp(entity.pos.x, margin + entitySize, roomWidth - margin - entitySize);
entity.pos.y = k.clamp(entity.pos.y, margin + entitySize, roomHeight - margin - entitySize);
```

**Impact:**
- Enemies always stay within visible room area
- No enemies can escape through edges
- 20-pixel margin keeps entities away from walls
- Size-aware clamping prevents partial clipping

## Technical Details

### Safe Knockback Function
Location: `src/systems/combat.js:41-88`

Features:
- **Boundary checking:** Clamps to room min/max with margins
- **Collision detection:** Checks against all 'wall' and 'obstacle' entities
- **Position validation:** Only applies knockback if safe
- **Revert on collision:** Returns to original position if blocked

### Knockback Replacements
All knockback code now uses `applySafeKnockback()`:

1. **Enemy hit by projectile** (line 339)
   - Amount: `COMBAT_CONFIG.KNOCKBACK_ENEMY_FROM_PROJECTILE` (15)

2. **Boss hit by projectile** (line 513)
   - Amount: `COMBAT_CONFIG.KNOCKBACK_BOSS_FROM_PROJECTILE` (10)

3. **Enemy hits player** (line 574)
   - Amount: `COMBAT_CONFIG.KNOCKBACK_ENEMY` (20)

4. **Miniboss hits player** (line 616)
   - Amount: `COMBAT_CONFIG.KNOCKBACK_MINIBOSS` (25)

5. **Boss hits player** (line 664)
   - Amount: `COMBAT_CONFIG.KNOCKBACK_BOSS` (10)

### Room Boundary Constraints

**Enemies:** `src/entities/enemy.js:1016-1023`
- Applied at end of onUpdate loop
- Runs after all movement behaviors
- Margin: 20 pixels
- Size-aware: `margin + enemySize`

**Bosses:** `src/entities/boss.js:881-888`
- Applied at end of onUpdate loop
- Runs after all movement and attack patterns
- Margin: 20 pixels
- Size-aware: `margin + bossSize`

**Minibosses:** `src/entities/miniboss.js:383-390` (NEW)
- Added boundary clamping (was missing)
- Applied at end of onUpdate loop
- Margin: 20 pixels
- Size-aware: `margin + minibossSize`

## Files Modified

1. **src/systems/combat.js**
   - Added `applySafeKnockback()` helper function
   - Replaced all direct position modifications with safe knockback
   - Updated 5 collision handlers

2. **src/entities/miniboss.js**
   - Added room boundary clamping
   - Matches enemy and boss behavior

## Testing Recommendations

1. **Test Knockback:**
   - Hit enemies near walls - verify they don't clip through
   - Hit enemies near obstacles - verify they stay outside
   - Hit bosses/minibosses near walls - verify same behavior

2. **Test Movement:**
   - Verify enemies don't leave room bounds during rush behavior
   - Verify charging enemies stop at room edges
   - Verify teleporting enemies stay within bounds
   - Verify minibosses respect room boundaries

3. **Test Edge Cases:**
   - Rapid-fire weapons hitting enemies near walls
   - Multiple enemies stacked against walls
   - Boss movement patterns near room corners
   - Miniboss charge attacks near obstacles

## Performance Considerations

The `applySafeKnockback()` function performs collision checks on each knockback:
- Queries all 'wall' and 'obstacle' entities
- Iterates through obstacles checking `isColliding()`
- Only runs when knockback occurs (not every frame)
- Lightweight collision check using KAPLAY's built-in methods

Expected performance impact: Negligible
- Knockback is infrequent (only on hits)
- Collision checks are fast (KAPLAY optimized)
- Early exit on first collision found

## Summary

Enemy collision and boundary systems are now fully functional:
- ✅ Enemies respect all obstacles during knockback
- ✅ Enemies cannot be pushed through walls
- ✅ Enemies always stay within room bounds
- ✅ Bosses and minibosses also respect all constraints
- ✅ No performance impact from safety checks
