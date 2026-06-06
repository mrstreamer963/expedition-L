# Design: RimWorld MVP

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React UI (редко обновляется)        │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ │
│  │  TopBar  │ │ BuildMenu│ │ Colonist   │ │        │ │
│  │  (HUD)   │ │ (toolbar)│ │  Panel     │ │ ...    │ │
│  └─────────┘ └──────────┘ └────────────┘ └────────┘ │
│                                          ↑          │
│                                    gameState (signal) │
└──────────────────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────┼──────────┐
│              Game Engine (60fps loop)    │          │
│                                          │          │
│  ┌──────────┐  ┌───────────┐  ┌───────┐ │ ┌──────┐│
│  │  World   │  │ JobSystem │  │Path-  │ │ │Camera││
│  │  (tiles, │◀─│           │  │finding│◀─┤│(scroll││
│  │  entities)│ └───────────┘  │       │ │ └──────┘│
│  └──────────┘                 └───────┘ │          │
│       │                                │          │
│  ┌────▼─────┐                       ┌───▼──────┐  │
│  │ Colonist │×3                    │ Renderer  │  │
│  │ (needs,  │                       │ (Canvas 2D)│ │
│  │  state)  │                       └──────────┘  │
│  └──────────┘                                     │
└────────────────────────────────────────────────────┘
```

## Core Systems

### 1. World (Map)

```
Grid<30, 20> — 2D массив тайлов

Tile:
  - type: Floor | Wall | Bed | Food | Rock | Water
  - walkable: boolean
  - renderColor: string

Изометрическая проекция:
  screenX = (tileX - tileY) * 16 + offsetX
  screenY = (tileX + tileY) * 8   + offsetY

  tileX = (screenX / 16 + screenY / 8) / 2
  tileY = (screenY / 8 - screenX / 16) / 2

Sort order (back-to-front): tileY + tileX (render in this order)
```

### 2. Colonist

```typescript
interface Colonist {
  id: string
  name: string
  color: string           // визуал: цвет прямоугольника
  position: Vec2          // текущий тайл (x, y)
  targetPosition: Vec2 | null  // куда идёт (pathfinding)
  path: Vec2[]            // вычисленный путь
  speed: number           // тайлов в секунду (~3)
  state: 'idle' | 'walking' | 'eating' | 'sleeping' | 'building'
  
  // Потребности (0-100, падают со временем)
  needs: {
    hunger: number         // голод (100 = сыт, 0 = голоден)
    sleep: number          // сон (100 = бодр, 0 = хочет спать)
  }
  
  // Текущая задача
  currentJob: Job | null
}
```

### 3. Needs System

```
Тик каждую секунду (в игровом времени):

  hunger -= 0.5    // ~3.3 минуты до полного голода
  sleep  -= 0.3    // ~5.5 минут до полной усталости

Пороги реакции:
  hunger < 40 → ищем еду → едим (+40 hunger)
  sleep < 25  → ищем кровать → спим (+60 sleep, занимает 10 сек игрового)

Если потребность критическая, прерываем текущую задачу
(кроме еды — голод приоритетнее всего)
```

### 4. Job System

```
Job:
  - type: 'eat' | 'sleep' | 'walk' | 'build'
  - target: Entity | Tile
  - priority: number
  - progress: number

Присвоение (каждые 2 секунды для каждого колониста):

  1. Прерывание?
     Если критическая потребность → отменить текущую задачу
     → перейти к удовлетворению

  2. Уже есть задача?
     Если задача выполнима → продолжать
     Иначе → отменить, искать новую

  3. Приоритетный поиск:
     ┌──────────────────────────────────┐
     │ hunger < 40? → Job('eat')       │ ← приоритет 1
     │ sleep < 25?  → Job('sleep')     │ ← приоритет 2
     │ есть buildQueue? → Job('build') │ ← приоритет 3
     │ иначе → idle                     │
     └──────────────────────────────────┘

  4. Для задачи → pathfinding до цели → начать движение
```

### 5. Pathfinding (A*)

```
Стандартный A* на сетке:
  - 4 направления (вверх, вниз, влево, вправо)
  - Избегаем стен, камней, воды
  - Проходим через других колонистов (но не стоим на их тайле при планировании)
  - Пере-планирование при изменении пути

Collision check:
  При движении: если тайл занят другим колонистом → ждать 0.5 сек → пере-планировать
```

### 6. Building

```
Режимы строительства:
  - 'wall'  → ставим стену на тайл (unwalkable)
  - 'bed'   → ставим кровать (колонист будет на ней спать)
  - 'food'  → кладем еду на землю

Процесс:
  1. Игрок выбирает инструмент в BuildMenu
  2. Курсор меняет цвет (подсветка тайла)
  3. Клик ЛКМ на карте → задача в buildQueue
  4. JobSystem назначает ближайшему колонисту Job('build')
  5. Колонист идёт к точке → анимация строительства (0.5 сек) → готово

Ограничения:
  - Нельзя строить на камне, воде
  - Кровать только на полу
  - Проверка: не занято ли другим объектом
```

### 7. Renderer (Canvas 2D)

```
Рендер-порядок (back-to-front):
  for y = 0 to 19
    for x = 0 to 29
      drawTile(x, y)
      
      if entity at (x, y):
        drawEntity(entity)

Тайлы:
  Floor:  #4a7c59 (трава)
  Wall:   #8b7355 (камень)
  Rock:   #6b6b6b
  Water:  #5b8fb9
  Bed:    #c49a6c
  Food:   #e8d44d (маленький жёлтый квадрат)

Колонист:
  Прямоугольник 12×16px, цвет персонажа
  Подпись имени сверху
  Индикатор потребности (маленький треугольник/точка)

Camera:
  Pan: WASD или drag мышью
  Zoom: не в MVP (фиксированный масштаб)
```

### 8. Game Loop

```typescript
let timeScale = 1.0     // 0 = пауза, 1 = норм, 2 = быстро
let lastTime = 0
let accumulator = 0
const TICK = 1 / 60     // 60 тиков в секунду (реального)

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000
  lastTime = timestamp

  accumulator += dt * timeScale

  while (accumulator >= TICK) {
    update(TICK)        // игровая логика
    accumulator -= TICK
  }

  render()              // рендер (всегда 1 раз)
  requestAnimationFrame(gameLoop)
}

function update(dt) {
  // Обновить потребности
  for (colonist of colonists) {
    colonist.needs.hunger = max(0, colonist.needs.hunger - 0.5 * dt)
    colonist.needs.sleep  = max(0, colonist.needs.sleep  - 0.3 * dt)
  }
  
  // Job assignment (не каждый кадр, с таймером)
  jobSystem.tick(dt)
  
  // Движение
  for (colonist of colonists) {
    colonist.move(dt)
  }
  
  // Обновить UI (редко, ~2 раза в сек)
  uiUpdateTimer += dt
  if (uiUpdateTimer > 0.5) {
    gameState.emit()     // React подхватит
    uiUpdateTimer = 0
  }
}
```

### 9. Input Handling

```
ЛКМ по колонисту → выделить (показать панель)
ЛКМ по карте → выделить пустое место
ПКМ по карте → команда движения (первый свободный колонист)
ПКМ по группе → вся группа идёт
Shift+ЛКМ → добавить к выделению
Ctrl+A → выделить всех

Кнопки:
  Space / P → пауза
  1, 2, 3 → скорость (0, 1x, 2x)
  W, A, S, D → двигать камеру
  1-3 (BuildMenu) → выбрать инструмент строительства
```

### 10. React Integration

```
GameWorld живёт в module singleton (не в React state).
React читает через ref:

  const gameRef = useRef<GameWorld>(null)
  const [uiState, setUiState] = useState<UIState>({...})

  // GameWorld подписывает callback:
  gameRef.current.onUiUpdate = (state) => {
    setUiState(state)  // триггерит React-ререндер
  }

  // Canvas рендер вызывается напрямую из gameLoop,
  // не через React. React только создаёт <canvas> и даёт ref.

  function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    
    useEffect(() => {
      const game = new GameWorld(canvasRef.current)
      gameRef.current = game
      return () => game.destroy()
    }, [])
    
    return <canvas ref={canvasRef} width={960} height={540} />
  }
```

## Project Structure

```
src/
├── game/
│   ├── world/
│   │   ├── map.ts           ← Grid<30,20>, тайлы, изометрия
│   │   ├── tile.ts          ← Tile тип, данные
│   │   └── pathfinding.ts   ← A* алгоритм
│   ├── colony/
│   │   ├── colonist.ts      ← Colonist класс
│   │   ├── needs.ts         ← Needs тип + update
│   │   └── jobSystem.ts     ← JobSystem класс
│   ├── entities/
│   │   ├── building.ts      ← Building (стена, кровать)
│   │   └── food.ts          ← Food
│   ├── input/
│   │   └── inputHandler.ts  ← Мышь, клавиатура
│   ├── camera.ts            ← Pan (WASD/drag)
│   ├── gameWorld.ts         ← World singleton, init
│   └── gameLoop.ts          ← requestAnimationFrame цикл
├── render/
│   ├── canvas.ts            ← Canvas context, draw функции
│   ├── drawTile.ts          ← Рендер тайла (изо)
│   ├── drawColonist.ts      ← Рендер колониста
│   └── drawUI.ts            ← Встроенный UI на канвасе (курсор, highlight)
├── ui/
│   ├── App.tsx              ← Главный лейаут
│   ├── GameCanvas.tsx       ← Canvas wrapper
│   ├── TopBar.tsx           ← Пауза, скорость, ресурсы
│   ├── BuildMenu.tsx        ← Стена / Кровать / Еда
│   ├── ColonistPanel.tsx    ← Инфо выбранного колониста
│   └── types.ts             ← UIState тип
└── store/
    └── types.ts             ← Общие типы, интерфейсы
```

## Key Decisions

| Решение | Почему |
|---------|--------|
| Canvas 2D, не DOM | Производительность, изометрия, плавность |
| Цветные прямоугольники | MVP — без спрайтов, быстрее в 10x |
| GameLoop вне React | 60fps несовместим с React render cycle |
| Signal-based UI update | React получает данные ~2x/sec, не каждый кадр |
| A* pathfinding | Стандарт для сеточных игр, простой, надёжный |
| Job-система приоритетная | Ядро RimWorld-feel: персонажи "живые" |
| 3 колониста | Минимум для "колонии", не перегружает |
| 30×20 тайлов | ~600 тайлов, помещаются на ~1920p с запасом |
| 32×16 тайлы | Классическая изометрия, хороший баланс |
