## 1. Data Model — Tile Occupancy

- [x] 1.1 Add `occupantId: string | null` field to the `Tile` interface in `src/game/world/tile.ts`
- [x] 1.2 Initialize `occupantId` to `null` for all tiles in `src/game/world/map.ts` (`generateMap` / constructor)

## 2. Colonist — Occupy / Release on State Change

- [x] 2.1 On `startJob()` or transition to `idle` — occupy current tile (`setTileOccupant(this.position, this.id)`)
- [x] 2.2 On transition to `walking` (when path is set) — release current tile (`clearTileOccupant(this.position)`)
- [x] 2.3 On `cancelJob()` — re-occupy current tile (if free) or find nearest free tile

## 3. Movement — Destination Check

- [x] 3.1 In `colonist.move()`, at each tile shift (`position = path.shift()`), check if final path tile (`path[path.length-1]`) is occupied
- [x] 3.2 If occupied by a non-walking colonist → call `cancelJob()`, clear path, set state to `idle`

## 4. Pathfinding — Occupied Set

- [x] 4.1 In `gameWorld.ts` right-click handler: filter occupied set to only `idle`/`working` colonists
- [x] 4.2 In `jobSystem.ts` `sendTo()`: filter occupied set to only `idle`/`working` colonists
- [x] 4.3 Ensure pathfinding blocks target tile if occupied and the target is not the current colonist's own tile

## 5. Verify

- [x] 5.1 Run `npx vitest run` or build (`npx tsc --noEmit`) and confirm no errors
- [ ] 5.2 Manual test: send two colonists to same food source — only one eats, the other recalculates
