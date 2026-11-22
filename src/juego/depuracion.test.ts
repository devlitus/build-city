import { describe, expect, it } from 'vitest'
import {
  CARACTER_ZONA,
  CONFIG_CULTIVOS,
  CULTIVOS,
  crearEstadoInicial,
  faseDe,
  ladoValle,
  tierraValida,
} from '../core'
import { crearAlmacen } from './almacen'
import {
  comandosCultivoEnParcelasPropias,
  estadoGranjaLlena,
  instalarAtajosDepuracion,
  PLANTAS_GRANJA_LLENA,
} from './depuracion'

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

describe('estadoGranjaLlena', () => {
  const lleno = estadoGranjaLlena(base)

  it('genera 2.000 plantas en casillas propias distintas y la tierra es válida', () => {
    expect(lleno).toBeDefined()
    if (!lleno) return
    expect(lleno.plantas).toHaveLength(PLANTAS_GRANJA_LLENA)
    expect(new Set(lleno.plantas.map((p) => p[0])).size).toBe(PLANTAS_GRANJA_LLENA)
    expect(tierraValida(lleno)).toBe(true)
    const lado = ladoValle(lleno.valle)
    const c = lleno.valle.casillasPorParcela
    for (const p of lleno.plantas) {
      const x = p[0] % lado
      const y = Math.floor(p[0] / lado)
      const i = Math.floor(y / c) * lleno.valle.parcelasPorLado + Math.floor(x / c)
      expect(lleno.valle.parcelas[i]?.estado).toBe('propia')
    }
  })

  it('lleva los 5 cultivos, las 4 fases, marchitas y tierra regada', () => {
    if (!lleno) throw new Error('sin granja')
    expect(new Set(lleno.plantas.map((p) => p[1])).size).toBe(CULTIVOS.length)
    const fases = new Set(
      lleno.plantas.map((p) => faseDe(CONFIG_CULTIVOS.cultivos[CULTIVOS[p[1]] as never], p[2])),
    )
    expect(fases.size).toBe(4)
    expect(lleno.plantas.some((p) => p[5] === 1)).toBe(true)
    expect(lleno.tierra.includes('A')).toBe(true)
  })

  it('deja al personaje en una parcela propia', () => {
    if (!lleno) throw new Error('sin granja')
    const c = lleno.valle.casillasPorParcela
    const f = Math.floor(lleno.personaje.y / c)
    const col = Math.floor(lleno.personaje.x / c)
    expect(lleno.valle.parcelas[f * lleno.valle.parcelasPorLado + col]?.estado).toBe('propia')
    expect(lleno.comprasHechas).toBeGreaterThan(0)
  })

  it('devuelve undefined si no caben las plantas', () => {
    expect(estadoGranjaLlena(base, 10_000_000)).toBeUndefined()
  })

  it('F7 reemplaza el estado del almacén', () => {
    const almacen = crearAlmacen(base)
    const oyentes = new Map<string, (e: KeyboardEvent) => void>()
    const objetivo = {
      addEventListener: (t: string, f: unknown) => oyentes.set(t, f as never),
      removeEventListener: (t: string) => oyentes.delete(t),
    }
    instalarAtajosDepuracion(almacen, objetivo as never)
    oyentes.get('keydown')?.({ code: 'F7', repeat: false, preventDefault: () => {} } as never)
    expect(almacen.estado.plantas).toHaveLength(PLANTAS_GRANJA_LLENA)
  })
})
