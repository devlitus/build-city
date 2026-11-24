import { describe, expect, it } from 'vitest'
import type { EventoJuego } from '../../core'
import { casillasRegadas, describirRiego } from './riego'

const riego = (x: number, y: number): EventoJuego => ({ tipo: 'tierra-regada', x, y })

describe('describirRiego', () => {
  it('devuelve la casilla de un evento tierra-regada', () => {
    expect(describirRiego(riego(4, 7))).toEqual({ x: 4, y: 7 })
  })

  it('ignora otros eventos', () => {
    expect(describirRiego({ tipo: 'marchita-limpiada', x: 1, y: 2 })).toBeUndefined()
  })
})

describe('casillasRegadas', () => {
  it('con varios eventos (regadera 3x3) devuelve una casilla por evento, en orden', () => {
    const eventos = [
      riego(1, 1),
      { tipo: 'marchita-limpiada', x: 9, y: 9 } as EventoJuego,
      riego(2, 1),
    ]
    expect(casillasRegadas(eventos)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ])
  })
})
