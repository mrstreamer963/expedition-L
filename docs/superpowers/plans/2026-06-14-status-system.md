# Status System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add discrete status effects (hungry, tired) to colonists that drive FSM job selection instead of raw need thresholds.

**Architecture:** StatusDefinition objects (like JobDefinition) registered in StatusRegistry. StatusSystem evaluates conditions each tick and populates `colonist.statuses: Set<ColonistStatus>`. JobDispatcher reads statuses (sorted by priority) to pick jobs. Same FSM phases, new job selection logic.

**Tech Stack:** TypeScript 5.5 strict, Vitest, React 18, Canvas 2D

---

### Task 1: Add new types (ColonistStatus, StatusDefinition, StatusUpdatable) + StatusRegistry

**Files:**
- Modify: `src/game/colony/types.ts`
- Create: `src/game/colony/statusRegistry.ts`

- [ ] **Step 1: Add ColonistStatus, StatusDefinition, StatusUpdatable to types.ts**

```typescript
// Add to existing types.ts

export type ColonistStatus = 'hungry' | 'tired'

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
```

- [ ] **Step 2: Add statuses to ColonistLike**

```typescript
export interface ColonistLike {
  id: string
  position: Vec2
  needs: ColonistNeeds
  state: ColonistState
  statuses: Set<ColonistStatus>
}
```

- [ ] **Step 3: Create statusRegistry.ts**

```typescript
import { StatusDefinition } from './types'

export class StatusRegistry {
  private defs = new Map<string, StatusDefinition>()

  register(def: StatusDefinition): void {
    if (this.defs.has(def.type)) return
    this.defs.set(def.type, def)
  }

  get(type: string): StatusDefinition | undefined {
    return this.defs.get(type)
  }

  getAll(): StatusDefinition[] {
    return Array.from(this.defs.values())
  }
}

export const STATUS_REGISTRY = new StatusRegistry()
```

- [ ] **Step 4: Export from game/index.ts**

Add to `src/game/index.ts`:
```typescript
export { STATUS_REGISTRY, StatusRegistry } from './colony/statusRegistry'
export type { ColonistStatus, StatusDefinition, StatusUpdatable } from './colony/types'
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add status types and StatusRegistry"
```

---

### Task 2: Create status definitions (hungry, tired)

**Files:**
- Create: `src/game/colony/statuses/hungry.ts`
- Create: `src/game/colony/statuses/tired.ts`

- [ ] **Step 1: Create hungry.ts**

```typescript
import { StatusDefinition } from '../types'

export const hungryStatus: StatusDefinition = {
  type: 'hungry',
  label: 'Голод',
  priority: 1,
  condition: colonist => colonist.needs.hunger < 25,
  jobType: 'eat',
}
```

- [ ] **Step 2: Create tired.ts**

```typescript
import { StatusDefinition } from '../types'

export const tiredStatus: StatusDefinition = {
  type: 'tired',
  label: 'Устал',
  priority: 2,
  condition: colonist => colonist.needs.sleep < 25,
  jobType: 'sleep',
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add hungry and tired status definitions"
```

---

### Task 3: Add statuses field to Colonist (model change)

**Files:**
- Modify: `src/game/colony/colonist.ts`

- [ ] **Step 1: Add statuses field to constructor and class**

```typescript
export class Colonist {
  // existing fields...
  statuses: Set<ColonistStatus> = new Set()
```

Import `ColonistStatus` from `./types`.

- [ ] **Step 2: Update toJSON**

```typescript
toJSON() {
  return {
    // existing fields...
    statuses: [...this.statuses],
  }
}
```

- [ ] **Step 3: Update fromJSON**

```typescript
static fromJSON(data: any): Colonist {
  const c = new Colonist(data.id, data.name, data.color, data.position.x, data.position.y)
  c.needs = { hunger: data.needs.hunger, sleep: data.needs.sleep }
  c.statuses = new Set(data.statuses ?? [])
  // rest unchanged...
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add statuses field to Colonist"
```

---

### Task 4: StatusSystem + tests

**Files:**
- Create: `src/game/systems/statusSystem.ts`
- Create: `src/test/statusSystem.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Colonist } from '../game/colony/colonist'
import { StatusSystem } from '../game/systems/statusSystem'
import { STATUS_REGISTRY } from '../game/colony/statusRegistry'
import { hungryStatus } from '../game/colony/statuses/hungry'
import { tiredStatus } from '../game/colony/statuses/tired'

describe('StatusSystem', () => {
  beforeEach(() => {
    STATUS_REGISTRY.register(hungryStatus)
    STATUS_REGISTRY.register(tiredStatus)
  })

  it('applies hungry when hunger < 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.needs.hunger = 20
    const system = new StatusSystem()
    system.update(1, [colonist])
    expect(colonist.statuses.has('hungry')).toBe(true)
  })

  it('removes hungry when hunger >= 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.statuses.add('hungry')
    colonist.needs.hunger = 30
    const system = new StatusSystem()
    system.update(1, [colonist])
    expect(colonist.statuses.has('hungry')).toBe(false)
  })

  it('applies tired when sleep < 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.needs.sleep = 20
    const system = new StatusSystem()
    system.update(1, [colonist])
    expect(colonist.statuses.has('tired')).toBe(true)
  })

  it('removes tired when sleep >= 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.statuses.add('tired')
    colonist.needs.sleep = 30
    const system = new StatusSystem()
    system.update(1, [colonist])
    expect(colonist.statuses.has('tired')).toBe(false)
  })

  it('supports multiple simultaneous statuses', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.needs.hunger = 10
    colonist.needs.sleep = 10
    const system = new StatusSystem()
    system.update(1, [colonist])
    expect(colonist.statuses.has('hungry')).toBe(true)
    expect(colonist.statuses.has('tired')).toBe(true)
  })
})
```

Run: `npx vitest run src/test/statusSystem.test.ts`
Expected: FAIL (StatusSystem not created yet)

- [ ] **Step 2: Implement StatusSystem**

```typescript
import { STATUS_REGISTRY } from '../colony/statusRegistry'
import { StatusUpdatable, ColonistLike } from '../colony/types'

export class StatusSystem {
  update(dt: number, colonists: StatusUpdatable[]): void {
    for (const colonist of colonists) {
      for (const def of STATUS_REGISTRY.getAll()) {
        const like: ColonistLike = {
          id: '',
          position: { x: 0, y: 0 },
          needs: colonist.needs,
          state: { phase: 'idle' },
          statuses: colonist.statuses,
        }
        if (def.condition(like)) {
          colonist.statuses.add(def.type)
        } else {
          colonist.statuses.delete(def.type)
        }
      }
    }
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/test/statusSystem.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add StatusSystem with tests"
```

---

### Task 5: Refactor JobDispatcher to use statuses + tests

**Files:**
- Modify: `src/game/colony/jobDispatcher.ts`
- Modify: `src/test/GameWorld.test.ts` (update existing tests)

- [ ] **Step 1: Replace assignBestJob logic**

Current `assignBestJob` and `tryAssignNeed` methods. Replace with:

```typescript
import { STATUS_REGISTRY } from './statusRegistry'

// In assignBestJob:
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
```

Add new `tryAssignJob` method (same as old `tryAssignNeed` but without threshold check):

```typescript
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
```

Remove `tryAssignNeed` method entirely.

- [ ] **Step 2: Update existing GameWorld test**

The test at `src/test/GameWorld.test.ts` sets `colonist.needs.hunger = 10` and expects jobs to trigger. With status-based dispatch, the tests also need statuses active.

Read the test file first to understand what to change.

```bash
# Find test lines that set needs and expect behavior
```

The key fix: tests that set `colonist.needs.hunger = 10` must also add `colonist.statuses.add('hungry')` for the dispatcher to pick it up. Same for sleep.

- [ ] **Step 3: Verify existing tests pass**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: refactor JobDispatcher to use status-driven job selection"
```

---

### Task 6: Integrate StatusSystem into GameWorld + tests

**Files:**
- Modify: `src/game/gameWorld.ts`
- Modify: `src/test/GameWorld.test.ts`

- [ ] **Step 1: Register statuses and add StatusSystem to GameWorld**

In `GameWorld` constructor, after `JOB_REGISTRY` registrations:

```typescript
import { STATUS_REGISTRY } from './colony/statusRegistry'
import { hungryStatus } from './colony/statuses/hungry'
import { tiredStatus } from './colony/statuses/tired'
import { StatusSystem } from './systems/statusSystem'

// In constructor:
STATUS_REGISTRY.register(hungryStatus)
STATUS_REGISTRY.register(tiredStatus)
this.statusSystem = new StatusSystem()
```

Declare `private statusSystem: StatusSystem` as a field.

- [ ] **Step 2: Add StatusSystem to update tick order**

```typescript
// GameWorld.update, after needSystem.update:
this.needSystem.update(dt, this.colonists)
this.statusSystem.update(dt, this.colonists)
```

The order is: colonist movement → need decay → status evaluation → idle job assignment.

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: integrate StatusSystem into GameWorld update loop"
```

---

### Task 7: Serialization update

**Files:**
- Modify: `src/game/persistence/worldSerializer.ts`
- Modify: `src/test/worldSerializer.test.ts`

- [ ] **Step 1: Add statuses to SerializableColonist**

```typescript
export interface SerializableColonist {
  id: string
  name: string
  color: string
  position: { x: number; y: number }
  fsmState: ColonistState
  needs: { hunger: number; sleep: number }
  statuses: string[]
}
```

- [ ] **Step 2: Update round-trip test**

In `src/test/worldSerializer.test.ts`, add a check that statuses survive round-trip:

```typescript
it('round-trip preserves colonist statuses', () => {
  const world = createTestWorld()
  world.colonists[0].statuses.add('hungry')
  world.colonists[1].statuses.add('tired')
  const data = WorldSerializer.toJSON(world)
  const restored = WorldSerializer.fromJSON(data)
  expect(restored.colonists[0].statuses.has('hungry')).toBe(true)
  expect(restored.colonists[1].statuses.has('tired')).toBe(true)
})
```

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest run src/test/worldSerializer.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add statuses to serialization"
```

---

### Task 8: UI — show statuses in ColonistPanel

**Files:**
- Modify: `src/ui/types.ts`
- Modify: `src/ui/ColonistPanel.tsx`

- [ ] **Step 1: Add statuses to UIColonist**

```typescript
export interface UIColonist {
  id: string
  name: string
  color: string
  stateLabel: string
  hunger: number
  sleep: number
  currentJob: string | null
  position: { x: number; y: number }
  statuses: string[]
}
```

- [ ] **Step 2: Add statuses to UI emit in GameWorld**

In `GameWorld.emitUiState()`, add `statuses: [...c.statuses]` to the colonist mapping.

- [ ] **Step 3: Add status display to ColonistPanel**

```typescript
// In ColonistPanel, after the status line:
{
  colonist.statuses.length > 0 && (
    <div style={styles.statusRow}>
      {colonist.statuses.map(s => (
        <span key={s} style={styles.statusBadge}>
          {s === 'hungry' ? '🍖 Голод' : s === 'tired' ? '💤 Устал' : s}
        </span>
      ))}
    </div>
  )
}
```

Add styles:
```typescript
statusRow: {
  marginTop: 6,
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
},
statusBadge: {
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
  color: '#ffcc44',
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: show statuses in colonist panel UI"
```

---

### Task 9: Render — show status icons above colonists

**Files:**
- Modify: `src/render/drawColonist.ts`

- [ ] **Step 1: Add status icon drawing above need bars**

After the name label, add small colored circles for each active status:

```typescript
// Status effect icons above name
if (colonist.statuses.size > 0) {
  const statusArr = Array.from(colonist.statuses)
  const iconY = barY - 14
  for (let i = 0; i < statusArr.length; i++) {
    const ix = cx - ((statusArr.length - 1) * 5) + i * 10
    ctx.beginPath()
    ctx.arc(ix, iconY, 3, 0, Math.PI * 2)
    ctx.fillStyle = statusArr[i] === 'hungry' ? '#e06060' : '#60a0e0'
    ctx.fill()
  }
}
```

- [ ] **Step 2: Verify render test still passes**

Run: `npx vitest run src/test/renderMap.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: show status icons above colonists on canvas"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors
