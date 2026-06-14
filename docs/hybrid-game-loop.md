# Hybrid Game Loop: Tick + Event

RinWord использует гибридную модель игрового цикла, совмещающую **tick-based симуляцию** (непрерывные процессы) и **event-driven реакции** (дискретные действия).

## Tick-based симуляция (continuous)

Системы, работающие на каждом игровом такте (60 tps):

| Система | Что делает | Частота |
|---------|-----------|---------|
| **NeedSystem** | Голод: `value -= 0.5 * dt`, Сон: `value -= 0.3 * dt` | каждый frame |
| **GrowthSystem** | Рост растений, деревьев (в будущем) | каждый frame |
| **TemperatureSystem** | Температура, пожары, обморожение (в будущем) | каждый frame |
| **WeatherSystem** | Дождь, снег, молнии (в будущем) | каждый frame |

Эти системы **не генерируют события**. Они просто меняют состояние каждый кадр. Игрок видит непрерывное ухудшение голода/сна, рост растений, смену погоды.

## Event-driven реакции (discrete)

События триггерят немедленную реакцию в том же фрейме:

| Событие | Триггер | Реакция |
|---------|---------|---------|
| `colonist_idle` | Колонист завершил задание (`done → idle`) | `JobDispatcher.assignBestJob()` |
| `build_queued` | Игрок поставил стройку | Резервация + dispatch на ближайшего idle колониста |
| `food_consumed` | Еда съедена | Проверка emergency food |
| `colonist_arrived` | Moving → Working | Начать выполнение задания |

## Поток выполнения в одном frame

```
GameController.update(dt):
  1. NeedSystem.update(dt)           # tick: голод/сон у всех
  2. for each colonist:
       colonist.update(dt, map)      # tick: FSM (moving, working progress)
       if colonist.state.phase === 'done':
         EventBus.publish('colonist_idle', id)   # event
  3. EventBus.drain()                # обработка событий (JobDispatcher)
  4. inputHandler.update(dt)         # WASD pan
  5. collectSnapshot()               # snapshot для render
  6. emitUiState()                   # если прошло 0.5s
```

## Почему гибрид, а не чистый event

- **Голод и сон** — непрерывные процессы. Они не привязаны к действиям игрока или колонистов. Событие `food_eaten` меняет значение, но между приёмами пищи голод растёт на каждом тике.
- **Dispatch заданий** — дискретный. Нет смысла проверять каждые 2 секунды, есть ли idle колонист. Достаточно среагировать на `colonist_idle`.
- **Производительность**: tick-системы работают за O(n) (n колонистов). Event-driven исключает лишние проверки.

## Сравнение с чистым event-driven

| Аспект | Pure Event | Hybrid (RinWord) |
|--------|-----------|-------------------|
| Голод | По событию `time_passed(sleep(2s))` | Каждый tick: -= 0.5*dt |
| Dispatch заданий | По событию `idle` | По событию `idle` |
| Рост растений | По событию `time_passed(1h)` | Каждый tick: += rate*dt |
| Стройка | По событию `build_queued` | По событию `build_queued` |
| Сложность отладки | trace цепочек событий | Прямолинейно |

## Основание

Модель основана на архитектуре RimWorld:

> "Вся базовая симуляция мира работает на постоянном обновлении (tick-based), а случайные происшествия, квесты и реакция на действия игрока запускаются через события (event-driven)."
