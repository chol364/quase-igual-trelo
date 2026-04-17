import { defineConfig } from 'vitest/config'
import path from 'node:path'
import fs from 'node:fs'

const projectRoot = fs.realpathSync(__dirname)

export default defineConfig({
  root: projectRoot,
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
    },
  },
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
})
