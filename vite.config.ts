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
