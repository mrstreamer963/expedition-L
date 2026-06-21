/// <reference types="vitest/config" />
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function buildTimestampPlugin(): Plugin {
  return {
    name: 'build-timestamp',
    transformIndexHtml(html) {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}`
      return html.replace('<title>RimWorld MVP</title>', `<title>RimWorld MVP ${ts}</title>`)
    },
  }
}

export default defineConfig({
  plugins: [react(), buildTimestampPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
