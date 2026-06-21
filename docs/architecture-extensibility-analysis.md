# Анализ расширяемости архитектуры

## Общая архитектура

Гибридная слоистая архитектура с лёгким ECS (bitECS) в ядре.

```
App/UI (React) → Game (GameHost) → Core (GameWorld) → Geometry (чистая математика)
                                         |
                                  Bitecs (ECS)
```

Зависимости строго однонаправленные — циклических импортов нет.

```
src/
├── geometry/     # Чистая математика (изометрия, камера) — 0 зависимостей от проекта
├── core/         # Игровая логика (ECS, колонисты, работы, статусы, карта)
├── game/         # Клиентская оркестрация (GameHost, GameLoop, InputHandler, сохранения)
├── render/       # Canvas-рендеринг (читает только ClientSnapshot)
├── ui/           # React-компоненты (TopBar, BuildMenu, ColonistPanel, GameCanvas)
└── test/         # Тесты (Vitest)
```

## Слой `src/geometry/` — Pure Math

- `tile.ts` — константы TILE_WIDTH=48, TILE_HEIGHT=24
- `isoUtils.ts` — tileToScreen, screenToTile, getRenderOrder (painter's algorithm)
- `camera.ts` — 2D offset camera с pan, smooth-pan, reset, JSON-сериализацией

**Расширяемость:** ✅ Отличная — ни от чего не зависит, легко дополнять новыми утилитами.

---

## Слой `src/core/` — Игровой движок (27 файлов)

### ECS (bitECS)

Компоненты (`src/core/components/`):

| Файл | Тип | Роль |
|------|-----|------|
| `position.ts` | TypedArray (Float32Array) | x, y |
| `renderable.ts` | Array (RenderableData[]) | type, color |
| `edible.ts` | Tag ({}) | Еда |
| `sleepable.ts` | Tag ({}) | Кровать |
| `solid.ts` | Tag ({}) | Стена/здание |

Сущности в ECS — только статические объекты (еда, кровати, здания). Колонисты — это plain TypeScript-классы.

### Системы (`src/core/systems/`)

```typescript
interface GameSystem {
  readonly type: string
  readonly priority: number
  init?(world: WorldState): void
  update(dt: number, world: WorldState): void
  serialize?(): unknown
  deserialize?(data: unknown, world: WorldState): void
  destroy?(): void
}
```

- `SystemPipeline` — priority-ordered контейнер, run каждого тика
- `NeedSystem` (priority 10) — декай потребностей
- `StatusSystem` (priority 20) — проверка и применение статусов

### Реестры (Plugin System)

**JobRegistry** (`JOB_REGISTRY`) — глобальный реестр работ:
- `register(def)` — добавить работу
- `get(type)` / `getAll()` / `clear()`
- 4 работы: eat, sleep, build, walk

**StatusRegistry** (`STATUS_REGISTRY`) — глобальный реестр статусов:
- `register(def)` — добавить статус
- `get(type)` / `getAll()` / `clear()`
- 2 статуса: hungry → eat, tired → sleep

### Интерфейсы

```typescript
interface GameServer {
  create(): ClientSnapshot
  load(data: SaveData): ClientSnapshot
  update(dt: number): ClientSnapshot
  handleAction(action: PlayerAction): ClientSnapshot
  getSnapshot(): ClientSnapshot
  save(): SaveData
  destroy(): void
}
```

`ClientSnapshot` — иммутабельный DTO, единственный источник данных для рендера и UI.

### GameWorld (335 строк)

Центральный класс. Де-факто God Object:
- Создание мира (init/load)
- HandleAction (build, right-click)
- Update (pipeline, FSM колонистов, job dispatcher)
- Генерация снепшота
- Загрузка/сохранение (через WorldSerializer)

---

## Слой `src/game/` — Клиентская оркестрация (6 файлов)

- `GameHost` — мост между React UI и GameServer. Владеет GameLoop, InputHandler, Camera.
- `GameLoop` — fixed-timestep (1/60) с accumulator pattern
- `InputHandler` — мышь/клавиатура, изометрическая screen-to-tile конверсия

---

## Слой `src/render/` — Canvas Rendering (11 файлов)

Чистый рендеринг: читает ClientSnapshot + RenderContext. Никаких импортов из core.

---

## Слой `src/ui/` — React (6 файлов)

- TopBar (скорость, сохранение)
- BuildMenu (выбор режима)
- ColonistPanel (инфо о колонисте)
- GameCanvas (canvas wrapper)

---

## Оценка расширяемости

### ✅ Что уже хорошо

1. **JobRegistry + StatusRegistry** — плагиноподобная система. Новая работа = register() одной строкой. Новый статус = register() с condition + jobType.
2. **SystemPipeline** — любая GameSystem добавляется по приоритету. Serialize/deserialize на каждую.
3. **GameServer interface** — полная абстракция игрового сервера. Можно заменить имплементацию.
4. **ClientSnapshot** — иммутабельный срез данных, рендер отвязан от логики.
5. **Строгая слоистость** — зависимости только вниз, никаких циклов.
6. **FSM колонистов** — `idle → moving → working → done → idle`, легко расширить новыми состояниями.
7. **Все состояния сериализуемы** — SaveData покрывает мир, ECS, колонистов, очередь строительства, данные систем.

### ❌ Что мешает

1. **Нет Event Bus** — системы не общаются через события. Всё через поллинг в update(). Добавление cross-system логики требует правки GameWorld.
2. **GameWorld — God Object (335 строк)** — всё в одном классе. Любая новая фича почти всегда требует его модификации.
3. **Добавление здания требует правки 5+ файлов** — buildingTypes.ts, components (ECS), TILE_DATA (client), textures.ts (рендер), renderEntities/Overlay, ClientSnapshot. Нет единого "регистра зданий".
4. **GameHost тесно связан** — фабрика createGameServer() жёстко зашита. Смена реализации GameServer требует изменения GameHost.
5. **Нет Entity Factory** — ECS-сущности создаются в разных местах (placeInitialEntities, build job).
6. **Нет DI** — зависимости создаются внутри классов.
7. **Тесты** — GameHost, GameLoop, InputHandler, Camera, geometry без покрытия. Нет E2E.

### Итог: 7/10

Проект имеет хорошую основу — реестры работ/статусов и system pipeline делают добавление нового поведения колонистов тривиальным. Но расширение на уровне фич (новые здания, новые системы, новая логика мира) требует правки центральных классов.

### Приоритетные улучшения для масштабирования

1. **Event Bus** — системы смогут реагировать на события, а не поллинговать каждый тик
2. **Выделить генерацию снепшота** из GameWorld в отдельный класс/систему
3. **Building Registry** — один реестр зданий с конфигом + рендером + компонентом
4. **Вынести FSM колонистов** в отдельную систему (а не в GameWorld.update())
5. **Entity Factory** — централизованное создание ECS-сущностей
