## Context

Adding systems (Temperature, Weather, Growth) previously required editing GameWorld in 5+ places: state array, `update()` call, serializer, constructor init, export list. GameWorld had ~180 lines with manually ordered `update()` calls. State was split across 6 separate arrays on GameWorld. Job callbacks received a `JobContext` interface that exposed individual arrays.

## Goals / Non-Goals

**Goals:**
- Centralize all game state into a single `WorldState` bag
- Standardize system lifecycle via `GameSystem` interface and `SystemPipeline`
- Remove `JobContext` — jobs get full `WorldState` for future-proof access
- All 71 existing tests pass, TypeScript strict mode clean

**Non-Goals:**
- EventBus — only one consumer (JobDispatcher) for every current event; direct call is simpler
- Performance optimization — pipeline overhead is negligible for < 20 systems
- UI layer changes — React components continue to read from GameWorld delegation getters

## Decisions

1. **WorldState over individual arrays**: Single `WorldState` bag replaces 6 separate GameWorld arrays. Jobs receive `WorldState` instead of `JobContext` so future systems (Temperature) can add data without interface changes. Properties are mutable — tests and systems need to assign directly.

2. **Priority-sorted pipeline over manual ordering**: `SystemPipeline` sorts by `priority` (insert-time, stable for equal priorities). NeedSystem=10, StatusSystem=20. Adding a system is `pipeline.add(new MySystem())` — no more editing `update()` call order.

3. **Per-system serializer on GameSystem**: `serialize()`/`deserialize()` are optional methods on the interface. Pipeline collects `systemData: Record<string, unknown>` during WorldSerializer.toJSON and distributes during fromJSON. Systems without persistent state (NeedSystem, StatusSystem) skip them.

4. **No EventBus**: Only one pipeline consumer needs every current event. Adding EventBus before a second consumer exists is premature complexity.

5. **Registries remain singletons**: `JOB_REGISTRY` and `STATUS_REGISTRY` stay global to keep job dispatch simple. Test `beforeEach` explicitly clears them to prevent cross-test pollution.

6. **Delegation getters on GameWorld**: `get map()`, `get colonists()`, etc. delegate to `this.state.*` for backward compatibility with UI code and external consumers.

## Risks / Trade-offs

- **Constructor order sensitivity**: `WorldState` must be created BEFORE `occupyTile()` calls. The constructor has an explicit ordering: map → colonists → buildQueue → foods → beds → WorldState.
- **Singleton test pollution**: Any test file that clears registries in `beforeEach`/`afterEach` affects subsequent files. Mitigation: all test files with GameWorld now clear registries before creating instances.
- **GameSystem.serialize return type**: Must be `unknown` since each system defines its own shape. Pipeline and WorldSerializer only pass it through — no schema validation on system data.

## Migration Plan

1. Create `WorldState`, `GameSystem`, `SystemPipeline` as new files
2. Rewrite `GameWorld` constructor to build state then wrap in WorldState
3. Migrate `NeedSystem`, `StatusSystem` to GameSystem interface
4. Replace `JobContext` with `WorldState` in all 4 job files and jobDispatcher
5. Update `WorldSerializer` schema to version 3 with `systemData`
6. Fix test pollution — explicit `JOB_REGISTRY.clear()` + `STATUS_REGISTRY.clear()` in beforeEach
7. Run all 71 tests + `tsc --noEmit`
