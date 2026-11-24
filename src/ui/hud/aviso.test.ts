import { describe, expect, it } from 'vitest'
import { conTierraLabrable } from '../../../tests/unit/fixtures/labranza'
import {
  CONFIG_CULTIVOS,
  CULTIVOS,
  diasHastaMadurar,
  ladoValle,
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

describe('avisoContextual con herramientas de cultivo', () => {
  const lado = ladoValle(base.valle)
  const i = 51 * lado + 50
  const labrable = conTierraLabrable(
    { ...base, modo: 'vida', energia: 100, personaje: { x: 50.5, y: 50.5, orientacion: 'sur' } },
    50,
    50,
  )
  const arada: EstadoJuego = {
    ...labrable,
    tierra: labrable.tierra.slice(0, i) + 'a' + labrable.tierra.slice(i + 1),
  }
  const usa = (h: EstadoJuego['herramienta'], e: EstadoJuego = labrable): EstadoJuego => ({
    ...e,
    herramienta: h,
  })
  const conPlanta = (dias: number, marchita = 0): EstadoJuego => ({
    ...arada,
    herramienta: 'mano',
    plantas: [[i, CULTIVOS.indexOf('rabano'), dias, 0, 0, marchita]],
  })

  it('azada sobre tierra sin labrar en zona cultivo -> Arar', () => {
    expect(avisoContextual(usa('azada'))).toBe('E — Arar')
  })

  it('azada con un árbol delante apunta al suelo: no ofrece talar', () => {
    const e = { ...usa('azada'), obstaculos: [{ ...arbol, x: 50, y: 51 }] }
    expect(avisoContextual(e)).toBeUndefined()
  })

  it('azada sobre tierra ya arada -> sin aviso', () => {
    expect(avisoContextual(usa('azada', arada))).toBeUndefined()
  })

  it('semillas sobre tierra arada → Plantar con el nombre del cultivo', () => {
    const e: EstadoJuego = {
      ...usa('semillas', arada),
      inventario: [{ objeto: 'semilla-zanahoria', cantidad: 3 }],
      semillaElegida: 'semilla-zanahoria',
    }
    expect(avisoContextual(e)).toBe('E — Plantar zanahoria')
  })

  it('semillas sin semilla elegida o sobre tierra sin arar -> sin aviso', () => {
    expect(avisoContextual({ ...usa('semillas', arada), semillaElegida: null })).toBeUndefined()
    const sinArar: EstadoJuego = { ...usa('semillas'), semillaElegida: 'semilla-rabano' }
    expect(avisoContextual(sinArar)).toBeUndefined()
  })

  it('regadera sobre una planta seca -> Regar; ya regada -> sin aviso', () => {
    const e = { ...conPlanta(0), herramienta: 'regadera' as const }
    expect(avisoContextual(e)).toBe('E — Regar')
    const regada = { ...e, tierra: e.tierra.slice(0, i) + 'A' + e.tierra.slice(i + 1) }
    expect(avisoContextual(regada)).toBeUndefined()
  })

  it('hoz (mano) sobre cultivo maduro → Cosechar; sobre uno joven -> sin aviso', () => {
    const dias = diasHastaMadurar(CONFIG_CULTIVOS.cultivos.rabano)
    expect(avisoContextual(conPlanta(dias))).toBe('E — Cosechar')
    expect(avisoContextual(conPlanta(0))).toBeUndefined()
  })

  it('mano sobre una planta marchita -> quitarla', () => {
    expect(avisoContextual(conPlanta(0, 1))).toBe(t('aviso.limpiarMarchita'))
  })

  it('en parcela ajena pide comprarla y sin energía avisa del cansancio', () => {
    const ajena: EstadoJuego = {
      ...usa('azada'),
      valle: {
        ...labrable.valle,
        parcelas: labrable.valle.parcelas.map((p) => ({ ...p, estado: 'en-venta' })),
      },
    }
    expect(avisoContextual(ajena)).toBe(t('aviso.comprarParcela'))
    expect(avisoContextual({ ...usa('azada'), energia: 0 })).toBe(t('aviso.cansancio'))
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
