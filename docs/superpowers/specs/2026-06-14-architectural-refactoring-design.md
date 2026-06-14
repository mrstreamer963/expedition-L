# Architectural Refactoring

## AS-IS: Current Problems

- **GameWorld — God Object** (389 строк). Знает про canvas, рендер, UI, input, persistence, колонистов, карту, еду, кровати, стройку.
- **Tangled layers**: `src/game/` импортирует `../render/worldRenderer`, `../ui/types`, `../store/types`. Стрелка зависимостей идёт в обе стороны.
- **Незавершённый FSM-рефакторинг**: типы `ColonistState` (discriminated union), `JobDefinition`, `JobContext`, `GameEvent` уже в `colony/types.ts`, но `JobDispatcher` и job-файлы (`build.ts`, `eat.ts`, `sleep.ts`) активно используют `as any`. `GameWorld.update()` дублирует логику occupancy.
- **Нет barrel-файлов**: модули не имеют чёткого публичного API. Непонятно, что можно импортировать из `game/`, `render/` и т.д.
- **WorldSerializer сильная связанность**: знает про GameMap, Colonist, Camera, Food, Bed, Building, BuildQueue — любой новый тип требует правки сериализатора.

## TO-BE: Целевая архитектура

### Слои и направление зависимостей

```
src/
  game/          # engine — не имеет зависимостей наружу
    world/       # GameMap, Tile, pathfinding
    colony/      # Colonist (FSM), jobs, JobRegistry, JobDispatcher
    entities/    # Food, Bed, Building, BuildQueue
    systems/     # tick-based: NeedSystem (голод/сон)
    eventBus.ts  # publish/subscribe на GameEvent
    index.ts     # public API
  render/        # знает только RenderSnapshot
    snapshot.ts  # RenderSnapshot + collectSnapshot()
    worldRenderer.ts, drawColonist.ts, drawTile.ts, ...
    index.ts
  controller/    # координация — единственный, кто знает про всех
    gameController.ts
    types.ts     # RenderSnapshot, UIState
  ui/            # React — дёргает Controller через callbacks
    index.ts
  persistence/   # знает только Serializable-интерфейсы
    index.ts
```

**Arrow of dependency (строгая):**

```
ui → controller → game → render
           ↓
    persistence
```

Никаких обратных импортов. `game/` не импортирует `render/`, `ui/`, `controller/`.

### Компоненты

| Компонент | Ответственность | Зависимости |
|-----------|----------------|-------------|
| `GameMap` | Сетка тайлов, occupancy, isWalkable | — |
| `Colonist` | FSM-состояния, `update(dt, map)`, `transition()` | GameMap |
| `JobRegistry` | Реестр JobDefinition | — |
| `JobDispatcher` | Event-driven dispatch заданий, assignBestJob | JobRegistry, EventBus |
| `NeedSystem` | Tick-based: голод -= 0.5*dt, сон -= 0.3*dt | Colonist[] |
| `EventBus` | publish/subscribe GameEvent, очередь событий | — |
| `GameController` | Владеет game loop, tick → render → UI callback | всё game/ + render/ |
| `WorldRenderer` | `renderWorld(ctx, snapshot)` | только RenderSnapshot |
| `UI components` | React, callbacks в Controller | controller/types |

### Гибридный игровой цикл

- **Tick-based (каждый frame):** голод, сон, рост растений, температура — непрерывные процессы, меняют state без событий
- **Event-driven (в том же frame):** `idle` → dispatch, `build_queued` → assign, `food_consumed` → emergency — реакции на discrete действия
- События обрабатываются синхронно: `EventBus.publish()` → `JobDispatcher.handle()` в рамках того же `update()`
- Никакого polling для диспетчера заданий

### План миграции (8 шагов)

| Шаг | Описание | Ключевые файлы |
|-----|----------|----------------|
| 1 | **Убрать `as any`** в JobDispatcher и job-файлах | `jobDispatcher.ts`, `jobs/*.ts` |
| 2 | **Очистить `GameWorld.update()`** — убрать дублирование `occupyTile/releaseTile` | `gameWorld.ts` |
| 3 | **EventBus** — централизовать GameEvent, подписать JobDispatcher | `eventBus.ts`, `jobDispatcher.ts` |
| 4 | **NeedSystem** — выделить needs update из GameWorld | `systems/needSystem.ts` |
| 5 | **RenderSnapshot → `render/snapshot.ts`** — сборка там | `render/snapshot.ts`, `gameWorld.ts` |
| 6 | **GameWorld → GameController** — вынести canvas/render/UI | `controller/gameController.ts` |
| 7 | **Barrel-файлы** — index.ts для каждого модуля | Все модули |
| 8 | **Persistence clean** — Serializable-интерфейсы | `worldSerializer.ts` |

### Ключевые принципы

- **Никакой регрессии**: после каждого шага тесты проходят
- **Никакого расширения функциональности**: только перекладывание кода, без изменения логики
- **Типобезопасность**: убрать все `as any`
- **Изоляция слоёв**: `game/` не импортирует render/ui
