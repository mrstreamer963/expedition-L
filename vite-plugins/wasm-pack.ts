import { execSync } from 'node:child_process'
import { resolve, relative } from 'node:path'
import { watch } from 'chokidar'
import type { Plugin, ViteDevServer } from 'vite'

interface WasmPackPluginOptions {
  crateDir: string
  watchDir?: string
  profile?: 'dev' | 'release'
}

export function wasmPackPlugin(options: WasmPackPluginOptions): Plugin {
  const { crateDir, watchDir, profile = 'dev' } = options

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

    async configResolved() {
      // Verify wasm-pack is available
      try {
        execSync('wasm-pack --version', { stdio: 'pipe' })
      } catch {
        throw new Error(
          'wasm-pack is not installed. Install it with: cargo install wasm-pack',
        )
      }
    },

    async configureServer(_server) {
      server = _server

      // Initial build
      console.log('[wasm-pack] Building crate...')
      try {
        runWasmPack(profile)
        console.log('[wasm-pack] Build complete')
      } catch (err) {
        console.error('[wasm-pack] Build failed:', err)
        return
      }

      // Watch for .rs file changes
      const watcher = watch(`${absoluteWatchDir}/**/*.rs`, {
        ignoreInitial: true,
      })

      watcher.on('change', (filePath) => {
        const relPath = relative(absoluteWatchDir, filePath)
        console.log(`[wasm-pack] ${relPath} changed, rebuilding...`)

        if (rebuilding) {
          rebuildQueued = true
          return
        }

        rebuilding = true

        try {
          runWasmPack(profile)
          console.log('[wasm-pack] Rebuild complete')
          triggerFullReload()
        } catch (err) {
          console.error('[wasm-pack] Rebuild failed:', err)
        }

        rebuilding = false

        if (rebuildQueued) {
          rebuildQueued = false
          // Trigger a second rebuild if one was queued during the first
          try {
            runWasmPack(profile)
            console.log('[wasm-pack] Rebuild complete')
            triggerFullReload()
          } catch (err) {
            console.error('[wasm-pack] Rebuild failed:', err)
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