## Context

The `InputHandler` class in `src/game/input/inputHandler.ts` handles WASD keyboard panning by tracking pressed keys in a `Set<string>` and applying camera deltas each frame in the `update(dt)` method. Currently W pans up (`pan(0, -speed)`) and S pans down (`pan(0, speed)`). The user reports this feels inverted — W should pan down, S should pan up.

## Goals / Non-Goals

**Goals:**
- Swap W and S pan direction so W moves the camera down and S moves it up
- Apply the same swap to Cyrillic equivalents (`ц` → `ы`)

**Non-Goals:**
- No changes to A/D panning, middle-mouse drag, camera speed, or any other input handling
- No new configuration/settings — this is a direct swap

## Decisions

- **Direct sign swap**: The simplest change is to flip the `dy` sign in the two `camera.pan()` calls on lines 104-105. No new abstractions needed.
- **Alternative considered — configurable inversion**: Overkill for a binary change that should be the default. Can be added later if requested.

## Risks / Trade-offs

- **Muscle memory**: Existing players accustomed to the old behavior will need to re-adapt. This is a one-time cost justified by the long-term benefit of an intuitive default.
