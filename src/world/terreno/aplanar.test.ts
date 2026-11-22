import { describe, expect, it } from 'vitest'
import { alturaAsiento, puntosCentros, puntosEsquinas, zocalo } from './aplanar'
import { cargarTerreno, PARAMETROS_TERRENO } from './parametros'

const valle = { parcelasPorLado: 4, casillasPorParcela: 8 } // lado 32, mitad 16
const margen = PARAMETROS_TERRENO.zocalo.margen

describe('alturaAsiento', () => {
  it('la altura de asiento es la media de la huella', () => {
    // Rampa h = xm. Huella x 4..5: centros en -11,5 y -10,5; media -11.
    expect(alturaAsiento({ x0: 4, y0: 3, x1: 5, y1: 3 }, valle, (x) => x)).toBeCloseTo(-11, 10)
  })
  it('terreno plano: asiento = altura del terreno', () => {
    expect(alturaAsiento({ x0: 0, y0: 0, x1: 3, y1: 3 }, valle, () => 2.5)).toBeCloseTo(2.5, 10)
  })
  it('huella de 1 casilla: su centro (x=5 -> xm -10,5)', () => {
    const huella = { x0: 5, y0: 5, x1: 5, y1: 5 }
    expect(puntosCentros(huella, valle)).toHaveLength(1)
    expect(puntosEsquinas(huella, valle)).toHaveLength(4)
    expect(alturaAsiento(huella, valle, (x) => x)).toBeCloseTo(-10.5, 10)
  })
  it('+z es el sur: la casilla y=0 queda al norte (z negativa)', () => {
    const h = alturaAsiento({ x0: 0, y0: 0, x1: 0, y1: 0 }, valle, (_x, z) => z)
    expect(h).toBeCloseTo(-15.5, 10)
  })
  it('un cauce pegado a la huella no hunde el asiento', () => {
    // Tierra a 1 m y cauce de -0,8 m desde xm = -10, justo en el borde este de la huella x 5..5
    // (centro -10,5; esquinas orientales en -10).
    const orilla = (x: number): number => (x >= -10 ? -0.8 : 1)
    const huella = { x0: 5, y0: 5, x1: 5, y1: 5 }
    expect(alturaAsiento(huella, valle, orilla)).toBeCloseTo(1, 10)
    const z = zocalo(huella, valle, orilla)
    expect(z.cotaSuperior).toBeCloseTo(1, 10)
    expect(z.cotaInferior).toBeCloseTo(-0.8 - margen, 10)
  })
})

describe('zocalo', () => {
  it('terreno plano: zócalo mínimo igual al margen', () => {
    const z = zocalo({ x0: 2, y0: 2, x1: 4, y1: 4 }, valle, () => 1)
    expect(z.cotaSuperior).toBeCloseTo(1, 10)
    expect(z.alto).toBeCloseTo(margen, 10)
  })
  it('el zócalo cubre la diferencia máxima', () => {
    // h = xm; huella x 6..9: centros -9,5..-6,5 (media -8), esquina mínima xm -10.
    const z = zocalo({ x0: 6, y0: 6, x1: 9, y1: 8 }, valle, (x) => x)
    expect(z.cotaSuperior).toBeCloseTo(-8, 10)
    expect(z.cotaInferior).toBeCloseTo(-10 - margen, 10)
    expect(z.alto).toBeCloseTo(2 + margen, 10)
  })
  it('huella de 1 casilla en pendiente fuerte', () => {
    // h = 2*xm; centro -10,5 -> -21; esquina mínima xm -11 -> -22.
    const z = zocalo({ x0: 5, y0: 5, x1: 5, y1: 5 }, valle, (x) => 2 * x)
    expect(z.cotaSuperior).toBeCloseTo(-21, 10)
    expect(z.cotaInferior).toBeCloseTo(-22 - margen, 10)
    expect(z.alto).toBeCloseTo(1 + margen, 10)
  })
})

describe('datos del zócalo', () => {
  it('rechaza un color que no está en la paleta', () => {
    const malo = {
      ...PARAMETROS_TERRENO,
      zocalo: { ...PARAMETROS_TERRENO.zocalo, colorPaleta: 'noExiste' },
    }
    expect(() => cargarTerreno(malo)).toThrow(/paleta/)
  })
})
