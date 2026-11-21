import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Generar un estado inicial tarda ~10 ms con el valle de 160×160, pero hay tests que crean
    // cientos y recorren el mapa entero: con la máquina cargada superan con facilidad los 20 s.
    testTimeout: 60_000,
  },
})
