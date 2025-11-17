# Minimap Three-State System

## Overview
Implemented a three-state minimap system that cycles through minimized, open, and maximized modes.

## States

### 1. Minimized (Starting State) 🔘
**Visual:**
- Small 40x40 pixel button in top-right corner
- Map icon (◧) displayed prominently
- Floor number badge in corner
- Blue outline border

**Location:** `x: width - 50, y: 30`

**Features:**
- Compact, non-intrusive
- Shows floor number at a glance
- Click to open minimap

### 2. Open (Small Minimap) 📍
**Visual:**
- Small 140x80 minimap display
- 12x12 pixel grid cells
- Shows current room, visited rooms, available paths
- Room counter at bottom
- "click to expand" hint

**Location:** `x: width - 120, y: 30`

**Features:**
- Shows complete floor grid
- Room symbols:
  - ★ Current room (yellow)
  - ● Cleared room (green)
  - ▫ Available room (gray)
  - B Boss room (red)
  - ▪ Hidden room (dark)
- Room progress counter: "visited/total"
- Click to maximize

### 3. Maximized (Full Minimap with Legend) 🗺️
**Visual:**
- Large minimap display (220+ width, 180+ height)
- 18x18 pixel grid cells
- Title bar with floor and room count
- Detailed grid with cell backgrounds
- **Complete legend** showing all room types
- "click to minimize" hint

**Location:** `x: width - 250, y: 30`

**Features:**
- Larger, easier to read grid
- Cell backgrounds and borders for clarity
- Title bar: "FLOOR X - ROOM Y/Z"
- **Legend entries:**
  - ★ Current Room (yellow)
  - ● Cleared Room (green)
  - ▫ Available Room (gray)
  - B Boss Room (red)
- Click to minimize (returns to minimized state)

## State Cycling

**Click Behavior:**
```
Minimized → Open → Maximized → Minimized (cycle repeats)
   🔘    →   📍   →    🗺️     →    🔘
```

**Starting State:** Minimized (small button only)

## Implementation Details

### Mode Constants
```javascript
const MINIMAP_MODE = {
    MINIMIZED: 'minimized',  // Just a map button
    OPEN: 'open',            // Small minimap
    MAXIMIZED: 'maximized'   // Large minimap with legend
};
```

### Toggle Logic
```javascript
toggle() {
    if (this.mode === MINIMIZED) {
        this.mode = OPEN;
    } else if (this.mode === OPEN) {
        this.mode = MAXIMIZED;
    } else {
        this.mode = MINIMIZED;
    }
    this.update();
}
```

### Render Methods
- `renderMinimized()` - Shows map button with floor badge
- `renderOpen()` - Shows small grid minimap
- `renderMaximized()` - Shows large minimap with legend

## Visual Design

### Minimized Button
- **Size:** 40x40 pixels
- **Icon:** ◧ (map symbol)
- **Colors:**
  - Background: Dark blue (30, 30, 50)
  - Border: Light blue (100, 150, 200)
  - Icon: Sky blue (150, 180, 255)
  - Badge: Yellow (255, 255, 100)

### Open Minimap
- **Size:** 140x80 pixels
- **Grid:** 12px cells
- **Colors:**
  - Background: Dark (20, 20, 30)
  - Border: Blue (100, 150, 200)
  - Current: Yellow (255, 255, 100)
  - Visited: Green (100, 255, 100)
  - Revealed: Gray (150, 150, 150)
  - Hidden: Dark gray (60, 60, 80)
  - Boss: Red (255, 100, 100)

### Maximized Minimap
- **Size:** Dynamic (minimum 220x180)
- **Grid:** 18px cells
- **Features:**
  - Title bar with dark background
  - Cell backgrounds and outlines
  - Legend with 4 entries
  - Professional appearance

## User Experience

### Benefits
1. **Non-intrusive start:** Game starts with minimal UI clutter
2. **Quick access:** One click shows full minimap
3. **Detailed view:** Two clicks shows legend and larger view
4. **Easy toggle:** Three clicks returns to button

### Hints
- **Minimized:** No hint (button is self-explanatory)
- **Open:** "(click to expand)" - indicates more info available
- **Maximized:** "(click to minimize)" - indicates how to close

## Files Modified

**src/systems/minimap.js**
- Changed `MINIMAP_MODE` enum from 2 to 3 states
- Updated constructor to start in MINIMIZED mode
- Modified `toggle()` to cycle through 3 states
- Added `renderMinimized()` method
- Renamed `renderCompact()` to `renderOpen()`
- Renamed `renderExpanded()` to `renderMaximized()`
- Updated position constants for all three states

## Testing Recommendations

1. **State Transitions:**
   - Click button → should show small minimap
   - Click minimap → should show large minimap with legend
   - Click large minimap → should return to button

2. **Visual Verification:**
   - Minimized button displays in top-right
   - Floor number badge visible on button
   - Open minimap shows grid correctly
   - Maximized minimap shows legend with 4 entries

3. **Room Navigation:**
   - Current room marked with ★
   - Visited rooms marked with ●
   - Boss rooms marked with B
   - Room counter updates correctly

## Summary

The minimap now has three distinct states:
- ✅ **Minimized** - Small map button (starting state)
- ✅ **Open** - Small minimap grid
- ✅ **Maximized** - Large minimap with legend
- ✅ Cycles through states on click
- ✅ Legend only shows in maximized state
- ✅ Clear visual hints for user guidance
