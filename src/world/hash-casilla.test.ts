import { describe, expect, it } from 'vitest'
import { azarCasilla, hashEntero } from './hash-casilla'

describe('hash de casilla', () => {
  it('es determinista', () => {
    expect(hashEntero(123, 4)).toBe(hashEntero(123, 4))
    expect(azarCasilla(77, 2)).toBe(azarCasilla(77, 2))
  })
  it('queda en [0, 1) y varía según casilla y sal', () => {
    const valores = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const a = azarCasilla(i, 1)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(1)
      valores.add(a)
    }
    expect(valores.size).toBeGreaterThan(490)
    expect(azarCasilla(5, 1)).not.toBe(azarCasilla(5, 2))
  })
  it('reparte aproximadamente de forma uniforme', () => {
    let suma = 0
    for (let i = 0; i < 2000; i++) suma += azarCasilla(i)
    expect(suma / 2000).toBeGreaterThan(0.45)
    expect(suma / 2000).toBeLessThan(0.55)
  })
})
