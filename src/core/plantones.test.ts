import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  cantidadDe,
  CONFIG_RECURSOS,
  crearEstadoInicial,
  empezarDiaSiguiente,
  puedePlantarPlanton,
  siguienteAleatorio,
  type EstadoJuego,
  type Obstaculo,
} from './index'

const base = crearEstadoInicial({ semilla: 1 })
/** Valle despejado: parcelas propias, sin obstáculos; personaje junto a la casilla de pruebas (51, 50). */
const limpio: EstadoJuego = {
  ...base,
  valle: { ...base.valle, parcelas: base.valle.parcelas.map((p) => ({ ...p, estado: 'propia' })) },
  obstaculos: [],
  edificios: [],
  inventario: [{ objeto: 'planton', cantidad: 3 }],
  personaje: { x: 50.5, y: 50.5, orientacion: 'sur' },
  herramienta: 'mano',
}
const DIAS = CONFIG_RECURSOS.planton.diasCrecimiento

/** Usa la herramienta activa en (x, y); falla si el núcleo rechaza el comando. */
function usar(e: EstadoJuego, x: number, y: number): EstadoJuego {
  const r = aplicarComando(e, { tipo: 'UsarHerramienta', x, y })
  if (!r.ok) throw new Error(r.error)
  return r.estado
}

/** Estado del RNG para el que el sorteo del plantón sale (o no) con la probabilidad de los datos. */
function rngQue(sale: boolean): number {
  for (let r = 0; ; r++) {
    if (siguienteAleatorio(r).valor < CONFIG_RECURSOS.arbol.probabilidadPlanton === sale) return r
  }
}

describe('plantones (M3-T06)', () => {
  it('talar un árbol puede dar un plantón según probabilidadPlanton, con el RNG del estado', () => {
    const talar = (rng: number): EstadoJuego => {
      let e: EstadoJuego = {
        ...limpio,
        inventario: [],
        herramienta: 'hacha',
        rng,
        personaje: { x: 50.5, y: 50.5, orientacion: 'este' },
        obstaculos: [{ tipo: 'arbol', x: 51, y: 50, variante: 0.5 }],
      }
      for (let i = 0; i < 20 && e.obstaculos[0]?.tipo === 'arbol'; i++) {
        e = usar({ ...e, energia: 100 }, 51, 50)
      }
      expect(e.obstaculos[0]?.tipo).toBe('tocon')
      return e
    }
    expect(cantidadDe(talar(rngQue(true)).inventario, 'planton')).toBe(
      CONFIG_RECURSOS.arbol.plantones,
    )
    expect(cantidadDe(talar(rngQue(false)).inventario, 'planton')).toBe(0)
  })

  it('un plantón crece a árbol en N días (diasCrecimiento de recursos.json)', () => {
    let e = usar(limpio, 51, 50)
    expect(e.obstaculos[0]).toMatchObject({ tipo: 'planton', diaPlantado: limpio.dia })
    for (let i = 1; i < DIAS; i++) {
      e = empezarDiaSiguiente(e, 'dormir').estado
      expect(e.obstaculos[0]?.tipo).toBe('planton')
    }
    e = empezarDiaSiguiente(e, 'dormir').estado
    expect(e.dia - limpio.dia).toBe(DIAS)
    expect(e.obstaculos[0]).toMatchObject({ tipo: 'arbol', x: 51, y: 50 })
  })

  it('no se planta en casilla ocupada (árbol, roca, tocón ni otro plantón)', () => {
    for (const tipo of ['arbol', 'roca', 'tocon', 'planton'] as const) {
      const o: Obstaculo = { tipo, x: 51, y: 50, variante: 0.3, diaPlantado: 1 }
      const e: EstadoJuego = { ...limpio, obstaculos: [o] }
      expect(puedePlantarPlanton(e, 51, 50)).toBe(false)
      const r = usar(e, 51, 50)
      expect(r.obstaculos).toHaveLength(1)
      expect(cantidadDe(r.inventario, 'planton')).toBe(3)
    }
  })

  it('no se planta en parcela ajena', () => {
    const ajena: EstadoJuego = {
      ...limpio,
      valle: {
        ...limpio.valle,
        parcelas: limpio.valle.parcelas.map((p) => ({ ...p, estado: 'en-venta' as const })),
      },
    }
    expect(puedePlantarPlanton(ajena, 51, 50)).toBe(false)
    expect(usar(ajena, 51, 50).obstaculos).toEqual([])
  })

  it('se planta en casilla libre de parcela propia y gasta un plantón', () => {
    expect(puedePlantarPlanton(limpio, 51, 50)).toBe(true)
    expect(cantidadDe(usar(limpio, 51, 50).inventario, 'planton')).toBe(2)
  })
})
