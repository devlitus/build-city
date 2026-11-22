import { describe, expect, it } from 'vitest'
import {
  crearEstadoInicial,
  golpesNecesarios,
  terrenoDeCasilla,
  type EstadoJuego,
  type Obstaculo,
} from '../../core'
import type { Notificacion } from '../../juego/almacen'
import { t } from '../textos'
import { avisoContextual, textoRecogida } from './aviso-contextual'

const base = crearEstadoInicial({ semilla: 1 })
const limpio: EstadoJuego = {
  ...base,
  valle: { ...base.valle, parcelas: base.valle.parcelas.map((p) => ({ ...p, estado: 'propia' })) },
  obstaculos: [],
  energia: 100,
  modo: 'vida',
  personaje: { x: 50.5, y: 50.5, orientacion: 'sur' },
}
const arbol: Obstaculo = { tipo: 'arbol', x: 50, y: 51, variante: 0.5 }
const roca: Obstaculo = { tipo: 'roca', x: 50, y: 51, variante: 0.5 }
const tocon: Obstaculo = { tipo: 'tocon', x: 50, y: 51, variante: 0.5 }
const con = (
  herramienta: EstadoJuego['herramienta'],
  o?: Obstaculo,
  energia = 100,
): EstadoJuego => ({
  ...limpio,
  herramienta,
  energia,
  obstaculos: o ? [o] : [],
})

describe('avisoContextual', () => {
  it('hacha + árbol -> Talar con los golpes que faltan', () => {
    const terreno = terrenoDeCasilla(limpio, 50, 51)
    if (!terreno) throw new Error('casilla fuera del valle')
    const n = golpesNecesarios(arbol, terreno)
    const texto = avisoContextual(con('hacha', arbol))
    expect(texto).toBe(n === 1 ? t('aviso.talarArbolUno') : t('aviso.talarArbol', { golpes: n }))
    expect(texto).toContain('Talar')
    const tocado = avisoContextual(con('hacha', { ...arbol, golpes: n - 1 }))
    expect(tocado).toBe(t('aviso.talarArbolUno'))
  })

  it('pico + árbol -> sin aviso', () => {
    expect(avisoContextual(con('pico', arbol))).toBeUndefined()
  })

  it('sin objetivo o con otra herramienta -> sin aviso', () => {
    expect(avisoContextual(con('hacha'))).toBeUndefined()
    expect(avisoContextual(con('azada', arbol))).toBeUndefined()
  })

  it('sin energía -> aviso de cansancio', () => {
    expect(avisoContextual(con('hacha', arbol, 0))).toBe(t('aviso.cansancio'))
  })

  it('pico + roca -> Picar roca; hacha + roca -> nada', () => {
    expect(avisoContextual(con('pico', roca))).toBe(t('aviso.picarRoca'))
    expect(avisoContextual(con('hacha', roca))).toBeUndefined()
  })

  it('hacha + tocón -> Quitar tocón', () => {
    expect(avisoContextual(con('hacha', tocon))).toBe(t('aviso.quitarTocon'))
  })

  it('en pausa -> sin aviso', () => {
    expect(avisoContextual({ ...con('hacha', arbol), pausado: true })).toBeUndefined()
  })

  it('en Modo Plano (el comando se rechaza) -> sin aviso', () => {
    expect(avisoContextual({ ...con('hacha', arbol), modo: 'plano' })).toBeUndefined()
  })
})

describe('avisoContextual fuera de parcela propia', () => {
  const ajena = (e: EstadoJuego): EstadoJuego => ({
    ...e,
    valle: { ...e.valle, parcelas: e.valle.parcelas.map((p) => ({ ...p, estado: 'en-venta' })) },
  })

  it('hacha + árbol en parcela ajena -> pide comprar la parcela para talar', () => {
    expect(avisoContextual(ajena(con('hacha', arbol)))).toBe(t('aviso.comprarParaTalar'))
    expect(avisoContextual(ajena(con('hacha', tocon)))).toBe(t('aviso.comprarParaTalar'))
  })

  it('pico + roca en parcela ajena -> pide comprar la parcela para picar', () => {
    expect(avisoContextual(ajena(con('pico', roca)))).toBe(t('aviso.comprarParaPicar'))
  })

  it('el texto menciona Tab y el Modo Plano', () => {
    expect(t('aviso.comprarParaTalar')).toContain('Tab')
    expect(t('aviso.comprarParaTalar')).toContain('Modo Plano')
  })

  it('con una herramienta que no golpea -> sin aviso', () => {
    expect(avisoContextual(ajena(con('pico', arbol)))).toBeUndefined()
  })
})

describe('textoRecogida', () => {
  const comando = { tipo: 'UsarHerramienta', x: 1, y: 1 } as const
  const quitado = (madera: number, piedra: number, plantones: number): Notificacion => ({
    ok: true,
    comando,
    eventos: [
      { tipo: 'obstaculo-quitado', obstaculo: 'arbol', x: 1, y: 1, madera, piedra, plantones },
    ],
  })

  it('formatea madera, piedra y plantón', () => {
    expect(textoRecogida(quitado(4, 0, 0))).toBe('+4 madera')
    expect(textoRecogida(quitado(0, 3, 0))).toBe('+3 piedra')
    expect(textoRecogida(quitado(4, 0, 1))).toBe('+4 madera, +1 plantón')
  })

  it('sin botín o sin evento -> nada', () => {
    expect(textoRecogida(quitado(0, 0, 0))).toBeUndefined()
    expect(textoRecogida({ ok: true, comando, eventos: [] })).toBeUndefined()
    expect(textoRecogida({ ok: false, comando, error: 'sin-energia' })).toBeUndefined()
  })
})
