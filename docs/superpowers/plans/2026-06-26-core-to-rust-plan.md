# Core to Rust/WASM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TypeScript core (`src/core/api.ts` + `src/core/index.ts`) with a Rust crate that compiles to WASM, with automatic rebuild on `.rs` changes during `vite dev`.

**Architecture:** A Rust crate `crates/core/` uses `wasm-bindgen` to export its functions. The `vite-plugin-wasm-hmr` plugin runs `wasm-pack build --target bundler` on dev-server start and watches for `.rs` file changes. On change, it rebuilds the WASM module and triggers a Vite full-reload. A thin bridge `src/core/wasm.ts` re-exports the functions from the WASM module to the existing codebase. `vite-plugin-wasm` handles `.wasm` imports in Vite's module graph.

**Tech Stack:** Rust, wasm-bindgen, wasm-pack, vite-plugin-wasm-hmr, vite-plugin-wasm

## Global Constraints

- Rust code goes in `crates/core/` — NOT inside `src/`
- `wasm-pack build --target bundler` (handled by vite-plugin-wasm-hmr) — dev and production
- Dev mode uses `--dev` profile for debug symbols and source maps
- Production build uses `--release`
- vite-plugin-wasm-hmr watches `crates/core/src/**/*.rs` and `Cargo.toml`, triggers reload on change
- Keep the same function interface: no consumer code should break

---

### Task 1: Create Rust crate with get_greeting

**Files:**
- Create: `crates/core/Cargo.toml`
- Create: `crates/core/src/lib.rs`

**Interfaces:**
- Produces: `get_greeting() -> String` exported via `wasm-bindgen`
- Consumes: nothing

- [x] **Step 1: Create crate directory and Cargo.toml**

```bash
mkdir -p crates/core/src
```

- [x] **Step 2: Write Cargo.toml**

```toml
[package]
name = "core"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

- [x] **Step 3: Write lib.rs**

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_greeting() -> String {
    "Hello, World!".to_string()
}
```

- [x] **Step 4: Verify it compiles with wasm-pack**

```bash
cd crates/core && wasm-pack build --target bundler --dev
```

Expected output: `[INFO]: 🎯  🎉  Wasm pack has produced the wasm file in 'pkg'.`
Check that `crates/core/pkg/core.js` and `crates/core/pkg/core_bg.wasm` exist.

- [x] **Step 5: Run native cargo check as well**

```bash
cd crates/core && cargo check
```

Expected output: `Checking core v0.1.0` — no errors.

- [x] **Step 6: Commit**

```bash
git add crates/core/
git commit -m "feat: create Rust core crate with get_greeting()"
```

---

### Task 2: Add vite-plugin-wasm-hmr for auto-build

**Files:**
- Modify: `vite.config.ts` — replace custom plugin with standard packages

**Interfaces:**
- Consumes: `crates/core/` directory
- Produces: automatic `wasm-pack build` on dev start and on `.rs` file changes

- [x] **Step 1: Install standard packages**

```bash
npm install -D vite-plugin-wasm-hmr vite-plugin-wasm
```

- [x] **Step 2: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { wasmHmr } from 'vite-plugin-wasm-hmr'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    wasmHmr({
      crate: 'crates/core',
      buildOnStart: true,
    }),
  ],
  server: {
    watch: {
      ignored: ['**/pkg/**'],
    },
  },
})
```

- [x] **Step 3: Remove custom plugin and dead deps**

```bash
rm vite-plugins/wasm-pack.ts
npm uninstall chokidar
rmdir vite-plugins 2>/dev/null || true
```

- [x] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [x] **Step 5: Commit**

```bash
git add vite.config.ts package.json package-lock.json
git rm vite-plugins/wasm-pack.ts
git commit -m "feat: replace custom wasm-pack plugin with vite-plugin-wasm-hmr"
```

---

### Task 3: Add WASM bridge module

**Files:**
- Create: `src/core/wasm.ts` — bridge layer
- Modify: `src/core/api.ts` — re-export from WASM bridge

**Interfaces:**
- Consumes: `crates/core/pkg/core.js` (output of wasm-pack --target bundler)
- Produces: `getGreeting(): string` (synchronous re-export from WASM)

> Note: With `--target bundler`, the wasm module is loaded synchronously by Vite (via vite-plugin-wasm). No `init()` call needed.

- [x] **Step 1: Write src/core/wasm.ts**

```typescript
import { get_greeting } from '../../crates/core/pkg/core'

export function getGreeting(): string {
  return get_greeting()
}
```

- [x] **Step 2: Rewrite src/core/api.ts to use the WASM bridge**

```typescript
import { getGreeting } from './wasm'

export class Api {
  getMessage(): string {
    return getGreeting()
  }
}
```

- [x] **Step 3: Remove old TypeScript core**

```bash
rm src/core/index.ts
```

- [x] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [x] **Step 5: Commit**

```bash
git add src/core/
git commit -m "feat: add WASM bridge module and update Api class"
```

---

### Task 4: Keep App.tsx unchanged

**Files:**
- No changes needed to `src/App.tsx` or `src/main.tsx`

**Rationale:** With `--target bundler`, the wasm module is loaded synchronously by the bundler via `vite-plugin-wasm`. No async initialization is required. `App.tsx` already imports `Api` from `./core/api` and calls `getMessage()`. `main.tsx` renders as-is.

- [x] **Step 1: Verify no changes needed**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

### Task 5: Verify dev cycle with auto-rebuild

**Files:**
- No file changes — just verification

- [x] **Step 1: Start dev server and verify WASM loads**

```bash
npx vite
```

Expected:
- `[vite] [wasm-hmr] Building...` followed by `[vite] [wasm-hmr] Build complete`
- App opens at http://localhost:5173 showing "Hello, World!"

- [x] **Step 2: Modify Rust source and verify auto-rebuild**

Edit `crates/core/src/lib.rs`, change greeting to "Hello from Rust!".

```bash
# In another terminal:
sed -i '' 's/"Hello, World!"/"Hello from Rust!"/' crates/core/src/lib.rs
```

Expected:
- Console shows `[vite] [wasm-hmr]` rebuild messages
- Browser reloads showing "Hello from Rust!"

- [x] **Step 3: Revert the change**

```bash
git checkout crates/core/src/lib.rs
```

Expected: Browser reloads and shows "Hello, World!" again.

- [x] **Step 4: Verify production build**

```bash
npm run build
```

Expected: Build succeeds.

- [x] **Step 5: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: finalize core-to-rust migration"
```
