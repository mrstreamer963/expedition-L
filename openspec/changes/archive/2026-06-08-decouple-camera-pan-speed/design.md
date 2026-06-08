## Context

Camera panning speed is currently proportional to game speed because `InputHandler.update(dt)` is called inside `GameWorld.update(dt)`, which is driven by the game loop's fixed-timestep accumulator (`accumulator += dt * timeScale`). At GameSpeed 3 (10×), the camera pans 10× faster in real time, making precise navigation impractical.

The `InputHandler` is the only consumer of `dt` in `GameWorld.update()` that should respond to real-time input rather than game-time simulation.

## Goals / Non-Goals

**Goals:**
- Camera panning (WASD) feels the same at any game speed
- Middle-mouse drag panning also unaffected by game speed
- Minimal structural change — avoid refactoring the game loop architecture

**Non-Goals:**
- Changing how game simulation (colonist movement, needs, jobs) uses dt — those stay on game time
- Performance optimizations to the input system
- Touch/controller input changes

## Decisions

**Decision 1: Move input handling to the render loop instead of the game update loop**

The render loop in `GameLoop.loop()` runs once per `requestAnimationFrame` with real wall-clock `dt`. By calling `inputHandler.update(realDt)` there — after the game update loop but before rendering — camera panning uses real time, unaffected by `timeScale`.

*Alternatives considered:*
- **Pass real dt to GameWorld.update() separately** — more complex, would require threading two dt values through the update chain
- **Use `performance.now()` inside InputHandler** — hides the dt source, breaks the pattern of dt being passed explicitly
- **Separate rAF loop for input** — overengineered for this use case

Moving input to the render loop is the simplest change: one line added to `loop()`, one line removed from `GameWorld.update()`.

**Decision 2: Inline `CAMERA_SPEED * dt * 60` normalization at the new call site**

The existing `CAMERA_SPEED * dt * 60` formula in `InputHandler.update(dt)` assumes `dt` is the fixed game tick (1/60). Since the new real-time `dt` will vary (≈0.016 at 60fps), the formula naturally adapts: `CAMERA_SPEED * realDt * 60` gives ≈8 pixels per real frame regardless of game speed.

No changes needed to the formula itself.

## Risks / Trade-offs

- **Input state staleness**: If game speed is very high (10×), input is still polled once per rendered frame (e.g., 60fps = every ~16ms real time), not once per game tick (every ~1.6ms real time at 10×). For panning, this is unnoticeable — 60Hz key polling is more than sufficient.
- **Mouse drag during paused game**: Drag panning already uses raw pixel deltas without dt scaling, so it's unaffected. This change only affects keyboard panning.
