## Context

Текущее тестовое покрытие: 21 тест в двух файлах (`GameWorld.test.ts`, `TopBar.test.tsx`). Тесты покрывают speed controls и приоритизацию нужд JobSystem. Production-код не имеет тестов для pathfinding, build queue, serialization, map, renderer.

Все целевые модули — чистые функции или изолированные классы без внешних зависимостей, что делает их идеальными кандидатами для unit-тестов.

## Goals / Non-Goals

**Goals:**
- Добавить unit-тесты для `pathfinding.ts` (findPath)
- Добавить unit-тесты для `building.ts` (BuildQueue)
- Добавить unit-тесты для `workGiver.ts` (WorkGiver)
- Добавить unit-тесты для `worldSerializer.ts` (WorldSerializer)
- Добавить unit-тесты для `map.ts` (GameMap)
- Добавить unit-тесты для `canvas.ts` (renderMap)
- Достичь минимального порога покрытия ключевых сценариев для каждого модуля

**Non-Goals:**
- Изменение production-кода (кроме возможного экспорта функций для тестирования)
- Добавление e2e или интеграционных тестов
- Достижение 100% code coverage
- Тестирование UI-компонентов (уже есть)
- Тестирование GameWorld (уже есть)

## Decisions

### 1. Отдельные test-файлы по модулям

Вместо одного большого test-файла — отдельный файл на модуль:

- `src/test/pathfinding.test.ts`
- `src/test/buildQueue.test.ts`
- `src/test/worldSerializer.test.ts`
- `src/test/gameMap.test.ts`
- `src/test/renderMap.test.ts`

**Rationale**: Каждый модуль изолирован, тесты можно запускать выборочно. Совпадает с подходом в существующих тестах.

### 2. Pathfinding: тестирование через реальный GameMap

`findPath` принимает `GameMap`, `start`, `end`, `occupiedPositions`. Для тестов создаём карты с известной конфигурацией (передаём grid в конструктор `GameMap`), а не полагаемся на случайную генерацию.

**Alternatives considered**: Mock GameMap — излишне, класс простой.
**Rationale**: GameMap — тонкая обёртка над grid, его создание не имеет побочных эффектов.

### 3. WorldSerializer: round-trip через toJSON → fromJSON

Тесты создают `GameWorld`, вызывают `toJSON`, затем `fromJSON`, сравнивают ключевые поля. Для валидации — вызывают `validate` с некорректными данными.

**Rationale**: WorldSerializer — чистая конвертация данных, round-trip гарантирует целостность.

### 4. RenderMap: spy на drawTile

Вместо проверки пикселей на canvas — spy `drawTile`, проверяем что функция вызвана для каждого тайла в правильном порядке.

**Rationale**: Проверка canvas-рендеринга через пиксели хрупка и сложна в поддержке. Нам важно что renderMap итерирует все таймы и вызывает drawTile для каждого.

### 5. Экспорт вспомогательных функций

Если `manhattan` в pathfinding.ts не экспортируется — добавить `export` (без изменения реализации).

**Rationale**: Функция уже написана, тестировать её напрямую проще чем через findPath.

## Risks / Trade-offs

- **[Low] Генерация карты random** → Тесты используют предопределённый grid, не вызывая `generateMap`. Это решено дизайном конструктора `GameMap`.
- **[Low] Изменение production-кода для экспорта** → Минимальное изменение (добавить `export` к `manhattan`). Не меняет поведение.
- **[Low] Canvas mock не идеален** → Существующий mock в GameWorld.test.ts уже используется. RenderMap тесты используют тот же подход.
