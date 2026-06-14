# Architectural Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the colony simulator from God Object (GameWorld) into layered architecture with clean dependencies, type safety, and hybrid tick+event game loop.

**Architecture:** Extract responsibilities from GameWorld into `game/` (pure engine, no external deps), `render/` (reads only snapshot), `controller/` (coordination). Eliminate `as any`. Revert all `game/` → `render/ui/store` imports.

**Tech Stack:** TypeScript, React 18, Vite, Vitest, Canvas 2D

---

### Task 1: Remove `as any` from JobDispatcher and job files

**Files:**
- Modify: `src/game/colony/colonist.ts` — add typed `reservedBuildTaskId` property
- Modify: `src/game/colony/jobDispatcher.ts` — replace all `as any` casts
- Modify: `src/game/colony/jobs/eat.ts` — remove `as any`
- Modify: `src/game/colony/jobs/sleep.ts` — remove `as any`
- Modify: `src/game/colony/jobs/build.ts` — remove `as any`

- [ ] **Step 1: Add typed property to Colonist**

Add to `src/game/colony/colonist.ts` class Colonist next to existing properties (line ~12):

```typescript
reservedBuildTaskId: string | null = null
```

- [ ] **Step 2: Fix `build.ts` — typed colonist, typed context, no `any`**

Rewrite `src/game/colony/jobs/build.ts` — remove `as any` casts. Use only `ColonistLike` and `JobContext` types. For `resolveTaskId`, cast to a local interface with `reservedBuildTaskId`:

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
    const task = buildQueue.removeById(resolveTaskId(colonist, context))
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

- [ ] **Step 3: Fix `eat.ts` — remove `as any`, typed context**

Rewrite `src/game/colony/jobs/eat.ts` — replace `const c = colonist as any` with direct access to `colonist.needs.hunger` and `context.foods`:

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

- [ ] **Step 4: Fix `sleep.ts` — remove `as any`**

Replace `onComplete`:

```typescript
onComplete(colonist: ColonistLike, _context: JobContext): void {
  colonist.needs.sleep = Math.min(100, colonist.needs.sleep + 60)
},
```

- [ ] **Step 5: Fix `jobDispatcher.ts` — remove all `as any`**

Key changes — import `Colonist` class for `.transition()`, `.reservedBuildTaskId`; use `context.map` directly (already typed GameMap); use `context.colonists` directly (already typed ColonistLike[]). Only cast needed: `colonist as Colonist` when accessing Colonist-specific properties.

Rewrite `src/game/colony/jobDispatcher.ts`:

```typescript
import { GameEvent, JobContext } from './types'
import { JOB_REGISTRY } from './jobRegistry'
import { findPath } from '../world/pathfinding'
import { Colonist } from './colonist'

export class JobDispatcher {
  onEvent(event: GameEvent, context: JobContext): void {
    switch (event.type) {
      case 'colonist_idle':
        this.assignBestJob(event.colonistId, context)
        break
      case 'build_queued':
        this.onBuildQueued(event.task, context)
        break
      case 'food_consumed':
        this.checkEmergencyFood(context)
        break
      case 'food_built':
        break
    }
  }

  private onBuildQueued(task: { id: string; type: string; x: number; y: number; reservedBy: string | null }, context: JobContext): void {
    const idle = this.findIdleColonist(context)
    if (!idle) return
    task.reservedBy = idle.id
    idle.reservedBuildTaskId = task.id
    this.sendTo(idle, { x: task.x, y: task.y }, 'build', context)
  }

  private checkEmergencyFood(context: JobContext): void {
    if (context.foods.length > 0) return
    const hungryIdle = (context.colonists as Colonist[]).find(
      c => c.state.phase === 'idle' && c.needs.hunger < 40
    )
    if (!hungryIdle) return
    const foodTask = context.buildQueue.all.find(t => t.type === 'food' && t.reservedBy === null)
    if (!foodTask) return
    foodTask.reservedBy = hungryIdle.id
    hungryIdle.reservedBuildTaskId = foodTask.id
    this.sendTo(hungryIdle, { x: foodTask.x, y: foodTask.y }, 'build', context)
  }

  assignBestJob(colonistId: string, context: JobContext): void {
    const colonist = context.colonists.find(c => c.id === colonistId)
    if (!colonist || colonist.state.phase !== 'idle') return
    const hungerBelow = colonist.needs.hunger < 40
    const sleepBelow = colonist.needs.sleep < 25
    if (hungerBelow && sleepBelow) {
      const hungerRatio = colonist.needs.hunger / 40
      const sleepRatio = colonist.needs.sleep / 25
      if (sleepRatio < hungerRatio) {
        if (this.tryAssignNeed(colonist, 'sleep', context)) return
        if (this.tryAssignNeed(colonist, 'hunger', context)) return
      } else {
        if (this.tryAssignNeed(colonist, 'hunger', context)) return
        if (this.tryAssignNeed(colonist, 'sleep', context)) return
      }
    } else {
      if (this.tryAssignNeed(colonist, 'hunger', context)) return
      if (this.tryAssignNeed(colonist, 'sleep', context)) return
    }
    if (this.tryAssignBuild(colonist, context)) return
  }

  private tryAssignNeed(colonist: ColonistLike, need: 'hunger' | 'sleep', context: JobContext): boolean {
    const threshold = need === 'hunger' ? 40 : 25
    if (colonist.needs[need] >= threshold) return false
    const jobType = need === 'hunger' ? 'eat' : 'sleep'
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
    const task = context.buildQueue.all.find(t => t.reservedBy === null)
    if (!task) return false
    task.reservedBy = colonist.id
    ;(colonist as Colonist).reservedBuildTaskId = task.id
    return this.sendTo(colonist, { x: task.x, y: task.y }, 'build', context)
  }

  private findIdleColonist(context: JobContext): Colonist | null {
    const idle = context.colonists.filter(c => c.state.phase === 'idle')
    return idle.length > 0 ? (idle[0] as Colonist) : null
  }

  private sendTo(colonist: ColonistLike, target: { x: number; y: number }, jobType: string, context: JobContext): boolean {
    const def = JOB_REGISTRY.get(jobType)
    if (!def) return false
    const map = context.map
    if (!map.isWalkable(target.x, target.y)) {
      this.cancelReservation(colonist, context)
      return false
    }
    if (Math.round(colonist.position.x) === Math.round(target.x) &&
        Math.round(colonist.position.y) === Math.round(target.y)) {
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

  private cancelReservation(colonist: ColonistLike, context: JobContext): void {
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

- [ ] **Step 6: Run tests to verify no regression**

Run: `npm test`
Expected: all tests pass (31+ tests)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove as any from JobDispatcher and job files"
```

---

### Task 2: Clean `GameWorld.update()` — remove duplicate logic

**Files:**
- Modify: `src/game/gameWorld.ts`

- [ ] **Step 1: Remove redundant `occupyTile` in done handler**

In `src/game/gameWorld.ts` line ~309, remove:
```typescript
this.occupyTile(colonist.position.x, colonist.position.y, colonist.id)
```

Also replace `context as any` with just `context` (line ~306):
```typescript
def.onComplete(colonist, context)
```

The FSM's `snapIdlePosition` → `reclaimCurrentTile` already handles tile re-occupation after `done → idle`.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove redundant occupyTile from GameWorld.update()"
```

---

### Task 3: EventBus for decoupled event dispatch

**Files:**
- Create: `src/game/eventBus.ts`
- Modify: `src/game/gameWorld.ts` — emit events through EventBus
- Modify: `src/game/colony/jobDispatcher.ts` — subscribe to EventBus via GameWorld

- [ ] **Step 1: Create EventBus**

`src/game/eventBus.ts`:
```typescript
import { BuildTask } from './entities/building'
import { Vec2 } from './colony/types'

export interface GameEventMap {
  colonist_idle: { colonistId: string }
  build_queued: { task: BuildTask }
  food_consumed: { position: Vec2 }
  food_built: { position: Vec2 }
}

export type EventType = keyof GameEventMap

export class EventBus {
  private handlers = new Map<EventType, Set<(data: any) => void>>()

  on<K extends EventType>(type: K, handler: (data: GameEventMap[K]) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler as (data: any) => void)
  }

  off<K extends EventType>(type: K, handler: (data: GameEventMap[K]) => void): void {
    this.handlers.get(type)?.delete(handler as (data: any) => void)
  }

  emit<K extends EventType>(type: K, data: GameEventMap[K]): void {
    this.handlers.get(type)?.forEach(h => h(data))
  }

  clear(): void {
    this.handlers.clear()
  }
}

export const eventBus = new EventBus()
```

- [ ] **Step 2: Wire EventBus in GameWorld**

In `GameWorld` constructor (after creating jobDispatcher), add subscriptions:
```typescript
import { eventBus } from './eventBus'

// In constructor, after jobDispatcher creation:
eventBus.on('colonist_idle', (data) => {
  this.jobDispatcher.assignBestJob(data.colonistId, this.getJobContext())
})
eventBus.on('build_queued', (data) => {
  this.jobDispatcher.onEvent({ type: 'build_queued', task: data.task }, this.getJobContext())
})
```

- [ ] **Step 3: Replace direct dispatch calls in `GameWorld.update()` and `GameWorld.addBuildTask()`**

Replace:
```typescript
this.jobDispatcher.onEvent({ type: 'colonist_idle', colonistId: colonist.id }, context)
```
With:
```typescript
eventBus.emit('colonist_idle', { colonistId: colonist.id })
```

Replace `addBuildTask`:
```typescript
this.jobDispatcher.onEvent({ type: 'build_queued', task }, this.getJobContext())
```
With:
```typescript
eventBus.emit('build_queued', { task })
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add EventBus for decoupled game event dispatch"
```

---

### Task 4: NeedSystem — extract tick-based needs update

**Files:**
- Create: `src/game/systems/needSystem.ts`
- Modify: `src/game/gameWorld.ts`

- [ ] **Step 1: Create NeedSystem**

`src/game/systems/needSystem.ts`:
```typescript
export interface NeedsUpdatable {
  needs: { hunger: number; sleep: number }
}

export class NeedSystem {
  update(dt: number, colonists: NeedsUpdatable[]): void {
    for (const colonist of colonists) {
      colonist.needs.hunger = Math.max(0, colonist.needs.hunger - 0.5 * dt)
      colonist.needs.sleep = Math.max(0, colonist.needs.sleep - 0.3 * dt)
    }
  }
}
```

- [ ] **Step 2: Wire NeedSystem in GameWorld**

In GameWorld:
```typescript
import { NeedSystem } from './systems/needSystem'

// Property:
private needSystem = new NeedSystem()

// In update(dt), replace the needs loop:
for (const colonist of this.colonists) {
  colonist.needs.hunger = Math.max(0, colonist.needs.hunger - 0.5 * dt)
  colonist.needs.sleep = Math.max(0, colonist.needs.sleep - 0.3 * dt)
}
```
With:
```typescript
this.needSystem.update(dt, this.colonists)
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: extract NeedSystem for tick-based needs"
```

---

### Task 5: RenderSnapshot → move to `render/snapshot.ts`

**Files:**
- Create: `src/render/snapshot.ts`
- Modify: `src/render/worldRenderer.ts` — import from `./snapshot`
- Modify: `src/game/gameWorld.ts` — no longer defines snapshot types

- [ ] **Step 1: Create `render/snapshot.ts`**

Move `RenderSnapshot` interface and `collectSnapshot()` logic out of GameWorld. GameWorld will call a snapshot factory that takes game state and returns a RenderSnapshot.

`src/render/snapshot.ts`:
```typescript
import { GameMap } from '../game/world/map'
import { Colonist } from '../game/colony/colonist'
import { Food } from '../game/entities/food'
import { Bed } from '../game/entities/bed'
import { Building, BuildTask } from '../game/entities/building'
import { BuildMode } from '../ui/types'

export interface RenderSnapshot {
  offsetX: number
  offsetY: number
  canvasWidth: number
  canvasHeight: number
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueueTasks: BuildTask[]
  hoveredTile: { x: number; y: number } | null
  selectedColonistId: string | null
  buildMode: BuildMode
}

export function collectSnapshot(params: {
  camera: { offsetX: number; offsetY: number }
  canvasWidth: number
  canvasHeight: number
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueue: { all: BuildTask[] }
  hoveredTile: { x: number; y: number } | null
  selectedColonistId: string | null
  buildMode: BuildMode
}): RenderSnapshot {
  return {
    offsetX: params.camera.offsetX,
    offsetY: params.camera.offsetY,
    canvasWidth: params.canvasWidth,
    canvasHeight: params.canvasHeight,
    map: params.map,
    colonists: params.colonists,
    foods: params.foods,
    beds: params.beds,
    buildings: params.buildings,
    buildQueueTasks: params.buildQueue.all,
    hoveredTile: params.hoveredTile,
    selectedColonistId: params.selectedColonistId,
    buildMode: params.buildMode,
  }
}
```

Note: `collectSnapshot` stays in GameWorld as a thin call to this function. GameWorld still holds the game state and passes it as params. The key improvement: GameWorld no longer defines `RenderSnapshot` — the type lives in `render/`.

- [ ] **Step 2: Update `worldRenderer.ts`**

Change import path from:
```typescript
import { RenderSnapshot } from '../game/gameWorld'
```
To:
```typescript
import { RenderSnapshot } from './snapshot'
```

- [ ] **Step 3: Update `GameWorld`**

Update `collectSnapshot` method:
```typescript
private collectSnapshot(): RenderSnapshot {
  return collectSnapshot({
    camera: this.camera,
    canvasWidth: this.width,
    canvasHeight: this.height,
    map: this.map,
    colonists: this.colonists,
    foods: this.foods,
    beds: this.beds,
    buildings: this.buildings,
    buildQueue: this.buildQueue,
    hoveredTile: this.hoveredTile,
    selectedColonistId: this.selectedColonistId,
    buildMode: this.buildMode,
  })
}
```

Remove the `RenderSnapshot` interface from `gameWorld.ts`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move RenderSnapshot to render/snapshot.ts"
```

---

### Task 6: GameWorld → GameController — break God Object

**Files:**
- Create: `src/controller/gameController.ts`
- Create: `src/controller/types.ts`
- Modify: `src/game/gameWorld.ts` — strip canvas, render, UI bindings
- Modify: `src/App.tsx` — use GameController

- [ ] **Step 1: Create `controller/types.ts`**

`src/controller/types.ts`:
```typescript
import { RenderSnapshot } from '../render/snapshot'
import { UIState } from '../ui/types'

export { RenderSnapshot, UIState }
```

- [ ] **Step 2: Create GameController**

`src/controller/gameController.ts`:
```typescript
import { GameWorld } from '../game/gameWorld'
import { GameLoop } from '../game/gameLoop'
import { InputHandler } from '../game/input/inputHandler'
import { Camera } from '../game/camera'
import { renderWorld, RenderSnapshot } from '../render/worldRenderer'
import { UIState } from '../ui/types'

export class GameController {
  world: GameWorld
  private gameLoop: GameLoop
  private inputHandler: InputHandler
  private camera: Camera
  private canvas: HTMLCanvasElement
  private width: number
  private height: number

  onUiUpdate: ((state: UIState) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height
    this.camera = new Camera(this.width / 2, 100)
    this.world = new GameWorld(this.camera)
    this.inputHandler = new InputHandler(this.camera, this.world.map, canvas)
    this.setupInputCallbacks()
    this.world.onUiUpdate = (state) => this.onUiUpdate?.(state)

    const initialSpeed = this.world.speed === 2 ? 5 : this.world.speed === 3 ? 10 : this.world.speed
    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => this.update(dt),
      onRender: (ctx) => this.render(ctx),
    })
    this.gameLoop.setSpeed(initialSpeed)
    this.gameLoop.start()
  }

  private setupInputCallbacks(): void {
    // Transferred from GameWorld.setupInputCallbacks()
    // Same as current GameWorld.setupInputCallbacks() but uses this.world instead of this
    // (copy the full implementation from GameWorld.setupInputCallbacks)
  }

  private update(dt: number): void {
    this.world.update(dt)
  }

  private render(ctx: CanvasRenderingContext2D): void {
    this.inputHandler.update(/*realDt=*/0)
    renderWorld(ctx, this.collectSnapshot())
  }

  private collectSnapshot(): RenderSnapshot {
    // Same as current GameWorld.collectSnapshot()
  }

  setSpeed(speed: 0 | 1 | 2 | 3): void {
    this.world.setSpeed(speed)
    const timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.gameLoop.setSpeed(timeScale)
  }

  // ... other public methods from GameWorld

  destroy(): void {
    this.gameLoop.destroy()
    this.world.destroy()
  }
}
```

- [ ] **Step 3: Strip GameWorld down to pure game engine**

Remove from `GameWorld`:
- `canvas`, `width`, `height` properties
- `gameLoop` property
- `inputHandler` property
- `render()` method
- `collectSnapshot()` method
- `setupInputCallbacks()` method (move to GameController)
- Import of `renderWorld`, `InputHandler`, `GameLoop`

Keep in `GameWorld`:
- `map`, `colonists`, `camera`, `foods`, `beds`, `buildings`
- `buildQueue`, `jobDispatcher`
- `paused`, `speed` state
- `selectedColonistId`, `buildMode`, `hoveredTile`
- `onUiUpdate` callback
- `update(dt)` — pure game logic
- `addBuildTask`, `canBuildAt`, `getNearestColonist`
- `occupyTile`, `releaseTile`, `getJobContext`
- `togglePause`, `setSpeed`, `setBuildMode`
- `emitUiState`, `destroy`

- [ ] **Step 4: Update App.tsx to use GameController**

```typescript
import { GameController } from './controller/gameController'

function App() {
  const controllerRef = useRef<GameController | null>(null)

  const startNewGame = useCallback((canvas: HTMLCanvasElement) => {
    if (controllerRef.current) {
      controllerRef.current.destroy()
    }
    const controller = new GameController(canvas)
    controller.onUiUpdate = (state) => setUiState({ ...state })
    controllerRef.current = controller
  }, [])
  // ...
}
```

- [ ] **Step 5: Update tests**

Tests need to work with GameWorld as a pure engine (no canvas). Some tests that create `new GameWorld(canvas)` need updating:
- Tests that only test game logic (speed, dispatch, occupancy) can create GameWorld without canvas or with a minimal mock.
- Actually, the current GameWorld constructor needs canvas for InputHandler. We'll change GameWorld to accept Camera instead of canvas.

Update GameWorld constructor:
```typescript
constructor(camera: Camera, savedState?: SaveData) {
  // No more canvas parameter
  this.camera = camera
  // Remove gameLoop, inputHandler, render setup
  // Keep: map init, colonist init, job registry, build queue
}
```

Update tests to pass a Camera instead of canvas:
```typescript
const camera = new Camera(480, 270)
const game = new GameWorld(camera)
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: all tests pass. May need to update test setup (mock canvas context for GameController, not GameWorld).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: split GameWorld into GameController (coordination) + GameWorld (engine)"
```

---

### Task 7: Barrel files for each module

**Files:**
- Create: `src/game/index.ts`
- Create: `src/render/index.ts`
- Create: `src/controller/index.ts`
- Create: `src/ui/index.ts`
- Create: `src/persistence/index.ts`
- Modify: `src/App.tsx` — use barrel imports

- [ ] **Step 1: Create `src/game/index.ts`**

```typescript
export { GameMap, MAP_WIDTH, MAP_HEIGHT } from './world/map'
export { TileType, Tile, TILE_DATA } from './world/tile'
export { findPath } from './world/pathfinding'
export { Colonist } from './colony/colonist'
export { createInitialColonists } from './colony/colonistFactory'
export { JobDispatcher } from './colony/jobDispatcher'
export { JOB_REGISTRY, JobRegistry } from './colony/jobRegistry'
export { JobDefinition, JobContext, ColonistLike, ColonistState, ColonistNeeds, Vec2, GameEvent } from './colony/types'
export { Food } from './entities/food'
export { Bed } from './entities/bed'
export { Building, BuildQueue, BuildTask, BuildingType } from './entities/building'
export { Camera } from './camera'
export { NeedSystem } from './systems/needSystem'
export { EventBus, eventBus, GameEventMap, EventType } from './eventBus'
```

- [ ] **Step 2: Create `src/render/index.ts`**

```typescript
export { RenderSnapshot, collectSnapshot } from './snapshot'
export { renderWorld } from './worldRenderer'
export { renderMap } from './canvas'
export { drawColonist } from './drawColonist'
export { drawShadow } from './drawShadow'
export { tileToScreen, screenToTile } from '../game/isoUtils'
export { renderEntities } from './renderEntities'
export { renderBuildQueueGhosts, renderHighlight, renderSelection, renderPaths } from './renderOverlay'
```

- [ ] **Step 3: Create `src/controller/index.ts`**

```typescript
export { GameController } from './gameController'
export { RenderSnapshot, UIState } from './types'
```

- [ ] **Step 4: Create `src/ui/index.ts`**

```typescript
export { default as GameCanvas } from './GameCanvas'
export { default as TopBar } from './TopBar'
export { default as BuildMenu } from './BuildMenu'
export { default as ColonistPanel } from './ColonistPanel'
export { UIState, UIColonist, BuildMode, INITIAL_UI_STATE } from './types'
```

- [ ] **Step 5: Create `src/persistence/index.ts`**

```typescript
export { WorldSerializer, SaveData, GameWorldInit, SerializableWorld } from './worldSerializer'
export { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage, downloadSaveFile, uploadSaveFile, AUTOSAVE_KEY } from './storage'
```

- [ ] **Step 6: Update App.tsx to use barrel imports**

```typescript
// Before:
import GameCanvas from './ui/GameCanvas'
import TopBar from './ui/TopBar'
import { GameWorld } from './game/gameWorld'
// etc.

// After:
import { GameCanvas, TopBar, BuildMenu, ColonistPanel } from './ui'
import { GameController } from './controller'
```

- [ ] **Step 7: Run tests and build**

Run: `npm test` && `npm run build`
Expected: both pass

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: add barrel files for public API per module"
```

---

### Task 8: Persistence — use interfaces instead of direct class deps

**Files:**
- Modify: `src/persistence/worldSerializer.ts` — use interfaces, not direct class imports where possible

- [ ] **Step 1: Define serializable interfaces in persistence**

Add `Serializable` interfaces in `src/persistence/worldSerializer.ts` (or a separate `src/persistence/types.ts`):

```typescript
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
```

- [ ] **Step 2: Update `SaveData` and `SerializableWorld` to use interfaces**

```typescript
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
  camera: { offsetX: number; offsetY: number }
  speed: GameSpeed
}

export interface SerializableWorld {
  map: { toJSON(): { tiles: SerializableTile[][] } }
  colonists: { toJSON(): SerializableColonist }[]
  foods: { toJSON(): SerializableFood }[]
  beds: { toJSON(): SerializableBed }[]
  buildings: { toJSON(): SerializableBuilding }[]
  buildQueue: { toJSON(): { tasks: BuildTask[] }; all: BuildTask[] }
  camera: { toJSON(): { offsetX: number; offsetY: number } }
  speed: GameSpeed
}
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: use serializable interfaces in persistence layer"
```
