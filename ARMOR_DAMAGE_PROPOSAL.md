# Armor Damage-Reduction — Investigation & Fix Proposal

**Status:** Proposal only. No code changed. Awaiting decision (this is a balance change).

**Affected code (identical logic in all three):**
- `src/entities/enemy.js` — `takeDamageInternal` (~line 253)
- `src/entities/boss.js` — `takeDamageInternal` (~line 184)
- `src/entities/miniboss.js` — `takeDamageInternal` (~line 144)

---

## Current code

```js
enemy.takeDamageInternal = function(damage) {
    if (enemy.armorHealth > 0) {
        // "reducedDamage" = damage AFTER reduction (the part NOT reduced away)
        const reducedDamage = Math.floor(damage * (1 - enemy.damageReduction));
        const armorDamage   = Math.min(reducedDamage, enemy.armorHealth);
        enemy.armorHealth   = Math.max(0, enemy.armorHealth - armorDamage);

        // "remainingDamage" = the part reduction REMOVED  (= damage * damageReduction)
        const remainingDamage = damage - reducedDamage;
        if (remainingDamage > 0) {
            const damageMultiplier = enemy.armorHealth > 0 ? (1 - enemy.damageReduction) : 1;
            const finalDamage = Math.floor(remainingDamage * damageMultiplier);
            enemy.hurt(finalDamage);
        }
    } else {
        enemy.hurt(damage); // no armor → full damage (damageReduction only matters while armored)
    }
};
```

## Why it's wrong

Let `D` = incoming damage, `DR` = `damageReduction`, `A` = `armorHealth`.

- `reducedDamage R = D·(1−DR)` — the post-reduction damage — is sent to **armor**.
- `remainingDamage = D − R = D·DR` — the portion reduction was supposed to *negate* — is instead routed toward **health** (reduced again if armor survives, full if armor just broke).

So the chunk that "damage reduction" removes does **not** disappear — it leaks to health. Consequences:

1. **Higher reduction → more health leak.** While armor is up, health damage = `D·DR·(1−DR)`, which *peaks at DR = 0.5*. A 50%-reduction enemy takes the **most** health damage through its armor — the opposite of "reduction."
2. **Harsh armor-break hit.** On the hit that breaks armor, `remainingDamage` goes through at full (`×1`), so `D·DR` lands on health at once — biggest for high-DR enemies.
3. **Non-monotonic, unintuitive tuning.** Raising an enemy's `damageReduction` does not reliably make it tankier.

### Worked example (`D = 100`, armor still up)

| DR  | armor takes (R) | health takes |
|-----|-----------------|--------------|
| 0.0 | 100             | 0            |
| 0.3 | 70              | 21           |
| 0.5 | 50              | 25           |
| 0.7 | 30              | 21           |
| 0.9 | 10              | 9            |

(At DR 0 the armor soaks everything but melts fast; at DR 0.9 armor barely depletes yet health still bleeds — neither matches "30% reduction = 30% less damage.")

---

## Proposed fix (standard armor model)

Reduce the incoming damage, apply it to armor, and pass only the **overflow past armor** to health:

```js
enemy.takeDamageInternal = function(damage) {
    if (enemy.armorHealth > 0) {
        const reduced     = Math.floor(damage * (1 - enemy.damageReduction)); // post-reduction
        const armorDamage = Math.min(reduced, enemy.armorHealth);
        enemy.armorHealth = Math.max(0, enemy.armorHealth - armorDamage);

        const overflow = reduced - armorDamage; // only what armor couldn't absorb
        if (overflow > 0) {
            enemy.hurt(overflow);
        }
    } else {
        enemy.hurt(damage); // unchanged: no armor → full damage
    }
};
```

Result: armor absorbs the reduced damage; health takes nothing until armor is gone; higher `damageReduction` is strictly tankier and monotonic.

## Balance impact (important)

This makes armored enemies **noticeably tankier** in the common case: while armor is up, **0** damage leaks to health (today it leaks `D·DR·(1−DR)` per hit). Expect armored enemies/bosses to feel meaningfully harder. Likely follow-up tuning:

- Lower `armorHealth` / `damageReduction` values on armored enemy/boss/miniboss configs, **or**
- Apply `damageReduction` in the no-armor `else` branch too if DR is meant to be a permanent trait rather than an armor-only effect (design call).

## Recommendation

Adopt the standard model in all three files **together** (they must stay consistent), then playtest armored floors and adjust armor/DR config values. Because it shifts difficulty, ship it as its own change — not bundled with unrelated fixes — so it can be tuned or reverted independently.
