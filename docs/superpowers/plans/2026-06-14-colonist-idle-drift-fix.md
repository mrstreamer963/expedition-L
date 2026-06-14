# Colonist Idle Drift Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Stop idle colonists from drifting across the map every frame due to `reclaimCurrentTile` not recognizing self-occupancy.

**Architecture:** Three targeted changes in `src/game/colony/colonist.ts`: (1) remove per-frame `snapIdlePosition` call for idle colonists, (2) fix `reclaimCurrentTile` to check `=== this.id` in addition to `=== null`, (3) clear stale occupant data when spiral search moves a colonist to a new tile.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Remove per-frame snapIdlePosition for idle colonists

**Files:**
- Modify: `src/game/colony/colonist.ts:30-36`

- [ ] **Remove `snapIdlePosition` call from idle phase**

```typescript
// Before:
if (s.phase === 'idle') {
  this.snapIdlePosition(map)
  return
}

// After:
if (s.phase === 'idle') {
  return
}
```

Also remove the now-unused `snapIdlePosition` method:

```typescript
// Delete:
private snapIdlePosition(map: GameMap): void {
  this.reclaimCurrentTile(map)
}
```

### Task 2: Fix reclaimCurrentTile to recognize own occupancy

**Files:**
- Modify: `src/game/colony/colonist.ts:109-151`

- [ ] **Check `=== this.id` alongside `=== null` in the first occupancy check**

```typescript
// Before:
if (map.getOccupant(rx, ry) === null) {
  this.position = { x: rx, y: ry }
  map.setOccupant(rx, ry, this.id)
  return
}

// After:
const occ = map.getOccupant(rx, ry)
if (occ === null || occ === this.id) {
  this.position = { x: rx, y: ry }
  if (occ === null) map.setOccupant(rx, ry, this.id)
  return
}
```

### Task 3: Clear stale occupant when moving during reclaim fallback

**Files:**
- Modify: `src/game/colony/colonist.ts`

- [ ] **Add `clearOccupant` helper and call it before moving to floor/ceil/spiral tiles**

```typescript
private clearOccupant(map: GameMap, x: number, y: number): void {
  if (map.getOccupant(x, y) === this.id) {
    map.setOccupant(x, y, null)
  }
}
```

Add `this.clearOccupant(map, rx, ry)` before each floor/ceil/spiral position set.

### Task 4: Run tests and verify

- [ ] **Run test suite**

```bash
npm test
```

Expected: all 59 tests pass.

- [ ] **Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **In-browser verification** — start dev server, open game, poll colonist positions over 3+ seconds to confirm positions remain at spawn (10,10), (13,10), (16,10) without drifting.
