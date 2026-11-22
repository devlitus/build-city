import { describe, expect, it } from 'vitest'
import { CARACTER_ZONA, crearEstadoInicial, ladoValle } from '../core'
import { crearAlmacen } from './almacen'
import { comandosCultivoEnParcelasPropias, instalarAtajosDepuracion } from './depuracion'

const base = crearEstadoInicial({ semilla: 1 })

describe('comandosCultivoEnParcelasPropias', () => {
  it('un rectángulo de cultivo por parcela propia, cubriéndola entera', () => {
    const parcelas = base.valle.parcelas.map((p, i) =>
      i === 0 || i === 3 ? { ...p, estado: 'propia' as const } : p,
    )
    const valle = { ...base.valle, parcelas }
    const propias = parcelas.filter((p) => p.estado === 'propia')
    const comandos = comandosCultivoEnParcelasPropias(valle)
    expect(propias).toHaveLength(2)
    expect(comandos).toHaveLength(propias.length)
    const c = base.valle.casillasPorParcela
    const p = propias[0]
    expect(p).toBeDefined()
    expect(comandos[0]).toEqual({
      tipo: 'PintarZona',
      x0: (p?.columna ?? 0) * c,
      y0: (p?.fila ?? 0) * c,
      x1: (p?.columna ?? 0) * c + c - 1,
      y1: (p?.fila ?? 0) * c + c - 1,
      zona: 'cultivo',
    })
  })

  it('sin parcelas propias no hay comandos', () => {
    const valle = {
      ...base.valle,
      parcelas: base.valle.parcelas.map((p) => ({ ...p, estado: 'en-venta' as const })),
    }
    expect(comandosCultivoEnParcelasPropias(valle)).toEqual([])
  })
})

describe('instalarAtajosDepuracion', () => {
  it('F6 pinta cultivo en las parcelas propias y se puede quitar', () => {
    const parcelas = base.valle.parcelas.map((p, i) =>
      i === 0 ? { ...p, estado: 'propia' as const } : p,
    )
    const almacen = crearAlmacen({ ...base, valle: { ...base.valle, parcelas } })
    const oyentes = new Map<string, (e: KeyboardEvent) => void>()
    const objetivo = {
      addEventListener: (t: string, f: unknown) => oyentes.set(t, f as never),
      removeEventListener: (t: string) => oyentes.delete(t),
    }
    const quitar = instalarAtajosDepuracion(almacen, objetivo as never)
    const tecla = { code: 'F6', repeat: false, preventDefault: () => {} }
    oyentes.get('keydown')?.(tecla as unknown as KeyboardEvent)
    const lado = ladoValle(almacen.estado.valle)
    expect(almacen.estado.zonas.includes(CARACTER_ZONA.cultivo)).toBe(true)
    expect(almacen.estado.zonas).toHaveLength(lado * lado)
    quitar()
    expect(oyentes.size).toBe(0)
  })
})
