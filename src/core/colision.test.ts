import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { circuloSolapaBloqueo, moverCirculo } from './colision'
import type { MapaTransitabilidad } from './mapa'

const R = 0.3

/** Mapa de prueba a partir de filas de texto: `#` bloqueada, `.` libre. */
function mapaDe(filas: readonly string[]): MapaTransitabilidad {
  const lado = filas.length
  const bloqueada = new Uint8Array(lado * lado)
  filas.forEach((f, y) => {
    for (let x = 0; x < lado; x++) bloqueada[y * lado + x] = f[x] === '#' ? 1 : 0
  })
  return { lado, bloqueada }
}

const vacio = (lado: number): string[] => Array.from({ length: lado }, () => '.'.repeat(lado))

describe('colisión círculo-cajas', () => {
  it('no entra en un obstáculo', () => {
    const filas = vacio(10)
    filas[3] = '....#.....'
    const m = mapaDe(filas)
    // Obstáculo en la casilla (4, 3); se camina hacia él desde el oeste.
    const r = moverCirculo(m, 2.5, 3.5, 3, 0, R)
    expect(r.x).toBeLessThanOrEqual(4 - R + 1e-9)
    expect(circuloSolapaBloqueo(m, r.x, r.y, R)).toBe(false)
  })

  it('se desliza en diagonal a lo largo de la pared', () => {
    // Pared vertical en la columna 5; se avanza al este y al sur a la vez.
    const m = mapaDe(vacio(10).map(() => '.....#....'))
    const r = moverCirculo(m, 4.6, 2, 1, 1, R)
    expect(r.x).toBeLessThanOrEqual(5 - R + 1e-9)
    // No pierde la componente tangencial: baja casi lo mismo que habría bajado sin pared.
    expect(r.y).toBeGreaterThan(2 + 0.9)
  })

  it('no sale del valle', () => {
    const m = mapaDe(vacio(10))
    const destinos: ReadonlyArray<readonly [number, number]> = [
      [-50, 0],
      [50, 0],
      [0, -50],
      [0, 50],
      [-30, -30],
      [30, 30],
    ]
    for (const [dx, dy] of destinos) {
      const r = moverCirculo(m, 5, 5, dx, dy, R)
      expect(r.x).toBeGreaterThanOrEqual(R - 1e-9)
      expect(r.x).toBeLessThanOrEqual(10 - R + 1e-9)
      expect(r.y).toBeGreaterThanOrEqual(R - 1e-9)
      expect(r.y).toBeLessThanOrEqual(10 - R + 1e-9)
    }
  })

  it('solo cruza el río por un vado', () => {
    // Río en la fila 5 con un vado en la columna 7.
    const filas = vacio(10)
    filas[5] = '#######.##'
    const m = mapaDe(filas)
    const sinVado = moverCirculo(m, 2.5, 3.5, 0, 4, R)
    expect(sinVado.y).toBeLessThanOrEqual(5 - R + 1e-9)
    const conVado = moverCirculo(m, 7.5, 3.5, 0, 4, R)
    expect(conVado.y).toBeCloseTo(7.5, 6)
  })

  it('un paso enorme no atraviesa obstáculos finos', () => {
    const filas = vacio(20)
    filas[10] = '#'.repeat(20)
    const m = mapaDe(filas)
    const recto = moverCirculo(m, 10.5, 2.5, 0, 15, R)
    expect(recto.y).toBeLessThanOrEqual(10 - R + 1e-9)
    const diagonal = moverCirculo(m, 2.5, 2.5, 12, 12, R)
    expect(diagonal.y).toBeLessThanOrEqual(10 - R + 1e-9)
  })

  it('propiedad: nunca acaba solapando una caja bloqueada', () => {
    const filas = Array.from({ length: 12 }, (_, y) =>
      Array.from({ length: 12 }, (_, x) => ((x * 7 + y * 13) % 5 === 0 ? '#' : '.')).join(''),
    )
    const m = mapaDe(filas)
    const libres: Array<readonly [number, number]> = []
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) if (filas[y]?.[x] === '.') libres.push([x, y])
    }
    const delta = fc.double({ min: -20, max: 20, noNaN: true })
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: libres.length - 1 }),
        fc.array(fc.tuple(delta, delta), { minLength: 1, maxLength: 12 }),
        (i, pasos) => {
          const [cx, cy] = libres[i] ?? [0, 0]
          let x = cx + 0.5
          let y = cy + 0.5
          for (const [dx, dy] of pasos) {
            const r = moverCirculo(m, x, y, dx, dy, R)
            x = r.x
            y = r.y
            expect(circuloSolapaBloqueo(m, x, y, R)).toBe(false)
          }
        },
      ),
      { numRuns: 200 },
    )
  })
})
