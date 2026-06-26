# Core Layer Migration to Rust/WASM

**Date:** 2026-06-26  
**Status:** Implemented  
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
├── vite.config.ts               ← vite-plugin-wasm-hmr для wasm-pack
└── package.json
```

### Components

1. **Rust crate (`crates/core/`)**
   - Содержит ту же логику, что текущий `src/core/`
   - Экспортирует функции через `wasm-bindgen`
   - Компилируется в WASM via `wasm-pack build`

2. **WASM bridge (`src/core/wasm.ts`)**
   - Импортирует функции напрямую из `crates/core/pkg/core` (синхронно, без init)
   - Реэкспортирует функции для использования в React-компонентах
   - Предоставляет типобезопасный интерфейс

3. **Vite plugin (`vite.config.ts`)**
   - Использует `vite-plugin-wasm-hmr` — стандартный npm-пакет
   - При `vite dev`: запускает `wasm-pack build --target bundler --dev` при старте
   - Следит за изменениями `.rs` файлов и `Cargo.toml`
   - При изменении: пересобирает wasm-pack, затем Vite делает reload модуля
   - `vite-plugin-wasm` обеспечивает корректную обработку `.wasm` импортов

### Data flow

```
React Component
    → import { getGreeting } from './core/wasm'
        → wasm.ts импортирует из crates/core/pkg/core (синхронно)
            → vite-plugin-wasm обрабатывает импорт .wasm
                → WASM модуль выполняет нативную функцию
                    → возвращает строку в JS
```

### Vite plugin details (vite-plugin-wasm-hmr)

Используется стандартный пакет `vite-plugin-wasm-hmr` вместо кастомного плагина:

```ts
wasmHmr({
  crate: 'crates/core',          // путь к crate относительно корня Vite
  buildOnStart: true,            // сборка при старте dev-сервера
  // watch — автоматически, следит за src/**/*.rs и Cargo.toml
  // default: outDir = "pkg", debounceMs = 300
})
```

Плагин:
- На `configureServer` запускает `wasm-pack build --target bundler --dev`
- Через `fs.watch()` (Node.js) следит за `crates/core/src/**/*.rs` и `Cargo.toml`
- Debounce 300ms при изменениях
- При изменении: пересобирает WASM, копирует staging → pkg, инвалидирует модули Vite
- `vite-plugin-wasm` обеспечивает корректный импорт `.wasm` файлов

### Error handling

- Если `wasm-pack` не установлен — vite-plugin-wasm-hmr показывает ошибку на старте
- Если Rust код не компилится — wasm-pack выводит ошибку в консоль
- WASM модуль импортируется синхронно через bundler — ошибка компиляции проявится как ошибка импорта модуля

### Testing

- Rust-крейт тестируется нативно: `cargo test` внутри `crates/core/`
- WASM bridge (`wasm.ts`) тестируется как часть приложения
- При сборке: `wasm-pack build` не запускается, если `cargo check` не проходит

## Rollout (выполнено)

1. ✅ Создан Rust-крейт с get_greeting
2. ✅ Установлен `vite-plugin-wasm-hmr` + `vite-plugin-wasm` (вместо кастомного плагина)
3. ✅ Заменён `src/core/*` на bridge `src/core/wasm.ts`
4. ✅ `App.tsx` продолжает импорт из `./core/api` — изменений не требуется
5. ✅ Dev-сборка работает с автопересборкой при изменении .rs
6. ⬜ Production-сборка — проверить