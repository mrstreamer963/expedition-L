# Hybrid ECS with BitECS — Design Document

## Goal
Заменить жёсткие классы Food, Bed, Building на Entity-Component-System (BitECS),
чтобы добавление новых типов предметов/построек не требовало создания новых классов.

## Non-goals
- Не менять FSM колонистов (Colonist класс остаётся)
- Не менять системы NeedSystem/StatusSystem (фаза 2)
- Не менять формат ClientSnapshot (рендер не трогаем)
- Не менять формат SaveData (обратная совместимость)

## ECS Library
**BitECS v0.4.0** — `npm install bitecs`

## Components (src/core/components/)

```typescript
// position.ts
export const Position = { x: new Float32Array(1e5), y: new Float32Array(1e5) }

// renderable.ts
export const Renderable = [] as { type: string; color?: string }[]

// Tags (пустые объекты — достаточно факта наличия)
export const Edible = {}
export const Sleepable = {}
export const Solid = {}
```

## WorldState changes

```typescript
import { World } from 'bitecs'

class WorldState {
  ecs: World                              // + новый
  map: GameMap
  colonists: Colonist[]
  buildQueue: BuildQueue
  // foods, beds, buildings — удалены
}
```

## GameWorld changes

- `constructor()`: создаёт `createWorld()`, инициализирует entity для еды/кроватей
- `placeInitialFood()`: `addEntity + addComponent(Position, Edible, Renderable)` вместо `new Food()`
- `placeInitialBeds()`: аналогично `addEntity + Position + Sleepable + Renderable`
- `canBuildAt()`: `query(ecs, [Edible, Position])` вместо `foods.some()`
- `addBuildTask()`: без изменений (BuildQueue не трогаем)
- `generateSnapshot()`: `query(ecs, [Edible, Position]).map(...)` вместо `foods.map()`

## Job changes (eat.ts / sleep.ts / build.ts)

### eat.ts
```typescript
// findAllTargets
const foods = query(ecs, [Edible, Position])
  .filter(eid => !occupied.has(`${Position.x[eid]},${Position.y[eid]}`))
  .map(eid => ({ x: Position.x[eid], y: Position.y[eid] }))

// onComplete — удаление entity
for (const eid of query(ecs, [Edible, Position])) {
  if (matchPosition(eid, colonist.position)) {
    removeEntity(ecs, eid); break
  }
}
```

### sleep.ts
Аналогично eat.ts: `query(ecs, [Sleepable, Position])` вместо `context.beds`.

### build.ts onComplete
```typescript
const eid = addEntity(ecs)
Position.x[eid] = tx; Position.y[eid] = ty
Renderable[eid] = { type: task.type }
addComponent(ecs, eid, Solid)                // для стен
// или addComponent(ecs, eid, Edible)        // для food
// или addComponent(ecs, eid, Sleepable)     // для bed
```

## Serialization (WorldSerializer)

Формат SaveData не меняется: `foods: [{id, x, y}]`. Сериализация:
- `toJSON()`: `query(ecs, [Edible, Position])` → массив `{id, x, y}`
- `fromJSON()`: итерация по массиву → `addEntity + addComponent(Position, Edible, Renderable)`

## Test changes

3 файла. Паттерн:
```typescript
// Было: game.state.foods = []
// Стало:
for (const eid of query(game.state.ecs, [Edible])) {
  removeEntity(game.state.ecs, eid)
}
```

## Implementation order
1. `npm install bitecs`
2. Создать компоненты (5 файлов)
3. Создать отдельный файл BuildQueue (перенести из building.ts)
4. Удалить Food, Bed, Building; перелинковать импорты BuildQueue
5. Добавить `ecs` в WorldState
6. Обновить GameWorld (init, entity creation, snapshot)
7. Обновить jobs (eat, sleep, build)
8. Обновить WorldSerializer
9. Обновить тесты
10. `npm test` — зелёный

## Risk
- Тесты, которые мутируют `game.state.foods = []`, нужно переписать на ECS-удаление
- WorldSerializer.fromJSON теперь принимает `ecs: World` — нужно обновить сигнатуру
