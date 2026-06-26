# Core Layer Migration to Rust/WASM

**Date:** 2026-06-26  
**Status:** Draft  
**Project:** expedition-L

## Motivation

Перенести core-слой (`src/core/`) проекта с TypeScript на Rust с компиляцией в WASM,
чтобы получить преимущества строгой типизации Rust, производительности нативных
вычислений и возможности расширять core сложной логикой без потери скорости.

## Architecture

### Project structure

```
expedition-L/
├── crates/
│   └── core/                    ← Rust crate
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs           ← get_greeting() на Rust
├── src/
│   ├── core/
│   │   └── wasm.ts              ← импорт и инициализация WASM
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts               ← кастомный плагин для wasm-pack
└── package.json
```

### Components

1. **Rust crate (`crates/core/`)**
   - Содержит ту же логику, что текущий `src/core/`
   - Экспортирует функции через `wasm-bindgen`
   - Компилируется в WASM via `wasm-pack build`

2. **WASM bridge (`src/core/wasm.ts`)**
   - Инициализирует WASM модуль через `init()` из `crates/core/pkg/`
   - Реэкспортирует функции для использования в React-компонентах
   - Предоставляет типобезопасный интерфейс

3. **Vite plugin (`vite.config.ts`)**
   - При `vite dev`: запускает `wasm-pack build --target web --dev` при старте
   - Режим `dev` включает source maps и debug symbols для Rust
   - Следит за изменениями `.rs` файлов через `chokidar`
   - При изменении: перезапускает `wasm-pack build`, затем Vite делает full reload

### Data flow

```
React Component
    → import { getGreeting } from './core/wasm'
        → wasm.ts вызывает init() и реэкспортирует getGreeting
            → WASM модуль выполняет нативную функцию
                → возвращает строку в JS
```

### Vite plugin details (WasmPackPlugin)

```ts
// Псевдокод плагина
WasmPackPlugin({
  crateDir: 'crates/core',       // директория с Cargo.toml
  outDir: 'crates/core/pkg',     // куда wasm-pack кладёт результат
  watch: ['crates/core/src'],    // за какими файлами следить
  profile: 'dev',                // wasm-pack profile
})
```

Плагин:
- Применяется на `configResolved` — проверяет установлен ли `wasm-pack`
- На `configureServer` запускает `wasm-pack build --target web --dev`
- Через `chokidar.watch()` следит за `crates/core/src/**/*.rs`
- При изменении `.rs` файла: пересобирает WASM и отправляет Vite HMR full reload (`server.ws.send({ type: 'full-reload' })`)
- На `build` (production сборка): запускает `wasm-pack build --target web --release`

### Error handling

- Если `wasm-pack` не установлен — бросать понятную ошибку при старте dev-сервера
- Если Rust код не компилится — WASM перестаёт обновляться, ошибка выводится в консоль
- `wasm.ts` экспортирует функции с fallback: если WASM не инициализировался, бросать ошибку

### Testing

- Rust-крейт тестируется нативно: `cargo test` внутри `crates/core/`
- WASM bridge (`wasm.ts`) тестируется как часть приложения
- При сборке: `wasm-pack build` не запускается, если `cargo check` не проходит

## Rollout

1. Создать Rust-крейт с текущей функциональностью
2. Написать кастомный Vite-плагин
3. Заменить `src/core/*` на `src/core/wasm.ts`
4. Обновить импорты в `App.tsx`
5. Проверить dev-сборку с автопересборкой
6. Проверить production-сборку