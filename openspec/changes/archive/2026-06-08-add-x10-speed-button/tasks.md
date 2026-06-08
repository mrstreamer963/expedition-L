## 1. Type & State Changes

- [x] 1.1 Extend `GameSpeed` type in `src/store/types.ts` from `0 | 1 | 2` to `0 | 1 | 2 | 3`

## 2. Game Engine Changes

- [x] 2.1 Update `setSpeed()` in `src/game/gameWorld.ts` to map speed `3` → timeScale `10`
- [x] 2.2 Add keyboard shortcut `4` → speed `3` in the `onKey` handler
- [x] 2.3 Handle save/load backward compatibility — clamp unknown speed values to `2`

## 3. UI Changes

- [x] 3.1 Add `▶▶▶ 10x` button to `src/ui/TopBar.tsx` with active state highlight
- [x] 3.2 Update `TopBarProps.onSetSpeed` type to accept `0 | 1 | 2 | 3`

## 4. Verify

- [x] 4.1 Build and type-check: `tsc -b` + `npm run build` — pass
- [x] 4.2 All tests pass (11/11)
- [x] 4.3 Manual test: all 4 speed buttons work, active state shows correctly
