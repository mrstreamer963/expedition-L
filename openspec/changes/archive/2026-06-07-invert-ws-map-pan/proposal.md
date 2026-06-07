## Why

Current W/S key behavior for map panning is unintuitive — pressing W pans the camera up and S pans it down. Most games and applications use the inverted convention where W pans down (toward the viewer in isometric space) and S pans up. Inverting these keys matches player expectations and reduces cognitive friction.

## What Changes

- Invert W/S pan direction in `InputHandler.update()` — W now pans the camera down (positive Y), S pans up (negative Y)
- Same inversion applies to Cyrillic layout equivalents (`ц`/`ы`)
- Camera pan speed and all other controls remain unchanged
- Middle-mouse drag panning is unaffected

## Capabilities

### New Capabilities
- `map-pan-controls`: Keyboard-based camera panning with intuitive W/S inversion for isometric map navigation

### Modified Capabilities

None — this is a new capability, no existing specs change.

## Impact

- `src/game/input/inputHandler.ts`: Swap sign of dy parameter in W and S pan calls (lines 104-105)
- No API, dependency, or system impact
