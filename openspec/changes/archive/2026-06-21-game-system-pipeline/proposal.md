## Why

Adding new game logic (Temperature, Weather, Growth) requires touching GameWorld in 5+ places per system — manual `update()` wiring, state arrays, serializer patches, export lists. This doesn't scale. Introduce a unified system pipeline so adding a system is a single file + one registration line.

## What Changes

- **New**: `WorldState` class — single source of truth for all game state (map, colonists, buildQueue, foods, beds, buildings)
- **New**: `GameSystem` interface — `type`, `priority`, `update(WorldState)`, optional `init/serialize/deserialize/destroy`
- **New**: `SystemPipeline` — priority-sorted batch lifecycle (update, init, serialize, deserialize, destroy)
- **Modified**: `GameWorld` rewritten — delegates state to `WorldState`, systems to `SystemPipeline`, backward-compat getters
- **Modified**: 4 job files (eat, sleep, build, walk) — `JobContext` → `WorldState`
- **Modified**: `NeedSystem`, `StatusSystem` — implement `GameSystem`, take `WorldState` instead of bare arrays
- **Modified**: `WorldSerializer` — version 3, `systemData: Record<string, unknown>` in SaveData
- **Removed**: `JobContext` interface — fully replaced by `WorldState`

## Capabilities

### New Capabilities
- `game-system-pipeline`: GameSystem interface, priority-sorted pipeline, batch lifecycle management
- `world-state`: Centralized state bag holding map, colonists, buildQueue, foods, beds, buildings

### Modified Capabilities
- `world-serialization`: SaveData version bumped to 3 with optional `systemData` field for system-persistent state

## Impact

- `src/core/gameWorld.ts` — major rewrite
- `src/core/colony/types.ts` — removed JobContext
- `src/core/colony/jobs/*.ts` — all 4 jobs use WorldState
- `src/core/worldSerializer.ts` — version 3 schema
- `src/core/systems/*.ts` — NeedSystem, StatusSystem implement GameSystem
- No changes to UI layer (React components, TopBar)
