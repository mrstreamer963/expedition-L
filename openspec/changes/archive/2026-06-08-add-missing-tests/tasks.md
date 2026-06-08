## 1. Pathfinding tests

- [x] 1.1 Create `src/test/pathfinding.test.ts` with `describe('Pathfinding')` block
- [x] 1.2 Test: finds straight path on open terrain
- [x] 1.3 Test: returns empty array when start equals end
- [x] 1.4 Test: returns empty array when target is unwalkable
- [x] 1.5 Test: routes around a wall obstacle
- [x] 1.6 Test: returns empty array for unreachable area (surrounded by walls)
- [x] 1.7 Test: avoids occupied positions mid-path
- [x] 1.8 Test: does not block start position (start excluded from occupied set)
- [x] 1.9 Export `manhattan` function from `src/game/world/pathfinding.ts` if not already exported

## 2. BuildQueue + WorkGiver tests

- [x] 2.1 Create `src/test/buildQueue.test.ts` with `describe('BuildQueue')` and `describe('WorkGiver')` blocks
- [x] 2.2 Test: add increases length
- [x] 2.3 Test: pop returns and removes first task (FIFO order)
- [x] 2.4 Test: peek returns first task without removing
- [x] 2.5 Test: pop returns null from empty queue
- [x] 2.6 Test: reserve succeeds on unreserved task, sets reservedBy
- [x] 2.7 Test: reserve fails on already reserved task
- [x] 2.8 Test: release clears reservation
- [x] 2.9 Test: BuildQueue.toJSON returns tasks array

## 3. GameMap tests

- [x] 3.1 Create `src/test/gameMap.test.ts` with `describe('GameMap')` block
- [x] 3.2 Test: tileAt returns correct tile for valid coordinates
- [x] 3.3 Test: tileAt out of bounds returns Water tile
- [x] 3.4 Test: setTile changes tile type and walkability
- [x] 3.5 Test: setTile out of bounds is no-op
- [x] 3.6 Test: setOccupant/getOccupant track occupancy
- [x] 3.7 Test: isWalkable returns correct value for known tile types
- [x] 3.8 Test: toJSON returns correct dimensions (20 rows, 30 cols)

## 4. WorldSerializer tests

- [x] 4.1 Create `src/test/worldSerializer.test.ts` with `describe('WorldSerializer')` block
- [x] 4.2 Test: toJSON produces object with all required fields
- [x] 4.3 Test: validate returns true for valid SaveData
- [x] 4.4 Test: validate returns false for null/non-object/wrong version/missing fields
- [x] 4.5 Test: round-trip preserves map dimensions
- [x] 4.6 Test: round-trip preserves colonist count, food count, bed count, building count
- [x] 4.7 Test: round-trip preserves speed setting

## 5. RenderMap tests

- [x] 5.1 Create `src/test/renderMap.test.ts` with `describe('renderMap')` block
- [x] 5.2 Create canvas context mock with spy on drawTile
- [x] 5.3 Test: renderMap calls drawTile for every tile (600 calls for 30x20 map)
- [x] 5.4 Test: drawTile receives correct tile and screen coordinates for each position

## 6. Verification

- [x] 6.1 Run `npm test` and confirm all tests pass (existing + new)
