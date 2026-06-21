## 1. Core Infrastructure

- [X] 1.1 Create `WorldState` class with map, colonists, buildQueue, foods, beds, buildings
- [X] 1.2 Create `GameSystem` interface (type, priority, update, optional hooks)
- [X] 1.3 Create `SystemPipeline` with priority-sorted insert and batch lifecycle
- [X] 1.4 Export new types from `src/core/index.ts`

## 2. System Migration

- [X] 2.1 Migrate `NeedSystem` to implement `GameSystem`, take WorldState
- [X] 2.2 Migrate `StatusSystem` to implement `GameSystem`, take WorldState

## 3. GameWorld Rewrite

- [X] 3.1 Rewrite GameWorld to use WorldState internally
- [X] 3.2 Add delegation getters for backward compat (map, colonists, etc.)
- [X] 3.3 Wire NeedSystem and StatusSystem via pipeline.add()
- [X] 3.4 Replace manual update() calls with pipeline.update(worldState)

## 4. Job System Migration

- [X] 4.1 Replace `JobContext` with `WorldState` in all 4 job files
- [X] 4.2 Update `JobDefinition` generic to default to `WorldState`
- [X] 4.3 Update `jobDispatcher` to pass WorldState to job callbacks

## 5. Serialization Update

- [X] 5.1 Bump SaveData version to 3 with optional `systemData` field
- [X] 5.2 Update WorldSerializer.toJSON to accept and include systemData
- [X] 5.3 Add per-system serialize/deserialize in pipeline

## 6. Test Fixes

- [X] 6.1 Fix test pollution: clear registries in beforeEach of affected test files
- [X] 6.2 Fix buildJob to construct typed entity instances (Bed, Food)
- [X] 6.3 Fix map-randomness flakiness in colonist FSM test 1.6
- [X] 6.4 Verify all 71 tests pass
- [X] 6.5 Verify TypeScript strict mode (`tsc --noEmit`)
