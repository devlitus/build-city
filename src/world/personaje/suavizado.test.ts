import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cargarAlturaPersonaje, PARAMETROS_ALTURA, type ParametrosAltura } from './altura-datos'
import { crearSeguidorAltura, suavizarAltura } from './altura'

const P: ParametrosAltura = { rapidezSubida: 10, rapidezBajada: 10, saltoMaximo: 5, tolerancia: 0 }
const metros = fc.double({ min: -50, max: 50, noNaN: true })

describe('suavizado de la altura del personaje', () => {
  it('los datos cumplen el esquema', () => {
    expect(() => cargarAlturaPersonaje(PARAMETROS_ALTURA)).not.toThrow()
    expect(() => cargarAlturaPersonaje({ ...PARAMETROS_ALTURA, rapidezSubida: 0 })).toThrow(
      /inválida/,
    )
  })

  it('el suavizado converge a la altura objetivo', () => {
    let y = 0
    for (let i = 0; i < 300; i++) y = suavizarAltura(y, 1, 1 / 60, PARAMETROS_ALTURA)
    expect(y).toBeCloseTo(1, 6)
    let b = 1
    for (let i = 0; i < 600; i++) b = suavizarAltura(b, 0.5, 1 / 60, PARAMETROS_ALTURA)
    expect(b).toBeCloseTo(0.5, 6)
  })

  it('no se pasa de largo', () => {
    fc.assert(
      fc.property(metros, metros, fc.double({ min: 0.0001, max: 100, noNaN: true }), (a, o, dt) => {
        const r = suavizarAltura(a, o, dt, PARAMETROS_ALTURA)
        expect(r).toBeGreaterThanOrEqual(Math.min(a, o) - 1e-9)
        expect(r).toBeLessThanOrEqual(Math.max(a, o) + 1e-9)
      }),
    )
  })

  it('con dt no válido o ≤ 0 devuelve la altura actual', () => {
    for (const dt of [0, -1, NaN, Infinity, -Infinity])
      expect(suavizarAltura(1, 1.4, dt, PARAMETROS_ALTURA)).toBe(1)
  })

  it('una diferencia mayor que el salto máximo se ajusta de golpe', () => {
    expect(suavizarAltura(0, 20, 0.001, P)).toBe(20)
    expect(suavizarAltura(20, 0, 0.001, P)).toBe(0)
    expect(suavizarAltura(0, 4, 0.001, P)).toBeLessThan(4)
  })

  it('es independiente del fotograma: dos pasos de dt/2 equivalen a uno de dt', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -2, max: 2, noNaN: true }),
        fc.double({ min: -2, max: 2, noNaN: true }),
        fc.double({ min: 0.001, max: 0.5, noNaN: true }),
        (a, o, dt) => {
          const uno = suavizarAltura(a, o, dt, P)
          const dos = suavizarAltura(suavizarAltura(a, o, dt / 2, P), o, dt / 2, P)
          expect(dos).toBeCloseTo(uno, 9)
        },
      ),
    )
  })

  it('sube más rápido de lo que baja', () => {
    const p = { ...P, rapidezSubida: 20, rapidezBajada: 5 }
    const sube = suavizarAltura(0, 1, 0.05, p)
    const baja = 1 - suavizarAltura(1, 0, 0.05, p)
    expect(sube).toBeGreaterThan(baja)
  })

  it('el seguidor empieza exacto y sigue una rampa sin hundirse más que la tolerancia', () => {
    const rampa = (x: number) => 0.4 * x // pendiente de ~22°
    const seguidor = crearSeguidorAltura((x) => rampa(x), PARAMETROS_ALTURA)
    expect(seguidor.actualizar(10, 0, 1 / 60)).toBe(rampa(10))
    let x = 10
    for (let i = 0; i < 600; i++) {
      x += 5 / 60 // corriendo, 5 m/s
      const y = seguidor.actualizar(x, 0, 1 / 60)
      expect(y).toBeGreaterThanOrEqual(rampa(x) - PARAMETROS_ALTURA.tolerancia - 1e-9)
    }
  })
})
