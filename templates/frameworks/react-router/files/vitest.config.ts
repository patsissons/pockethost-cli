import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Deliberately standalone: the react-router vite plugin does not run under
// vitest, so tests use plain @vitejs/plugin-react with a matching ~ alias.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '~': path.resolve(import.meta.dirname, 'app') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx}'],
  },
})
