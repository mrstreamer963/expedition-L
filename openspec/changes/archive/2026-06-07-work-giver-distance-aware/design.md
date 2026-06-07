## Context

WorkGiver был внедрён в change `work-giver-system` (архивирован). `getAvailableTask()` брал первый незарезервированный таск, игнорируя расстояние. В `JobSystem` колонисты обходятся в фиксированном порядке массива — Алиса всегда проверяется первой, затем Борис, затем Вера. Self-preservation (еда/сон) корректно использует `findNearestFood`/`findNearestBed`, а стройка назначалась первому idle колонисту в массиве.

## Goals / Non-Goals

**Goals:**
- Задачи стройки назначаются ближайшему idle колонисту, независимо от порядка в массиве

**Non-Goals:**
- Не менять self-preservation (голод > сон > стройка)
- Не менять `reserve()`/`release()`
- Не добавлять weighted scoring или приоритеты типов построек

## Decisions

- **Task-first assignment в `JobSystem.tick()`**: вместо per-colonist цикла (где каждый ищет задачу) — два прохода: (1) self-preservation per-colonist, (2) build tasks — итерация по таскам, каждый назначается ближайшему idle колонисту. Это гарантирует, что ближайший к задаче колонист её получит, независимо от порядка colonists\[\].
- **Manhattan distance** (без sqrt): зеркалирует `findNearestFood`/`findNearestBed`. Без взвешенных cost-карт достаточно.
- **`getAvailableTask()` удалён**: стал мёртвым кодом после перехода на task-first. WorkGiver теперь только `reserve()`/`release()`/`releaseByPosition()`.
- **Если idle колонистов нет — `break`**: все оставшиеся задачи ждут следующего тика.

## Risks / Trade-offs

- **Два прохода вместо одного**: для 3 колонистов и 1–5 задач незначительно. O(n + m) где n=колонисты, m=задачи.
- **Race condition**: два таска могут претендовать на одного колониста — первый таск назначается, второй видит `pendingBuildTaskId` и переходит к следующему таску. Корректно.
