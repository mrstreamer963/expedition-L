# Expedition-L / RimWorld MVP

Колония-симулятор в изометрической проекции, вдохновлённый RimWorld. MVP на TypeScript, React и Canvas 2D.

## Стек

- **Язык:** TypeScript (strict)
- **UI:** React 18
- **Сборка:** Vite 5
- **Рендеринг:** HTML5 Canvas 2D (изометрический)
- **Тесты:** Vitest + Testing Library

## Установка и запуск

```bash
npm install
npm run dev      # dev-сервер
npm test        # тесты
npm run build   # прод-сборка
npm run preview # предпросмотр сборки
```

## Особенности

- **Изометрическая карта** 30×20 тайлов с процедурной генерацией
- **Поселенцы** (3 шт.) с потребностями: голод и сон
- **FSM поселенцев:** idle → assigned → moving → working → done
- **Система задач:** еда, сон, строительство, перемещение (правый клик)
- **A\* pathfinding** (4-направленный, с обходом препятствий)
- **Строительство:** стены, кровати, запасы еды (очередь + бронирование)
- **Скорость игры:** пауза, 1×, 5×, 10× (клавиши 1-4, Space/P)
- **Камера:** WASD + средняя кнопка мыши
- **Сохранение/загрузка:** localStorage + JSON-файлы
- **Гибридный игровой цикл:** фиксированный tick (60 tps) + событийная шина

## Архитектура

```
src/
├── core/           # чистый игровой движок (без DOM/браузера)
│   ├── colony/     # колонисты, FSM, задачи, реестры
│   │   ├── jobs/   # eat, sleep, build, walk
│   │   └── statuses/ # hungry, tired
│   ├── entities/   # Food, Bed, Building, BuildQueue
│   ├── systems/    # NeedSystem, StatusSystem
│   ├── world/      # GameMap, Tile, pathfinding (A*)
│   ├── gameWorld.ts    # главный цикл (GameServer impl)
│   ├── worldSerializer.ts  # сохранение/загрузка v2
│   ├── types.ts    # GameServer, ClientSnapshot, PlayerAction
│   └── index.ts
├── game/           # клиентская оркестрация (браузер)
│   ├── gameHost.ts     # мост core ↔ React ↔ Canvas
│   ├── gameLoop.ts     # requestAnimationFrame, 60 TPS
│   ├── input/          # клавиатура, мышь
│   ├── persistence/    # localStorage + файлы
│   └── index.ts
├── geometry/        # чистая математика (камера, изометрия)
├── render/          # Canvas 2D изометрический рендерер
├── ui/              # React-компоненты (TopBar, BuildMenu, ColonistPanel)
├── store/           # типы состояния React
└── test/            # 71 тест (Vitest)
```

## Управление

| Действие | Управление |
|----------|------------|
| Перемещение камеры | WASD / средняя кнопка мыши |
| Выбор поселенца | Левый клик |
| Перемещение | Правый клик по тайлу |
| Строительство | Выбрать режим в BuildMenu → левый клик |
| Скорость игры | 1 (пауза), 2 (1×), 3 (5×), 4 (10×) |
| Пауза | Space / P |

## Тесты

```bash
npm test             # однократно
npm run test:watch   # watch mode
```
