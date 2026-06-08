## Context

The game has 3 speed tiers: paused (0), normal 1x (1), and fast 5x (2). The `GameLoop` already accepts arbitrary `timeScale` values — no engine changes needed. Adding a 10x tier is purely a UI + state wiring change.

## Goals / Non-Goals

**Goals:**
- Allow players to run the simulation at 10x speed
- Consistent visual style with existing speed buttons

**Non-Goals:**
- No new gameplay systems (this is just a multiplier)
- No simulation stability changes (fixed timestep handles arbitrary timeScale)

## Decisions

### New speed value: `3` → timeScale `10`

The `setSpeed()` mapping table expands from `{0→0, 1→1, 2→5}` to `{0→0, 1→1, 2→5, 3→10}`.

### Keyboard shortcut: `4`

Extends existing pattern where `1` = pause, `2` = 1x, `3` = 5x. The number keys map to `speed` value directly (with offset), so `4` → speed `3` is consistent.

### Button label: `▶▶▶ 10x`

Follows existing convention: single arrow for 1x, double for 5x, triple for 10x.

### Visual style: identical to existing buttons

Same style object, same `activeButton` highlight pattern. No special coloring.

## Risks / Trade-offs

- **Save compatibility**: Old saves store `speed: 0 | 1 | 2`. When loaded into new code, speed 3 doesn't exist. Mitigation: the `WorldSerializer.fromJSON` should clamp unknown speed values to `2` (fast) as a safe default.
- **Performance at 10x**: The fixed-tick loop runs up to 600 updates/second at 10x. This is CPU-heavy but acceptable for a 30×20 map with few entities. If colonist count grows significantly, 10x may cause visible lag.
- **Need drain rate**: At 10x, hunger drops at 5/s and sleep at 3/s. Colonists will spend most of their time eating/sleeping. This is expected behavior — same as 5x but faster.
