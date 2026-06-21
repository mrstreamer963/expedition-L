## Context

Right-click movement currently uses `getNearestColonist(target)` which finds the colonist geographically closest to the click point, ignoring selection state. Selection (`selectedColonistId`) lives only in the client layer (`GameHost`), while the movement logic is in the core game server (`GameWorld`).

## Goals / Non-Goals

**Goals:**
- Right-click moves the selected colonist when one is selected
- Fall back to nearest-colonist when nothing is selected
- Minimal changes to the core/client boundary

**Non-Goals:**
- Changing how selection works
- Multi-select or group movement
- Changing save/load format

## Decisions

- **Add `colonistId` to `PlayerAction` right-click variant** rather than adding a separate `setSelectedColonist` method to `GameServer`. This keeps the change minimal — one optional field instead of a new code path for syncing selection state.
- **`colonistId` is optional**: When not provided, `handleRightClick` behaves exactly as before (nearest colonist). This preserves backward compatibility.
- **Validate colonist exists**: If `colonistId` is provided but doesn't match any colonist, fall back to nearest. This defends against stale selection state.

## Risks / Trade-offs

- The `PlayerAction` union type gains an optional field, which is slightly less clean — but avoids the complexity of a separate selection-tracking mechanism in the core.
