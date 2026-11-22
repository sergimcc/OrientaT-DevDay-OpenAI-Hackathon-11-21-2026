import { defineConfig } from 'vitest/config'

// Only this extension's tests: web/ is a separate app with its own tooling.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } })
