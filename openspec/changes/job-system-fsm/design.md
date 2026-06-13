## Context

Текущая система заданий использует три несвязанных механизма:

1. **Неявные состояния** — `Colonist.state` это строка (`'idle' | 'walking' | 'eating' | ...`), но реальное состояние определяется комбинацией полей: `state`, `path.length`, `currentJob`, `onArrive`, `pendingBuildTaskId`, `jobTimer`. Невозможно понять, что делает колонист, не проверив 5 полей.

2. **Callback-лапша** — `JobSystem.sendTo()` устанавливает `colonist.onArrive`, который вызывается в `GameWorld.update()` строками 336-348. Информация о том, что делать по прибытии, захвачена в кложуре внутри JobSystem, а что делать после выполнения — в GameWorld. Два конца логики в разных файлах.

3. **Polling вместо событий** — `JobSystem.tick()` работает на таймере 2с. Колонист простаивает до 2с после завершения задания. При `timeScale = 10` (speed 3) такт игры в 10× быстрее, но диспетчер всё ещё тикает раз в 2 реальных секунды.

## Goals / Non-Goals

**Goals:**
- Ввести конечный автомат (FSM) для колониста с явными типами состояний и дискриминируемыми переходами
- Вынести логику каждого задания в единый реестр `JobDefinition`, чтобы новое задание добавлялось одной записью
- Заменить polling на event-driven dispatch (событие `idle` → немедленное назначение)
- Заменить `world: any` на строго типизированный `JobContext`
- Удалить `onArrive` коллбэки и `pendingBuildTaskId`

**Non-Goals:**
- Не менять игровую логику (пороги голода/сна, скорости, длительности) — только архитектуру
- Не вводить очередь заданий на колониста (будет в следующем изменении)
- Не менять BuildQueue, GameMap, pathfinding API — только точки интеграции
- Не оптимизировать производительность (кроме устранения 2с задержки как побочный эффект)

## Decisions

### Decision 1: Discriminated Union для FSM вместо класса с enum

```typescript
// Было:
type ColonistState = 'idle' | 'walking' | 'eating' | 'sleeping' | 'building'

// Стало:
type ColonistState =
  | { phase: 'idle' }
  | { phase: 'assigned'; job: string; target: Vec2 }
  | { phase: 'moving';   job: string; path: Vec2[] }
  | { phase: 'working';  job: string; progress: number; duration: number }
  | { phase: 'done';     job: string }
```

**Почему**: discriminated union в TypeScript даёт:
- `switch(state.phase)` сужает тип в каждой ветке — компилятор знает, какие поля доступны
- Невозможно создать невалидную комбинацию (нет ситуации `state='walking'` но `path=[]`)
- Переходы — это функции, возвращающие новое состояние, а не мутирующие 5 полей

**Альтернатива**: Класс-стейтмашина с отдельными классами для каждого состояния.
**Отклонено**: Overkill для текущей сложности; discriminated union даёт те же гарантии с меньшим бойлерплейтом.

### Decision 2: JobDefinition как объект с методами, а не класс

```typescript
interface JobDefinition<Context = JobContext> {
  type: string
  label: string
  duration: number
  
  findTarget(needs: ColonistNeeds, context: Context): Vec2 | null
  onStart(colonist: Colonist, context: Context): void
  onComplete(colonist: Colonist, context: Context): void
  onCancel(colonist: Colonist, context: Context): void
  onTick(colonist: Colonist, dt: number): void  // анимация/прогресс
}
```

**Почему**:
- `onComplete` заменяет размазанную логику `GameWorld.update()` строк 352-367
- `findTarget` заменяет `findNearestFood`/`findNearestBed` внутри JobSystem
- `onCancel` заменяет ручную чистку `pendingBuildTaskId` в трёх местах

**Альтернатива**: Абстрактный класс `BaseJob`.
**Отклонено**: Объектная композиция гибче и тестируемее, чем наследование.

### Decision 3: Event-driven dispatch через EventEmitter

```typescript
// События:
type GameEvent =
  | { type: 'colonist_idle'; colonistId: string }
  | { type: 'build_queued'; task: BuildTask }
  | { type: 'food_consumed'; position: Vec2 }
  | { type: 'food_built'; position: Vec2 }
  | { type: 'colonist_arrived'; colonistId: string }

class JobDispatcher {
  onEvent(event: GameEvent): void {
    switch (event.type) {
      case 'colonist_idle':
        this.assignBestJob(event.colonistId)
        break
      case 'build_queued':
        this.assignBuildTask(event.task)
        break
      case 'food_consumed':
        this.checkEmergencyFood()
        break
    }
  }
}
```

**Почему**: Вместо цикла каждые 2с, диспетчер реагирует мгновенно. Колонист не ждёт.

**Риск**: Событие может триггернуть цепочку → потенциально бесконечный цикл.
**Митигация**: `assignBestJob` проверяет `colonist.state.phase === 'idle'` — если колонист уже не idle, событие игнорируется.

### Decision 4: JobContext — строгая проекция GameWorld

```typescript
interface JobContext {
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueue: BuildQueue
}
```

**Почему**: JobSystem и JobDefinition видят ровно то, что им нужно. Не могут случайно изменить camera, canvas, UI state. Замена `any` на конкретный интерфейс делает код самодокументируемым.

### Decision 5: FSM владеет tile occupancy

Текущая логика размазана: `GameWorld.releaseColonistTile()`, `GameWorld.occupyColonistTile()`, `GameMap.setOccupant()`. В новой системе occupancy — сайд-эффект переходов FSM:

```
idle → assigned:  освободить текущий тайл (если занят)
assigned → moving: ничего (уже освобождено)
moving → working: занять тайл цели
working → done:   оставить занятым (переход в idle без смены позиции)
done → idle:     ничего
```

## Risks / Trade-offs

- **[Сложность]**: FSM добавляет формализма там, где раньше была "гибкость" строк. **Митигация**: TypeScript не даст создать невалидное состояние — это плата за надёжность.
- **[Совместимость]**: Меняется формат сериализации — старые сейвы не загрузятся. **Митигация**: version bump в WorldSerializer + конвертер старого формата в новый.
- **[Регрессия]**: Переписывание `colonist.ts` затрагивает рендер, коллизии, pathfinding. **Митигация**: Сначала написать тесты на текущее поведение, потом рефакторить.
- **[Производительность]**: Создание новых объектов состояния на каждый переход может дать нагрузку на GC. **Митигация**: Состояния маленькие (3-5 полей), GC modern JS справляется. Если проблема — объединить moving/working с полями `job` и `progress` вместо отдельных объектов.

## Migration Plan

1. **Написать тесты** на текущее поведение (движение, еда, сон, стройка, занятость тайлов)
2. **Ввести новые типы** (FSM, JobDefinition, JobContext, GameEvent) в отдельных файлах
3. **Переписать `Colonist`** — FSM + метод `update(dt, context)` вместо `move()` + `updateJob()` + `cancelJob()`
4. **Создать `JobRegistry`** — встроенные задания eat, sleep, build, перенести логику из JobSystem + GameWorld
5. **Создать `JobDispatcher`** — event-driven, заменить `JobSystem`
6. **Переписать `GameWorld.update()`** — убрать эффекты заданий, добавить вызов `colonist.update(dt, context)` + обработку события `done`
7. **Обновить рендер** — `drawColonist.ts` и `renderOverlay.ts` читают `state.phase`
8. **Обновить сериализацию** — новый формат, конвертер со старого
9. **Прогнать тесты** — убедиться, что поведение не изменилось

## Open Questions

- Нужна ли фаза `assigned` или можно сразу переходить в `moving`? Назначение + pathfinding могут быть в одном шаге.
```