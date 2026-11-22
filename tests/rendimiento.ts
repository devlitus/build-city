import { it } from 'vitest'

/**
 * Prueba de rendimiento: umbral absoluto de tiempo, sensible a la carga de la máquina.
 * No se ejecuta en `npm test` (se salta); sí con `npm run test:rendimiento`
 * (`vitest.rendimiento.config.ts` activa `RENDIMIENTO` y filtra por la etiqueta). La CI la ejecuta
 * como paso aparte. Los invariantes de corrección van en pruebas normales, nunca aquí.
 */
export const ETIQUETA_RENDIMIENTO = '[rendimiento]'

const activo = process.env.RENDIMIENTO === '1'

export const itRendimiento = (nombre: string, f: () => void, timeout?: number): void => {
  it.skipIf(!activo)(`${ETIQUETA_RENDIMIENTO} ${nombre}`, f, timeout)
}
