# Core to Rust/WASM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TypeScript core (`src/core/api.ts` + `src/core/index.ts`) with a Rust crate that compiles to WASM, with automatic rebuild on `.rs` changes during `vite dev`.

**Architecture:** A Rust crate `crates/core/` uses `wasm-bindgen` to export its functions. A custom Vite plugin runs `wasm-pack build` on dev-server start and watches for `.rs` file changes. On change, it rebuilds the WASM module and triggers a Vite full-reload. A thin bridge `src/core/wasm.ts` initializes the WASM module and re-exports the functions to the existing codebase.

**Tech Stack:** Rust, wasm-bindgen, wasm-pack, Vite custom plugin, chokidar

## Global Constraints

- Rust code goes in `crates/core/` — NOT inside `src/`
- `wasm-pack build --target web` for both dev and production
- Dev mode uses `--dev` profile for debug symbols and source maps
- Production build uses `--release`
- The Vite plugin MUST watch `crates/core/src/**/*.rs` and trigger full reload on change
- Keep the same function interface: no consumer code should break

---

### Task 1: Create Rust crate with get_greeting

**Files:**
- Create: `crates/core/Cargo.toml`
- Create: `crates/core/src/lib.rs`

**Interfaces:**
- Produces: `get_greeting() -> String` exported via `wasm-bindgen`
- Consumes: nothing

- [ ] **Step 1: Create crate directory and Cargo.toml**

```bash
mkdir -p crates/core/src
```

- [ ] **Step 2: Write Cargo.toml**

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

- [ ] **Step 3: Write lib.rs**

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_greeting() -> String {
    "Hello, World!".to_string()
}
```

- [ ] **Step 4: Verify it compiles with wasm-pack**

```bash
cd crates/core && wasm-pack build --target web --dev
```

Expected output: `[INFO]: 🎯  🎉  Wasm pack has produced the wasm file in 'pkg'.`
Check that `crates/core/pkg/core.js` and `crates/core/pkg/core_bg.wasm` exist.

- [ ] **Step 5: Run native cargo check as well**

```bash
cd crates/core && cargo check
```

Expected output: `Checking core v0.1.0` — no errors.

- [ ] **Step 6: Commit**

```bash
git add crates/core/
git commit -m "feat: create Rust core crate with get_greeting()"
```

---

### Task 2: Write WasmPack Vite plugin

**Files:**
- Create: `vite-plugins/wasm-pack.ts`
- Modify: `vite.config.ts` — add the plugin

**Interfaces:**
- Consumes: `crates/core/Cargo.toml` and `crates/core/src/` directory
- Produces: a Vite plugin that calls `wasm-pack build` and watches `.rs` files

- [ ] **Step 1: Create vite-plugins directory**

```bash
mkdir -p vite-plugins
```

- [ ] **Step 2: Write vite-plugins/wasm-pack.ts**

```typescript
import { execSync, exec } from 'node:child_process'
import { resolve, relative } from 'node:path'
import { watch } from 'chokidar'
import type { Plugin, ViteDevServer } from 'vite'

interface WasmPackPluginOptions {
  crateDir: string
  watchDir?: string
  profile?: 'dev' | 'release'
}

export function wasmPackPlugin(options: WasmPackPluginOptions): Plugin {
  const {
    crateDir,
    watchDir,
    profile = 'dev',
  } = options

  const absoluteCrateDir = resolve(crateDir)
  const absoluteWatchDir = resolve(watchDir ?? resolve(crateDir, 'src'))

  let server: ViteDevServer | undefined
  let rebuilding = false
  let rebuildQueued = false

  function runWasmPack(profile: 'dev' | 'release'): void {
    const profileFlag = profile === 'release' ? '--release' : '--dev'
    const command = `wasm-pack build ${profileFlag} --target web`
    execSync(command, {
      cwd: absoluteCrateDir,
      stdio: 'inherit',
    })
  }

  function triggerFullReload(): void {
    if (!server) return
    server.ws.send({ type: 'full-reload' })
  }

  return {
    name: 'wasm-pack',

    async configResolved(config) {
      // Verify wasm-pack is available
      try {
        execSync('wasm-pack --version', { stdio: 'pipe' })
      } catch {
        throw new Error(
          'wasm-pack is not installed. Install it with: cargo install wasm-pack'
        )
      }
    },

    async configureServer(_server) {
      server = _server

      // Initial build
      console.log('[wasm-pack] Building crate...')
      try {
        runWasmPack(profile)
        console.log('[wasm-pack] ✅ Build complete')
      } catch (err) {
        console.error('[wasm-pack] ❌ Build failed:', err)
        return
      }

      // Watch for .rs file changes
      const watcher = watch(`${absoluteWatchDir}/**/*.rs`, {
        ignoreInitial: true,
      })

      watcher.on('change', (filePath) => {
        const relPath = relative(absoluteWatchDir, filePath)
        console.log(`[wasm-pack] 📝 ${relPath} changed, rebuilding...`)

        if (rebuilding) {
          rebuildQueued = true
          return
        }

        rebuilding = true

        try {
          runWasmPack(profile)
          console.log('[wasm-pack] ✅ Rebuild complete')
          triggerFullReload()
        } catch (err) {
          console.error('[wasm-pack] ❌ Rebuild failed:', err)
        }

        rebuilding = false

        if (rebuildQueued) {
          rebuildQueued = false
          // Trigger a second rebuild if one was queued during the first
          try {
            runWasmPack(profile)
            console.log('[wasm-pack] ✅ Rebuild complete')
            triggerFullReload()
          } catch (err) {
            console.error('[wasm-pack] ❌ Rebuild failed:', err)
          }
        }
      })

      // Cleanup on server close
      _server.httpServer?.on('close', () => {
        watcher.close()
      })
    },

    async closeBundle() {
      // For production builds, do a release build
      if (profile === 'release') {
        console.log('[wasm-pack] Building for production...')
        runWasmPack('release')
      }
    },
  }
}
```

- [ ] **Step 3: Install chokidar dependency**

```bash
npm install -D chokidar
```

- [ ] **Step 4: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { wasmPackPlugin } from './vite-plugins/wasm-pack'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasmPackPlugin({
      crateDir: 'crates/core',
      profile: 'dev',
    }),
  ],
  server: {
    watch: {
      // Ignore the pkg directory to avoid loops
      ignored: ['**/pkg/**'],
    },
  },
})
```

- [ ] **Step 5: Verify the plugin loads without errors**

```bash
npx vite --version
```

And check types:
```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add vite-plugins/wasm-pack.ts vite.config.ts package.json package-lock.json
git commit -m "feat: add WasmPack Vite plugin with auto-rebuild"
```

---

### Task 3: Add WASM bridge module

**Files:**
- Modify: `src/core/api.ts` — rewrite to init and re-export WASM
- Create: `src/core/wasm.ts` — bridge layer

**Interfaces:**
- Consumes: `crates/core/pkg/core.js` (output of wasm-pack)
- Produces: `initCore(): Promise<void>` and `getGreeting(): string` (re-exported from WASM)

- [ ] **Step 1: Write src/core/wasm.ts**

```typescript
import init, { get_greeting } from '../../crates/core/pkg/core'

let initialized = false

export async function initCore(): Promise<void> {
  if (initialized) return
  await init()
  initialized = true
}

export function getGreeting(): string {
  if (!initialized) {
    throw new Error('Core WASM module not initialized. Call initCore() first.')
  }
  return get_greeting()
}
```

- [ ] **Step 2: Rewrite src/core/api.ts to use the WASM bridge**

```typescript
import { getGreeting, initCore } from './wasm'

export { initCore }

export class Api {
  getMessage(): string {
    return getGreeting()
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (may have warnings about `.wasm` import — that's normal and Vite handles it).

- [ ] **Step 4: Commit**

```bash
git add src/core/
git commit -m "feat: add WASM bridge module and update Api class"
```

---

### Task 4: Update App.tsx to init WASM on startup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Update main.tsx to initialize WASM before rendering**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initCore } from './core/api.ts'
import App from './App.tsx'

async function main() {
  await initCore()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

main()
```

- [ ] **Step 2: Keep App.tsx unchanged — it still imports Api and calls getMessage()**

Current `App.tsx` already imports `Api` from `./core/api`, which still exports it. No changes needed to `App.tsx`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "fix: initialize WASM core before React render"
```

---

### Task 5: Verify dev cycle with auto-rebuild

**Files:**
- No file changes — just verification

- [ ] **Step 1: Start dev server and verify WASM loads**

```bash
npx vite
```

Expected:
- `[wasm-pack] Building crate...` followed by `[wasm-pack] ✅ Build complete`
- App opens at http://localhost:5173 showing "Hello, World!"

- [ ] **Step 2: Modify Rust source and verify auto-rebuild**

Edit `crates/core/src/lib.rs`, change greeting to "Hello from Rust!".

```bash
# In another terminal:
sed -i '' 's/"Hello, World!"/"Hello from Rust!"/' crates/core/src/lib.rs
```

Expected:
- Console shows `[wasm-pack] 📝 lib.rs changed, rebuilding...`
- Followed by `[wasm-pack] ✅ Rebuild complete`
- Browser auto-reloads showing "Hello from Rust!"

- [ ] **Step 3: Revert the change**

```bash
git checkout crates/core/src/lib.rs
```

Expected: Browser reloads and shows "Hello, World!" again.

- [ ] **Step 4: Verify production build**

```bash
npm run build
```

Expected: Build succeeds with wasm-pack release build.

- [ ] **Step 5: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: finalize core-to-rust migration"
```