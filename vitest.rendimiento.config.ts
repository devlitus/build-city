import { defineConfig } from 'vitest/config'
import { ETIQUETA_RENDIMIENTO } from './tests/rendimiento'

// Solo las pruebas etiquetadas con `itRendimiento`. Un archivo a la vez para que no se midan
// entre sí. Ejecutar con la máquina en reposo (`npm run test:rendimiento`).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    env: { RENDIMIENTO: '1' },
    testNamePattern: ETIQUETA_RENDIMIENTO.replace(/[[\]]/g, '\\$&'),
    fileParallelism: false,
  },
})
