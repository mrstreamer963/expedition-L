## Why

Система заданий сейчас — самая хрупкая часть кода. Логика размазана между `GameWorld.update()`, `Colonist.move()`, `Colonist.updateJob()`, `JobSystem.tick()` и `onArrive`-коллбэками. Добавление нового типа задания требует правки трёх файлов, а использование `world: any` сводит на нет типобезопасность TypeScript. Это делает систему труднорасширяемой и подверженной багам (как `fix-build-food-deadlock`).

## What Changes

- **Colonist FSM**: Замена неявных состояний (`idle`, `walking`, `eating`, `sleeping`, `building`) на явную конечный автомат с чёткими переходами (idle → assigned → moving → working → done → idle). Каждый переход — метод, а не callback.
- **JobDefinition Registry**: Выесение логики каждого типа задания (eat, sleep, build, walk) в единый реестр с методами `findTarget()`, `onStart()`, `onComplete()`, `onCancel()`. Добавление нового задания = одна запись в реестре.
- **Event-driven JobDispatcher**: Замена polling-цикла (2s) на реактивную систему: события `colonist_idle`, `build_queued`, `food_consumed` триггерят назначение заданий без задержки.
- **Типизированный JobContext**: Замена `world: any` на строгий интерфейс `JobContext` с конкретными полями (map, colonists, foods, etc.).
- **Удаление `pendingBuildTaskId`**: Уходит вместе со старой системой — FSM несёт информацию о задании в своём состоянии.
- **Удаление `onArrive` коллбэков**: Переход moving → working происходит внутри FSM, а не через внешнюю функцию.
- **BREAKING**: `Colonist.state` меняет тип с enum-строки на discriminated union FSM. Это затрагивает рендеринг (`drawColonist.ts`, `renderOverlay.ts`) и `worldSerializer.ts`.

## Capabilities

### New Capabilities
- `colonist-fsm`: Конечный автомат колониста — типы состояний, переходы, обработка тиков
- `job-registry`: Реестр определений заданий — `JobDefinition` интерфейс, встроенные задания (eat/sleep/build/walk), API для добавления новых
- `job-dispatch`: Диспетчер заданий — подписка на события игры, назначение заданий свободным колонистам, приоритизация

### Modified Capabilities
- `unit-tile-occupancy`: Логика занятия/освобождения тайлов переносится в FSM-переходы (assigned→moving освобождает, working→done занимает)
- `world-serialization`: Изменение формата сериализации колониста (FSM-состояние вместо плоского enum)
- `render-system`: Рендер читает новую структуру состояния; `renderOverlay.ts` использует FSM-состояние для путей и подсветок

## Impact

- `src/game/colony/colonist.ts` — полная переработка (FSM вместо плоского класса)
- `src/game/colony/jobSystem.ts` — замена на JobDispatcher + JobRegistry
- `src/game/colony/workGiver.ts` — упрощение или удаление (логика резервирования уходит в JobDefinition)
- `src/game/entities/building.ts` — BuildQueue/WorkGiver связь меняется
- `src/game/gameWorld.ts` — `update()` упрощается: не содержит логики эффектов заданий
- `src/render/drawColonist.ts` — чтение FSM-состояния
- `src/render/renderOverlay.ts` — чтение FSM-состояния для путей
- `src/game/persistence/worldSerializer.ts` — новая сериализация колониста
