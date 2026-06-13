## Context

GameWorld currently owns all rendering logic — ~180 строк из 666. Это мешает:

- Тестировать рендеринг изолированно (нужен полноценный GameWorld)
- Изменять пайплайн рендеринга без риска сломать логику
- Переиспользовать render-функции в других контекстах

Рендер-функции уже выделены в `src/render/` (drawColonist, drawTile, drawWall3D, drawShadow), но вызывающий код (renderEntities, renderGhosts, renderHighlight, renderSelection, renderPaths, roundRect) живёт прямо в GameWorld.

## Goals / Non-Goals

**Goals:**
- Все render-методы GameWorld переезжают в `src/render/worldRenderer.ts`
- Создаётся контракт `RenderSnapshot` — value object без ссылок на `GameWorld`
- GameWorld.render() сокращается до `< 5 строк`: input update + collectSnapshot + renderWorld
- Рендеринг становится тестируемым через `renderWorld(fakeCtx, snapshot)`
- Дубликат `roundRect` устраняется (сейчас в gameWorld.ts и drawColonist.ts)

**Non-Goals:**
- Менять сигнатуры существующих render-функций (drawColonist, drawTile etc.)
- Менять игровую логику
- Оптимизировать производительность рендеринга
- Менять внешний вид игры

## Decisions

### Decision 1: Value object snapshot вместо callback-интерфейса

Альтернативы:
- **Callback-интерфейс**: `IRenderableView { getColonists(), getMap()... }` — GameWorld реализует интерфейс. Плюс: не создаёт новый объект каждый кадр. Минус: связывает render-слой с GameWorld через мутабельный интерфейс, сложнее тестировать.
- **Snapshot (выбран)**: `RenderSnapshot` — плоский value object, собранный в конце update-цикла. Плюс: иммутабельный контракт, легко тестировать, явная граница. Минус: аллокация каждый кадр (пренебрежимо для 60fps).

Решение: используем `RenderSnapshot`. Если GC станет проблемой — оптимизируем позже.

### Decision 2: Один файл worldRenderer.ts vs несколько

Альтернативы:
- **Один большой файл** с renderWorld() и вспомогательными функциями
- **Несколько файлов** (renderEntities.ts, renderOverlay.ts, roundRect.ts)

Решение: несколько файлов для ясности:
- `worldRenderer.ts` — `RenderSnapshot`, `collectSnapshot()`, `renderWorld()`
- `renderEntities.ts` — отрисовка food, bed, wall (бывший `renderEntities`)
- `renderOverlay.ts` — highlight, selection, paths, ghosts (бывшие overlay-методы)
- `roundRect.ts` — общая утилита

### Decision 3: inputHandler.update() остаётся в GameWorld.render()

`inputHandler.update(realDt)` — это не рендеринг, а обработка ввода с реальным (не игровым) временем. Он живёт в render-вызове GameWorld потому что это удобная точка, но семантически это часть game loop, а не рендера. Оставляем в GameWorld.

## Risks / Trade-offs

- **[Low] GC pressure от snapshot-объекта** — новая аллокация 60 раз/с. Если будет заметно — перейти на мутабельный объект с перезаписью полей.
- **[Low] Случайное мутирование snapshot** — snapshot содержит ссылки на мутабельные объекты (colonists, map). Если render-функция изменит их — баг. В коде рендера нет мутаций, но стоит помнить. Можно замёржить поля (spread/copy) или заморозить в будущем.
- **[Low] Тесты GameWorld с замоканным canvas** — текущие тесты мокают getContext. После рефакторинга GameWorld.render() не трогает canvas напрямую, и моки станут проще или не нужны.
