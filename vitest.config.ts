import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Algunos tests generan varios valles (hasta ~5 s cada uno con el valle de 160×160, M1-T01):
    // con la máquina cargada superan con facilidad los 20 s.
    testTimeout: 60_000,
  },
})
