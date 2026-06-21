# Building Visuals Registry

## Purpose

Eliminate hardcoded type checks in render/overlay when adding new buildings. Currently adding one building type requires editing 5+ files across core, game, render, and UI layers. This spec introduces a unified `entities[]` in ClientSnapshot and a visual registry in `src/game/`, keeping core unchanged.

## Requirements

### Requirement: ClientSnapshot uses unified entities array

`ClientSnapshot` SHALL replace `foods`, `beds`, `buildings` arrays with a single `entities` array containing `{ id: string, type: string, x: number, y: number }`.

The `type` field SHALL use the existing `Renderable[eid].type` set in `createBuildingEntity`, requiring no new ECS components.

#### Scenario: Snapshot emits one array
- **GIVEN** a world with food, bed, and wall entities
- **WHEN** `generateSnapshot()` is called
- **THEN** `snapshot.entities` SHALL contain all three entities with correct `type`, `x`, `y`

#### Scenario: Renderer iterates once
- **GIVEN** a snapshot with mixed entity types
- **WHEN** `renderEntities()` is called
- **THEN** it SHALL iterate `snap.entities` once and dispatch per type via registry

### Requirement: Building visuals registry in src/game/

A new module `src/game/buildingVisuals.ts` SHALL provide:
- `registerBuildingVisual(type: string, def: BuildingVisualDef): void`
- `getBuildingVisual(type: string): BuildingVisualDef | undefined`

#### BuildingVisualDef interface:
```typescript
interface BuildingVisualDef {
  label: string
  renderEntity(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void
  renderGhost(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void
}
```

#### Scenario: New building type added via one registration
- **GIVEN** a new building type `"workbench"`
- **WHEN** `registerBuildingVisual("workbench", { label, renderEntity, renderGhost })` is called
- **THEN** all render/overlay code picks it up without modifications

### Requirement: Overlay uses registry

`renderOverlay.ts` SHALL replace `if (task.type === BuildingType.Wall / Bed / Food)` chains with `getBuildingVisual(task.type)?.renderGhost(ctx, cx, cy)`.

Both `renderBuildQueueGhosts` and `renderHighlight` SHALL use this dispatch.

### Requirement: GameWorld.generateSnapshot uses single query

`GameWorld.generateSnapshot()` SHALL replace three separate `query(ecs, [Component, Position])` calls with one `query(ecs, [Renderable, Position])`.

### Requirement: GameWorld.canBuildAt uses generic entity check

`GameWorld.canBuildAt()` SHALL replace three `findEntityAt(ecs, x, y, Component)` calls with a single check for any entity with `Position` at the given tile.

### Requirement: Core refactoring scope limited to snapshot and collision

Only `src/core/types.ts` (ClientSnapshot interface) and `src/core/gameWorld.ts` (generateSnapshot, canBuildAt) SHALL change. The `BuildingConfig`, `BuildingType`, `entityFactory`, `components/`, `colony/`, and all registries (JobRegistry, StatusRegistry, SystemPipeline) SHALL remain untouched.

No new files in `src/core/`.

### Non-requirements (out of scope)

- Tile rendering (`drawTile.ts`, `textures.ts`) — not changed
- Item/entity system beyond buildings — not introduced
- Core BuildingConfig refactoring — not done
- Test coverage for existing code — not added (only tests for new code if applicable)

## Architecture

```
src/
├── core/
│   ├── types.ts           ← ClientSnapshot.entities replaces foods/beds/buildings
│   └── gameWorld.ts       ← generateSnapshot + canBuildAt use generic approach
├── game/
│   └── buildingVisuals.ts ← NEW: registry for visual definitions
├── render/
│   ├── renderEntities.ts  ← one loop over snap.entities, dispatch via registry
│   └── renderOverlay.ts   ← dispatch ghosts/highlights via registry
└── ui/
    └── BuildMenu.tsx      ← may use registry for labels (optional)
```

## Data flow

```
GameWorld.generateSnapshot()
  → query(ecs, [Renderable, Position])
  → emit { id, type, x, y }[]

ClientSnapshot.entities[]
  → renderEntities()
    → getBuildingVisual(e.type).renderEntity(ctx, screenX, screenY)
  → renderOverlay()
    → getBuildingVisual(task.type).renderGhost(ctx, screenX, screenY)
```

Adding a new building:
1. Add to `BuildingType` enum + `BUILDING_CONFIGS` (core, existing)
2. If new pattern — add to `textures.ts` (render, existing)
3. `registerBuildingVisual(type, { label, renderEntity, renderGhost })` — one call
