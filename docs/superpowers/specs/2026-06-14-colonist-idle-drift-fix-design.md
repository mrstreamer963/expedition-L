# Colonist Idle Drift Fix

## Problem

Idle colonists drift across the map every frame instead of staying in place. They never eat or sleep because their positions constantly change due to the drift.

## Root Cause

`snapIdlePosition()` → `reclaimCurrentTile()` is called every frame for idle colonists via `Colonist.update()`. The method fails to recognize when a tile is already occupied by the same colonist:

1. `reclaimCurrentTile` only checks `getOccupant(rx, ry) === null` — it does NOT check whether the occupant is the colonist themselves.
2. Since the tile IS occupied (by the colonist, from init or a previous reclaim), the check fails, falling through to floor/ceil (identical for integer positions).
3. Falls through to a spiral search up to radius 3, which finds the nearest **empty** tile and moves the colonist there.
4. The old tile occupant is never cleared, leaving stale data behind.

This creates a cascade: every frame, each idle colonist jumps to a new nearby tile, corrupting the occupancy grid for other colonists' pathfinding.

## Changes

### `src/game/colony/colonist.ts`

**1. Remove `snapIdlePosition` call from idle phase:**
Idle colonists no longer call `reclaimCurrentTile` every frame. Tile snapping only happens during state transitions (e.g., `moving → idle`).

**2. Fix `reclaimCurrentTile` to recognize own occupancy:**
The first check now handles `getOccupant(rx, ry) === this.id` — the colonist stays in place if they already own the tile.

**3. Clear old occupant when moving during reclaim:**
Added `clearOccupant()` helper to clear stale occupant data from the previous tile before snapping to a new tile via floor/ceil/spiral fallbacks.

## Verification

- All 59 existing tests pass.
- TypeScript type-check passes (`tsc --noEmit`).
- Observed in-browser: colonists remain at spawn positions (10,10), (13,10), (16,10) over multiple seconds without drifting.
- Needs (hunger, sleep) decrease normally as the game runs.
