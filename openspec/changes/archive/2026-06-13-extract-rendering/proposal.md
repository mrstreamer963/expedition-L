## Why

GameWorld (666 строк) смешивает игровую логику и рендеринг. Это усложняет тестирование, затрудняет внесение изменений и нарушает Single Responsibility Principle. Рендеринг — отдельная подсистема, и должен жить в своём слое.

## What Changes

- Выделить все render-методы из GameWorld в отдельный модуль `src/render/worldRenderer.ts`
- Создать контракт `RenderSnapshot` — value object, который GameWorld передаёт рендереру
- Вынести дублирующийся `roundRect()` в общую утилиту
- GameWorld перестаёт импортировать Canvas-зависимости
- Рендерер становится чистой функцией: `renderWorld(ctx, snapshot)`

## Capabilities

### New Capabilities
- `render-system`: Изолированный рендер-слой, принимающий snapshot состояния и рисующий всё на canvas. Включает отрисовку карты, сущностей, колонистов, build queue ghost-ов, overlay-элементов (highlight, selection, paths).

### Modified Capabilities
<!-- No spec-level behavior changes — rendering output remains identical. -->

## Impact

- `src/game/gameWorld.ts`: удалить ~180 строк рендеринга (~25% файла). Импорт GameMap, Colonist и других game-классов остаётся (они нужны в snapshot).
- `src/render/`: новый файл `worldRenderer.ts`, опционально `renderEntities.ts`/`renderOverlay.ts`/`roundRect.ts`
- `src/test/renderMap.test.ts`: остаётся без изменений
- `src/test/GameWorld.test.ts`: может потребовать корректировки моков
