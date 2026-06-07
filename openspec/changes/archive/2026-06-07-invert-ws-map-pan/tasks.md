## 1. Invert W/S Pan Direction

- [x] 1.1 Swap W and S dy signs in `src/game/input/inputHandler.ts` — change line 104 from `pan(0, -speed)` to `pan(0, speed)` and line 105 from `pan(0, speed)` to `pan(0, -speed)`
- [x] 1.2 Verify the build compiles and camera panning works correctly in both Latin and Cyrillic layouts
