# Stat Normalization System

**Purpose:** Display normalized stats (1-100 scale) to players while using raw backend values for gameplay

---

## 🎯 Design Goals

- **Backend:** Use raw values that make sense for gameplay (pixels/second, damage points, etc.)
- **Display:** Show normalized values (1-100 scale) that are easy to understand
- **Flexibility:** Scale can be adjusted (1-10, 1-100, or add decimals later)
- **Consistency:** Normalization formulas should be consistent across all stats

---

## 📊 Stat Categories

### 1. **Health**
- **Backend:** Raw HP values (e.g., 100, 150, 200)
- **Display Scale:** 1-100 (or 1-10 with decimals)
- **Normalization:** `displayValue = (currentHP / maxHP) * 100`
- **Example:** 75/100 HP = 75 (or 7.5 on 1-10 scale)

### 2. **Speed**
- **Backend:** Pixels per second (e.g., 150, 200, 300)
- **Display Scale:** 1-100
- **Normalization:** Need to define baseline and max
  - **Baseline:** 150 pixels/sec = 50 (middle of scale)
  - **Max:** 300 pixels/sec = 100
  - **Formula:** `displayValue = ((speed - minSpeed) / (maxSpeed - minSpeed)) * 100`
  - **Or simpler:** `displayValue = (speed / 3)` where 150 = 50, 300 = 100

### 3. **Damage**
- **Backend:** Raw damage points (e.g., 10, 20, 50)
- **Display Scale:** 1-100
- **Normalization:** Similar to speed
  - **Baseline:** 10 damage = 50
  - **Max:** 50 damage = 100
  - **Formula:** `displayValue = (damage / 0.5)` where 10 = 50, 50 = 100

### 4. **Fire Rate**
- **Backend:** Shots per second (e.g., 1.5, 2.0, 5.0)
- **Display Scale:** 1-100
- **Normalization:** 
  - **Baseline:** 1.5 shots/sec = 50
  - **Max:** 5.0 shots/sec = 100
  - **Formula:** `displayValue = ((fireRate - 1.5) / (5.0 - 1.5)) * 50 + 50`

---

## 🔧 Implementation

### Stat Normalization Utility

```javascript
// src/utils/statNormalization.js

export const StatRanges = {
    health: { min: 0, max: 200, baseline: 100 },
    speed: { min: 50, max: 300, baseline: 150 },
    damage: { min: 5, max: 50, baseline: 10 },
    fireRate: { min: 0.5, max: 5.0, baseline: 1.5 },
    // Add more as needed
};

/**
 * Normalize a stat value for display (1-100 scale)
 * @param {string} statType - Type of stat ('health', 'speed', etc.)
 * @param {number} rawValue - Raw backend value
 * @param {number} scale - Display scale (default 100, can be 10 for 1-10 scale)
 * @returns {number} Normalized display value
 */
export function normalizeStat(statType, rawValue, scale = 100) {
    const range = StatRanges[statType];
    if (!range) return rawValue; // Return raw if no normalization defined
    
    // Clamp value to range
    const clamped = Math.max(range.min, Math.min(range.max, rawValue));
    
    // Normalize to 0-1, then scale
    const normalized = (clamped - range.min) / (range.max - range.min);
    return Math.round(normalized * scale);
}

/**
 * Get stat display value with optional decimals
 * @param {string} statType - Type of stat
 * @param {number} rawValue - Raw backend value
 * @param {number} scale - Display scale (100 or 10)
 * @param {number} decimals - Number of decimal places (0 for integers)
 * @returns {string} Formatted display value
 */
export function formatStat(statType, rawValue, scale = 100, decimals = 0) {
    const normalized = normalizeStat(statType, rawValue, scale);
    return normalized.toFixed(decimals);
}

/**
 * Get stat comparison (current vs baseline)
 * @param {string} statType - Type of stat
 * @param {number} rawValue - Current raw value
 * @returns {object} Comparison data
 */
export function compareStat(statType, rawValue) {
    const range = StatRanges[statType];
    if (!range) return null;
    
    const normalized = normalizeStat(statType, rawValue);
    const baselineNormalized = normalizeStat(statType, range.baseline);
    
    return {
        display: normalized,
        baseline: baselineNormalized,
        difference: normalized - baselineNormalized,
        percentage: ((normalized / baselineNormalized) - 1) * 100
    };
}
```

### Usage Examples

```javascript
import { normalizeStat, formatStat, compareStat } from './utils/statNormalization.js';

// Normalize player stats for display
const playerSpeed = 150; // pixels/second
const displaySpeed = normalizeStat('speed', playerSpeed); // Returns 50 (on 1-100 scale)

const playerDamage = 10;
const displayDamage = normalizeStat('damage', playerDamage); // Returns 50

// Format for UI
const speedText = formatStat('speed', playerSpeed, 100, 0); // "50"
const damageText = formatStat('damage', playerDamage, 100, 0); // "50"

// Compare to baseline
const speedComparison = compareStat('speed', 200);
// Returns: { display: 75, baseline: 50, difference: 25, percentage: 50 }
// Meaning: 200 speed is 50% faster than baseline (150)
```

---

## 📐 Scale Options

### Option 1: 1-100 Scale (Recommended for Start)
- **Pros:** 
  - Familiar percentage-like scale
  - Good granularity (100 possible values)
  - Easy to understand
- **Cons:** 
  - Might feel arbitrary (why 100?)
  - Larger numbers in UI

### Option 2: 1-10 Scale
- **Pros:**
  - Smaller, cleaner numbers
  - Easy to understand
  - Can add decimals (7.5) for more precision
- **Cons:**
  - Less granularity (only 10-20 meaningful values)
  - Decimals might feel unnecessary

### Option 3: 1-10 with Decimals
- **Pros:**
  - Clean numbers (7.5, 8.2, etc.)
  - Good balance of precision and simplicity
- **Cons:**
  - Slightly more complex to display
  - Need to decide decimal places (1 or 2?)

**Recommendation:** Start with **1-100 scale** (familiar, good granularity), can switch to 1-10 later if needed.

---

## 🎮 UI Display Examples

### Character Selection Screen
```
The Survivor
Health:  75/100  (Display: 75)
Speed:  50/100  (Display: 50, from 150 pixels/sec)
Damage: 50/100  (Display: 50, from 10 damage)
Fire Rate: 50/100  (Display: 50, from 1.5 shots/sec)
Ability: +10% XP Gain
```

### In-Game HUD
```
Health: ████████░░ 75/100
Level: 5
XP: ████░░░░░░ 40/100
```

### Upgrade Selection
```
+10 Damage
Current: 50 → New: 60
(Backend: 10 → 12)
```

---

## 🔄 Stat Progression

### How Stats Scale

#### Health:
- **Starting:** 100 HP (Display: 50 on 1-100 scale, or 5 on 1-10 scale)
- **With Upgrades:** +10 HP per upgrade
- **Display:** Show current/max, normalize both

#### Speed:
- **Starting:** 150 px/s (Display: 50)
- **With Upgrades:** +25 px/s per upgrade
- **Display:** Normalize current speed value

#### Damage:
- **Starting:** 10 damage (Display: 50)
- **With Upgrades:** +2 damage per upgrade
- **Display:** Normalize current damage value

#### Fire Rate:
- **Starting:** 1.5 shots/sec (Display: 50)
- **With Upgrades:** +0.5 shots/sec per upgrade
- **Display:** Normalize current fire rate

---

## 📝 Implementation Notes

### Backend Values (Keep As-Is)
- Use raw values that make gameplay sense
- No need to change existing code
- Calculations use raw values

### Display Layer (New)
- Create normalization utility
- Use in UI components only
- Keep backend calculations unchanged

### Stat Ranges (Configurable)
- Define min/max/baseline per stat type
- Easy to adjust if needed
- Can be data-driven (JSON config)

### Future Flexibility
- Can switch scales (100 → 10) easily
- Can add decimals if needed
- Can add new stat types easily

---

## ✅ Benefits

1. **Player-Friendly:** Easy to understand normalized values
2. **Developer-Friendly:** Backend uses sensible raw values
3. **Flexible:** Can adjust scale or add decimals later
4. **Consistent:** Same normalization approach for all stats
5. **Maintainable:** Clear separation between backend and display

---

## 🧪 Testing

When implementing, test:
- [ ] Normalization formulas produce expected values
- [ ] UI displays normalized values correctly
- [ ] Backend calculations unaffected
- [ ] Stat comparisons make sense
- [ ] Scale changes work (100 → 10)
- [ ] Edge cases handled (values outside range)





