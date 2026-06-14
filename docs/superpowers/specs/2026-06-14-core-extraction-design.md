# Core Extraction: Separating Engine from Browser Layer

## Goal

Extract a pure, browser-independent engine (`src/core/`) from the current `src/game/`, leaving `src/game/` as a thin browser-specific coordination layer. This enables future server-side use of the engine without modification.

## Layer Diagram

```
src/
  core/              # pure engine — zero browser dependencies
    world/           # TileType, Tile, GameMap, pathfinding (A*)
    colony/          # Colonist (FSM), jobs, JobDispatcher, registries, types
    entities/        # Food, Bed, Building, BuildQueue
    systems/         # NeedSystem, StatusSystem
    gameWorld.ts     # pure state + update(dt) + serialization
    types.ts         # CoreStateSnapshot interface
    index.ts         # barrel

  game/              # browser coordination layer
    gameLoop.ts      # requestAnimationFrame, Canvas, fixed timestep
    inputHandler.ts  # DOM events (keyboard, mouse)
    storage.ts       # localStorage, Blob, file download/upload
    tileData.ts      # TILE_DATA (colors/patterns), TILE_WIDTH/HEIGHT
    gameHost.ts      # owns core.GameWorld + GameLoop + Input + Camera
    index.ts         # barrel (re-exports from core/ + browser exports)

  render/            # unchanged — reads RenderSnapshot
  controller/        # not yet created (future)
  ui/                # unchanged — React
  geometry/          # unchanged — Camera, isoUtils
  persistence/       # not yet created (future)
```

## What Goes Where

### `core/` (pure engine)

| Module | Contents |
|--------|----------|
| `world/tile.ts` | `TileType` enum, `Tile` interface (`type`, `walkable`, `occupantId`) |
| `world/map.ts` | `GameMap` — grid, occupancy, generation |
| `world/pathfinding.ts` | A* pathfinding |
| `colony/types.ts` | `Vec2`, `ColonistState`, `ColonistNeeds`, `ColonistLike`, `JobContext`, `JobDefinition`, `StatusDefinition`, `GameEvent` |
| `colony/colonist.ts` | Colonist FSM class |
| `colony/colonistFactory.ts` | `createInitialColonists()` |
| `colony/jobDispatcher.ts` | Job dispatch, A* pathfinding integration |
| `colony/jobRegistry.ts` | `JOB_REGISTRY` singleton |
| `colony/statusRegistry.ts` | `STATUS_REGISTRY` singleton |
| `colony/jobs/` | `eat.ts`, `sleep.ts`, `build.ts`, `walk.ts` |
| `colony/statuses/` | `hungry.ts`, `tired.ts` |
| `entities/food.ts`, `bed.ts`, `building.ts` | Data entities + `BuildQueue` |
| `systems/needSystem.ts` | Tick-based hunger/sleep decay |
| `systems/statusSystem.ts` | Status evaluation each tick |
| `gameWorld.ts` | Pure game state + `update(dt)` |
| `types.ts` | `CoreStateSnapshot` for UI callback |
| `index.ts` | Barrel |

### `game/` (browser layer)

| File | Contents |
|------|----------|
| `gameLoop.ts` | `requestAnimationFrame`, `performance.now()`, Canvas types |
| `inputHandler.ts` | DOM keyboard/mouse events, camera pan, right-click command |
| `storage.ts` | `localStorage` save/load, file download/upload via Blob |
| `tileData.ts` | `TILE_DATA` (color/pattern per TileType), `TILE_WIDTH`, `TILE_HEIGHT` |
| `gameHost.ts` | Coordinates `core.GameWorld` + `GameLoop` + `InputHandler` + Camera |
| `index.ts` | Re-exports from `core/` + browser-specific exports |

## Key Design Changes

### GameWorld

The current God Object is split:

- **`core/GameWorld`** — owns map, colonists, entities, buildQueue, jobDispatcher, systems. Has `update(dt)`. No browser references. No camera, no canvas, no DOM. Calls `onStateChanged` callback when state updates.
- **`game/GameHost`** — owns `core.GameWorld`, `GameLoop`, `InputHandler`, `Camera`. Manages browser lifecycle (rAF, DOM events, beforeunload). Creates `core.GameWorld` with saved state or fresh. Delegates `update(dt)` to core.

### EventBus Removed

`eventBus.ts` is eliminated. All event routing was within `GameWorld` itself — `update()` emitted events that `GameWorld`'s constructor subscribed to, just to call `JobDispatcher` methods. Replaced by direct method calls:

```
Before: update() → eventBus.emit('colonist_idle') → handler → jobDispatcher.assignBestJob()
After:  update() → jobDispatcher.assignBestJob()
```

### addBuildTask Takes Explicit Type

Before: used `this.buildMode` (browser state) to determine task type.  
After: `addBuildTask(x, y, type: 'wall' | 'bed' | 'food')` — the browser layer passes the type explicitly.

### UIState → CoreStateSnapshot

Before: `emitUiState()` built a `UIState` (from `ui/types`) including browser fields (`selectedColonistId`, `buildMode`, `hoveredTile`).  
After: `core/GameWorld` calls `onStateChanged(coreSnapshot)` with a `CoreStateSnapshot` containing only engine data. `game/GameHost` merges browser fields before forwarding to React.

### Serialization

- **`core/WorldSerializer`** — serializes/deserializes game state only (map, colonists, entities, buildQueue, speed). No camera.
- **`game/GameHost`** — adds camera state when saving, restores camera when loading.

### Camera

Entirely removed from core. `Camera` stays in `geometry/` and is used only by `game/GameHost`, `render/`, and `input/`.

### TILE_DATA

`TILE_DATA` (colors, patterns) and `TILE_WIDTH`/`TILE_HEIGHT` (render dimensions) stay in `game/tileData.ts`. `core/` only knows `TileType` enum — it has no visual information.

## Dependency Flow

```
ui/ → game/GameHost → core/GameWorld
                  ↘ render/
```

No reverse imports. `core/` imports nothing from `game/`, `render/`, `ui/`, `store/`, or `geometry/`.

## Serialization Format (SaveData)

```typescript
interface SaveData {
  version: number
  timestamp: number
  map: { tiles: SerializableTile[][] }
  colonists: SerializableColonist[]
  foods: SerializableFood[]
  beds: SerializableBed[]
  buildings: SerializableBuilding[]
  buildQueue: { tasks: BuildTask[] }
  speed: number
  camera?: { offsetX: number; offsetY: number }  // added by game/GameHost
}
```

`camera` is optional — added by the browser layer, absent when saving from server.

## Migration Strategy

1. Create `src/core/` with `index.ts`
2. Move pure files from `game/` to `core/` (maintaining folder structure)
3. Clean `GameWorld` — remove camera, EventBus, UIState, browser deps
4. Create `game/GameHost` — browser coordinator wrapping `core.GameWorld`
5. Create `game/tileData.ts` — extract TILE_DATA from world/tile.ts
6. Clean `worldSerializer` — remove Camera/GameSpeed deps
7. Update `game/index.ts` — re-export from core/ + add browser exports
8. Update imports across `ui/`, `render/`, `App.tsx`
9. Serialization: camera is saved/loaded by GameHost independently

## Non-Goals

- No new features
- No behavior changes
- No changes to `render/`, `ui/`, `geometry/` beyond import path updates
