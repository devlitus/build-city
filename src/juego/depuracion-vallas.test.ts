import { describe, expect, it } from 'vitest'
import { CARACTER_CAMINO, crearEstadoInicial } from '../core'
import { crearAlmacen } from './almacen'
import {
  CAMINOS_LLENOS,
  comandosVallasCaminosEnParcelas,
  estadoVallasCaminosLleno,
  instalarAtajoVallasCaminos,
  VALLAS_LLENAS,
} from './depuracion-vallas'

const base = crearEstadoInicial({ semilla: 1 })

describe('comandosVallasCaminosEnParcelas', () => {
  it('genera comandos de camino, valla y puerta solo en las parcelas dadas', () => {
    const comandos = comandosVallasCaminosEnParcelas([{ fila: 0, columna: 1 }], 8)
    const tipos = new Set(comandos.map((c) => c.tipo))
    expect(tipos).toEqual(new Set(['ColocarCamino', 'ColocarVallas']))
    for (const c of comandos) {
      if (c.tipo !== 'ColocarCamino' && c.tipo !== 'ColocarVallas') continue
      for (const q of c.casillas) {
        expect(q.x).toBeGreaterThanOrEqual(8)
        expect(q.x).toBeLessThan(16)
        expect(q.y).toBeLessThan(8)
      }
    }
  })
})

describe('estadoVallasCaminosLleno', () => {
  it('deja al menos 400 casillas de valla y 400 de camino y el modo del estado base', () => {
    const e = estadoVallasCaminosLleno(base)
    expect(e).toBeDefined()
    if (!e) return
    expect([...e.vallas].filter((c) => c !== '.').length).toBeGreaterThanOrEqual(VALLAS_LLENAS)
    expect([...e.caminos].filter((c) => c === CARACTER_CAMINO).length).toBeGreaterThanOrEqual(
      CAMINOS_LLENOS,
    )
    expect(e.vallas).toContain('p')
    expect(e.modo).toBe(base.modo)
  })
})

describe('instalarAtajoVallasCaminos', () => {
  it('F9 reemplaza el estado y quitar el oyente lo desactiva', () => {
    const almacen = crearAlmacen(base)
    let oyente: ((e: KeyboardEvent) => void) | undefined
    const objetivo = {
      addEventListener: (_: string, f: unknown) => (oyente = f as (e: KeyboardEvent) => void),
      removeEventListener: () => (oyente = undefined),
    }
    const quitar = instalarAtajoVallasCaminos(almacen, objetivo)
    oyente?.({ code: 'F8', repeat: false, preventDefault() {} } as KeyboardEvent)
    expect(almacen.estado.vallas).toBe(base.vallas)
    oyente?.({ code: 'F9', repeat: false, preventDefault() {} } as KeyboardEvent)
    expect(almacen.estado.vallas).not.toBe(base.vallas)
    quitar()
    expect(oyente).toBeUndefined()
  })
})
