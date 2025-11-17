# Development Priorities & Next Steps

**Last Updated:** 2025-01-15
**Status:** Post-Architecture Refactor - Menu Polish & Shop Updates

---

## 🎉 Major Milestone: Architecture Refactor Complete!

**What Was Accomplished (Jan 2025):**
- ✅ **Constants System**: Centralized game config for easy tuning
- ✅ **Data-Driven Content**: 21 enemies, 4 bosses, 5 minibosses as pure data
- ✅ **Multiplayer Architecture**: GameState, InputManager, NetworkManager
- ✅ **Full Documentation**: Comprehensive headers and inline comments
- ✅ **Code Cleanup**: Zero dead code, organized imports, pristine structure
- ✅ **Future-Ready**: Architecture prepared for Windows/browser co-op multiplayer

---

## ✅ Completed Priority Items

### Immediate (All Complete!)
- ✅ Visual pause indication (pause overlay implemented)
- ✅ Remove radius from display (clean HUD)
- ✅ Level/XP decimal format (`Level: 1.55` shows 55% to next level)
- ✅ Consolidate floor/room display (`F1 R1` format)
- ✅ Fix boss armor text color (white text on bars)
- ✅ Fix armor damage bug (multi-layer damage system working correctly)
- ✅ Lower projectile range (range limits implemented, 600px default)

### High Priority (All Complete!)
- ✅ Boss spawn location fix (avoids entrance door)
- ✅ Player entry from correct door (`entryDirection` system)
- ✅ Player always enters from door (safe spawn zones implemented)
- ✅ Increase door visual size (using `=` characters)
- ✅ No obstacles in first room (floor 1, room 1 check)
- ✅ Visual obstacle distinction (walls `#` vs cover distinct)
- ✅ Enemies remaining counter (shows X/Y in HUD)

### Medium Priority (Most Complete!)
- ✅ Twin Guardians as separate bosses (implemented with opposite door spawning)
- ✅ Penetrating shots decision (separate `piercing` and `obstaclePiercing` stats)
- ✅ Regenerative shields for bosses (implemented with 3s cooldown after damage)
- ✅ Menu UI standardization and polish (credit indicators, back buttons, character icons, escalating prices)
- ⚠️ Enemy AI obstacle handling (basic avoidance, could be improved)

---

## 🎉 Recent Updates (January 2025)

### Menu UI Improvements
- ✅ **Standardized Credit Indicator**: Unified credit display across all menus with rotating currency symbols ($, ₤, €, ₿, ¥, £, ¢, ₹)
- ✅ **Standardized Back Buttons**: Consistent styling, size, and positioning across all menu scenes
- ✅ **Character Icons in Shop**: Visual character icons displayed on shop's character page
- ✅ **Shop Improvements**: 
  - Escalating upgrade prices (Level 1=$50, Level 2=$65, Level 3=$90, Level 4=$115, Level 5=$160)
  - Price display with $ prefix
  - Green border for unlocked characters (replaces "UNLOCKED" text)
  - Refund button matches "Reset to Defaults" button formatting from Settings menu
  - Refund button displays amount in button text: "REFUND: $[Amount]"
  - Centered tab buttons (Upgrades, Characters, Weapons)
- ✅ **Pause Menu**: Fixed spacing and removed "(ESC)" text from Resume button
- ✅ **Weapon Detail State**: Properly saves and restores minimized/maximized state when pausing/unpausing
- ✅ **Statistics Menu**: Added padding between Statistics and Achievements tab buttons
- ✅ **Character Select Menu**: Updated to match formatting of other menus (background color, title font/size/position)
- ✅ **Background Particle Effects**: Applied to all menu pages and tabs

## 🎯 Current Focus Areas

### 🔴 **Performance & Optimization**
1. **Object Pooling** (Future)
   - Pool projectiles, enemies, pickups to reduce GC pressure
   - **Impact:** High - better performance at high enemy counts
   - **Complexity:** Medium (2-3 hours)

2. **Spatial Partitioning** (Future)
   - Implement quadtree for collision detection
   - **Impact:** High - scales better with many entities
   - **Complexity:** High (4-6 hours)

### 🟡 **Content Expansion**
3. **More Synergies** (Active Development)
   - Add more upgrade combinations beyond the current 8
   - **Impact:** High - increases build variety
   - **Complexity:** Low-Medium (data-driven now!)

4. **More Room Templates** (Active Development)
   - Add variety beyond current 6 templates
   - **Impact:** Medium - increases visual variety
   - **Complexity:** Low (easy with data-driven system)

5. **Balance Tuning** (Ongoing)
   - Fine-tune enemy health, damage, spawn rates
   - **Impact:** High - affects game feel
   - **Complexity:** Low (constants system makes this easy!)

### 🟢 **Future Features**
6. **Multiplayer Implementation** (Architecture Ready!)
   - Implement WebRTC/WebSocket networking
   - Use existing NetworkManager as foundation
   - **Impact:** Very High - major feature
   - **Complexity:** Very High (weeks of work)

7. **More Weapon Types** (Easy with Data System)
   - Add new weapons beyond current 7 types
   - **Impact:** Medium - build variety
   - **Complexity:** Low (data-driven)

8. **Advanced Procedural Generation** (Future)
   - More complex room layouts
   - Multiple floor themes
   - **Impact:** Medium - visual variety
   - **Complexity:** Medium

---

## 🐛 Known Issues

### Minor Issues
- **Enemy pathfinding**: Enemies can get stuck on obstacles (low priority, gameplay still works)
- **Visual effects**: No particle system yet (polish item)

### Shop Issues
- ⚠️ **Upgrade purchasing bug**: One click purchases as many upgrade levels as the player can afford, instead of purchasing one level per click. Needs investigation and fix.

### No Critical Bugs! 🎉
All major gameplay bugs have been fixed!

---

## 💡 Design Decisions Made

1. ✅ **Penetrating Shots:** Separate stats for enemy penetration vs obstacle penetration
   - Allows strategic choices (pierce enemies vs pierce walls)

2. ✅ **Armor vs Shields:** Different mechanics implemented
   - Armor `[]`: Reduces damage, damaged first after shields
   - Shields `{}`: Takes normal damage, regenerates after 3s

3. ✅ **State Management:** Centralized GameState for multiplayer
   - All state is serializable (JSON-ready)
   - Input history for rollback/replay

---

## 📊 Implementation Order (Recommended)

### Phase 1: Content & Polish (Now - Next 2 Weeks)
1. Add more synergies (easy wins)
2. Add more room templates
3. Balance tuning pass
4. More upgrade variety

### Phase 2: Performance (As Needed)
1. Profile performance with many entities
2. Implement object pooling if needed
3. Add spatial partitioning if needed

### Phase 3: Multiplayer (Future Major Feature)
1. Implement WebRTC/WebSocket layer
2. Test state synchronization
3. Handle latency and prediction
4. Implement lobby/matchmaking

---

## 🎯 Success Metrics

**Code Quality:**
- ✅ Zero dead code
- ✅ Comprehensive documentation
- ✅ Clean, maintainable architecture
- ✅ Easy to add content (data-driven)

**Gameplay:**
- ✅ Core loop is fun and engaging
- ✅ No critical bugs
- ✅ Balanced difficulty progression
- 🔄 Adequate content variety (expanding)

**Technical:**
- ✅ Fast hot reload (Vite)
- ✅ Multiplayer-ready architecture
- ✅ Browser localStorage saves
- 🔄 Performance optimization (as needed)

---

## 📝 Notes

- **Focus on content and polish** now that architecture is solid
- **Performance optimization** can wait until needed (no issues currently)
- **Multiplayer** is a major feature requiring significant time investment
- **Data-driven system** makes adding content extremely fast
- **Architecture** is production-ready and future-proof

---

**Next Review:** After next content/balance pass
