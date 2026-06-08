## Why

Текущее покрытие тестами — 21 тест, покрывающий только speed controls и приоритизацию нужд JobSystem. Ключевые системы (pathfinding, build queue, serialization, map, renderer) не имеют тестов, что делает рефакторинг рискованным и затрудняет добавление новых функций.

## What Changes

Добавить unit-тесты для следующих модулей:

- **Pathfinding** (`findPath`): корректность маршрутов, обход препятствий, учёт занятых позиций, недостижимые цели
- **BuildQueue** + **WorkGiver**: добавление/извлечение задач, резервирование/освобождение, сериализация
- **WorldSerializer**: round-trip сериализация/десериализация, валидация, обработка невалидных данных
- **GameMap**: tileAt, setTile, isWalkable, occupant tracking, toJSON
- **Canvas renderer** (`renderMap`): итерация всех тайлов, вызов drawTile для каждого

Никаких изменений production-кода — только новые тесты.

## Capabilities

### New Capabilities

- `pathfinding`: A* pathfinding behaviour — walkability, obstacle avoidance, occupancy awareness, unreachable targets
- `build-queue`: Build task queue and work reservation logic
- `world-serialization`: Save/load round-trip integrity and data validation
- `game-map`: Tile grid access, modification, occupancy, and serialization
- `render-coverage`: Map renderer iterates all tiles correctly

### Modified Capabilities

- *(none — production behaviour does not change)*

## Impact

- `src/test/` — новые файлы тестов
- `src/game/world/pathfinding.ts` — может потребоваться экспорт `manhattan` для тестов (если сейчас не экспортируется)
- Никаких изменений логики, только добавление тестов
