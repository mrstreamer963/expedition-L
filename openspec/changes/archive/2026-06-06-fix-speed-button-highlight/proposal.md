## Why

The speed control buttons (pause, normal, fast) in the top bar do not visually indicate which speed is currently active. This makes it unclear what state the simulation is in at a glance, hurting usability.

## What Changes

- Speed buttons in `TopBar.tsx` will conditionally apply an active highlight style based on the current `state.speed` value
- The active style will follow the existing pattern from `BuildMenu.tsx` (yellow highlight with `rgba(255, 200, 0, 0.3)` background and `#ffc800` border)
- No game logic changes — purely visual

## Capabilities

### New Capabilities
<!-- None — this is a UI-only change to existing functionality -->

### Modified Capabilities
- `ui`: Add requirement that speed control buttons visually indicate the active speed

## Impact

- `src/ui/TopBar.tsx` — conditional styling on the 3 speed buttons
- No changes to game engine, store, or other components
