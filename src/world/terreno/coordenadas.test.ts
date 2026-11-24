import { describe, expect, it } from 'vitest'
import {
  casillaAMetros,
  dentroDelValle,
  ladoCasillas,
  ladoMetros,
  metrosACasilla,
} from './coordenadas'

const valle = { parcelasPorLado: 4, casillasPorParcela: 10 }

describe('coordenadas', () => {
  it('el lado en metros es parcelas por casillas', () => {
    expect(ladoCasillas(valle)).toBe(40)
    expect(ladoMetros(valle)).toBe(40)
  })

  it('la casilla (0,0) está en la esquina noroeste y la última en la sureste', () => {
    expect(casillaAMetros(0, 0, valle)).toEqual({ x: -19.5, z: -19.5 })
    expect(casillaAMetros(39, 39, valle)).toEqual({ x: 19.5, z: 19.5 })
  })

  it('casilla -> metros -> casilla es coherente', () => {
    for (const [x, y] of [
      [0, 0],
      [12, 31],
      [39, 5],
    ] as const) {
      const m = casillaAMetros(x, y, valle)
      expect(metrosACasilla(m.x, m.z, valle)).toEqual({ x, y })
    }
  })

  it('los puntos fuera del valle dan casillas fuera de rango', () => {
    expect(metrosACasilla(-25, 30, valle)).toEqual({ x: -5, y: 50 })
  })

  it('dentroDelValle distingue el interior y el anillo exterior', () => {
    expect(dentroDelValle(0, 0, valle)).toBe(true)
    expect(dentroDelValle(20, -20, valle)).toBe(true)
    expect(dentroDelValle(20.01, 0, valle)).toBe(false)
    expect(dentroDelValle(0, -21, valle)).toBe(false)
  })
})
