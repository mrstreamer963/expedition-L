## Why

Simulation can feel slow even at 5x during long idle periods (e.g., waiting for crops, research, or long-distance colonist travel). A 10x speed tier lets players fast-forward through downtime more efficiently.

## What Changes

- Add a new `speed: 3` game speed tier that runs the simulation at 10x time scale
- Add a fourth speed button `▶▶▶ 10x` in the TopBar UI alongside existing pause/1x/5x buttons, in the same visual style
- Add keyboard shortcut `4` to activate 10x speed
- Extend `GameSpeed` type from `0 | 1 | 2` to `0 | 1 | 2 | 3`
- Update save/load to handle the new speed value
- Update the ui spec with a scenario for the 10x button

## Capabilities

### New Capabilities
*(none — this extends existing speed system, no new standalone capability)*

### Modified Capabilities
- `ui`: Add requirement that a 10x speed button exists and shows active state when speed is 3

## Impact

- `src/store/types.ts` — `GameSpeed` type change
- `src/game/gameWorld.ts` — `setSpeed()` mapping for speed=3 → 10x, keyboard shortcut `4`, save/load compat
- `src/ui/TopBar.tsx` — new button
- `src/game/gameLoop.ts` — no changes needed (already accepts arbitrary timeScale)
