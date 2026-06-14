# Core Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a pure browser-independent engine (`src/core/`) from `src/game/`, leaving `src/game/` as a thin browser coordination layer.

**Architecture:** Move all pure game logic (world, colony, entities, systems, serialization) to `src/core/` with zero browser dependencies. Create `game/GameHost` as the browser coordinator owning `core.GameWorld` + `GameLoop` + `InputHandler` + Camera. Remove EventBus — replace with direct method calls. Remove camera/UIState/GameSpeed from core.

**Tech Stack:** TypeScript, Vite, Vitest

---

### Task 1: Create `src/core/world/` — TileType, Tile, GameMap, pathfinding

**Files:**
- Create: `src/core/world/tile.ts` — TileType enum, Tile interface (pure, no TILE_DATA/width/height)
- Create: `src/core/world/map.ts` — GameMap (copy, update imports)
- Create: `src/core/world/pathfinding.ts` — findPath (copy, update imports)
- Update: `src/game/world/tile.ts` — remove TILE_DATA and TILE_WIDTH/HEIGHT, keep only re-exports from core

- [ ] **Step 1: Create `src/core/world/tile.ts`**

```typescript
export enum TileType {
  Floor = 'Floor',
  Wall = 'Wall',
  Rock = 'Rock',
  Water = 'Water',
  Bed = 'Bed',
  Food = 'Food',
}

export interface Tile {
  type: TileType
  walkable: boolean
  occupantId: string | null
}
```

- [ ] **Step 2: Create `src/core/world/map.ts`**

Same as current `src/game/world/map.ts` but:
- Import `Tile, TileType` from `'./tile'` (not from `'../game/world/tile'`)
- Remove `import { TILE_DATA } from './tile'` — no longer available in core/tile.ts
- In `setTile`, use walkable directly instead of `TILE_DATA[type].walkable`:
  ```typescript
  setTile(x: number, y: number, type: TileType): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return
    const walkable = type !== TileType.Wall && type !== TileType.Rock && type !== TileType.Water
    this.grid[y][x] = { type, walkable, occupantId: null }
  }
  ```

Full content:
```typescript
import { Tile, TileType } from './tile'

export const MAP_WIDTH = 30
export const MAP_HEIGHT = 20

export class GameMap {
  private grid: Tile[][]

  constructor(grid?: Tile[][]) {
    this.grid = grid ?? this.generateMap()
  }

  private generateMap(): Tile[][] {
    const grid: Tile[][] = []
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: Tile[] = []
      for (let x = 0; x < MAP_WIDTH; x++) {
        const edgeDistance = Math.min(x, y, MAP_WIDTH - 1 - x, MAP_HEIGHT - 1 - y)
        if (edgeDistance === 0 && Math.random() < 0.6) {
          row.push({ type: TileType.Water, walkable: false, occupantId: null })
        } else if (edgeDistance <= 2 && Math.random() < 0.3) {
          row.push({ type: TileType.Rock, walkable: false, occupantId: null })
        } else if (Math.random() < 0.05) {
          row.push({ type: TileType.Rock, walkable: false, occupantId: null })
        } else {
          row.push({ type: TileType.Floor, walkable: true, occupantId: null })
        }
      }
      grid.push(row)
    }
    return grid
  }

  tileAt(x: number, y: number): Tile {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      return { type: TileType.Water, walkable: false, occupantId: null }
    }
    return this.grid[y][x]
  }

  setTile(x: number, y: number, type: TileType): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return
    const walkable = type !== TileType.Wall && type !== TileType.Rock && type !== TileType.Water
    this.grid[y][x] = { type, walkable, occupantId: null }
  }

  isWalkable(x: number, y: number): boolean {
    return this.tileAt(x, y).walkable
  }

  setOccupant(x: number, y: number, id: string | null): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return
    this.grid[y][x].occupantId = id
  }

  getOccupant(x: number, y: number): string | null {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return null
    return this.grid[y][x].occupantId
  }

  clearOccupantFor(id: string): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.grid[y][x].occupantId === id) {
          this.grid[y][x].occupantId = null
        }
      }
    }
  }

  getGrid(): Tile[][] {
    return this.grid
  }

  get width(): number { return MAP_WIDTH }
  get height(): number { return MAP_HEIGHT }

  toJSON(): { tiles: { type: TileType; occupantId: string | null }[][] } {
    return {
      tiles: this.grid.map(row =>
        row.map(tile => ({
          type: tile.type,
          occupantId: tile.occupantId,
        }))
      ),
    }
  }
}
```

- [ ] **Step 3: Create `src/core/world/pathfinding.ts`**

Same as current `src/game/world/pathfinding.ts`, just update import path to `'./map'` instead of `'../world/map'`.

```typescript
import { GameMap } from './map'
import { Vec2 } from '../colony/types'

export function findPath(
  map: GameMap,
  start: Vec2,
  end: Vec2,
  occupied: Vec2[] = []
): Vec2[] {
  const startX = Math.round(start.x)
  const startY = Math.round(start.y)
  const endX = Math.round(end.x)
  const endY = Math.round(end.y)

  if (!map.isWalkable(endX, endY)) return []
  if (startX === endX && startY === endY) return [{ x: endX, y: endY }]

  const occupiedSet = new Set(occupied.map(p => `${p.x},${p.y}`))

  interface Node {
    x: number
    y: number
    g: number
    h: number
    f: number
    parent: Node | null
  }

  const open: Node[] = []
  const closed = new Set<string>()

  open.push({ x: startX, y: startY, g: 0, h: manhattan(startX, startY, endX, endY), f: 0, parent: null })

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!
    const key = `${current.x},${current.y}`

    if (current.x === endX && current.y === endY) {
      const path: Vec2[] = []
      let node: Node | null = current
      while (node) {
        path.unshift({ x: node.x, y: node.y })
        node = node.parent
      }
      return path
    }

    if (closed.has(key)) continue
    closed.add(key)

    const directions = [
      { x: 0, y: -1 }, { x: 1, y: 0 },
      { x: 0, y: 1 }, { x: -1, y: 0 },
    ]

    for (const d of directions) {
      const nx = current.x + d.x
      const ny = current.y + d.y
      const nk = `${nx},${ny}`

      if (closed.has(nk)) continue
      if (!map.isWalkable(nx, ny)) continue
      if (occupiedSet.has(nk) && !(nx === endX && ny === endY)) continue

      const g = current.g + 1
      const h = manhattan(nx, ny, endX, endY)
      const existing = open.find(n => n.x === nx && n.y === ny)
      if (existing && existing.g <= g) continue

      open.push({ x: nx, y: ny, g, h, f: g + h, parent: current })
    }
  }

  return []
}

export function manhattan(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}
```

- [ ] **Step 4: Empty `src/game/world/tile.ts` — leave only re-exports of TileType/Tile from core + TILE_DATA/width/height**

Replace content of `src/game/world/tile.ts`:
```typescript
export { TileType, Tile } from '../../core/world/tile'
export type { TileType as TileTypeEnum } from '../../core/world/tile'

export interface TileData {
  color: string
  walkable: boolean
  pattern: string
}

export const TILE_DATA: Record<string, TileData> = {
  Floor: { color: '#5a8c69', walkable: true, pattern: 'grass' },
  Wall: { color: '#9a8b6a', walkable: false, pattern: 'brick' },
  Rock: { color: '#6b6b6b', walkable: false, pattern: 'crack' },
  Water: { color: '#4a7fa9', walkable: false, pattern: 'wave' },
  Bed: { color: '#c49a6c', walkable: true, pattern: 'stripe' },
  Food: { color: '#e8d44d', walkable: true, pattern: 'dot' },
}

export const TILE_WIDTH = 48
export const TILE_HEIGHT = 24
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: tests that import from `../game/world/tile`, `../game/world/map`, `../game/world/pathfinding` still pass because game/ re-exports.

Note: if tests fail because `import { TILE_DATA } from '../game/world/tile'` now finds it in the re-export file, it should still work. If someone imports `import { TileType } from '../game/world/tile'`, that still works via re-export. If tests import from direct paths like `../game/world/map`, those will need updating in Task 7.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: create core/world/ with TileType, Tile, GameMap, pathfinding"
```

---

### Task 2: Create `src/core/colony/` — FSM, jobs, dispatcher, registries, types

**Files:**
- Create: `src/core/colony/types.ts` — remove `GameEvent` type (no longer needed)
- Create: `src/core/colony/colonist.ts` — copy from game/, update imports
- Create: `src/core/colony/colonistFactory.ts` — copy
- Create: `src/core/colony/jobDispatcher.ts` — copy, remove `onEvent()` and `checkEmergencyFood()`, add direct `assignBestJob()`, `onBuildQueued()`, `cancelReservation()`
- Create: `src/core/colony/jobRegistry.ts` — copy
- Create: `src/core/colony/statusRegistry.ts` — copy
- Create: `src/core/colony/jobs/eat.ts` — copy, remove `eventBus` import and emit
- Create: `src/core/colony/jobs/sleep.ts` — copy
- Create: `src/core/colony/jobs/build.ts` — copy, remove `eventBus` import and emit
- Create: `src/core/colony/jobs/walk.ts` — copy
- Create: `src/core/colony/statuses/hungry.ts` — copy
- Create: `src/core/colony/statuses/tired.ts` — copy

- [ ] **Step 1: Create `src/core/colony/types.ts`**

Same as current `src/game/colony/types.ts` but:
- Remove `GameEvent` type union (lines 66-70)
- Remove `import { BuildTask } from '../entities/building'` — no longer needed for GameEvent
- Keep everything else

```typescript
import { BuildQueue, BuildingType } from '../entities/building'
import { GameMap } from '../world/map'

export interface Vec2 {
  x: number
  y: number
}

export type ColonistStatus = 'hungry' | 'tired'

export interface ColonistNeeds {
  hunger: number
  sleep: number
}

export interface StatusDefinition {
  type: ColonistStatus
  label: string
  priority: number
  condition: (colonist: ColonistLike) => boolean
  jobType: string
}

export interface StatusUpdatable {
  needs: ColonistNeeds
  statuses: Set<ColonistStatus>
}

export type ColonistState =
  | { phase: 'idle' }
  | { phase: 'assigned'; job: string; target: Vec2 }
  | { phase: 'moving';   job: string; path: Vec2[] }
  | { phase: 'working';  job: string; progress: number; duration: number }
  | { phase: 'done';     job: string }

export interface JobContext {
  map: GameMap
  colonists: ColonistLike[]
  foods: { id: string; x: number; y: number }[]
  beds: { id: string; x: number; y: number }[]
  buildings: { id: string; type: BuildingType; x: number; y: number }[]
  buildQueue: BuildQueue
}

export interface ColonistLike {
  id: string
  position: Vec2
  needs: ColonistNeeds
  state: ColonistState
  statuses: Set<ColonistStatus>
}

export interface JobDefinition<C = JobContext> {
  type: string
  label: string
  duration: number

  findTarget(colonist: ColonistLike, context: C): Vec2 | null
  findAllTargets?(colonist: ColonistLike, context: C): Vec2[]
  onStart(colonist: ColonistLike, context: C): void
  onComplete(colonist: ColonistLike, context: C): void
  onCancel(colonist: ColonistLike, context: C): void
  onTick(colonist: ColonistLike, dt: number): void
}
```

- [ ] **Step 2: Create `src/core/colony/colonist.ts`**

Same as current `src/game/colony/colonist.ts`, just update imports to point to `../world/map`, `./types`, `./jobRegistry`.

- [ ] **Step 3: Create `src/core/colony/colonistFactory.ts`**

Same as current, update import to `./colonist`.

- [ ] **Step 4: Create `src/core/colony/jobDispatcher.ts`**

Same as current `src/game/colony/jobDispatcher.ts` but:
- Remove `GameEvent` from import — import only `JobContext, ColonistLike`
- Remove `onEvent()` method entirely
- Remove `checkEmergencyFood()` method (redundant — regular update loop handles it)
- `assignBestJob()` stays as the main public method
- `onBuildQueued()` stays private
- All other methods stay
- Import from `../world/pathfinding` instead of `../game/world/pathfinding`

```typescript
import { JobContext, ColonistLike } from './types'
import { JOB_REGISTRY } from './jobRegistry'
import { STATUS_REGISTRY } from './statusRegistry'
import { findPath } from '../world/pathfinding'
import { Colonist } from './colonist'

export class JobDispatcher {
  assignBestJob(colonistId: string, context: JobContext): void {
    const colonist = context.colonists.find(c => c.id === colonistId)
    if (!colonist || colonist.state.phase !== 'idle') return

    const statuses = STATUS_REGISTRY.getAll()
      .filter(def => colonist.statuses.has(def.type))
      .sort((a, b) => a.priority - b.priority)

    for (const status of statuses) {
      if (this.tryAssignJob(colonist, status.jobType, context)) return
    }

    if (this.tryAssignBuild(colonist, context)) return
  }

  onBuildQueued(
    task: { id: string; type: string; x: number; y: number; reservedBy: string | null },
    context: JobContext
  ): void {
    const idle = this.findIdleColonist(context, task.x, task.y)
    if (!idle) return
    task.reservedBy = idle.id
    idle.reservedBuildTaskId = task.id
    this.sendTo(idle, { x: task.x, y: task.y }, 'build', context)
  }

  private tryAssignJob(colonist: ColonistLike, jobType: string, context: JobContext): boolean {
    const def = JOB_REGISTRY.get(jobType)
    if (!def) return false
    const targets = def.findAllTargets?.(colonist, context) ?? (() => {
      const t = def.findTarget(colonist, context)
      return t ? [t] : []
    })()
    for (const target of targets) {
      if (this.sendTo(colonist, target, jobType, context)) return true
    }
    return false
  }

  private tryAssignBuild(colonist: ColonistLike, context: JobContext): boolean {
    const existing = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
    if (existing) {
      ;(colonist as Colonist).reservedBuildTaskId = existing.id
      return this.sendTo(colonist, { x: existing.x, y: existing.y }, 'build', context)
    }
    const tasks = context.buildQueue.all
      .filter(t => t.reservedBy === null)
      .sort((a, b) => {
        const da = Math.abs(a.x - colonist.position.x) + Math.abs(a.y - colonist.position.y)
        const db = Math.abs(b.x - colonist.position.x) + Math.abs(b.y - colonist.position.y)
        return da - db
      })
    const task = tasks[0]
    if (!task) return false
    task.reservedBy = colonist.id
    ;(colonist as Colonist).reservedBuildTaskId = task.id
    return this.sendTo(colonist, { x: task.x, y: task.y }, 'build', context)
  }

  private findIdleColonist(context: JobContext, x: number, y: number): Colonist | null {
    let nearest: Colonist | null = null
    let minDist = Infinity
    for (const c of context.colonists) {
      if (c.state.phase !== 'idle') continue
      const dist = Math.abs(c.position.x - x) + Math.abs(c.position.y - y)
      if (dist < minDist) {
        minDist = dist
        nearest = c as Colonist
      }
    }
    return nearest
  }

  private sendTo(
    colonist: ColonistLike,
    target: { x: number; y: number },
    jobType: string,
    context: JobContext
  ): boolean {
    const def = JOB_REGISTRY.get(jobType)
    if (!def) return false
    const map = context.map
    if (!map.isWalkable(target.x, target.y)) {
      this.cancelReservation(colonist, context)
      return false
    }
    if (
      Math.round(colonist.position.x) === Math.round(target.x) &&
      Math.round(colonist.position.y) === Math.round(target.y)
    ) {
      const occupant = map.getOccupant(target.x, target.y)
      if (occupant !== null && occupant !== colonist.id) {
        this.cancelReservation(colonist, context)
        return false
      }
      ;(colonist as Colonist).transition({
        phase: 'working',
        job: jobType,
        progress: 0,
        duration: def.duration,
      })
      def.onStart(colonist, context)
      return true
    }
    const occupied = context.colonists
      .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
      .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
    const path = findPath(map, colonist.position, target, occupied)
    if (path.length === 0) {
      this.cancelReservation(colonist, context)
      return false
    }
    this.releaseTile(colonist, context)
    ;(colonist as Colonist).transition({ phase: 'moving', job: jobType, path })
    def.onStart(colonist, context)
    return true
  }

  cancelReservation(colonist: ColonistLike, context: JobContext): void {
    const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
    if (task) task.reservedBy = null
    ;(colonist as Colonist).reservedBuildTaskId = null
  }

  private releaseTile(colonist: ColonistLike, context: JobContext): void {
    const map = context.map
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    if (map.getOccupant(tx, ty) === colonist.id) {
      map.setOccupant(tx, ty, null)
    }
  }
}
```

- [ ] **Step 5: Create `src/core/colony/jobs/eat.ts`**

Same as `src/game/colony/jobs/eat.ts` but remove `eventBus` import and the `eventBus.emit('food_consumed', ...)` call on line 43.

```typescript
import { JobDefinition, JobContext, ColonistLike } from '../types'

export const eatJob: JobDefinition = {
  type: 'eat',
  label: 'Еда',
  duration: 0.5,

  findTarget(colonist: ColonistLike, context: JobContext): { x: number; y: number } | null {
    const all = this.findAllTargets!(colonist, context)
    return all.length > 0 ? all[0] : null
  },

  findAllTargets(colonist: ColonistLike, context: JobContext): { x: number; y: number }[] {
    const occupied = new Set(
      context.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => `${Math.round(c.position.x)},${Math.round(c.position.y)}`)
    )
    const foods = context.foods
      .filter(f => !occupied.has(`${f.x},${f.y}`))
      .map(f => ({ x: f.x, y: f.y }))
    const cx = colonist.position.x
    const cy = colonist.position.y
    foods.sort((a, b) =>
      (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy))
    )
    return foods
  },

  onStart(_colonist: ColonistLike, _context: JobContext): void {},

  onComplete(colonist: ColonistLike, context: JobContext): void {
    const foods = context.foods
    const idx = foods.findIndex(f =>
      Math.round(f.x) === Math.round(colonist.position.x) &&
      Math.round(f.y) === Math.round(colonist.position.y)
    )
    if (idx !== -1) {
      foods.splice(idx, 1)
      colonist.needs.hunger = Math.min(100, colonist.needs.hunger + 40)
    }
  },

  onCancel(_colonist: ColonistLike, _context: JobContext): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}
```

- [ ] **Step 6: Create `src/core/colony/jobs/build.ts`**

Same as `src/game/colony/jobs/build.ts` but remove `eventBus` import and the `eventBus.emit('food_built', ...)` call on line 46.

```typescript
import { JobDefinition, JobContext, ColonistLike } from '../types'
import { Building } from '../../entities/building'
import { TileType } from '../../world/tile'

interface ColonistWithBuildTask extends ColonistLike {
  reservedBuildTaskId: string | null
}

export const buildJob: JobDefinition = {
  type: 'build',
  label: 'Стройка',
  duration: 0.5,

  findTarget(colonist: ColonistLike, context: JobContext): { x: number; y: number } | null {
    const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
    if (task) return { x: task.x, y: task.y }
    const firstUnreserved = context.buildQueue.all.find(t => t.reservedBy === null)
    if (!firstUnreserved) return null
    firstUnreserved.reservedBy = colonist.id
    return { x: firstUnreserved.x, y: firstUnreserved.y }
  },

  onStart(_colonist: ColonistLike, _context: JobContext): void {},

  onComplete(colonist: ColonistLike, context: JobContext): void {
    const { buildQueue, buildings, map, foods, beds } = context
    const taskId = resolveTaskId(colonist, context)
    if (!taskId) return
    const task = buildQueue.removeById(taskId)
    if (!task) return
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    switch (task.type) {
      case 'wall':
        buildings.push(new Building(task.id, 'wall', tx, ty))
        map.setTile(tx, ty, TileType.Wall)
        break
      case 'bed':
        beds.push({ id: task.id, x: tx, y: ty })
        map.setTile(tx, ty, TileType.Bed)
        break
      case 'food':
        foods.push({ id: task.id, x: tx, y: ty })
        map.setTile(tx, ty, TileType.Food)
        break
    }
    ;(colonist as ColonistWithBuildTask).reservedBuildTaskId = null
  },

  onCancel(colonist: ColonistLike, context: JobContext): void {
    for (const task of context.buildQueue.all) {
      if (task.reservedBy === colonist.id) {
        task.reservedBy = null
        break
      }
    }
  },

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

function resolveTaskId(colonist: ColonistLike, context: JobContext): string | undefined {
  const c = colonist as ColonistWithBuildTask
  if (c.reservedBuildTaskId) return c.reservedBuildTaskId
  const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
  return task?.id
}
```

- [ ] **Step 7: Create remaining colony files**

Copy files below with only import path updates (from `../` or `../../` to correct core paths):

- `src/core/colony/jobs/sleep.ts` — same as game/, update import to `../types`
- `src/core/colony/jobs/walk.ts` — same, update import to `../types`
- `src/core/colony/statuses/hungry.ts` — same, update import to `../types`
- `src/core/colony/statuses/tired.ts` — same, update import to `../types`
- `src/core/colony/jobRegistry.ts` — same, update import to `./types`
- `src/core/colony/statusRegistry.ts` — same, update import to `./types`
- `src/core/colony/colonistFactory.ts` — same, update import to `./colonist`

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: tests pass. If any test imports from `game/colony/*`, those imports still work via the original files (they haven't been deleted yet).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: create core/colony/ with FSM, jobs, dispatcher, registries"
```

---

### Task 3: Create `src/core/entities/` and `src/core/systems/`

**Files:**
- Create: `src/core/entities/food.ts`, `bed.ts`, `building.ts` — copy from game/, update imports
- Create: `src/core/systems/needSystem.ts`, `statusSystem.ts` — copy from game/, update imports

- [ ] **Step 1: Create `src/core/entities/food.ts`**

Same as current `src/game/entities/food.ts` — no changes needed (no internal deps).

```typescript
export class Food {
  constructor(
    public id: string,
    public x: number,
    public y: number,
  ) {}

  toJSON() {
    return { id: this.id, x: this.x, y: this.y }
  }
}
```

- [ ] **Step 2: Create `src/core/entities/bed.ts`**

Same as current, no changes.

- [ ] **Step 3: Create `src/core/entities/building.ts`**

Same as current `src/game/entities/building.ts`. No import changes needed.

- [ ] **Step 4: Create `src/core/systems/needSystem.ts`**

Same as current `src/game/systems/needSystem.ts`. No changes.

- [ ] **Step 5: Create `src/core/systems/statusSystem.ts`**

Same as current `src/game/systems/statusSystem.ts`, just update import to `../colony/statusRegistry` and `../colony/types`.

```typescript
import { STATUS_REGISTRY } from '../colony/statusRegistry'
import { ColonistLike } from '../colony/types'

export class StatusSystem {
  update(dt: number, colonists: ColonistLike[]): void {
    for (const colonist of colonists) {
      const allDefs = STATUS_REGISTRY.getAll()
      for (const def of allDefs) {
        if (def.condition(colonist)) {
          colonist.statuses.add(def.type)
        } else {
          colonist.statuses.delete(def.type)
        }
      }
    }
  }
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: create core/entities/ and core/systems/"
```

---

### Task 4: Create `core/gameWorld.ts` — cleaned pure engine

**Files:**
- Create: `src/core/gameWorld.ts`
- Create: `src/core/types.ts` — CoreStateSnapshot

- [ ] **Step 1: Create `src/core/types.ts`**

```typescript
import { Vec2 } from './colony/types'

export interface CoreStateSnapshot {
  speed: number
  timeScale: number
  colonists: Array<{
    id: string
    name: string
    color: string
    stateLabel: string
    hunger: number
    sleep: number
    currentJob: string | null
    position: Vec2
    statuses: string[]
  }>
  foodCount: number
  bedCount: number
  buildQueueLength: number
}
```

- [ ] **Step 2: Create `src/core/gameWorld.ts`**

Key differences from current `src/game/gameWorld.ts`:
- **No camera** — removed property, constructor, serialization
- **No EventBus** — direct calls to `jobDispatcher`
- **No UIState** — `onStateChanged` with `CoreStateSnapshot`
- **No browser deps** — no `window.removeEventListener`, no `GameSpeed` import
- **No selectedColonistId, buildMode, hoveredTile** — UI state, not engine state
- **`addBuildTask(x, y, type)`** — explicit type parameter
- **`buildMode` removed** — GameHost passes type directly
- **`emitUiState` → `emitStateSnapshot`** — simpler
- **No `onUiUpdate`** — replaced by `onStateChanged`
- **Cleaner `destroy()`** — no window event cleanup

```typescript
import { GameMap } from './world/map'
import { TileType } from './world/tile'
import { Colonist, Vec2 } from './colony/colonist'
import { createInitialColonists } from './colony/colonistFactory'
import { JobDispatcher } from './colony/jobDispatcher'
import { JOB_REGISTRY } from './colony/jobRegistry'
import { STATUS_REGISTRY } from './colony/statusRegistry'
import { eatJob } from './colony/jobs/eat'
import { sleepJob } from './colony/jobs/sleep'
import { buildJob } from './colony/jobs/build'
import { walkJob } from './colony/jobs/walk'
import { hungryStatus } from './colony/statuses/hungry'
import { tiredStatus } from './colony/statuses/tired'
import { JobContext } from './colony/types'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building, BuildQueue, BuildTask } from './entities/building'
import { NeedSystem } from './systems/needSystem'
import { StatusSystem } from './systems/statusSystem'
import { WorldSerializer, SaveData } from './worldSerializer'
import { CoreStateSnapshot } from './types'

export class GameWorld {
  map: GameMap
  colonists: Colonist[]
  jobDispatcher: JobDispatcher
  buildQueue: BuildQueue

  foods: Food[]
  beds: Bed[]
  buildings: Building[]

  paused: boolean = false
  speed: number = 1  // 0 | 1 | 2 | 3
  timeScale: number = 1

  onStateChanged: ((snapshot: CoreStateSnapshot) => void) | null = null

  private uiUpdateTimer: number = 0
  private readonly UI_UPDATE_INTERVAL = 0.5

  private needSystem = new NeedSystem()
  private statusSystem = new StatusSystem()

  constructor(savedState?: SaveData) {
    JOB_REGISTRY.register(eatJob)
    JOB_REGISTRY.register(sleepJob)
    JOB_REGISTRY.register(buildJob)
    JOB_REGISTRY.register(walkJob)
    STATUS_REGISTRY.register(hungryStatus)
    STATUS_REGISTRY.register(tiredStatus)

    this.jobDispatcher = new JobDispatcher()
    this.buildQueue = new BuildQueue()

    if (savedState) {
      const init = WorldSerializer.fromJSON(savedState)
      this.map = init.map
      this.colonists = init.colonists
      this.foods = init.foods
      this.beds = init.beds
      this.buildings = init.buildings
      this.buildQueue = init.buildQueue
      this.speed = [0, 1, 2, 3].includes(init.speed) ? init.speed : 2
      this.timeScale = this.speed === 2 ? 5 : this.speed === 3 ? 10 : this.speed
      this.paused = this.speed === 0
      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          this.map.setOccupant(x, y, null)
        }
      }
      for (const c of this.colonists) {
        this.occupyTile(c.position.x, c.position.y, c.id)
      }
    } else {
      this.map = new GameMap()
      this.colonists = createInitialColonists()
      for (const c of this.colonists) {
        this.occupyTile(c.position.x, c.position.y, c.id)
      }
      this.foods = this.placeInitialFood()
      this.beds = this.placeInitialBeds()
      this.buildings = []
    }
  }

  private placeInitialFood(): Food[] {
    const positions: Vec2[] = [
      { x: 8, y: 8 }, { x: 12, y: 8 }, { x: 8, y: 12 }, { x: 12, y: 12 }, { x: 10, y: 10 },
    ]
    return positions.map((p, i) => {
      this.map.setTile(p.x, p.y, TileType.Food)
      return new Food(`food-${i}`, p.x, p.y)
    })
  }

  private placeInitialBeds(): Bed[] {
    const positions: Vec2[] = [
      { x: 6, y: 6 }, { x: 14, y: 14 },
    ]
    return positions.map((p, i) => {
      this.map.setTile(p.x, p.y, TileType.Bed)
      return new Bed(`bed-${i}`, p.x, p.y)
    })
  }

  private buildTaskCounter = 0

  addBuildTask(tileX: number, tileY: number, type: 'wall' | 'bed' | 'food'): void {
    if (!this.canBuildAt(tileX, tileY)) {
      this.emitStateSnapshot()
      return
    }

    const task: BuildTask = {
      id: `build-${Date.now()}-${++this.buildTaskCounter}`,
      type,
      x: tileX,
      y: tileY,
      reservedBy: null,
    }
    this.buildQueue.add(task)
    this.jobDispatcher.onBuildQueued(task, this.getJobContext())
    this.emitStateSnapshot()
  }

  private canBuildAt(x: number, y: number): boolean {
    const tile = this.map.tileAt(x, y)
    if (tile.type === TileType.Rock || tile.type === TileType.Water) return false
    if (this.foods.some(f => f.x === x && f.y === y)) return false
    if (this.beds.some(b => b.x === x && b.y === y)) return false
    if (this.buildings.some(b => b.x === x && b.y === y)) return false
    return true
  }

  getNearestColonist(target: Vec2): Colonist | null {
    let nearest: Colonist | null = null
    let minDist = Infinity
    for (const c of this.colonists) {
      const dist = Math.abs(c.position.x - target.x) + Math.abs(c.position.y - target.y)
      if (dist < minDist) {
        minDist = dist
        nearest = c
      }
    }
    return nearest
  }

  togglePause(): void {
    if (this.paused) {
      this.speed = 1
      this.paused = false
      this.timeScale = 1
    } else {
      this.speed = 0
      this.paused = true
      this.timeScale = 0
    }
    this.emitStateSnapshot()
  }

  setSpeed(speed: number): void {
    this.speed = speed
    this.paused = speed === 0
    this.timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.emitStateSnapshot()
  }

  occupyTile(x: number, y: number, id: string): void {
    const tx = Math.round(x)
    const ty = Math.round(y)
    const occ = this.map.getOccupant(tx, ty)
    if (occ === null || occ === id) {
      this.map.clearOccupantFor(id)
      this.map.setOccupant(tx, ty, id)
    }
  }

  releaseTile(x: number, y: number, id: string): void {
    const tx = Math.round(x)
    const ty = Math.round(y)
    if (this.map.getOccupant(tx, ty) === id) {
      this.map.setOccupant(tx, ty, null)
    }
  }

  private findFreeNeighbor(x: number, y: number, maxRadius: number = 5): { x: number; y: number } | null {
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= this.map.width || ny < 0 || ny >= this.map.height) continue
          if (this.map.isWalkable(nx, ny) && this.map.getOccupant(nx, ny) === null) {
            return { x: nx, y: ny }
          }
        }
      }
    }
    return null
  }

  private getJobContext(): JobContext {
    return {
      map: this.map,
      colonists: this.colonists,
      foods: this.foods,
      beds: this.beds,
      buildings: this.buildings,
      buildQueue: this.buildQueue,
    }
  }

  update(dt: number): void {
    const context = this.getJobContext()

    for (const colonist of this.colonists) {
      const s = colonist.state
      colonist.update(dt, this.map)
      const sAfter = colonist.state

      if (s.phase !== 'done' && sAfter.phase === 'done') {
        const job = sAfter.job
        const def = JOB_REGISTRY.get(job)
        if (def) {
          def.onComplete(colonist, context)
        }
        colonist.transition({ phase: 'idle' })
        if (job === 'sleep') {
          this.releaseTile(colonist.position.x, colonist.position.y, colonist.id)
          const free = this.findFreeNeighbor(
            Math.round(colonist.position.x),
            Math.round(colonist.position.y),
          )
          if (free) {
            colonist.position = free
            this.occupyTile(free.x, free.y, colonist.id)
          }
        } else {
          this.occupyTile(colonist.position.x, colonist.position.y, colonist.id)
        }
        this.jobDispatcher.assignBestJob(colonist.id, context)
      } else if (sAfter.phase === 'idle' && s.phase === 'moving') {
        this.jobDispatcher.cancelReservation(colonist, context)
        this.jobDispatcher.assignBestJob(colonist.id, context)
      }
    }

    this.needSystem.update(dt, this.colonists)
    this.statusSystem.update(dt, this.colonists)

    for (const colonist of this.colonists) {
      if (colonist.state.phase === 'idle') {
        this.jobDispatcher.assignBestJob(colonist.id, context)
      }
    }

    this.uiUpdateTimer += dt
    if (this.uiUpdateTimer >= this.UI_UPDATE_INTERVAL) {
      this.emitStateSnapshot()
      this.uiUpdateTimer = 0
    }
  }

  private emitStateSnapshot(): void {
    if (!this.onStateChanged) return

    const snapshot: CoreStateSnapshot = {
      timeScale: this.timeScale,
      speed: this.speed,
      colonists: this.colonists.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        stateLabel: c.state.phase,
        hunger: Math.round(c.needs.hunger),
        sleep: Math.round(c.needs.sleep),
        currentJob: c.state.phase === 'working' || c.state.phase === 'moving' || c.state.phase === 'done' ? c.state.job : null,
        position: c.position,
        statuses: [...c.statuses],
      })),
      foodCount: this.foods.length,
      bedCount: this.beds.length,
      buildQueueLength: this.buildQueue.all.length,
    }
    this.onStateChanged(snapshot)
  }

  toJSON(): SaveData {
    const context = this.getJobContext()
    return WorldSerializer.toJSON(this, context)
  }

  destroy(): void {
    JOB_REGISTRY.clear()
    STATUS_REGISTRY.clear()
  }
}
```

Note: `toJSON()` now takes context because `WorldSerializer.toJSON` needs buildQueue. We'll adjust WorldSerializer in Task 5.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: tests will fail because GameWorld tests import from `../game/gameWorld` (the old one). That's expected — we update tests in Task 7.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: create core/GameWorld — cleaned pure engine"
```

---

### Task 5: Create `core/worldSerializer.ts` — cleaned serializer

**Files:**
- Create: `src/core/worldSerializer.ts`
- Remove camera from SaveData/SerializableWorld
- Add `SerializableWorldForCore` interface that doesn't require camera

- [ ] **Step 1: Create `src/core/worldSerializer.ts`**

Key differences from `src/game/persistence/worldSerializer.ts`:
- **No Camera import** — camera field removed from SaveData, SerializableWorld, GameWorldInit
- **No GameSpeed import** — use `number` instead
- **`TILE_DATA_BY_TYPE`** — inline the walkable lookup (no longer needs TILE_DATA import)
- **`SerializableWorld`** — simplified, no camera
- **`GameWorldInit`** — no camera

```typescript
import { GameMap } from './world/map'
import { TileType, Tile } from './world/tile'
import { Colonist } from './colony/colonist'
import { ColonistState } from './colony/types'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building, BuildingType, BuildQueue, BuildTask } from './entities/building'

export interface SerializableTile {
  type: TileType
  occupantId: string | null
}

export interface SerializableColonist {
  id: string
  name: string
  color: string
  position: { x: number; y: number }
  fsmState: ColonistState
  needs: { hunger: number; sleep: number }
  statuses: string[]
}

export interface SerializableFood {
  id: string
  x: number
  y: number
}

export interface SerializableBed {
  id: string
  x: number
  y: number
}

export interface SerializableBuilding {
  id: string
  type: BuildingType
  x: number
  y: number
}

export interface SaveData {
  version: number
  timestamp: number
  gameName: string
  map: { tiles: SerializableTile[][] }
  colonists: SerializableColonist[]
  foods: SerializableFood[]
  beds: SerializableBed[]
  buildings: SerializableBuilding[]
  buildQueue: { tasks: BuildTask[] }
  speed: number
}

export interface GameWorldInit {
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueue: BuildQueue
  speed: number
}

export interface SerializableWorld {
  map: { toJSON(): { tiles: SerializableTile[][] }; tileAt(x: number, y: number): Tile }
  colonists: { toJSON(): SerializableColonist }[]
  foods: { toJSON(): SerializableFood }[]
  beds: { toJSON(): SerializableBed }[]
  buildings: { toJSON(): SerializableBuilding }[]
  buildQueue: { toJSON(): { tasks: BuildTask[] }; all: BuildTask[] }
  speed: number
}

const CURRENT_VERSION = 2

export class WorldSerializer {
  static toJSON(world: SerializableWorld): SaveData {
    return {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      gameName: 'expedition-l',
      map: world.map.toJSON(),
      colonists: world.colonists.map(c => c.toJSON()),
      foods: world.foods.map(f => f.toJSON()),
      beds: world.beds.map(b => b.toJSON()),
      buildings: world.buildings.map(b => b.toJSON()),
      buildQueue: world.buildQueue.toJSON(),
      speed: world.speed,
    }
  }

  static validate(data: unknown): data is SaveData {
    if (!data || typeof data !== 'object') return false
    const d = data as Record<string, unknown>
    const version = d.version as number
    if (version !== 1 && version !== 2) return false
    if (d.gameName !== 'expedition-l') return false
    if (!d.map || !d.colonists || !d.foods || !d.beds || !d.buildings) return false
    if (!d.buildQueue || d.speed === undefined) return false
    return true
  }

  static fromJSON(data: SaveData): GameWorldInit {
    const WALKABLE: Record<string, boolean> = {
      Floor: true, Wall: false, Rock: false,
      Water: false, Bed: true, Food: true,
    }

    const map = new GameMap(
      data.map.tiles.map(row =>
        row.map(t => ({
          type: t.type,
          walkable: WALKABLE[t.type] ?? true,
          occupantId: t.occupantId,
        }))
      )
    )

    const colonists = data.colonists.map(c => Colonist.fromJSON(c))
    const foods = data.foods.map(f => new Food(f.id, f.x, f.y))
    const beds = data.beds.map(b => new Bed(b.id, b.x, b.y))
    const buildings = data.buildings.map(b => new Building(b.id, b.type, b.x, b.y))

    const buildQueue = new BuildQueue()
    for (const task of data.buildQueue.tasks) {
      buildQueue.add({ ...task, reservedBy: null })
    }

    return { map, colonists, foods, beds, buildings, buildQueue, speed: data.speed }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: create core/WorldSerializer — cleaned, no camera/GameSpeed deps"
```

---

### Task 6: Update `game/index.ts` and create `game/gameHost.ts`

**Files:**
- Create: `src/game/gameHost.ts`
- Modify: `src/game/index.ts` — re-export from core/ + browser exports

- [ ] **Step 1: Create `src/game/gameHost.ts`**

GameHost is the browser coordinator. It owns:
- `core.GameWorld`
- `GameLoop` (from game/)
- `InputHandler` (from game/)
- Camera (from geometry/)
- Browser state: selectedColonistId, buildMode, hoveredTile
- UI callback: onUiUpdate → builds UIState from CoreStateSnapshot + browser state

```typescript
import { Camera } from '../geometry/camera'
import { GameWorld, SaveData, CoreStateSnapshot } from '../core'
import { GameLoop } from './gameLoop'
import { InputHandler } from './input/inputHandler'
import { renderWorld } from '../render/worldRenderer'
import { collectSnapshot, RenderSnapshot } from '../render/snapshot'
import { UIState, BuildMode } from '../ui/types'
import { findPath } from '../core/world/pathfinding'

export class GameHost {
  world: GameWorld
  private gameLoop: GameLoop
  private inputHandler: InputHandler
  private camera: Camera
  private width: number
  private height: number

  selectedColonistId: string | null = null
  buildMode: BuildMode = 'none'
  hoveredTile: { x: number; y: number } | null = null

  onUiUpdate: ((state: UIState) => void) | null = null

  constructor(canvas: HTMLCanvasElement, savedState?: SaveData) {
    this.width = canvas.width
    this.height = canvas.height

    this.camera = this.loadCamera(savedState)
    this.world = new GameWorld(savedState)
    this.world.onStateChanged = (snapshot) => this.onCoreStateChanged(snapshot)
    this.world.emitStateSnapshot()

    this.inputHandler = new InputHandler(this.camera, this.world.map, canvas)
    this.setupInputCallbacks()

    const initialSpeed = this.world.speed === 2 ? 5 : this.world.speed === 3 ? 10 : this.world.speed
    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => this.world.update(dt),
      onRender: (ctx, realDt) => this.render(ctx, realDt),
    })
    this.gameLoop.setSpeed(initialSpeed)
    this.gameLoop.start()
  }

  private loadCamera(savedState?: SaveData): Camera {
    if (savedState && 'camera' in savedState) {
      const camData = (savedState as any).camera
      if (camData) return new Camera(camData.offsetX, camData.offsetY)
    }
    return new Camera(this.width / 2, 100)
  }

  private onCoreStateChanged(snapshot: CoreStateSnapshot): void {
    if (!this.onUiUpdate) return
    const uiState: UIState = {
      timeScale: snapshot.timeScale,
      speed: snapshot.speed as 0 | 1 | 2 | 3,
      foodCount: snapshot.foodCount,
      colonistCount: snapshot.colonists.length,
      selectedColonistId: this.selectedColonistId,
      colonists: snapshot.colonists.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        stateLabel: c.stateLabel,
        hunger: c.hunger,
        sleep: c.sleep,
        currentJob: c.currentJob,
        position: c.position,
        statuses: c.statuses,
      })),
      buildMode: this.buildMode,
      hoveredTile: this.hoveredTile,
    }
    this.onUiUpdate(uiState)
  }

  private setupInputCallbacks(): void {
    this.inputHandler.onTileClick = (tileX, tileY) => {
      if (this.buildMode !== 'none') {
        this.world.addBuildTask(tileX, tileY, this.buildMode as 'wall' | 'bed' | 'food')
        return
      }
      const colonist = this.world.colonists.find(c =>
        Math.round(c.position.x) === tileX && Math.round(c.position.y) === tileY
      )
      this.selectedColonistId = colonist ? colonist.id : null
      this.world.emitStateSnapshot()
    }

    this.inputHandler.onRightClick = (tileX, tileY) => {
      const target = { x: tileX, y: tileY }
      const colonist = this.world.getNearestColonist(target)
      if (colonist && this.world.map.isWalkable(tileX, tileY)) {
        if (colonist.state.phase !== 'idle') {
          colonist.transition({ phase: 'idle' })
        }
        this.world.releaseTile(colonist.position.x, colonist.position.y, colonist.id)
        const occupied = this.world.colonists
          .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
          .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
        const path = findPath(this.world.map, colonist.position, target, occupied)
        if (path.length > 0) {
          colonist.transition({ phase: 'moving', job: 'walk', path })
        }
      }
    }

    this.inputHandler.onTileHover = (tileX, tileY) => {
      if (tileX >= 0 && tileX < this.world.map.width && tileY >= 0 && tileY < this.world.map.height) {
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
        case '1':
          this.setSpeed(0)
          break
        case '2':
          this.setSpeed(1)
          break
        case '3':
          this.setSpeed(2)
          break
        case '4':
          this.setSpeed(3)
          break
      }
    }
  }

  private render(ctx: CanvasRenderingContext2D, realDt: number = 0): void {
    this.inputHandler.update(realDt)
    renderWorld(ctx, this.collectSnapshot())
  }

  private collectSnapshot(): RenderSnapshot {
    return collectSnapshot({
      camera: this.camera,
      canvasWidth: this.width,
      canvasHeight: this.height,
      map: this.world.map,
      colonists: this.world.colonists,
      foods: this.world.foods,
      beds: this.world.beds,
      buildings: this.world.buildings,
      buildQueue: this.world.buildQueue,
      hoveredTile: this.hoveredTile,
      selectedColonistId: this.selectedColonistId,
      buildMode: this.buildMode,
    })
  }

  togglePause(): void {
    this.world.togglePause()
    this.gameLoop.setSpeed(this.world.paused ? 0 : (this.world.speed === 2 ? 5 : this.world.speed === 3 ? 10 : this.world.speed))
  }

  setSpeed(speed: number): void {
    this.world.setSpeed(speed)
    const timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.gameLoop.setSpeed(timeScale)
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
  }

  getSaveData(): SaveData {
    const data = this.world.toJSON()
    return {
      ...data,
      camera: this.camera.toJSON(),
    }
  }

  destroy(): void {
    this.gameLoop.destroy()
    this.world.destroy()
  }
}
```

Note on `loadCamera`: we check if savedState has a `camera` property. Since `SaveData` in core doesn't include camera, GameHost adds it at save time and checks at load time via a type-safe approach.

- [ ] **Step 2: Update `src/game/index.ts`**

Re-export everything from core/ + browser-specific exports:

```typescript
// Re-export all from core/
export { GameMap, MAP_WIDTH, MAP_HEIGHT } from '../core/world/map'
export { TileType } from '../core/world/tile'
export { findPath } from '../core/world/pathfinding'
export { Colonist } from '../core/colony/colonist'
export { createInitialColonists } from '../core/colony/colonistFactory'
export { JobDispatcher } from '../core/colony/jobDispatcher'
export { JOB_REGISTRY, JobRegistry } from '../core/colony/jobRegistry'
export { STATUS_REGISTRY, StatusRegistry } from '../core/colony/statusRegistry'
export type { JobDefinition, JobContext, ColonistLike, ColonistState, ColonistNeeds, ColonistStatus, StatusDefinition, StatusUpdatable, Vec2 } from '../core/colony/types'
export { Food } from '../core/entities/food'
export { Bed } from '../core/entities/bed'
export { Building, BuildQueue } from '../core/entities/building'
export type { BuildTask, BuildingType } from '../core/entities/building'
export { NeedSystem } from '../core/systems/needSystem'
export { GameWorld } from '../core/gameWorld'
export { WorldSerializer } from '../core/worldSerializer'
export type { SaveData, CoreStateSnapshot } from '../core/types'

// Browser-specific exports
export { GameLoop } from './gameLoop'
export { InputHandler } from './input/inputHandler'
export { GameHost } from './gameHost'
export { TILE_DATA, TILE_WIDTH, TILE_HEIGHT } from './world/tile'
```

- [ ] **Step 3: Run build check**

```bash
npm run build
```
Expected: may fail due to imports from game/ that no longer resolve. We'll fix those in the next task.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: create GameHost, update game/index.ts to re-export from core"
```

---

### Task 7: Update external imports

**Files:**
- Modify: `src/controller/gameController.ts` — update imports to use core/ or game/
- Modify: `src/App.tsx` — update imports
- Modify: `src/render/*.ts` — update imports
- Modify: `src/geometry/isoUtils.ts` — update import
- Modify: all test files — update imports

- [ ] **Step 1: Update `src/controller/gameController.ts`**

Replace imports from `../game/` with imports from `../core/` or `../game/`:

```typescript
import { Camera } from '../geometry/camera'
import { GameWorld } from '../core/gameWorld'
import { GameLoop } from '../game/gameLoop'
import { InputHandler } from '../game/input/inputHandler'
import { renderWorld } from '../render/worldRenderer'
import { collectSnapshot, RenderSnapshot } from '../render/snapshot'
import { UIState, BuildMode } from '../ui/types'
import { SaveData, WorldSerializer } from '../core/worldSerializer'
import { saveToLocalStorage, AUTOSAVE_KEY } from '../game/persistence/storage'
import { findPath } from '../core/world/pathfinding'
```

- [ ] **Step 2: Update `src/App.tsx`**

```typescript
import { GameHost, SaveData, WorldSerializer } from './game'
import { loadFromLocalStorage, downloadSaveFile, uploadSaveFile, saveToLocalStorage, AUTOSAVE_KEY } from './game/persistence'
```

Replace `GameController` with `GameHost`:
```typescript
import { GameHost, SaveData, WorldSerializer } from './game'
import { loadFromLocalStorage, downloadSaveFile, uploadSaveFile, saveToLocalStorage, AUTOSAVE_KEY } from './game/persistence'

function App() {
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE)
  const controllerRef = useRef<GameHost | null>(null)

  const startNewGame = useCallback((canvas: HTMLCanvasElement, savedState?: SaveData) => {
    if (controllerRef.current) {
      controllerRef.current.destroy()
    }
    const controller = new GameHost(canvas, savedState)
    controller.onUiUpdate = (state) => setUiState({ ...state })
    controllerRef.current = controller
    ;(window as any).__game = controller
  }, [])

  // ... rest unchanged
```

Also update handleSave:
```typescript
const handleSave = useCallback(() => {
  const ctrl = controllerRef.current
  if (!ctrl) return
  const data = ctrl.getSaveData()
  saveToLocalStorage(AUTOSAVE_KEY, data)
  downloadSaveFile(data)
}, [])
```

- [ ] **Step 3: Update `src/render/` imports**

All `src/render/*.ts` files import from `../game/`. These need to point to `../core/` or `../game/`:

| File | Import | Change to |
|------|--------|-----------|
| `drawWall3D.ts` | `TILE_WIDTH, TILE_HEIGHT` from `'../game/world/tile'` | `from '../game/world/tile'` (same — still re-exported) |
| `drawTile.ts` | `Tile, TILE_DATA, TILE_WIDTH, TILE_HEIGHT` | `Tile` from `'../core/world/tile'`, rest from `'../game/world/tile'` |
| `renderOverlay.ts` | `TILE_WIDTH, TILE_HEIGHT, TileType` | `TileType` from `'../core/world/tile'`, rest from `'../game/world/tile'` |
| `textures.ts` | `TileType, TILE_WIDTH, TILE_HEIGHT, TILE_DATA` | `TileType` from `'../core/world/tile'`, rest from `'../game/world/tile'` |
| `canvas.ts` | `GameMap` from `'../game/world/map'` | `from '../core/world/map'` |
| `drawColonist.ts` | `Colonist` from `'../game/colony/colonist'` | `from '../core/colony/colonist'` |
| `snapshot.ts` | `GameMap, Colonist, Food, Bed, Building, BuildTask` | `from '../core/...'` |
| `renderEntities.ts` | `TILE_HEIGHT` from `'../game/world/tile'` | `from '../game/world/tile'` (same) |

For files that need both core/ and game/ tile imports, split them:
```typescript
// drawTile.ts
import { Tile } from '../core/world/tile'
import { TILE_DATA, TILE_WIDTH, TILE_HEIGHT } from '../game/world/tile'

// renderOverlay.ts
import { TileType } from '../core/world/tile'
import { TILE_WIDTH, TILE_HEIGHT } from '../game/world/tile'
```

- [ ] **Step 4: Update `src/geometry/isoUtils.ts`**

Import `TILE_WIDTH, TILE_HEIGHT` from `'../game/world/tile'` (same path — still works).

- [ ] **Step 5: Update test files**

All test files import from `../game/`. Update to `../core/`:

| Test file | Import change |
|-----------|--------------|
| `statusSystem.test.ts` | `from '../core/colony/colonist'` etc |
| `gameMap.test.ts` | `from '../core/world/map'` etc |
| `renderMap.test.ts` | `from '../core/world/map'` etc |
| `pathfinding.test.ts` | `from '../core/world/pathfinding'` etc |
| `GameWorld.test.ts` | `from '../core/gameWorld'` etc |
| `worldSerializer.test.ts` | `from '../core/worldSerializer'` etc |
| `buildQueue.test.ts` | `from '../core/entities/building'` |

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: all tests pass. Fix any import errors.

- [ ] **Step 7: Run build**

Run: `npm run build`
Expected: clean build. Fix any import errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: update imports across all files to use core/ or game/"
```

---

### Task 8: Cleanup — delete moved files, remove eventBus

**Files:**
- Delete: `src/game/colony/` — entire directory (moved to core/)
- Delete: `src/game/entities/` — entire directory (moved to core/)
- Delete: `src/game/systems/` — entire directory (moved to core/)
- Delete: `src/game/world/map.ts` — moved
- Delete: `src/game/world/pathfinding.ts` — moved
- Delete: `src/game/world/serializer.ts` — moved to core/
- Delete: `src/game/eventBus.ts` — removed (replaced by direct calls)
- Delete: `src/game/controller/gameController.ts` — replaced by gameHost

Wait, `src/game/controller/` is not in game/ — it's separate. Let me check the structure again.

Actually, `src/controller/gameController.ts` — this is separate from `src/game/`. After creating GameHost, the controller/GameController is replaced. But we should keep it working or delete it. Let me add deletion of the old controller.

Actually, `src/controller/gameController.ts` is the current active coordinator. After creating `GameHost`, we should:
1. Update `App.tsx` to use `GameHost` instead of `GameController`
2. Delete or leave `controller/gameController.ts` — it becomes dead code

Let me leave it as cleanup.

- [ ] **Step 1: Remove old colony/, entities/, systems/ from game/**

```bash
rm -rf src/game/colony
rm -rf src/game/entities
rm -rf src/game/systems
rm -f src/game/world/map.ts
rm -f src/game/world/pathfinding.ts
rm -f src/game/eventBus.ts
```

- [ ] **Step 2: Remove old persistence/worldSerializer.ts**

Actually, `game/persistence/worldSerializer.ts` is referenced by `game/persistence/index.ts`. We need to update that index too. Or better: the persistence/index.ts should now import from core/.

Update `src/game/persistence/index.ts`:
```typescript
export { WorldSerializer } from '../../core/worldSerializer'
export type { SaveData, GameWorldInit, SerializableWorld } from '../../core/worldSerializer'
export { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage, downloadSaveFile, uploadSaveFile, AUTOSAVE_KEY } from './storage'
```

Then remove the old file:
```bash
rm -f src/game/persistence/worldSerializer.ts
```

- [ ] **Step 3: Remove old controller/gameController.ts** (replaced by gameHost)

```bash
rm -f src/controller/gameController.ts
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: cleanup — remove files moved to core/, delete eventBus/old controller"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass. GameWorld tests should now import from `../core/gameWorld` (not `../game/gameWorld`). Fix any remaining import issues.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: clean build with no errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Open browser, verify game loads, colonists move, build works, save/load works.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: final import fixes and cleanup"
```
