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
