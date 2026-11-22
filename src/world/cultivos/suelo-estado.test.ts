import { describe, expect, it } from 'vitest'
import { crearEstadoInicial, ladoValle, type EstadoJuego } from '../../core'
import { empezarDiaSiguiente } from '../../core/obras'
import { casillasSuelo, tonoSuelo } from './suelo-estado'

describe('casillasSuelo', () => {
  it('lista solo las casillas aradas con su tono', () => {
    // lado 3: . a A / 1 . 9 / . . .
    const l = casillasSuelo('.aA1.9...', 3)
    expect(l.map((c) => [c.x, c.y, tonoSuelo(c)])).toEqual([
      [1, 0, 'seca'],
      [2, 0, 'regada'],
      [0, 1, 'seca'],
      [2, 1, 'seca'],
    ])
  })

  it('sin tierra arada no hay casillas', () => {
    expect(casillasSuelo('.'.repeat(9), 3)).toEqual([])
  })

  it('tras el cambio de día del núcleo las casillas regadas vuelven a verse secas', () => {
    const base = crearEstadoInicial({ semilla: 1 })
    const lado = ladoValle(base.valle)
    const i = 50 * lado + 51
    const e: EstadoJuego = {
      ...base,
      tierra: base.tierra.slice(0, i) + 'A' + base.tierra.slice(i + 1),
    }
    expect(tonoSuelo(casillasSuelo(e.tierra, lado)[0] ?? { x: 0, y: 0, regada: false })).toBe(
      'regada',
    )
    const manana = empezarDiaSiguiente(e, 'dormir').estado
    const l = casillasSuelo(manana.tierra, lado)
    expect(l).toHaveLength(1)
    expect(tonoSuelo(l[0] ?? { x: 0, y: 0, regada: true })).toBe('seca')
  })
})
