import { describe, expect, it } from 'vitest'
import { crearEstadoInicial, type Valle } from '../../core'
import { crearAltura } from './altura'
import { casillaAMetros, ladoMetros, metrosACasilla } from './coordenadas'
import { alturasDeTrozo } from './muestreo'
import {
  anilloDeTrozos,
  casillaDeTrozo,
  esquinaDeTrozo,
  rangoDeTrozo,
  todosLosTrozos,
  trozoDeCasilla,
  trozoDeMetros,
  trozosVisibles,
} from './trozos'

const valle = { parcelasPorLado: 4, casillasPorParcela: 10 }

describe('trozos', () => {
  it('metros → casilla → metros es coherente', () => {
    for (const [x, y] of [
      [0, 0],
      [13, 7],
      [39, 39],
      [-3, 45],
    ] as const) {
      const m = casillaAMetros(x, y, valle)
      expect(metrosACasilla(m.x, m.z, valle)).toEqual({ x, y })
      const t = trozoDeMetros(m.x, m.z, valle)
      expect(t).toEqual(trozoDeCasilla(x, y, valle))
      // La casilla cae dentro del rectángulo de su trozo.
      const r = rangoDeTrozo(t, valle)
      expect(m.x).toBeGreaterThanOrEqual(r.xMin)
      expect(m.x).toBeLessThan(r.xMax)
      expect(m.z).toBeGreaterThanOrEqual(r.zMin)
      expect(m.z).toBeLessThan(r.zMax)
      const esquina = casillaDeTrozo(t, valle)
      const e = esquinaDeTrozo(t, valle)
      expect(casillaAMetros(esquina.x, esquina.y, valle)).toEqual({ x: e.x + 0.5, z: e.z + 0.5 })
    }
  })

  it('un punto del borde pertenece a un solo trozo', () => {
    const mitad = ladoMetros(valle) / 2
    // Borde entre los trozos 1 y 2 en x.
    const bx = -mitad + 2 * valle.casillasPorParcela
    const t = trozoDeMetros(bx, 3, valle)
    expect(t.cx).toBe(2)
    const dentro = (cx: number): boolean => {
      const r = rangoDeTrozo({ cx, cz: t.cz }, valle)
      return bx >= r.xMin && bx < r.xMax
    }
    expect([0, 1, 2, 3].filter(dentro)).toEqual([2])
  })

  it('trozosVisibles devuelve solo los del rango pedido', () => {
    const mitad = ladoMetros(valle) / 2
    // Rango dentro de un solo trozo (el 1, 1).
    const uno = trozosVisibles(
      { xMin: -mitad + 11, xMax: -mitad + 15, zMin: -mitad + 12, zMax: -mitad + 18 },
      valle,
      2,
    )
    expect(uno).toEqual([{ cx: 1, cz: 1 }])
    // Rango que cruza el borde: 2 x 2.
    const cuatro = trozosVisibles(
      { xMin: -mitad + 8, xMax: -mitad + 12, zMin: -mitad + 8, zMax: -mitad + 12 },
      valle,
      2,
    )
    expect(cuatro).toHaveLength(4)
    // Rango enorme: se recorta al valle más el anillo.
    const todos = trozosVisibles({ xMin: -1e6, xMax: 1e6, zMin: -1e6, zMax: 1e6 }, valle, 2)
    expect(todos).toHaveLength((4 + 4) ** 2)
    expect(todosLosTrozos(valle, 2)).toHaveLength((4 + 4) ** 2)
    expect(anilloDeTrozos(valle, 15)).toBe(2)
    // Rango fuera de todo: ninguno.
    expect(trozosVisibles({ xMin: 500, xMax: 600, zMin: 0, zMax: 10 }, valle, 2)).toEqual([])
  })
})

describe('muestreo por trozos', () => {
  it('los bordes de dos trozos vecinos comparten alturas (sin costuras)', () => {
    const v: Valle = crearEstadoInicial({ semilla: 3 }).valle
    const altura = crearAltura(v, 3)
    const celdas = v.casillasPorParcela
    const n = celdas + 1
    const anillo = 2
    const trozos = todosLosTrozos(v, anillo)
    const alturasDe = new Map(
      trozos.map((t) => {
        const e = esquinaDeTrozo(t, v)
        return [`${t.cx},${t.cz}`, alturasDeTrozo(altura, e.x, e.z, celdas)] as const
      }),
    )
    for (const t of trozos) {
      const a = alturasDe.get(`${t.cx},${t.cz}`)
      const este = alturasDe.get(`${t.cx + 1},${t.cz}`)
      const sur = alturasDe.get(`${t.cx},${t.cz + 1}`)
      for (let k = 0; k < n; k++) {
        if (este) expect(a?.[k * n + celdas]).toBe(este[k * n])
        if (sur) expect(a?.[celdas * n + k]).toBe(sur[k])
      }
    }
  })
})
