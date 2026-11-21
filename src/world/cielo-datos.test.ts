import { describe, expect, it } from 'vitest'
import { cargarCielo, DATOS_CIELO, direccionDelSol } from './cielo-datos'

describe('cielo', () => {
  it('los datos cumplen el esquema', () => {
    expect(() => cargarCielo(DATOS_CIELO)).not.toThrow()
    expect(() => cargarCielo({ ...DATOS_CIELO, exposicion: 0 })).toThrow(/Cielo inválido/)
  })

  it('la dirección del sol es unitaria y respeta elevación y azimut', () => {
    const d = direccionDelSol(DATOS_CIELO.sol.elevacion, DATOS_CIELO.sol.azimut)
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 10)
    expect(d.y).toBeCloseTo(Math.sin((DATOS_CIELO.sol.elevacion * Math.PI) / 180), 10)
    const este = direccionDelSol(0.0001 + 0, 90)
    expect(este.x).toBeGreaterThan(0.99)
    const norte = direccionDelSol(30, 0)
    expect(norte.z).toBeLessThan(0)
  })
})
