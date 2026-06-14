# Status System Design

## Overview

Add discrete status effects to colonists (Голод, Устал) that are triggered by need thresholds and drive the FSM job selection. Multiple statuses can be active simultaneously; the highest-priority status determines the colonist's next job.

## Motivation

Replace hardcoded need thresholds in `JobDispatcher.assignBestJob` with a generic status system. This decouples "what's wrong with the colonist" from "what job to do" — making both sides independently extensible.

## Data Model

### ColonistStatus (union type)

```typescript
type ColonistStatus = 'hungry' | 'tired'
```

### StatusDefinition

```typescript
interface StatusDefinition {
  type: ColonistStatus
  label: string
  priority: number       // lower = higher priority
  condition: (colonist: ColonistLike) => boolean
  jobType: string         // references JOB_REGISTRY key
}
```

### Colonist

Adds `statuses: Set<ColonistStatus>` field, initialized empty.

### StatusRegistry

Same pattern as `JobRegistry` — global singleton holding `Map<string, StatusDefinition>`.

## Status Definitions

### Голод (hungry)

- `type: 'hungry'`
- `priority: 1` (highest)
- `condition: colonist => colonist.needs.hunger < 25`
- `jobType: 'eat'`

### Устал (tired)

- `type: 'tired'`
- `priority: 2`
- `condition: colonist => colonist.needs.sleep < 25`
- `jobType: 'sleep'`

## StatusSystem

New system in `src/game/systems/statusSystem.ts`.

Each tick, for each colonist:

1. For each defined status, evaluate `condition(colonist)`
2. If true and not already active → add to `colonist.statuses`
3. If false and active → remove from `colonist.statuses`

Statuses are additive — a colonist can be both hungry and tired at once.

## FSM / JobDispatcher Changes

`ColonistState` (discriminated union) stays unchanged. Only `assignBestJob` changes:

1. Colonist transitions to idle → `assignBestJob` is called
2. It collects `colonist.statuses`, sorts by `StatusDefinition.priority`
3. For each status, calls `tryAssignJob(statusDef.jobType)` — no need threshold check (the status system already guarantees the condition)
4. First success wins
5. Fallback: try build job (unchanged)

This replaces the current `tryAssignNeed` method and its hardcoded `hungerBelow && sleepBelow` priority logic.

### Tick order in GameWorld.update

1. `colonist.update(dt, map)` — movement/working ticks
2. Handle `done` → `idle` transitions
3. `needSystem.update(dt, colonists)` — hunger/sleep decay
4. `statusSystem.update(dt, colonists)` — evaluate conditions, apply/remove statuses
5. For each idle colonist, `assignBestJob`

## Files

### New files

- `src/game/colony/statusRegistry.ts` — `StatusRegistry` class + `STATUS_REGISTRY` singleton
- `src/game/colony/statuses/hungry.ts` — `hungryStatus: StatusDefinition`
- `src/game/colony/statuses/tired.ts` — `tiredStatus: StatusDefinition`
- `src/game/systems/statusSystem.ts` — `StatusSystem` class

### Modified files

- `src/game/colony/types.ts` — add `ColonistStatus`, `StatusDefinition`
- `src/game/colony/colonist.ts` — add `statuses: Set<ColonistStatus>`, `toJSON`/`fromJSON`
- `src/game/colony/jobDispatcher.ts` — replace `assignBestJob` with status-driven logic
- `src/game/gameWorld.ts` — add `StatusSystem`, register statuses, update tick order
- `src/game/index.ts` — re-export new types
- `src/game/persistence/worldSerializer.ts` — add `statuses` to `SerializableColonist`, `SaveData`
- `src/ui/types.ts` — add `statuses: string[]` to `UIColonist`
- `src/ui/ColonistPanel.tsx` — display active statuses
- `src/render/drawColonist.ts` — show status icons above head

## Serialization

`Colonist.toJSON()` includes `statuses: [...this.statuses]`. `fromJSON` reads it (optional, defaults to empty Set for legacy saves). Version bump not required.

## UI

ColonistPanel shows a "Статусы:" line with colored badges for each active status, below the needs bars and state line.

## Edge Cases / Safety

- Status condition depends on needs, which change on every tick — statuses are naturally self-correcting
- A job target might be unavailable (no food, no free bed) → `assignBestJob` falls through to the next status priority
- On load from legacy save (no statuses field) → colonist gets empty Set, next statusSystem tick populates correctly
- Build job is always the lowest-priority fallback (unchanged behavior)
