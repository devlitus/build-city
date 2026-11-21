import { describe, expect, it } from 'vitest'
import { aplicarComando, crearEstadoInicial } from '../../core'
import { centroParcela, escalaAparicion, esquinasPropias } from './geometria-parcelas'

const base = crearEstadoInicial({ semilla: 42, dineroInicial: 100000 })
const N = base.valle.parcelasPorLado
const comprar = (e: typeof base, indice: number) => {
  const r = aplicarComando(e, { tipo: 'ComprarParcela', indice })
  if (!r.ok) throw new Error(r.error)
  return r.estado
}

describe('esquinasPropias', () => {
  it('sin propias no hay mojones; una parcela da 4; dos contiguas 6', () => {
    expect(esquinasPropias(base.valle)).toHaveLength(0)
    const e1 = comprar(base, 2 * N + 2)
    expect(esquinasPropias(e1.valle)).toHaveLength(4)
    expect(esquinasPropias(comprar(e1, 2 * N + 3).valle)).toHaveLength(6)
  })

  it('las esquinas caen en el borde de la parcela (metros enteros desplazados -L/2)', () => {
    const e = comprar(base, 0)
    const c = base.valle.casillasPorParcela
    const mitad = (N * c) / 2
    const xs = esquinasPropias(e.valle).map((p) => p.x)
    expect(Math.min(...xs)).toBe(-mitad)
    expect(Math.max(...xs)).toBe(c - mitad)
  })
})

describe('centroParcela y aparición', () => {
  it('la parcela 0 tiene su centro en la esquina noroeste + media parcela', () => {
    const c = base.valle.casillasPorParcela
    const mitad = (N * c) / 2
    expect(centroParcela(base.valle, 0)).toEqual({ x: c / 2 - mitad, z: c / 2 - mitad })
    expect(centroParcela(base.valle, -1)).toBeUndefined()
  })
  it('la escala va de 0 a 1 y es monótona', () => {
    expect(escalaAparicion(0, 0.4)).toBe(0)
    expect(escalaAparicion(0.4, 0.4)).toBe(1)
    expect(escalaAparicion(0.1, 0.4)).toBeLessThan(escalaAparicion(0.2, 0.4))
  })
})
