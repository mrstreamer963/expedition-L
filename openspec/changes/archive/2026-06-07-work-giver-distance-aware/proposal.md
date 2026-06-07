## Why

WorkGiver `getAvailableTask()` возвращает первый незарезервированный таск независимо от расстояния до колониста. В сочетании с фиксированным порядком обхода (`Алиса → Борис → Вера`) это приводит к тому, что Алиса идёт через всю карту строить рядом с Борисом, а Борис стоит idle рядом со стройкой. Поведение противоречит `findNearestFood`/`findNearestBed` в self-preservation, где расстояние учитывается.

## What Changes

- `WorkGiver.getAvailableTask()` теперь сортирует доступные задачи по Manhattan distance до колониста и возвращает ближайшую
- Сигнатура метода остаётся прежней, `_colonist` перестаёт игнорироваться
- Логика резервирования (`reserve`/`release`) не меняется

## Capabilities

### New Capabilities
- `work-giver-distance-aware`: WorkGiver назначает колонисту ближайшую задачу стройки, а не первую попавшуюся

### Modified Capabilities
<!-- нет изменений требований на уровне specs — только implementation -->
—

## Impact

- `src/game/colony/workGiver.ts` — изменить `getAvailableTask()`: добавить сортировку по дистанции
