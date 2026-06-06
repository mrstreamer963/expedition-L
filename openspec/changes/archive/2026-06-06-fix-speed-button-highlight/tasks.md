## 1. Add active highlight to speed buttons

- [x] 1.1 Add an `activeButton` style to the `styles` object in `TopBar.tsx` (matching the pattern from `BuildMenu.tsx` with yellow highlight)
- [x] 1.2 Conditionally apply the active style on each speed button by comparing the button's speed value against `state.speed`

## 2. Fix racing GameWorld instances causing speed highlight flicker

- [x] 2.1 Destroy previous `GameWorld` in `handleCanvasReady` before creating a new one (prevents duplicate game loops in Strict Mode)
- [x] 2.2 Add `useEffect` cleanup in `App.tsx` to destroy `GameWorld` on unmount

## 3. Fix UI state not updating when speed is set to 0

- [x] 3.1 Call `emitUiState()` immediately in `setSpeed()` and `togglePause()` so the UI reflects the new speed even when the game loop is paused (timeScale=0 stops tick processing, preventing the periodic `emitUiState` from firing)
