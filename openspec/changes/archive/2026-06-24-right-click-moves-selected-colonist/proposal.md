## Why

Right-click movement always moves the nearest colonist to the click target, ignoring which colonist the player has selected. This breaks the core expectation that selecting a colonist then right-clicking moves that specific colonist.

## What Changes

- Right-click will move the **selected** colonist (if one is selected) instead of the nearest one
- If no colonist is selected, right-click falls back to moving the nearest colonist (existing behavior)
- `PlayerAction` type gains optional `colonistId` for right-click actions
- Core game server (`GameWorld`) learns about colonist selection via the action payload

## Capabilities

### New Capabilities
- `selected-colonist-movement`: Right-click dispatches movement to the currently selected colonist rather than the geographically nearest one. When no colonist is selected, the behavior falls back to nearest-colonist.

### Modified Capabilities

None.

## Impact

- `src/core/types.ts`: `PlayerAction` right-click variant gains optional `colonistId: string`
- `src/core/gameWorld.ts`: `handleRightClick` accepts optional colonistId, moves specific colonist if provided
- `src/game/gameHost.ts`: Right-click action includes `selectedColonistId` when a colonist is selected
