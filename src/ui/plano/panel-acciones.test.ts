/* eslint-disable @typescript-eslint/no-non-null-assertion -- aserciones de ids conocidos en tests */
import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  colocacionValida,
  crearEstadoInicial,
  ladoValle,
  type Comando,
  type EstadoJuego,
  type TipoEdificio,
} from '../../core'
import { textoDevuelve, vistaAcciones } from './panel-acciones'

function preparar(): EstadoJuego {
  let e = crearEstadoInicial({ semilla: 42, dineroInicial: 5_000_000 })
  const paso = (c: Comando): void => {
    const r = aplicarComando(e, c)
    if (r.ok) e = r.estado
  }
  const n = e.valle.parcelasPorLado
  for (let i = 0; i < n * n; i++) paso({ tipo: 'ComprarParcela', indice: i })
  const lado = ladoValle(e.valle)
  const mitad = Math.floor(lado / 2)
  paso({ tipo: 'PintarZona', x0: 0, y0: 0, x1: mitad - 1, y1: lado - 1, zona: 'vivienda' })
  paso({ tipo: 'PintarZona', x0: mitad, y0: 0, x1: lado - 1, y1: lado - 1, zona: 'almacen' })
  paso({ tipo: 'CambiarModo', modo: 'plano' })
  return e
}
const base = preparar()

function construir(tipo: TipoEdificio, terminada: boolean): { e: EstadoJuego; id: number } {
  const lado = ladoValle(base.valle)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if (!colocacionValida(base, tipo, x, y, { ignorarCostes: true }).valida) continue
      const id = base.siguienteIdEdificio
      const r = aplicarComando(base, { tipo: 'Construir', tipoEdificio: tipo, x, y })
      if (!r.ok) throw new Error(r.error)
      const e = terminada
        ? { ...r.estado, edificios: r.estado.edificios.map((b) => ({ ...b, obra: null })) }
        : r.estado
      return { e, id }
    }
  }
  throw new Error('sin sitio')
}

const diferencia = (a: EstadoJuego, b: EstadoJuego) => ({
  dinero: b.dinero - a.dinero,
  madera: b.materiales.madera - a.materiales.madera,
  piedra: b.materiales.piedra - a.materiales.piedra,
})

describe('vistaAcciones', () => {
  it('el reembolso mostrado es la diferencia que aplica DemolerEdificio', () => {
    const { e, id } = construir('cobertizo', true)
    const v = vistaAcciones(e, id)!
    expect(v.accion).toBe('demoler')
    expect(v.comando).toEqual({ tipo: 'DemolerEdificio', id })
    const r = aplicarComando(e, v.comando!)
    expect(r.ok).toBe(true)
    if (r.ok) expect(diferencia(e, r.estado)).toEqual(v.devuelve)
    expect(v.devuelve.dinero).toBeGreaterThan(0)
  })

  it('una obra ofrece cancelar y devuelve el 100 %, como CancelarObra', () => {
    const { e, id } = construir('cobertizo', false)
    const v = vistaAcciones(e, id)!
    expect(v.accion).toBe('cancelar')
    expect(v.comando).toEqual({ tipo: 'CancelarObra', id })
    const r = aplicarComando(e, v.comando!)
    expect(r.ok).toBe(true)
    if (r.ok) expect(diferencia(e, r.estado)).toEqual(v.devuelve)
    expect(v.devuelve).toEqual({ dinero: 300, madera: 50, piedra: 10 })
  })

  it('la casa terminada no es demolible: sin comando y sin reembolso', () => {
    const { e, id } = construir('casa', true)
    const v = vistaAcciones(e, id)!
    expect(v.accion).toBe('no-demolible')
    expect(v.comando).toBeNull()
    expect(v.devuelve).toEqual({ dinero: 0, madera: 0, piedra: 0 })
  })

  it('un id que no existe no tiene vista', () => {
    expect(vistaAcciones(base, 12345)).toBeNull()
  })
})

describe('textoDevuelve', () => {
  it('lista solo las partidas con cantidad y formatea las monedas', () => {
    expect(textoDevuelve({ dinero: 1500, madera: 25, piedra: 0 })).toBe(
      'Se devuelve: 1.500 monedas, 25 madera',
    )
    expect(textoDevuelve({ dinero: 0, madera: 0, piedra: 5 })).toBe('Se devuelve: 5 piedra')
  })
  it('sin nada que devolver lo dice', () => {
    expect(textoDevuelve({ dinero: 0, madera: 0, piedra: 0 })).toBe('No se devuelve nada')
  })
})
