import { describe, expect, it } from 'vitest'
import { aplicarComando, crearEstadoInicial, indicesConCartel, type EstadoJuego } from './index'

const base = crearEstadoInicial({ semilla: 42, dineroInicial: 100000 })
const N = base.valle.parcelasPorLado
const idx = (f: number, c: number) => f * N + c
const comprar = (e: EstadoJuego, indice: number): EstadoJuego => {
  const r = aplicarComando(e, { tipo: 'ComprarParcela', indice })
  if (!r.ok) throw new Error(r.error)
  return r.estado
}

describe('carteles de parcelas en venta', () => {
  it('sin propias, todas las parcelas en venta tienen cartel', () => {
    expect(indicesConCartel(base)).toHaveLength(N * N)
  })

  it('solo las parcelas comprables tienen cartel', () => {
    const e = comprar(base, idx(2, 2))
    expect(indicesConCartel(e).sort((a, b) => a - b)).toEqual(
      [idx(1, 2), idx(2, 1), idx(2, 3), idx(3, 2)].sort((a, b) => a - b),
    )
  })

  it('no depende del dinero', () => {
    const e = comprar(base, idx(2, 2))
    expect(indicesConCartel({ ...e, dinero: 0 })).toEqual(indicesConCartel(e))
  })

  it('tras comprar, las nuevas adyacentes lo tienen y la comprada lo pierde', () => {
    const e1 = comprar(base, idx(2, 2))
    const e2 = comprar(e1, idx(2, 3))
    const c = indicesConCartel(e2)
    expect(c).not.toContain(idx(2, 3))
    expect(c).toContain(idx(2, 4))
    expect(c).toContain(idx(1, 3))
    expect(c).toContain(idx(3, 3))
    expect(c).not.toContain(idx(1, 4))
  })
})
