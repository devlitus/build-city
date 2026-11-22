import { describe, expect, it } from 'vitest'
import type { Obstaculo } from '../core'
import { obstaculosCambiaron } from './obstaculos-cambio'

const arbol: Obstaculo = { tipo: 'arbol', x: 3, y: 4, variante: 0.2 }
const roca: Obstaculo = { tipo: 'roca', x: 5, y: 6, variante: 0.7 }

describe('obstaculosCambiaron', () => {
  it('la misma lista o los mismos obstáculos no cambian', () => {
    const lista = [arbol, roca]
    expect(obstaculosCambiaron(lista, lista)).toBe(false)
    expect(obstaculosCambiaron(lista, [{ ...arbol }, { ...roca }])).toBe(false)
  })

  it('un golpe (solo cambia `golpes`) no cambia lo que se ve', () => {
    expect(obstaculosCambiaron([arbol, roca], [{ ...arbol, golpes: 1 }, roca])).toBe(false)
  })

  it('árbol talado -> tocón en la misma casilla cambia', () => {
    const tocon: Obstaculo = { tipo: 'tocon', x: 3, y: 4, variante: 0.2 }
    expect(obstaculosCambiaron([arbol, roca], [tocon, roca])).toBe(true)
  })

  it('roca picada o tocón quitado (desaparece) cambia', () => {
    expect(obstaculosCambiaron([arbol, roca], [arbol])).toBe(true)
    expect(obstaculosCambiaron([arbol], [])).toBe(true)
  })

  it('un plantón que crece a árbol o un plantón nuevo cambia', () => {
    const planton: Obstaculo = { tipo: 'planton', x: 3, y: 4, variante: 0.2, diaPlantado: 1 }
    expect(obstaculosCambiaron([planton], [{ ...arbol }])).toBe(true)
    expect(obstaculosCambiaron([], [planton])).toBe(true)
  })
})
