import { describe, expect, it } from 'vitest'
import { alturaAsiento, puntosMuestreo, zocalo } from './aplanar'
import { PARAMETROS_TERRENO } from './parametros'

const valle = { parcelasPorLado: 4, casillasPorParcela: 8 } // lado 32, mitad 16
const margen = PARAMETROS_TERRENO.zocalo.margen

describe('alturaAsiento', () => {
  it('la altura de asiento es la media de la huella', () => {
    // Rampa en x: h = xm. Huella x 4..5: esquinas en -12, -11, -10 y centros -11.5, -10.5.
    const h = alturaAsiento({ x0: 4, y0: 3, x1: 5, y1: 3 }, valle, (x) => x)
    expect(h).toBeCloseTo(-11, 10)
  })
  it('terreno plano: asiento = altura del terreno', () => {
    expect(alturaAsiento({ x0: 0, y0: 0, x1: 3, y1: 3 }, valle, () => 2.5)).toBeCloseTo(2.5, 10)
  })
  it('huella de 1 casilla: 4 esquinas y 1 centro', () => {
    expect(puntosMuestreo({ x0: 5, y0: 5, x1: 5, y1: 5 }, valle)).toHaveLength(5)
  })
  it('+z es el sur: la casilla y=0 queda al norte (z negativa)', () => {
    const h = alturaAsiento({ x0: 0, y0: 0, x1: 0, y1: 0 }, valle, (_x, z) => z)
    expect(h).toBeCloseTo(-15.5, 10)
  })
})

describe('zocalo', () => {
  it('terreno plano: zócalo mínimo igual al margen', () => {
    const z = zocalo({ x0: 2, y0: 2, x1: 4, y1: 4 }, valle, () => 1)
    expect(z.cotaSuperior).toBeCloseTo(1, 10)
    expect(z.alto).toBeCloseTo(margen, 10)
  })
  it('el zócalo cubre la diferencia máxima', () => {
    const alt = (x: number, z: number): number => 0.3 * x + 0.1 * z
    const huella = { x0: 6, y0: 6, x1: 9, y1: 8 }
    const z = zocalo(huella, valle, alt)
    const hs = puntosMuestreo(huella, valle).map((p) => alt(p.x, p.z))
    expect(z.cotaInferior).toBeCloseTo(Math.min(...hs) - margen, 10)
    expect(z.alto).toBeCloseTo(z.cotaSuperior - z.cotaInferior, 10)
    // El alto cubre desde el asiento hasta el punto más bajo.
    expect(z.alto).toBeGreaterThanOrEqual(z.cotaSuperior - Math.min(...hs))
  })
  it('huella de 1 casilla en pendiente fuerte', () => {
    // h = 2*xm; esquinas en xm -11 y -10 (-22 y -20), centro -10,5 (-21): media -21.
    const z = zocalo({ x0: 5, y0: 5, x1: 5, y1: 5 }, valle, (x) => 2 * x)
    expect(z.cotaSuperior).toBeCloseTo(-21, 10)
    expect(z.cotaInferior).toBeCloseTo(-22 - margen, 10)
    expect(z.alto).toBeCloseTo(1 + margen, 10)
  })
})
