# Core-Game Boundary Design

## Problem

`src/game/` contains re-export wrappers for `src/core/`, and both client and render code import ~52 exports directly from core (classes, types, enums). This prevents future RPC separation where `src/core/` runs on a server.

## Solution

Define a strict boundary between `src/core/` (server) and `src/game/` (client). `src/core/` exports only an interface + data types; everything else is internal.

## Architecture

```
src/game/ (client)  ─── PlayerAction / ClientSnapshot ───→  src/core/ (server)
  gameHost.ts                       GameServer interface      GameWorld (internal)
  gameLoop.ts                       ClientSnapshot types      Colonist, GameMap, etc. (internal)
  inputHandler.ts                   SaveData
  world/tile.ts (render consts)
  persistence/storage.ts
  render/ (uses only ClientSnapshot)
  ui/ (React, uses only ClientSnapshot)
```

No direct imports of `Colonist`, `GameMap`, `TileType`, `Building`, `findPath`, `GameWorld`, etc. from client/render.

## Public API (`src/core/index.ts`)

### GameServer interface

```typescript
export interface GameServer {
  create(): ClientSnapshot
  load(data: SaveData): ClientSnapshot
  update(dt: number): ClientSnapshot
  handleAction(action: PlayerAction): ClientSnapshot
  getSnapshot(): ClientSnapshot
  save(): SaveData
  destroy(): void
}
```

### PlayerAction (server-authoritative actions)

```typescript
export type PlayerAction =
  | { type: 'right-click'; x: number; y: number }
  | { type: 'build'; x: number; y: number; buildingType: 'wall' | 'bed' | 'food' }
```

Server handles: find nearest colonist, pathfinding, validate build, apply state changes.

### ClientSnapshot (data transfer object)

```typescript
export interface ClientSnapshot {
  speed: number
  timeScale: number
  paused: boolean
  map: {
    width: number
    height: number
    tiles: { type: string; occupant: string | null; walkable: boolean }[][]
  }
  colonists: {
    id: string; name: string; color: string
    position: Vec2
    needs: { hunger: number; sleep: number }
    statuses: string[]
    state: { phase: string; job?: string; path?: Vec2[] }
  }[]
  foods: { id: string; x: number; y: number }[]
  beds: { id: string; x: number; y: number }[]
  buildings: { id: string; x: number; y: number }[]
  buildQueue: { id: string; type: string; x: number; y: number }[]
}
```

### Re-exports for convenience

```typescript
export type { SaveData } from './worldSerializer'
export type { Vec2 } from './colony/types'
```

## Client-only state (not in core)

- Camera position
- Build mode (none/wall/bed/food)
- Selected colonist ID
- Hovered tile
- GameLoop speed

## Files to create/modify/delete

### Create
- `src/core/index.ts` — public exports

### Modify
- `src/core/gameWorld.ts` — implement GameServer interface, extract ClientSnapshot from state
- `src/game/gameHost.ts` — use GameServer instead of GameWorld directly, hold client-only state
- `src/game/gameLoop.ts` — no GameWorld reference, loop drives update/render via callback
- `src/game/index.ts` — export only client code (no core re-exports)
- `src/game/inputHandler.ts` — emit PlayerActions
- `src/render/snapshot.ts` — replace RenderSnapshot with ClientSnapshot, remove direct core imports
- `src/render/canvas.ts` — use ClientSnapshot map data, not GameMap
- `src/render/drawTile.ts` — use plain tile type, not Tile enum
- `src/render/drawColonist.ts` — use ClientColonist data, not Colonist class
- `src/render/renderEntities.ts` — use ClientSnapshot
- `src/render/renderOverlay.ts` — use ClientSnapshot
- `src/render/textures.ts` — use string tile type, not TileType enum
- `src/App.tsx` — use new GameServer API
- `src/test/buildQueue.test.ts` — import directly from core

### Delete (re-export wrappers)
- `src/game/colony/` (entire tree)
- `src/game/entities/` (entire tree)
- `src/game/systems/` (entire tree)
- `src/game/world/map.ts`
- `src/game/world/pathfinding.ts`
- `src/game/persistence/worldSerializer.ts`
