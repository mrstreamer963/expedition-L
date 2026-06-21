# Building Visuals Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify ClientSnapshot entity arrays into `entities[]` and introduce a visual registry so adding a new building type requires one `registerBuildingVisual()` call instead of editing 5+ files.

**Architecture:** `ClientSnapshot` replaces `foods`/`beds`/`buildings` with `entities: { id, type, x, y }[]`. `GameWorld.generateSnapshot()` uses a single ECS query. `src/game/buildingVisuals.ts` holds a registry mapping `type → { label, renderEntity, renderGhost }`. Render and overlay layers dispatch through the registry instead of hardcoded type checks.

**Tech Stack:** TypeScript, bitECS, Canvas 2D, Vitest

**Files to modify/create:**
- Modify: `src/core/types.ts` — ClientSnapshot.entities replaces foods/beds/buildings
- Modify: `src/core/gameWorld.ts` — generateSnapshot + canBuildAt use generic approach
- Create: `src/game/buildingVisuals.ts` — visual registry for buildings
- Create: `src/test/buildingVisuals.test.ts` — tests for registry
- Modify: `src/render/renderEntities.ts` — dispatch via registry
- Modify: `src/render/renderOverlay.ts` — dispatch ghosts via registry
- Modify: `src/game/gameHost.ts` — foodCount from entities array

---

### Task 1: buildingVisuals registry

**Files:**
- Create: `src/game/buildingVisuals.ts`
- Create: `src/test/buildingVisuals.test.ts`

- [ ] **Step 1: Create buildingVisuals.ts**

```typescript
import { drawWall3D } from '../render/drawWall3D'
import { roundRect } from '../render/roundRect'

export interface BuildingVisualDef {
  label: string
  renderEntity(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void
  renderGhost(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void
}

const registry = new Map<string, BuildingVisualDef>()

export function registerBuildingVisual(type: string, def: BuildingVisualDef): void {
  registry.set(type, def)
}

export function getBuildingVisual(type: string): BuildingVisualDef | undefined {
  return registry.get(type)
}

export function getAllBuildingTypes(): string[] {
  return Array.from(registry.keys())
}

function buildWall3D(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  drawWall3D(ctx, sx, sy)
}

function buildFood(ctx: CanvasRenderingContext2D, sx: number, sy: number, alpha: number = 1): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#d44040'
  ctx.beginPath()
  ctx.arc(sx - 3, sy - 14, 3, 0, Math.PI * 2)
  ctx.arc(sx + 3, sy - 15, 3, 0, Math.PI * 2)
  ctx.arc(sx + 1, sy - 12, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8d44d'
  ctx.beginPath()
  ctx.arc(sx - 3, sy - 14, 1.5, 0, Math.PI * 2)
  ctx.arc(sx + 3, sy - 15, 1.5, 0, Math.PI * 2)
  ctx.arc(sx + 1, sy - 12, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function buildBed(ctx: CanvasRenderingContext2D, sx: number, sy: number, alpha: number = 1): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#c49a6c'
  roundRect(ctx, sx - 14, sy - 20, 28, 16, 3)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 0.5
  ctx.stroke()
  ctx.fillStyle = '#d4b080'
  roundRect(ctx, sx + 4, sy - 18, 10, 8, 2)
  ctx.fill()
  ctx.restore()
}

registerBuildingVisual('wall', {
  label: 'Стена',
  renderEntity: (ctx, sx, sy) => buildWall3D(ctx, sx, sy),
  renderGhost: (ctx, sx, sy) => buildWall3D(ctx, sx, sy),
})

registerBuildingVisual('food', {
  label: 'Еда',
  renderEntity: (ctx, sx, sy) => buildFood(ctx, sx, sy, 1),
  renderGhost: (ctx, sx, sy) => buildFood(ctx, sx, sy, 0.35),
})

registerBuildingVisual('bed', {
  label: 'Кровать',
  renderEntity: (ctx, sx, sy) => buildBed(ctx, sx, sy, 1),
  renderGhost: (ctx, sx, sy) => buildBed(ctx, sx, sy, 0.35),
})
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/test/buildingVisuals.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { registerBuildingVisual, getBuildingVisual, getAllBuildingTypes } from '../game/buildingVisuals'

describe('buildingVisuals registry', () => {
  afterEach(() => {
    // Clear registry by re-registering defaults won't work; we need to clear
    // Instead just test with the pre-registered defaults
  })

  it('has wall registered', () => {
    const def = getBuildingVisual('wall')
    expect(def).toBeDefined()
    expect(def!.label).toBe('Стена')
  })

  it('has food registered', () => {
    const def = getBuildingVisual('food')
    expect(def).toBeDefined()
    expect(def!.label).toBe('Еда')
  })

  it('has bed registered', () => {
    const def = getBuildingVisual('bed')
    expect(def).toBeDefined()
    expect(def!.label).toBe('Кровать')
  })

  it('returns undefined for unregistered type', () => {
    expect(getBuildingVisual('nonexistent')).toBeUndefined()
  })

  it('getAllBuildingTypes returns all registered types', () => {
    const types = getAllBuildingTypes()
    expect(types).toContain('wall')
    expect(types).toContain('food')
    expect(types).toContain('bed')
  })

  it('renderEntity and renderGhost are functions', () => {
    const def = getBuildingVisual('food')
    expect(typeof def!.renderEntity).toBe('function')
    expect(typeof def!.renderGhost).toBe('function')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/test/buildingVisuals.test.ts --reporter=verbose`
Expected: 3 pass (wall is registered at module level)

- [ ] **Step 4: Run all tests to check for regressions**

Run: `npx vitest run --reporter=verbose`
Expected: all pass (buildingVisuals import doesn't break anything yet)

- [ ] **Step 5: Commit**

```bash
git add src/game/buildingVisuals.ts src/test/buildingVisuals.test.ts
git commit -m "feat: add buildingVisuals registry with food/bed/wall visuals"
```

---

### Task 2: ClientSnapshot entities[] + consumers

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/gameWorld.ts`
- Modify: `src/game/gameHost.ts`
- Modify: `src/render/renderOverlay.ts` — canBuildAt function
- Tests may need updating if they reference snapshot fields

- [ ] **Step 1: Update ClientSnapshot type**

Replace in `src/core/types.ts`:
```typescript
  foods: { id: string; x: number; y: number }[]
  beds: { id: string; x: number; y: number }[]
  buildings: { id: string; x: number; y: number }[]
```

With:
```typescript
  entities: { id: string; type: string; x: number; y: number }[]
```

- [ ] **Step 2: Update GameWorld.generateSnapshot()**

In `src/core/gameWorld.ts`, replace the three queries in `generateSnapshot()`:

```typescript
      foods: Array.from(query(this.state.ecs, [Edible, Position])).map(eid => ({ id: `e${eid}`, x: Position.x[eid], y: Position.y[eid] })),
      beds: Array.from(query(this.state.ecs, [Sleepable, Position])).map(eid => ({ id: `e${eid}`, x: Position.x[eid], y: Position.y[eid] })),
      buildings: Array.from(query(this.state.ecs, [Solid, Position])).map(eid => ({ id: `e${eid}`, x: Position.x[eid], y: Position.y[eid] })),
```

With:
```typescript
      entities: Array.from(query(this.state.ecs, [Renderable, Position])).map(eid => ({
        id: `e${eid}`,
        type: Renderable[eid].type,
        x: Position.x[eid],
        y: Position.y[eid],
      })),
```

- [ ] **Step 3: Update GameWorld.canBuildAt()**

Replace:
```typescript
    if (findEntityAt(this.state.ecs, x, y, Edible) !== null) return false
    if (findEntityAt(this.state.ecs, x, y, Sleepable) !== null) return false
    if (findEntityAt(this.state.ecs, x, y, Solid) !== null) return false
```

With a generic query on any entity with Position:
```typescript
    for (const eid of query(this.state.ecs, [Position])) {
      if (Position.x[eid] === x && Position.y[eid] === y) return false
    }
```

- [ ] **Step 4: Update imports in gameWorld.ts**

Remove unused imports: `Edible, Sleepable, Solid` from components import, `findEntityAt` from entityFactory import.

Keep `Position` (still used in query and entity loops).

- [ ] **Step 5: Update renderOverlay.ts canBuildAt**

In `src/render/renderOverlay.ts`, replace:
```typescript
  if (snap.foods.some(f => f.x === x && f.y === y)) return false
  if (snap.beds.some(b => b.x === x && b.y === y)) return false
  if (snap.buildings.some(b => b.x === x && b.y === y)) return false
```

With:
```typescript
  if (snap.entities.some(e => e.x === x && e.y === y)) return false
```

- [ ] **Step 6: Update gameHost.ts foodCount**

In `src/game/gameHost.ts`, replace:
```typescript
      foodCount: snap.foods.length,
```
With:
```typescript
      foodCount: snap.entities.filter(e => e.type === 'food').length,
```

- [ ] **Step 7: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: all pass

Possible test fix: if `GameWorld.test.ts` uses `snap.foods`/`snap.beds`/`snap.buildings`, update to `snap.entities`.

- [ ] **Step 8: Commit**

```bash
git add src/core/types.ts src/core/gameWorld.ts src/game/gameHost.ts src/render/renderOverlay.ts
git commit -m "refactor: unify ClientSnapshot entity arrays into entities[]"
```

---

### Task 3: Render layer — dispatch through registry

**Files:**
- Modify: `src/render/renderEntities.ts`

- [ ] **Step 1: Refactor renderEntities.ts**

Current file renders each type with hardcoded loops. Replace entire content with registry dispatch:

```typescript
import { tileToScreen } from '../geometry/isoUtils'
import { TILE_HEIGHT } from '../game/world/tile'
import { getBuildingVisual } from '../game/buildingVisuals'
import { ClientSnapshot } from '../core'

export function renderEntities(ctx: CanvasRenderingContext2D, snap: ClientSnapshot, offsetX: number, offsetY: number): void {
  for (const entity of snap.entities) {
    const visual = getBuildingVisual(entity.type)
    if (!visual) continue
    const { x: sx, y: sy } = tileToScreen(entity.x, entity.y)
    visual.renderEntity(ctx, sx + offsetX, sy + offsetY)
  }
}
```

Remove unused imports: `drawShadow`, `drawWall3D`, `roundRect` (they now live in buildingVisuals registry).

- [ ] **Step 2: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/render/renderEntities.ts
git commit -m "refactor: renderEntities dispatches through buildingVisuals registry"
```

---

### Task 4: Cleanup overlay hardcoded draw calls

**Files:**
- Modify: `src/render/renderOverlay.ts`

- [ ] **Step 1: Replace ghost draw logic in renderBuildQueueGhosts**

Current code uses `if (task.type === BuildingType.Wall / Bed / Food)`. Replace the if-chain inside the loop:

```typescript
for (const task of snap.buildQueue) {
    const { x: sx, y: sy } = tileToScreen(task.x, task.y)
    const cx = sx + renderCtx.offsetX
    const cy = sy + renderCtx.offsetY

    const visual = getBuildingVisual(task.type)
    if (visual) visual.renderGhost(ctx, cx, cy)
}
```

Remove unused import `BuildingType` from '../core'. Remove `import { drawWall3D }` if no longer used directly. Keep `import { roundRect }` if still used for other purposes.

- [ ] **Step 2: Replace highlight draw logic in renderHighlight**

Same pattern in the `renderCtx.buildMode !== 'none'` branch:

```typescript
const visual = getBuildingVisual(renderCtx.buildMode)
if (visual) visual.renderGhost(ctx, cx, cy)
```

Remove the `if (renderCtx.buildMode === BuildingType.Wall / Bed / Food)` chain.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run --reporter=verbose`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/render/renderOverlay.ts
git commit -m "refactor: overlay dispatches ghosts through buildingVisuals registry"
```

---

### Task 5: Verify build

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: tsc + vite build succeed with no errors

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: all tests pass

- [ ] **Step 3: Final commit (if needed)**

```bash
git add -A
git commit -m "chore: clean up remaining references after building visuals refactor"
```
