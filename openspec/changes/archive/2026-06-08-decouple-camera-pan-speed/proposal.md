## Why

Camera panning speed currently scales with game speed because input is processed inside the game's time-scaled update loop. At 10× speed, the camera also pans 10× faster, making precise navigation impossible at high game speeds.

## What Changes

- Camera panning (keyboard and middle-mouse drag) will be processed with real-time delta, not game-time delta, so panning feels the same regardless of game speed
- Input handling will move from the game update loop to the render loop or use real-time delta
- The `inputHandler.update(dt)` method will receive unscaled real-time delta instead of the fixed game tick

## Capabilities

### New Capabilities
- `camera-pan-speed-decoupling`: Decouple camera panning from game speed scaling

### Modified Capabilities
- `map-pan-controls`: Pan speed must remain constant regardless of game speed setting

## Impact

- `src/game/input/inputHandler.ts` — `update(dt)` must use real time, not game time
- `src/game/gameWorld.ts` — input handling must happen outside the game's time-scaled update, or receive real dt
- `src/game/gameLoop.ts` — render loop step must pass real dt for input
- `src/game/camera.ts` — no changes expected (pan() is dt-agnostic)
