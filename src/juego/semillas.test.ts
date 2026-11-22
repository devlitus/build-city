import { describe, expect, it } from 'vitest'
import { crearEstadoInicial } from '../core'
import { crearAlmacen } from './almacen'
import {
  comandoSemillaDeTecla,
  comandoSemillaPorDefecto,
  instalarEleccionSemilla,
  siguienteSemilla,
} from './semillas'

const inv = [
  { objeto: 'semilla-rabano', cantidad: 3 },
  { objeto: 'zanahoria', cantidad: 2 },
  { objeto: 'semilla-patata', cantidad: 1 },
] as const

const R = { code: 'KeyR', altKey: false, ctrlKey: false, metaKey: false }
const estado = (extra: object = {}) => ({
  herramienta: 'semillas' as const,
  modo: 'vida' as const,
  inventario: inv,
  semillaElegida: null,
  ...extra,
})

describe('siguienteSemilla', () => {
  it('es cíclica, salta lo que no es semilla y empieza por la primera', () => {
    expect(siguienteSemilla(inv, null)).toBe('semilla-rabano')
    expect(siguienteSemilla(inv, 'semilla-rabano')).toBe('semilla-patata')
    expect(siguienteSemilla(inv, 'semilla-patata')).toBe('semilla-rabano')
  })

  it('si la elegida ya no queda vuelve a la primera; sin semillas -> null', () => {
    expect(siguienteSemilla(inv, 'semilla-fresa')).toBe('semilla-rabano')
    expect(siguienteSemilla([], null)).toBeNull()
  })
})

describe('comandoSemillaDeTecla', () => {
  it('R con semillas activa elige la siguiente', () => {
    expect(comandoSemillaDeTecla(R, estado({ semillaElegida: 'semilla-rabano' }))).toEqual({
      tipo: 'ElegirSemilla',
      objeto: 'semilla-patata',
    })
  })

  it('no hace nada con otra herramienta, otra tecla, modificadores o una sola semilla', () => {
    expect(comandoSemillaDeTecla(R, estado({ herramienta: 'azada' }))).toBeUndefined()
    expect(comandoSemillaDeTecla({ ...R, code: 'KeyT' }, estado())).toBeUndefined()
    expect(comandoSemillaDeTecla({ ...R, ctrlKey: true }, estado())).toBeUndefined()
    expect(comandoSemillaDeTecla(R, estado({ modo: 'plano' }))).toBeUndefined()
    const una = estado({
      inventario: [{ objeto: 'semilla-fresa', cantidad: 1 }],
      semillaElegida: 'semilla-fresa',
    })
    expect(comandoSemillaDeTecla(R, una)).toBeUndefined()
  })
})

describe('comandoSemillaPorDefecto', () => {
  it('sin semilla elegida o con una que ya no queda elige la primera disponible', () => {
    const esperado = { tipo: 'ElegirSemilla', objeto: 'semilla-rabano' }
    expect(comandoSemillaPorDefecto(estado())).toEqual(esperado)
    expect(comandoSemillaPorDefecto(estado({ semillaElegida: 'semilla-fresa' }))).toEqual(esperado)
  })

  it('no hace nada si ya hay una válida, con otra herramienta o sin semillas', () => {
    expect(comandoSemillaPorDefecto(estado({ semillaElegida: 'semilla-patata' }))).toBeUndefined()
    expect(comandoSemillaPorDefecto(estado({ herramienta: 'mano' }))).toBeUndefined()
    expect(comandoSemillaPorDefecto(estado({ inventario: [] }))).toBeUndefined()
  })
})

describe('instalarEleccionSemilla', () => {
  it('al elegir «semillas» se elige la primera semilla y R cambia a la siguiente', () => {
    const base = crearEstadoInicial({ semilla: 1 })
    const almacen = crearAlmacen({ ...base, modo: 'vida' })
    const oyentes = new Map<string, (e: KeyboardEvent) => void>()
    const objetivo = {
      addEventListener: (tipo: string, f: unknown) => oyentes.set(tipo, f as never),
      removeEventListener: (tipo: string) => oyentes.delete(tipo),
    }
    const quitar = instalarEleccionSemilla(almacen, objetivo as never)
    almacen.despachar({ tipo: 'ElegirHerramienta', herramienta: 'semillas' })
    const primera = almacen.estado.semillaElegida
    expect(primera).not.toBeNull()
    const tecla = { ...R, repeat: false, target: null, preventDefault: () => {} }
    oyentes.get('keydown')?.(tecla as unknown as KeyboardEvent)
    expect(almacen.estado.semillaElegida).not.toBe(primera)
    quitar()
    expect(oyentes.size).toBe(0)
  })
})
