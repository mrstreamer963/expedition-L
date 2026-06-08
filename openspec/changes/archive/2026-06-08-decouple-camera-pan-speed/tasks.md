## 1. Move input handling from game update loop to render loop

- [x] 1.1 Remove `this.inputHandler.update(dt)` call from `GameWorld.update()`
- [x] 1.2 Add `this.inputHandler.update(realDt)` call in `GameLoop.loop()` before rendering, using wall-clock dt (not game-time dt)

## 2. Expose real dt to the render callback

- [x] 2.1 Update `GameLoop` to pass real wall-clock `dt` (not `TICK`) to the `onRender` callback alongside the render context
- [x] 2.2 Wire `GameWorld.render()` to forward real dt to `inputHandler.update()`

## 3. Verify behavior

- [x] 3.1 Keyboard panning works at all game speeds (0, 1, 2, 3) with identical real-time speed
- [x] 3.2 Middle-mouse drag panning unaffected
- [x] 3.3 No regression: game simulation still runs at correct speed
