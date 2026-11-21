import { describe, expect, it } from 'vitest'
import { aplicarComando, crearEstadoInicial, type EstadoJuego } from '../../core'
import { datosPanelParcela } from './panel-parcela'

const base = crearEstadoInicial({ semilla: 42, dineroInicial: 100000 })
const N = base.valle.parcelasPorLado
const centro = 2 * N + 2

const comprar = (e: EstadoJuego, indice: number) =>
  aplicarComando(e, { tipo: 'ComprarParcela', indice })

describe('datosPanelParcela', () => {
  it('muestra tipo, fertilidad y agua de la parcela', () => {
    const d = datosPanelParcela(base, centro)
    const p = base.valle.parcelas[centro]
    expect(d).toMatchObject({
      terreno: p?.terreno,
      fertilidad: p?.fertilidad,
      agua: p?.agua,
      comprable: true,
      motivo: undefined,
      falta: 0,
    })
    expect(datosPanelParcela(base, -1)).toBeUndefined()
  })

  it('el precio mostrado es exactamente el que cobra el núcleo', () => {
    for (const indice of [0, centro, N * N - 1]) {
      const mostrado = datosPanelParcela(base, indice)?.precio
      const r = comprar(base, indice)
      expect(r.ok).toBe(true)
      if (!r.ok) continue
      expect(r.eventos).toEqual([{ tipo: 'parcela-comprada', indice, precio: mostrado }])
      expect(base.dinero - r.estado.dinero).toBe(mostrado)
    }
  })

  it('tras una compra el precio mostrado de otra parcela sigue el del núcleo', () => {
    const e1 = comprar(base, centro)
    if (!e1.ok) throw new Error('falla')
    const vecina = centro + 1
    const mostrado = datosPanelParcela(e1.estado, vecina)?.precio
    const r = comprar(e1.estado, vecina)
    expect(r.ok && e1.estado.dinero - r.estado.dinero).toBe(mostrado)
  })

  it('sin dinero no es comprable y dice cuánto falta', () => {
    const precio = datosPanelParcela(base, centro)?.precio as number
    const pobre = { ...base, dinero: precio - 7 }
    expect(datosPanelParcela(pobre, centro)).toMatchObject({
      comprable: false,
      motivo: 'fondos-insuficientes',
      falta: 7,
    })
    expect(comprar(pobre, centro).ok).toBe(false)
  })

  it('con fondos justos es comprable y no falta nada', () => {
    const precio = datosPanelParcela(base, centro)?.precio as number
    expect(datosPanelParcela({ ...base, dinero: precio }, centro)).toMatchObject({
      comprable: true,
      falta: 0,
    })
  })

  it('no adyacente: motivo claro y falta 0 aunque haya dinero', () => {
    const e = comprar(base, centro)
    if (!e.ok) throw new Error('falla')
    expect(datosPanelParcela(e.estado, 0)).toMatchObject({
      comprable: false,
      motivo: 'no-adyacente',
      falta: 0,
    })
  })

  it('tras comprar, la misma parcela ya no es comprable', () => {
    const r = comprar(base, centro)
    if (!r.ok) throw new Error('falla')
    expect(datosPanelParcela(r.estado, centro)).toMatchObject({
      propia: true,
      comprable: false,
      motivo: 'ya-propia',
      precio: undefined,
    })
    expect(comprar(r.estado, centro)).toMatchObject({ ok: false, error: 'ya-propia' })
  })
})
