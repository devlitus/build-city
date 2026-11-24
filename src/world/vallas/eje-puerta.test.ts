import { describe, expect, it } from 'vitest'
import { ejePuerta } from './eje-puerta'
import { LADO_E, LADO_N, LADO_O, LADO_S } from './forma'

describe('ejePuerta', () => {
  it('va en x si conecta este u oeste', () => {
    expect(ejePuerta(LADO_E)).toBe(0)
    expect(ejePuerta(LADO_E | LADO_O)).toBe(0)
  })
  it('va en z si solo conecta norte o sur', () => {
    expect(ejePuerta(LADO_N)).toBe(1)
    expect(ejePuerta(LADO_N | LADO_S)).toBe(1)
  })
  it('suelta o con vecinas en los dos ejes, va en x', () => {
    expect(ejePuerta(0)).toBe(0)
    expect(ejePuerta(LADO_N | LADO_E)).toBe(0)
  })
})
