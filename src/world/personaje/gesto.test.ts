import { describe, expect, it } from 'vitest'
import { inclinacionGolpe } from './gesto'

describe('inclinacionGolpe', () => {
  const f = (t: number) => inclinacionGolpe(t, 0.4, 0.4, 0.35)

  it('vale 0 antes, al acabar y después del gesto', () => {
    expect(f(-0.1)).toBe(0)
    expect(f(0)).toBe(0)
    expect(f(0.4)).toBe(0)
    expect(f(1)).toBe(0)
  })

  it('primero se echa atrás y luego se inclina hacia delante hasta la inclinación máxima', () => {
    expect(f(0.07)).toBeLessThan(0)
    const maximo = Math.max(...Array.from({ length: 41 }, (_, i) => f(i * 0.01)))
    expect(maximo).toBeCloseTo(0.4, 1)
    expect(maximo).toBeLessThanOrEqual(0.4)
  })

  it('es continua en el paso de la preparación al golpe', () => {
    expect(Math.abs(f(0.4 * 0.35 - 1e-6) - f(0.4 * 0.35 + 1e-6))).toBeLessThan(1e-3)
  })
})
