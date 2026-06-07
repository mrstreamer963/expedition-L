## Context

Сейчас `JobSystem` в `tryAssignJob()` каждые 2 сек обходит всех idle колонистов и каждому пытается назначить `buildQueue.peek()`. Механика `isNearestColonist()` фильтрует "кому ближе", но не предотвращает дубли — два колониста на одной дистанции получают одну задачу.

Параллельно `tryAssignJob()` управляет и едой/сном (self-preservation). Это смешивает два режима в одном методе.

## Goals / Non-Goals

**Goals:**
- Централизованный `WorkGiver` для задач стройки с резервированием
- Self-preservation (еда/сон) остается per-pawn, без WorkGiver
- Очистить `JobSystem` от дублирующей логики

**Non-Goals:**
- Не менять логику приоритетов (голод > сон > стройка)
- Не добавлять приоритеты задач (все стройки равны)
- Не менять `unit-tile-occupancy` — только донастроить вызов `release()` при отмене

## Decisions

- **TaskPool — массив с флагом `reservedBy`**: каждый BuildTask получает поле `reservedBy: string | null`. immutable-keys не нужны — задач мало (1–5).
- **WorkGiver сканирует buildQueue, не копирует**: WorkGiver читает `world.buildQueue.all` напрямую, фильтруя `!task.reservedBy && !task.completing`. Это всегда актуальный список.
- **release() при старте работы, не при начале walking**: Чтобы задача не висела зарезервированной во время стройки. `colonist.startJob('build')` → `workGiver.release(task)`.
- **Самообеспечение (еда/сон) через `JobSystem.findNearestFood/ Bed`**: Эти методы уже есть. Просто вызывать их ДО WorkGiver, а не внутри `tryAssignJob()`. Если нашли — зарезервировать occupantId тайла и идти. Если нет — спросить WorkGiver.
- **WorkGiver.getAvailableTask() сортирует задачи по дистанции до колониста**: Вместо `buildQueueAll.find(t => t.reservedBy === null)` — фильтр + сортировка по Manhattan distance, затем первый. Это зеркалирует `findNearestFood`/`findNearestBed`, делая поведение стройки консистентным с self-preservation. Без этого первый idle колонист в массиве (`Алиса` → `Борис` → `Вера`) получает задачу независимо от расстояния.
- **Альтернатива рассмотрена — RimWorld-style ThinkTree**: Избыточно для 3 колонистов. WorkGiver + self-preservation покрывает те же сценарии проще.

## Risks / Trade-offs

- **Race condition при резервировании**: два колониста в одном тике вызывают `reserve()` → второй получит null и останется idle. Это корректно — jobSystem подхватит через 2 сек.
- **Self-preservation не резервирует через WorkGiver**: два голодных колониста могут пойти к одной еде. Первый займет occupantId, второй отменится — это уже покрыто `unit-tile-occupancy`.
