# Development Priorities & Next Steps

**Analysis Date:** 2025-01-XX  
**Purpose:** Prioritized action plan for addressing current issues and ideas

---

## 📊 Priority Categories

### 🔴 **IMMEDIATE (Do Now) - Quick Wins & Critical Fixes**

These are quick fixes that improve gameplay feel immediately and don't require major refactoring:

1. **Visual Pause Indication** ⚡ (5 min)
   - Add visual overlay/text when game is paused
   - Simple: Show "PAUSED" text or dim screen overlay
   - **Impact:** High - eliminates confusion

2. **Remove Radius from Display** ⚡ (2 min)
   - Remove `debugText.text = Radius: ${player.pickupRadius}px` from HUD
   - **Impact:** Medium - cleaner UI, will be in stats page later

3. **Display Level/XP as Decimal** ⚡ (5 min)
   - Change from "Level: 1" and "XP: 0/10" to "Level: 1.0%" or "1.0 (0%)"
   - Format: `Level: ${player.level}.${Math.floor((player.xp / player.xpToNext) * 10)}`
   - **Impact:** Medium - cleaner, more compact display

4. **Consolidate Floor/Room Display** ⚡ (5 min)
   - Combine "Floor: 1 Room: 1" into single line or more compact format
   - Consider: "F1 R1" or "Floor 1-1" or keep but reduce spacing
   - **Impact:** Medium - cleaner top-left HUD

5. **Fix Boss Armor Bar Text Color** ⚡ (2 min)
   - Change `bossArmorText.color` from `[200, 200, 200]` to higher contrast
   - Use white `[255, 255, 255]` or light yellow `[255, 255, 200]`
   - **Impact:** Medium - readability improvement

6. **Fix Armor Damage Bug** 🐛 (15 min)
   - **Issue:** Armor appears to take same/more damage, not less
   - **Root Cause:** Need to verify armor damage reduction logic
   - **Fix:** Review `boss.takeDamage()` in `boss.js` - ensure damage reduction applies correctly
   - **Impact:** High - critical gameplay bug

7. **Lower Projectile Range** ⚡ (10 min)
   - Add max range/lifetime to projectiles (currently infinite for pistol)
   - Set reasonable range: ~600-800 pixels (2-3 seconds at 300 px/s)
   - **Impact:** High - important for weapon differentiation

---

### 🟡 **HIGH PRIORITY (This Week) - Gameplay Flow**

These improve core gameplay flow and player experience:

8. **Boss Spawn Location Fix** 🎯 (20 min)
   - Bosses should spawn at top door or random door, not center if player is there
   - Check spawn logic in `game.js` around line 400
   - **Impact:** High - prevents unfair spawns

9. **Player Entry from Correct Door** 🎯 (30 min)
   - Track which door player exited from previous room
   - Spawn player at corresponding door in new room
   - Store exit direction in `gameState` and use for spawn
   - **Impact:** High - improves room transition feel

10. **Player Always Enters from Door** 🎯 (45 min)
    - Never spawn player in center
    - Ensure room generation doesn't place obstacles blocking entrance door
    - Modify obstacle generation to check entrance door position
    - **Impact:** High - consistent, fair gameplay

11. **Increase Door Visual Size** ⚡ (10 min)
    - Change door from single `=` to multiple characters: `===` or `═══`
    - Consider different display for vertical vs horizontal doors
    - Vertical: `|||` or `│││`, Horizontal: `===` or `═══`
    - **Impact:** Medium - better visibility

12. **No Obstacles in First Room** ⚡ (5 min)
    - Add check: `if (currentRoom === 1 && currentFloor === 1) { skip obstacles }`
    - Or reduce obstacle chance to 0% for first room
    - **Impact:** Medium - better new player experience

13. **Visual Obstacle Distinction** ⚡ (15 min)
    - Make walls vs cover visually distinct
    - Options: Different colors, different characters, outlines
    - Walls: `█` (full block), Cover: `▓` (dark shade) or `▒` (medium shade)
    - **Impact:** Medium - gameplay clarity

14. **Enemies Remaining Counter** ⚡ (10 min)
    - Add HUD element: "Enemies: X/Y" or "Remaining: X"
    - Show when room is active (not completed)
    - **Impact:** Medium - helpful player feedback

---

### 🟢 **MEDIUM PRIORITY (Next 1-2 Weeks) - Polish & Balance**

These can wait until core gameplay is solid:

15. **Improve Enemy AI Obstacle Handling** 🔧 (1-2 hours)
    - Enemies getting stuck on opposite side of obstacles
    - Implement pathfinding or better obstacle avoidance
    - Consider: A* pathfinding, obstacle avoidance steering, or simpler "go around" logic
    - **Impact:** Medium - improves enemy behavior

16. **Twin Guardians as Separate Bosses** 🎯 (2-3 hours)
    - Split into two separate boss entities
    - Spawn from opposite doors
    - Different AI for each (melee vs ranged)
    - **Impact:** High - better boss design, but can wait

17. **Penetrating Shots Through Obstacles** 🤔 (30 min)
    - **Design Decision Needed:** Should penetrating shots go through obstacles?
    - Currently: Penetrating shots go through enemies AND obstacles
    - Options:
      - A) Keep current (penetrates both)
      - B) Only penetrate enemies, not obstacles
      - C) Separate "obstacle piercing" upgrade
    - **Impact:** Medium - affects gameplay balance

18. **Regenerative Shields for Bosses** 💡 (1-2 hours)
    - New mechanic: Shields `{}` that regenerate
    - Different from armor `[]` - takes normal damage but regens
    - **Impact:** Low-Medium - new feature, can wait

---

### 🔵 **FUTURE / DESIGN NOTES (Later)**

19. **Verticality Concept** 📝
    - Note: Large rooms with raised platforms, steps
    - **Status:** Design note only, no implementation
    - **When:** Consider after core gameplay is polished

---

## 🎯 Recommended Implementation Order

### **Sprint 1: Quick Wins (1-2 hours)**
1. Visual pause indication
2. Remove radius display
3. Level/XP decimal format
4. Consolidate floor/room display
5. Fix boss armor text color
6. Fix armor damage bug
7. Lower projectile range

### **Sprint 2: Gameplay Flow (2-3 hours)**
8. Boss spawn location fix
9. Player entry from correct door
10. Player always enters from door
11. Increase door visual size
12. No obstacles in first room
13. Visual obstacle distinction
14. Enemies remaining counter

### **Sprint 3: Polish (1-2 weeks)**
15. Improve enemy AI obstacle handling
16. Twin guardians as separate bosses
17. Penetrating shots design decision
18. Regenerative shields (optional)

---

## 🐛 Critical Bugs to Fix First

1. **Armor Damage Bug** - Bosses taking incorrect damage
2. **Boss Spawn Location** - Unfair spawns
3. **Player Entry** - Inconsistent room transitions

---

## 💡 Design Decisions Needed

1. **Penetrating Shots:** Should they go through obstacles?
   - **Recommendation:** Only penetrate enemies, not obstacles (creates strategic choice)

2. **Door Visual:** Vertical vs horizontal representation?
   - **Recommendation:** Use `═══` for horizontal, `│││` for vertical

3. **Armor vs Shields:** Different mechanics?
   - **Recommendation:** 
     - Armor `[]`: Reduces damage, can be destroyed
     - Shields `{}`: Takes normal damage, regenerates
   - Can implement shields later

---

## 📝 Notes

- **Quick Wins** can be done in parallel or batched
- **Gameplay Flow** items should be done together for consistency
- **Polish** items can wait until game is more complete
- Focus on **bugs and critical gameplay** first, then polish

---

## ✅ Completion Checklist

### Immediate
- [ ] Visual pause indication
- [ ] Remove radius from display
- [ ] Level/XP decimal format
- [ ] Consolidate floor/room display
- [ ] Fix boss armor text color
- [ ] Fix armor damage bug
- [ ] Lower projectile range

### High Priority
- [ ] Boss spawn location fix
- [ ] Player entry from correct door
- [ ] Player always enters from door
- [ ] Increase door visual size
- [ ] No obstacles in first room
- [ ] Visual obstacle distinction
- [ ] Enemies remaining counter

### Medium Priority
- [ ] Improve enemy AI obstacle handling
- [ ] Twin guardians as separate bosses
- [ ] Penetrating shots design decision
- [ ] Regenerative shields (optional)

