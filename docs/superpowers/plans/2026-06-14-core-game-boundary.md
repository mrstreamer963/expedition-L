# Core-Game Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Define a strict interface between `src/core/` (future server) and `src/game/` (client). Core exports only `GameServer` + data types. All internals hidden.

**Architecture:** `src/core/index.ts` → `GameServer` interface + `ClientSnapshot`/`PlayerAction`/`SaveData`. `GameWorld` implements `GameServer`. Render uses only `ClientSnapshot`. Client-only state (camera, buildMode, selectedColonist) stays in `GameHost`.

**Tech Stack:** TypeScript, no runtime deps.

---

### Task 1: Define public API in `src/core/index.ts`

**Files:**
- Create: `src/core/index.ts`

- [ ] **Create `src/core/index.ts`**

```typescript
import { SaveData } from './worldSerializer'
import { Vec2 } from './colony/types'

export type { SaveData, Vec2 }

export interface GameServer {
  create(): ClientSnapshot
  load(data: SaveData): ClientSnapshot
  update(dt: number): ClientSnapshot
  handleAction(action: PlayerAction): ClientSnapshot
  getSnapshot(): ClientSnapshot
  save(): SaveData
  destroy(): void
}

export type PlayerAction =
  | { type: 'right-click'; x: number; y: number }
  | { type: 'build'; x: number; y: number; buildingType: 'wall' | 'bed' | 'food' }

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

### Task 2: Implement GameServer on GameWorld

**Files:**
- Modify: `src/core/gameWorld.ts`
- Delete: `src/core/types.ts` (CoreStateSnapshot replaced by ClientSnapshot)

- [ ] **Add `generateSnapshot()`, `handleAction()`, `handleRightClick()` to GameWorld**

```typescript
// src/core/gameWorld.ts — add these methods
import { ClientSnapshot, PlayerAction } from './index'  // circular import? No — index re-exports, GameWorld is not re-exported

// In GameWorld class:

  generateSnapshot(): ClientSnapshot {
    return {
      speed: this.speed,
      timeScale: this.timeScale,
      paused: this.paused,
      map: {
        width: this.map.width,
        height: this.map.height,
        tiles: Array.from({ length: this.map.height }, (_, y) =>
          Array.from({ length: this.map.width }, (_, x) => {
            const tile = this.map.tileAt(x, y)
            return { type: tile.type, occupant: tile.occupantId, walkable: tile.walkable }
          })
        ),
      },
      colonists: this.colonists.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        position: { ...c.position },
        needs: { ...c.needs },
        statuses: [...c.statuses],
        state: this.serializeState(c.state),
      })),
      foods: this.foods.map(f => ({ id: f.id, x: f.x, y: f.y })),
      beds: this.beds.map(b => ({ id: b.id, x: b.x, y: b.y })),
      buildings: this.buildings.map(b => ({ id: b.id, x: b.x, y: b.y })),
      buildQueue: this.buildQueue.all.map(t => ({ id: t.id, type: t.type, x: t.x, y: t.y })),
    }
  }

  private serializeState(state: ColonistState): ClientSnapshot['colonists'][0]['state'] {
    if (state.phase === 'moving') return { phase: 'moving', job: state.job, path: state.path.map(p => ({ ...p })) }
    if (state.phase === 'working') return { phase: 'working', job: state.job }
    if (state.phase === 'done') return { phase: 'done', job: state.job }
    return { phase: 'idle' }
  }

  handleAction(action: PlayerAction): void {
    if (action.type === 'right-click') {
      this.handleRightClick(action.x, action.y)
    } else if (action.type === 'build') {
      this.addBuildTask(action.x, action.y, action.buildingType)
    }
  }

  private handleRightClick(x: number, y: number): void {
    const target = { x, y }
    const colonist = this.getNearestColonist(target)
    if (colonist && this.map.isWalkable(x, y)) {
      if (colonist.state.phase !== 'idle') {
        colonist.transition({ phase: 'idle' })
      }
      this.releaseTile(colonist.position.x, colonist.position.y, colonist.id)
      const occupied = this.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
      const path = findPath(this.map, colonist.position, target, occupied)
      if (path.length > 0) {
        colonist.transition({ phase: 'moving', job: 'walk', path })
      }
    }
  }
```

- [ ] **Modify `update()` to return `ClientSnapshot`**

```typescript
  update(dt: number): ClientSnapshot {
    // existing update logic...
    const context = this.getJobContext()
    // ... all existing code ...
    return this.generateSnapshot()
  }
```

- [ ] **Remove types that are replaced**

`src/core/types.ts` (`CoreStateSnapshot`, `GameSpeed`) — no longer needed by external code. Remove `pushState()` callback mechanism (replaced by returning ClientSnapshot). The internal code can keep the types or inline them.

### Task 3: Refactor render layer

**Files:**
- Modify: `src/render/worldRenderer.ts`, `src/render/canvas.ts`, `src/render/drawTile.ts`, `src/render/drawColonist.ts`, `src/render/renderEntities.ts`, `src/render/renderOverlay.ts`, `src/render/textures.ts`
- Create: none
- Delete: `src/render/snapshot.ts`

- [ ] **Delete `src/render/snapshot.ts`**

- [ ] **Update `src/render/canvas.ts`** — use snapshot map tiles

```typescript
import { ClientSnapshot } from '../core'

export function renderMap(
  ctx: CanvasRenderingContext2D,
  map: ClientSnapshot['map'],
  offsetX: number,
  offsetY: number
): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x]
      drawTile(ctx, tile, x, y, offsetX, offsetY)
    }
  }
}
```

- [ ] **Update `src/render/drawTile.ts`** — use `{ type: string; occupant: string | null; walkable: boolean }`

```typescript
import { TILE_DATA, TILE_WIDTH, TILE_HEIGHT } from '../game/world/tile'
import { tileToScreen } from '../geometry/isoUtils'
import { getTilePattern } from './textures'

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: { type: string; occupant: string | null; walkable: boolean },
  tileX: number,
  tileY: number,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  // same body — tile.type is now string, but TileType was a string enum so same values
  const { x: sx, y: sy } = tileToScreen(tileX, tileY)
  const screenX = sx + offsetX
  const screenY = sy + offsetY
  const hw = TILE_WIDTH / 2
  const hh = TILE_HEIGHT / 2
  ctx.beginPath()
  ctx.moveTo(screenX, screenY - hh)
  ctx.lineTo(screenX + hw, screenY)
  ctx.lineTo(screenX, screenY + hh)
  ctx.lineTo(screenX - hw, screenY)
  ctx.closePath()
  const pattern = getTilePattern(tile.type)
  if (pattern) {
    ctx.fillStyle = pattern
  } else {
    ctx.fillStyle = TILE_DATA[tile.type]?.color ?? '#333'
  }
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.5
  ctx.stroke()
}
```

- [ ] **Update `src/render/textures.ts`** — accept string, not TileType

```typescript
export function getTilePattern(tileType: string): CanvasPattern | null {
  const data = TILE_DATA[tileType]
  if (!data) return null
  const factory = factories[data.pattern]
  if (!factory) return null
  return getOrCreate(data.pattern, factory)
}
```

- [ ] **Update `src/render/drawColonist.ts`** — accept snapshot colonist data instead of Colonist class

```typescript
import { ClientSnapshot } from '../core'
// No more import from core/colony/colonist

type SnapshotColonist = ClientSnapshot['colonists'][0]

export function drawColonist(
  ctx: CanvasRenderingContext2D,
  colonist: SnapshotColonist,
  offsetX: number,
  offsetY: number
): void {
  const pos = colonist.position  // was colonist.getInterpolatedPosition()
  const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
  const cx = sx + offsetX
  const cy = sy + offsetY
  // rest is same — all properties are plain data now
  // colonist.state.phase instead of colonist.state.phase (same)
  // colonist.needs.hunger (same)
  // colonist.statuses is string[] (was Set<string> so iterate differently)
  // ... same rendering logic
}
```

Key changes in `drawColonist.ts`:
- `pos` = `colonist.position` instead of `colonist.getInterpolatedPosition()`
- `colonist.statuses` is `string[]` not `Set<string>` — change `colonist.statuses.size > 0` to `colonist.statuses.length > 0` and `Array.from(colonist.statuses)` to just `colonist.statuses`

- [ ] **Update `src/render/renderEntities.ts`**

```typescript
import { ClientSnapshot } from '../core'
// Remove: import { Food } from '../core/entities/food', etc.

export function renderEntities(ctx: CanvasRenderingContext2D, snap: ClientSnapshot, offsetX: number, offsetY: number): void {
  const hh = TILE_HEIGHT / 2
  // snap.foods is now { id: string; x: number; y: number }[] — same access pattern
  for (const food of snap.foods) {
    const { x: sx, y: sy } = tileToScreen(food.x, food.y)
    drawShadow(ctx, sx + offsetX, sy + offsetY, 12, 5)
  }
  // ... same for beds, buildings
}
```

- [ ] **Update `src/render/renderOverlay.ts`** — use snapshot for tile/colonist data

```typescript
import { ClientSnapshot } from '../core'

function canBuildAt(x: number, y: number, snap: ClientSnapshot): boolean {
  const tile = snap.map.tiles[y]?.[x]
  if (!tile) return false
  if (tile.type === 'Rock' || tile.type === 'Water') return false
  if (snap.foods.some(f => f.x === x && f.y === y)) return false
  if (snap.beds.some(b => b.x === x && b.y === y)) return false
  if (snap.buildings.some(b => b.x === x && b.y === y)) return false
  return true
}
```

For `renderSelection` and `renderPaths`, replace:
- `colonist.getInterpolatedPosition()` → `colonist.position`
- `colonist.state.path` → `colonist.state.path ?? []` (state may not have path)
- No `import { TileType } from '../core/world/tile'`

- [ ] **Update `src/render/worldRenderer.ts`** — new signature

```typescript
import { ClientSnapshot } from '../core'

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  snap: ClientSnapshot,
  renderCtx: {
    offsetX: number; offsetY: number
    canvasWidth: number; canvasHeight: number
    hoveredTile: { x: number; y: number } | null
    selectedColonistId: string | null
    buildMode: string
  }
): void {
  ctx.clearRect(0, 0, renderCtx.canvasWidth, renderCtx.canvasHeight)
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, renderCtx.canvasWidth, renderCtx.canvasHeight)
  renderMap(ctx, snap.map, renderCtx.offsetX, renderCtx.offsetY)

  const sortedColonists = [...snap.colonists].sort(
    (a, b) => (a.position.x + a.position.y) - (b.position.x + b.position.y)
  )
  for (const colonist of sortedColonists) {
    const pos = colonist.position
    const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
    drawShadow(ctx, sx + renderCtx.offsetX, sy + renderCtx.offsetY)
    drawColonist(ctx, colonist, renderCtx.offsetX, renderCtx.offsetY)
  }
  renderEntities(ctx, snap, renderCtx.offsetX, renderCtx.offsetY)
  renderBuildQueueGhosts(ctx, snap, renderCtx)
  renderHighlight(ctx, snap, renderCtx)
  renderSelection(ctx, snap, renderCtx)
  renderPaths(ctx, snap, renderCtx)
}
```

### Task 4: Update InputHandler

**Files:**
- Modify: `src/game/input/inputHandler.ts`

- [ ] **Remove GameMap from constructor**

```typescript
// Before:
import { Camera } from '../../geometry/camera'
import { GameMap } from '../world/map'
import { screenToTile } from '../../geometry/isoUtils'

export class InputHandler {
  constructor(camera: Camera, _map: GameMap, canvas: HTMLCanvasElement) {

// After:
import { Camera } from '../../geometry/camera'
import { screenToTile } from '../../geometry/isoUtils'

export class InputHandler {
  constructor(camera: Camera, canvas: HTMLCanvasElement) {
```

### Task 5: Refactor GameHost

**Files:**
- Modify: `src/game/gameHost.ts`
- Modify: `src/game/gameLoop.ts`

- [ ] **Update GameHost to use GameServer**

```typescript
import { Camera } from '../geometry/camera'
import { GameWorld } from './core'  // ERROR — can't import GameWorld. Need to import from core/
// Wait — GameWorld implements GameServer but is not exported from core/index.ts
// We need to either:
//   A) Export GameWorld from core/index.ts (defeats the purpose)
//   B) Have a factory function in core/index.ts
//   C) Create the GameServer in GameHost via a different mechanism

// Solution: Add a createGameServer function to core/index.ts
```

Wait, this is a critical design issue. `GameHost` needs to create a `GameServer` instance, but `GameWorld` is internal. We need either:

Option A: Export a factory function from core/index.ts
```ts
export function createGameServer(savedState?: SaveData): GameServer {
  return new GameWorld(savedState)
}
```

Option B: GameHost takes a GameServer in constructor (injected)

Option C: Move GameWorld creation to a factory in core/

I'll go with Option A — simplest.

- [ ] **Add factory to `src/core/index.ts`**

```typescript
import { GameWorld } from './gameWorld'

export function createGameServer(savedState?: SaveData): GameServer {
  return new GameWorld(savedState)
}
```

Now GameHost:

```typescript
import { createGameServer, GameServer, ClientSnapshot, PlayerAction } from '../core'
import { Camera } from '../geometry/camera'
import { GameLoop } from './gameLoop'

export class GameHost {
  private server: GameServer
  private gameLoop: GameLoop
  private inputHandler: InputHandler
  private camera: Camera
  private width: number
  private height: number
  private lastSnapshot: ClientSnapshot | null = null

  selectedColonistId: string | null = null
  buildMode: BuildMode = 'none'
  hoveredTile: { x: number; y: number } | null = null

  onUiUpdate: ((state: UIState) => void) | null = null

  constructor(canvas: HTMLCanvasElement, savedState?: SaveData) {
    this.width = canvas.width
    this.height = canvas.height
    this.camera = this.loadCamera(savedState)
    this.server = createGameServer(savedState)
    this.lastSnapshot = savedState ? this.server.load(savedState) : this.server.create()

    this.inputHandler = new InputHandler(this.camera, canvas)
    this.setupInputCallbacks()

    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => {
        this.lastSnapshot = this.server.update(dt)
        this.emitUIUpdate()
      },
      onRender: (ctx) => {
        if (!this.lastSnapshot) return
        renderWorld(ctx, this.lastSnapshot, {
          offsetX: this.camera.offsetX,
          offsetY: this.camera.offsetY,
          canvasWidth: this.width,
          canvasHeight: this.height,
          hoveredTile: this.hoveredTile,
          selectedColonistId: this.selectedColonistId,
          buildMode: this.buildMode,
        })
      },
    })
    this.gameLoop.setSpeed(1)
    this.gameLoop.start()
  }

  private setupInputCallbacks(): void {
    this.inputHandler.onTileClick = (tileX, tileY) => {
      if (this.buildMode !== 'none') {
        this.lastSnapshot = this.server.handleAction({
          type: 'build', x: tileX, y: tileY,
          buildingType: this.buildMode as 'wall' | 'bed' | 'food',
        })
        this.emitUIUpdate()
        return
      }
      // Select colonist — client-side from snapshot
      if (!this.lastSnapshot) return
      const colonist = this.lastSnapshot.colonists.find(c =>
        Math.round(c.position.x) === tileX && Math.round(c.position.y) === tileY
      )
      this.selectedColonistId = colonist ? colonist.id : null
      this.emitUIUpdate()
    }

    this.inputHandler.onRightClick = (tileX, tileY) => {
      this.lastSnapshot = this.server.handleAction({ type: 'right-click', x: tileX, y: tileY })
      this.emitUIUpdate()
    }

    this.inputHandler.onTileHover = (tileX, tileY) => {
      if (!this.lastSnapshot) return
      const map = this.lastSnapshot.map
      if (tileX >= 0 && tileX < map.width && tileY >= 0 && tileY < map.height) {
        this.hoveredTile = { x: tileX, y: tileY }
      } else {
        this.hoveredTile = null
      }
    }

    this.inputHandler.onKey = (key) => {
      switch (key) {
        case ' ':
        case 'p':
        case 'P':
          this.togglePause()
          break
        case '1': this.setSpeed(0); break
        case '2': this.setSpeed(1); break
        case '3': this.setSpeed(2); break
        case '4': this.setSpeed(3); break
      }
    }
  }

  togglePause(): void {
    if (this.gameLoop.getSpeed() > 0) {
      this.gameLoop.setSpeed(0)
    } else {
      this.gameLoop.setSpeed(1)
    }
  }

  setSpeed(speed: number): void {
    const timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.gameLoop.setSpeed(timeScale)
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
  }

  private emitUIUpdate(): void {
    if (!this.onUiUpdate || !this.lastSnapshot) return
    const snap = this.lastSnapshot
    this.onUiUpdate({
      timeScale: snap.speed === 0 ? 0 : snap.speed,
      speed: snap.speed as 0 | 1 | 2 | 3,
      foodCount: snap.foods.length,
      colonistCount: snap.colonists.length,
      selectedColonistId: this.selectedColonistId,
      colonists: snap.colonists.map(c => ({
        id: c.id, name: c.name, color: c.color,
        stateLabel: c.state.phase,
        hunger: c.needs.hunger,
        sleep: c.needs.sleep,
        currentJob: c.state.job ?? null,
        position: c.position,
        statuses: c.statuses,
      })),
      buildMode: this.buildMode,
      hoveredTile: this.hoveredTile,
    })
  }

  getSaveData(): SaveData & { camera: { offsetX: number; offsetY: number } } {
    const data = this.server.save()
    return { ...data, camera: this.camera.toJSON() }
  }

  destroy(): void {
    this.gameLoop.destroy()
    this.server.destroy()
  }
}
```

### Task 6: Update GameLoop interface

**Files:**
- Modify: `src/game/gameLoop.ts`

Remove `realDt` from `onRender`:
```typescript
export interface GameLoopConfig {
  onUpdate: (dt: number) => void
  onRender: (ctx: CanvasRenderingContext2D) => void
  canvas: HTMLCanvasElement
}
// In loop():
  const ctx = this.config.canvas.getContext('2d')
  if (ctx) {
    this.config.onRender(ctx)
  }
```

### Task 7: Update App.tsx

**Files:**
- Modify: `src/App.tsx`

```typescript
import { GameHost } from './game'
// No more SaveData import — GameHost handles typing internally
```

Remove unused imports (`SaveData` from game, persistence). Keep the same functional logic — GameHost API is similar.

### Task 8: Re-export cleanup and deletion

**Files:**
- Modify: `src/game/index.ts`
- Modify: `src/test/buildQueue.test.ts`
- Delete: entire `src/game/colony/`, `src/game/entities/`, `src/game/systems/`, `src/game/world/map.ts`, `src/game/world/pathfinding.ts`, `src/game/persistence/worldSerializer.ts`

- [ ] **Rewrite `src/game/index.ts`**

```typescript
export { GameHost } from './gameHost'
export { GameLoop } from './gameLoop'
export { InputHandler } from './input/inputHandler'
export { TILE_DATA, TILE_WIDTH, TILE_HEIGHT } from './world/tile'
export { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage, downloadSaveFile, uploadSaveFile, AUTOSAVE_KEY } from './persistence'
// No more core re-exports
```

- [ ] **Update `src/test/buildQueue.test.ts`**

Change `import { BuildQueue, BuildTask } from '../game/entities/building'` to `import { BuildQueue, BuildTask } from '../core/entities/building'`

- [ ] **Delete re-export files**

```bash
rm -rf src/game/colony src/game/entities src/game/systems src/game/world/map.ts src/game/world/pathfinding.ts src/game/persistence/worldSerializer.ts
git add -A
```

### Task 9: Clean up core/types.ts

`CoreStateSnapshot` is no longer used by external code. Check if anything still references it and remove if possible.

---

## Self-Review Checklist

1. **Spec coverage** — Every aspect of the design doc is covered.
2. **Placeholder scan** — No TBD/TODO.
3. **Type consistency** — `ClientSnapshot` type is used consistently across all render files and GameHost.
4. **Ambiguity check** — The factory function `createGameServer` resolves the circular dependency between GameHost (needs GameServer) and GameWorld (internal).

---

## Execution Handoff

Chose inline execution in this session since the user is actively watching.
