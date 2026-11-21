import { defineConfig } from 'vitest/config'

// Solo las pruebas etiquetadas con `itRendimiento`. Un archivo a la vez para que no se midan
// entre sí. Ejecutar con la máquina en reposo (`npm run test:rendimiento`).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    env: { RENDIMIENTO: '1' },
    testNamePattern: '\\[rendimiento\\]', // = ETIQUETA_RENDIMIENTO de tests/rendimiento.ts
    fileParallelism: false,
  },
})
