# Design: Improve Graphics

## Overview

Current → Target:

```
Текущее:                        Цель:
┌──────────────┐               ┌──────────────┐
│  Скучные     │               │  Читаемые    │
│  ромбы       │               │  тайлы +     │
│  32×16       │   ───────▶    │  тени +      │
│  Прямоуголь- │               │  3D-стены +  │
│  ники-колон. │               │  колонисты   │
│  Нет теней   │               │  пропорции   │
└──────────────┘               └──────────────┘
```

## 1. Tile Size

Увеличиваем тайл для читаемости:

```
Текущий:                Новый:
╱▔▔╲                    ╱▔▔▔▔╲
╱ 32 ╲                  ╱ 48  ╲
╲    ╱                  ╲     ╱
 ╲__╱                    ╲___╱
 16px                    24px

TILE_WIDTH = 48         TILE_HEIGHT = 24
```

Координаты:
```
tileToScreen(tx, ty):
  x = (tx - ty) * 24    // TILE_WIDTH / 2
  y = (tx + ty) * 12    // TILE_HEIGHT / 2
```

## 2. Texture Patterns (Canvas, not sprites)

Вместо `ctx.fillStyle = '#4a7c59'` → `ctx.fillStyle = pattern`:

```
Floor (трава):
  ┌─────────────────────────────┐
  │  ░░░░░░░░░░░░░░░░░░░░░░░░░  │  base: #5a8c69
  │  ░░░░▒▒░░░░▒▒░░░░▒▒░░░░░▒  │  noise: #4a7c59 dots
  │  ░░░░░░░░░░░░░░░░░░░░░░░░░  │  (random points every 4px)
  └─────────────────────────────┘

Rock (камень):
  ┌─────────────────────────────┐
  │  ██████████████████████████  │  base: #6b6b6b
  │  ██░░██░░██░░██░░██░░██░░██  │  cracks: lighter/darker lines
  │  ██████████████████████████  │  (3 random 1px lines)
  └─────────────────────────────┘

Water (вода):
  ┌─────────────────────────────┐
  │  ▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁  │  base: #4a7fa9
  │  ▁▁▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁▔▔  │  waves: alternating
  │  ▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁▔▔▁▁  │  brightness lines
  └─────────────────────────────┘

Wall (стена):
  ┌─────────────────────────────┐
  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  base: #9a8b6a
  │  ▓▓░░▓▓▓▓░░▓▓▓▓░░▓▓▓▓░░▓▓  │  brick: horizontal
  │  ▓▓▓▓░░▓▓▓▓░░▓▓▓▓░░▓▓▓▓░░  │  lines every 6px
  └─────────────────────────────┘
```

Canvas pattern создаётся один раз при инициализации:
```typescript
function createTilePattern(type: TileType): CanvasPattern {
  const c = document.createElement('canvas')
  c.width = 48
  c.height = 24
  const ctx = c.getContext('2d')!
  // draw procedural texture
  return ctx.createPattern(c, 'repeat')!
}
```

## 3. Wall 3D Effect

Стена — не плоский ромб, а 3D-блок:

```
Вид сверху (изометрия):

       ╱▔▔▔▔╲                ← верхняя грань (wall top color)
      ╱      ╲
     ╱        ╲
    ╱          ╲
   ╱            ╲
  ╱──────────────╲   ← линия-граница верх/перед
  ╲              ╱
   ╲            ╱    ← передняя грань (wall front color,
   ╲          ╱       темнее верха)
    ╲        ╱
     ╲      ╱
      ╲____╱
```

```
Рисование:
  1. ctx.beginPath() — ромб верхней грани (такой же как тайл)
     fillStyle = lighter wall color
  2. ctx.beginPath() — трапеция передней грани
     fillStyle = darker wall color
  3. ctx.beginPath() — трапеция правой грани
     fillStyle = medium wall color

  Высота стены: H = 12px (половина TILE_HEIGHT)
```

## 4. Shadows

Тень под каждым объектом — тёмный эллипс или ромб на полу:

```
     ╱▔▔╲
    ╱ колон ╲
    ╲       ╱
     ╲_____╱
        ▓           ← тень: fillStyle 'rgba(0,0,0,0.2)'
      ▓▓▓▓▓         эллипс 16×6px под колонистом
        ▓

Рисование перед entities:
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(screenX, screenY, 8, 3, 0, 0, Math.PI * 2)
  ctx.fill()
```

Тень для стен:
```
- Тень падает влево-вниз (по диагонали изо-проекции)
- Смещение: dx = -4, dy = 4
- Полупрозрачный чёрный ромб
```

## 5. Colonist Redesign

Из прямоугольника 12×16 → в двучастную фигуру:

```
Текущий:              Новый:
┌────────┐            ●●●●●●        ← голова (6×6, круг)
│        │           ●      ●       color = colonist.color
│   цв.  │           ●      ●
│   прям.│           ●      ●
│  12×16 │           ████████       ← тело (8×12, скруглённый
│        │          ██████████       прямоугольник, темнее цвета)
│        │          ██░░░░░░██
└────────┘          ██░░░░░░██
                    ██████████
                        ░░         ← ноги-намёк (2×4px)
                        ░░
```

```
Рисование:
  1. Тень (ellipse под позицией)
  2. Ноги: два маленьких rect (2×4) внизу
  3. Тело: roundRect(center-4, y-12, 8, 12, 2)
     fillStyle = darker(colonist.color)
  4. Голова: circle или roundRect(center-3, y-20, 6, 6, 3)
     fillStyle = colonist.color (яркий)
  5. Глаза: две white точки (2×2), если колонист не спит
```

## 6. Need Indicators

Вместо emoji над колонистом — цветная полоска потребностей:

```
Текущий:              Новый:
  🍖💤🔨                ════╗   ← hunger bar (красный → зелёный)
   name                  ══╝   ← sleep bar (синий)
  ┌───────┐              name
  │  цвет │             ┌──────┐
  │  тело │             │ тело │
  └───────┘             └──────┘
```

```
Рисование (над головой):
  - Полоска hunger: 24×3px
    цвет: lerp(#e06060, #60d080, hunger/100)
  - Полоска sleep: 24×3px (под hunger)
    цвет: lerp(#e0a060, #60a0e0, sleep/100)
  - Имя: под полосками
```

## 7. New Color Palette

Увеличенный контраст между типами тайлов:

```
Тип        Base Color    Top Color    Front Color        Pattern
─────────────────────────────────────────────────────────────
Floor      #5a8c69       —            —                  трава+шум
Rock       #6b6b6b       #808080      #505050            трещины
Water      #4a7fa9       —            —                  волны
Wall       #9a8b6a       #b8a87e      #7a6e52            кирпич
Bed        #c49a6c       —            —                  (поперечные полосы)
Food       #e8d44d       —            —                  (точки)
```

## 8. Render Pipeline

Новый порядок рендера:

```
render(ctx):
  1. clear + background (#1a1a2e)
  2. for y → for x:
     a. drawTileShadow(x, y)     // если есть стена выше
     b. drawTilePattern(x, y)    // текстура пола
  3. for y → for x:
     a. если Wall: drawWall3D    // 3D-блок стены
     b. если Bed: drawBed        // модернизированная кровать
  4. for (entity sorted):
     a. drawShadow(entity)
     b. drawEntity(entity)
  5. for (colonist sorted):
     a. drawShadow(colonist)
     b. drawColonist(colonist)   // новая прорисовка
  6. highlight + selection + paths overlay
```

## 9. TILE_DATA Update

```
TILE_DATA:
  Floor: { color: '#5a8c69', walkable: true, pattern: 'grass' }
  Wall:  { color: '#9a8b6a', walkable: false, pattern: 'brick', has3D: true }
  Rock:  { color: '#6b6b6b', walkable: false, pattern: 'crack' }
  Water: { color: '#4a7fa9', walkable: false, pattern: 'wave' }
  Bed:   { color: '#c49a6c', walkable: true, pattern: 'stripe' }
  Food:  { color: '#e8d44d', walkable: true, pattern: 'dot' }

  Добавить: TILE_DATA[type].pattern — имя процедурного паттерна
```

## Key Decisions

| Решение | Почему |
|---------|--------|
| Canvas Pattern, не PNG | Нет внешних файлов, всегда в репозитории, быстро генерируется |
| 3D-стены через трапеции | Добавляет глубину без WebGL, 3 строки кода на грань |
| Тени — эллипсы | Простая математика, большой визуальный эффект |
| Пропорции колониста | Минимальные изменения для читаемости (голова + тело + глаза) |
| Увеличенный тайл 48×24 | Лучше читается на 960×540, карта 30×20 всё ещё влезает |
| Полоски потребностей | Компактнее emoji, цвет кодирует уровень (не нужны цифры) |
