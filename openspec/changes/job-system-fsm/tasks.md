## 1. Tests — заморозка текущего поведения

- [ ] 1.1 Написать тест: colonist idle → assigned → moving → working → done (движение по пути, занятие тайла)
- [ ] 1.2 Написать тест: colonist ест еду (находит еду, идёт, consuming, еда удаляется, hunger +40)
- [ ] 1.3 Написать тест: colonist спит в кровати (находит кровать, идёт, 10s, sleep +60)
- [ ] 1.4 Написать тест: colonist строит здание (task в очереди, назначается, идёт, строит 0.5s, здание появляется)
- [ ] 1.5 Написать тест: движение блокируется занятым тайлом назначения
- [ ] 1.6 Написать тест: JobSystem назначает build task ближайшему idle колонисту
- [ ] 1.7 Написать тест: приоритет голода над стройкой

## 2. Новые типы и интерфейсы

- [x] 2.1 Создать `src/game/colony/types.ts` — определить `ColonistState` discriminated union
- [x] 2.2 Определить `JobContext` интерфейс (map, colonists, foods, beds, buildings, buildQueue)
- [x] 2.3 Определить `JobDefinition<C>` интерфейс (type, duration, findTarget, onStart, onComplete, onCancel, onTick)
- [x] 2.4 Определить `GameEvent` discriminated union (colonist_idle, build_queued, food_consumed, food_built)

## 3. Colonist FSM

- [x] 3.1 Переписать `Colonist` — заменить enum state на discriminated union `ColonistState`
- [x] 3.2 Удалить поля: `targetPosition`, `onArrive`, `buildType`, `pendingBuildTaskId`, `moveProgress`, `jobTimer`
- [x] 3.3 Реализовать `transition(targetPhase, data)` — валидация и применение перехода
- [x] 3.4 Реализовать `update(dt, context)` — единый метод вместо `move()` + `updateJob()`
- [x] 3.5 Реализовать `getInterpolatedPosition()` на новом FSM
- [x] 3.6 Реализовать `toJSON()` / статический `fromJSON()` для нового формата
- [ ] 3.7 Прогнать тесты из секции 1 (зелёные?)

## 4. JobRegistry

- [x] 4.1 Создать `src/game/colony/jobRegistry.ts` — класс JobRegistry с register/get/getAll
- [x] 4.2 Создать `src/game/colony/jobs/eat.ts` — JobDefinition 'eat' (findTarget: nearest food, duration: 0.5, onComplete: consume)
- [x] 4.3 Создать `src/game/colony/jobs/sleep.ts` — JobDefinition 'sleep' (findTarget: nearest bed, duration: 10, onComplete: +sleep)
- [x] 4.4 Создать `src/game/colony/jobs/build.ts` — JobDefinition 'build' (findTarget: build task, duration: 0.5, onComplete: place entity)
- [x] 4.5 Создать `src/game/colony/jobs/walk.ts` — JobDefinition 'walk' (duration: 0, onComplete: no-op)
- [x] 4.6 Инициализировать реестр при создании GameWorld (register всех built-in джоб)

## 5. JobDispatcher

- [x] 5.1 Создать `src/game/colony/jobDispatcher.ts` — класс JobDispatcher
- [x] 5.2 Реализовать `onEvent(event, context)` — switch по типу события
- [x] 5.3 Реализовать `assignBestJob(colonistId, context)` — priority: critical need → build → idle
- [x] 5.4 При назначении: найти target через JobDefinition.findTarget, вызвать colonist.transition('assigned', ...)
- [x] 5.5 При assigned: выполнить pathfinding, перейти в moving; если нет пути → cancel (idle)
- [x] 5.6 Удалить старый `JobSystem.ts`

## 6. GameWorld integration

- [x] 6.1 Упростить `GameWorld.update(dt)` — убрать логику эффектов заданий (строки 352-367)
- [x] 6.2 Заменить `this.jobSystem.tick()` на `jobDispatcher.onEvent()` по событиям
- [x] 6.3 В `update()`: для каждого colonist вызвать `colonist.update(dt, context)`
- [x] 6.4 Если colonist перешёл в idle — вызвать `jobDispatcher.onEvent({ type: 'colonist_idle', colonistId })`
- [x] 6.5 При `addBuildTask` — вызвать `jobDispatcher.onEvent({ type: 'build_queued', task })`
- [x] 6.6 Удалить `WorkGiver.ts` (логика резервирования уходит в JobDispatcher)

## 7. Обновление рендера

- [x] 7.1 `drawColonist.ts` — читать `colonist.state.phase` вместо `colonist.state`
- [x] 7.2 `renderOverlay.ts` — читать `phase === 'moving'` вместо `state === 'walking'`

## 8. Сериализация

- [x] 8.1 `worldSerializer.ts` — обновить `SaveData.version` до 2
- [x] 8.2 Добавить конвертер: если version === 1, преобразовать старое `state`/`currentJob`/`path` в `fsmState`
- [x] 8.3 `Colonist.toJSON()` — output FSM state
- [x] 8.4 `Colonist.fromJSON()` — input FSM state, поддержка legacy

## 9. Финальная проверка

- [ ] 9.1 `npm test` — все тесты зелёные
- [ ] 9.2 `npm run build` — компиляция без ошибок
- [ ] 9.3 Ручной тест: новая игра, колонисты едят и спят
- [ ] 9.4 Ручной тест: стройка стены, кровати, еды
- [ ] 9.5 Ручной тест: загрузка старого сейва (если есть)
