# Multiplayer Synchronization Analysis

## Currently Implemented ✅

### Lobby/Party System
- ✅ Player names, invite codes, selected characters
- ✅ Player join/leave events
- ✅ Game start trigger
- ✅ Party panel with character icons

### Entity Spawning
- ✅ Enemy spawn (id, type, position, floor)
- ✅ Pickup spawn (XP and currency with value)
- ✅ Spawn messages broadcast to all clients

### Continuous State Sync (20Hz)
- ✅ Player positions (x, y)
- ✅ Player angle
- ✅ Player health (hp)
- ✅ Player level
- ✅ Player XP
- ✅ Enemy positions, health, type
- ✅ Projectile positions, angles
- ✅ Pickup positions, types

### Input Handling
- ✅ Client sends input to host (move, shoot, aimAngle)
- ✅ Host applies input to remote players

---

## CRITICAL MISSING ❌

### 1. Weapon/Upgrade State
**Problem:** Clients don't know what weapons/upgrades other players have
**Impact:**
- Can't render correct weapon visuals for remote players
- Weapon behavior won't match between clients
- Orbital weapons, multi-shot, etc. won't sync

**Solution Needed:**
```javascript
// Add to player state in collectGameState()
weapons: player.weapons.map(w => ({
    type: w.type,
    level: w.level,
    damage: w.damage
})),
upgrades: player.upgrades.map(u => u.id)
```

### 2. Projectile Spawn Events
**Problem:** Clients see projectiles in game_state but don't know WHEN they spawn
**Impact:**
- Projectiles pop into existence mid-flight
- No visual feedback for shooting
- Chain lightning, explosions won't trigger properly

**Solution Needed:**
```javascript
// In weapon firing code:
broadcast('spawn_projectile', {
    id: projectileId,
    x, y, angle,
    weaponType: weapon.type,
    damage: weapon.damage,
    ownerId: playerId
});
```

### 3. Damage Events
**Problem:** Only host calculates damage, clients don't see hit effects
**Impact:**
- No damage numbers on clients
- No hit flash effects
- No feedback when hitting enemies

**Solution Needed:**
```javascript
broadcast('damage_dealt', {
    targetId: enemy.mpEntityId,
    targetType: 'enemy',
    damage: finalDamage,
    isCrit: wasCrit,
    attackerId: playerId
});
```

### 4. Death Events
**Problem:** Entity deaths only implicit via existence check
**Impact:**
- No death animations sync
- XP/currency drop sync issues
- Boss death doesn't trigger properly

**Solution Needed:**
```javascript
broadcast('entity_destroyed', {
    entityId: entity.mpEntityId,
    entityType: 'enemy',
    x: entity.pos.x,
    y: entity.pos.y,
    droppedXP: xpAmount
});
```

### 5. Level Up Synchronization
**Problem:** Level ups only sync through continuous state updates
**Impact:**
- Upgrade screen doesn't trigger for host
- No celebration/pause when players level
- Upgrade selections not synced

**Solution Needed:**
```javascript
broadcast('player_level_up', {
    slotIndex: playerSlot,
    newLevel: player.level,
    pauseGame: true // Trigger upgrade screen
});
```

### 6. Floor/Wave Progression
**Problem:** No synchronization of game progression
**Impact:**
- Clients don't know when floor changes
- Room cleared state not synced
- Boss spawn timing not coordinated

**Solution Needed:**
```javascript
broadcast('floor_changed', {
    newFloor: floorNumber,
    roomsCleared: clearedRooms
});
```

---

## IMPORTANT MISSING ⚠️

### 7. Player Stats Sync
**Current:** Only hp/level/xp synced
**Missing:** Speed, damage multipliers, defense, pickup radius, etc.
**Impact:** Can't accurately predict movement or show correct stats

### 8. Boss Special States
**Missing:** Enraged flag, phase changes, special attack states
**Impact:** Boss behavior appears inconsistent across clients

### 9. Minimap State
**Missing:** Which rooms are visited, cleared, contain bosses
**Impact:** Minimap doesn't update for clients

### 10. Room Generation Seed
**Missing:** Random seed for room layout
**Impact:** Different room layouts between host and clients
**Severity:** CRITICAL if rooms are procedurally generated

---

## NICE TO HAVE 💡

### 11. Player Actions/Animations
- Dash animations
- Hit reactions
- Ability activations
**Current workaround:** Interpolate from position changes

### 12. Chat/Communication
- Ping system
- Quick chat commands
**Current workaround:** None (use external chat)

### 13. Latency Compensation
- Client-side prediction
- Server reconciliation
- Lag compensation for shooting
**Current:** Pure server authority (may feel laggy)

---

## ARCHITECTURE NOTES

### Current Model: Server-Authoritative
- Host simulates everything
- Clients are "dumb terminals" that render state
- Inputs sent to host, host updates state, state sent back

**Pros:**
- No cheating (host is authoritative)
- Simpler to implement
- Guaranteed consistency

**Cons:**
- Input lag for clients
- Host advantage (0ms latency)
- Network issues affect all clients

### Missing: Entity Lifecycle Events
Currently using implicit detection (exists() check) for:
- Entity spawn (except initial spawn)
- Entity destruction
- Entity state changes

**Should add explicit events for:**
- Projectile spawn/destroy
- Enemy spawn/death (already have spawn)
- Pickup spawn/collection
- Player death/respawn

---

## PRIORITY IMPLEMENTATION ORDER

### Phase 1 - Critical (Breaks Gameplay)
1. **Projectile spawn events** - Players can't see others shooting
2. **Damage events** - No hit feedback
3. **Weapon/upgrade state** - Wrong visuals
4. **Death events** - Broken death handling

### Phase 2 - Important (Bad UX)
5. **Level up sync** - Upgrade selection broken
6. **Floor progression** - Game flow broken
7. **Boss states** - Boss fights inconsistent

### Phase 3 - Polish (Nice to Have)
8. **Player stats sync** - Better info display
9. **Minimap sync** - QoL feature
10. **Latency compensation** - Better feel

---

## BANDWIDTH CONSIDERATIONS

**Current:**
- 20 updates/sec @ ~2KB each = ~40 KB/s = 320 Kbps per client
- With 3 clients = ~1 Mbps upload for host

**After adding events:**
- Projectile spawns: +50-100 events/sec @ 100 bytes = +5-10 KB/s
- Damage events: +20-50 events/sec @ 50 bytes = +1-2.5 KB/s
- Death events: +5-10 events/sec @ 100 bytes = +0.5-1 KB/s

**Total estimate: ~60-70 KB/s per client = ~480-560 Kbps**

**Recommendation:**
- Keep state sync at 20Hz
- Send events immediately (don't batch)
- Consider reducing state sync frequency to 15Hz if needed
