# Hybrid ECS with BitECS Implementation Plan

> **For agentic workers:** Use executing-plans or inline execution.

**Goal:** Replace concrete classes Food, Bed, Building with BitECS entities/components.

**Architecture:** BitECS v0.4.0 ECS for items/objects. Colonist class stays with FSM intact.

**Tech Stack:** TypeScript, BitECS, Vitest

---

### Task 1: Install bitecs + create components

**Files:**
- Create: `src/core/components/position.ts`
- Create: `src/core/components/renderable.ts`
- Create: `src/core/components/edible.ts`
- Create: `src/core/components/sleepable.ts`
- Create: `src/core/components/solid.ts`
- Create: `src/core/components/index.ts`

- [ ] **Step 1:** `npm install bitecs@0.4.0`

- [ ] **Step 2:** Create 6 component files with typed arrays/objects (see design doc)

- [ ] **Step 3:** `npx tsc --noEmit` — verify no errors

- [ ] **Step 4:** `git add -A && git commit -m "feat: add BitECS components (Position, Renderable, Edible, Sleepable, Solid)"`

---

### Task 2: Extract BuildQueue, update WorldState, update all references

**Files:**
- Create: `src/core/colony/buildQueue.ts`
- Modify: `src/core/worldState.ts`
- Modify: `src/core/gameWorld.ts`
- Modify: `src/core/worldSerializer.ts`
- Modify: `src/core/colony/jobs/eat.ts`, `sleep.ts`, `build.ts`
- Modify: 3 test files

This is the big one. Execute all changes: create BuildQueue from building.ts content, update WorldState to add `ecs`, update GameWorld/jobs/serializer/tests.

- [ ] **Step 1:** Create `src/core/colony/buildQueue.ts` with BuildingType, BuildTask, BuildQueue (extracted from building.ts)

- [ ] **Step 2:** Update WorldState: add `ecs: World`, remove foods/beds/buildings arrays

- [ ] **Step 3:** Update GameWorld: ECS init, entity creation, query-based snapshot, remove getters

- [ ] **Step 4:** Update job files (eat.ts, sleep.ts, build.ts): ECS queries + entity creation

- [ ] **Step 5:** Update WorldSerializer: fromJSON takes ecs param, toJSON takes ecs, entity creation in fromJSON

- [ ] **Step 6:** Update 3 test files for ECS

- [ ] **Step 7:** `npx tsc --noEmit` — verify no errors

- [ ] **Step 8:** `npm test` — all green

- [ ] **Step 9:** Delete old files: `src/core/entities/food.ts`, `bed.ts`, `building.ts`

- [ ] **Step 10:** `git add -A && git commit -m "refactor: hybrid ECS with BitECS for items/objects"`
