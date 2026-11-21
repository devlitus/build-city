import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  cantidadDe,
  capacidadInventario,
  casillaBloqueada,
  CONFIG_RECURSOS,
  crearEstadoInicial,
  mapaTransitabilidad,
  obstaculoEn,
  siguienteAleatorio,
  terrenoDeCasilla,
  type EstadoJuego,
  type Obstaculo,
} from './index'
import recursosJson from '../../data/recursos.json'

const base = crearEstadoInicial({ semilla: 1 })
const limpio: EstadoJuego = {
  ...base,
  valle: { ...base.valle, parcelas: base.valle.parcelas.map((p) => ({ ...p, estado: 'propia' })) },
  obstaculos: [],
  inventario: [],
  materiales: { madera: 0, piedra: 0 },
  edificios: [],
  energia: 100,
  personaje: { x: 50.5, y: 50.5, orientacion: 'sur' },
}
const arbol: Obstaculo = { tipo: 'arbol', x: 51, y: 50, variante: 0.5 }
const roca: Obstaculo = { tipo: 'roca', x: 49, y: 50, variante: 0.5 }
const con = (h: 'hacha' | 'pico', ...o: Obstaculo[]): EstadoJuego => ({
  ...limpio,
  herramienta: h,
  obstaculos: o,
})
const usar = (e: EstadoJuego, x: number, y: number) =>
  aplicarComando(e, { tipo: 'UsarHerramienta', x, y })
const rngQue = (sale: boolean): number => {
  for (let r = 0; ; r++) {
    if (siguienteAleatorio(r).valor < CONFIG_RECURSOS.arbol.probabilidadPlanton === sale) return r
  }
}
/** Golpea `n` veces con energía llena; devuelve el estado y los tipos de evento de cada golpe. */
function golpear(e: EstadoJuego, n: number, x: number, y: number) {
  let estado = e
  const eventos: string[][] = []
  for (let i = 0; i < n; i++) {
    const r = usar({ ...estado, energia: 100 }, x, y)
    if (!r.ok) throw new Error(r.error)
    estado = r.estado
    eventos.push(r.eventos.map((v) => v.tipo))
  }
  return { estado, eventos }
}
const llena = () =>
  Array.from({ length: capacidadInventario([]) }, () => ({
    objeto: 'patata' as const,
    cantidad: 99,
  }))
const TERRENOS = ['prado', 'bosque', 'rocoso'] as const
/** Valle con todas las parcelas de un terreno. */
const deTerreno = (t: (typeof TERRENOS)[number], e: EstadoJuego): EstadoJuego => ({
  ...e,
  valle: { ...e.valle, parcelas: e.valle.parcelas.map((p) => ({ ...p, terreno: t })) },
})

describe('talar: N golpes y tocón', () => {
  const terreno = terrenoDeCasilla(limpio, 51, 50) as (typeof TERRENOS)[number]
  const n = CONFIG_RECURSOS.arbol.golpes[terreno]

  it('N golpes talan el árbol: los N-1 primeros no, el último sí', () => {
    const previo = golpear(con('hacha', arbol), n - 1, 51, 50).estado
    expect(obstaculoEn(previo, 51, 50)).toMatchObject({ tipo: 'arbol', golpes: n - 1 })
    expect(previo.materiales.madera).toBe(0)
    const fin = golpear(previo, 1, 51, 50).estado
    expect(obstaculoEn(fin, 51, 50)?.tipo).not.toBe('arbol')
    expect(fin.materiales.madera).toBe(CONFIG_RECURSOS.arbol.madera[terreno])
  })

  it('el tocón queda en la misma casilla y sigue bloqueando el paso', () => {
    const { estado } = golpear(con('hacha', arbol), n, 51, 50)
    expect(estado.obstaculos).toEqual([{ tipo: 'tocon', x: 51, y: 50, variante: 0.5 }])
    expect(casillaBloqueada(mapaTransitabilidad(estado), 51, 50)).toBe(true)
  })

  it('el tocón se quita con el hacha en los golpes de los datos y da su madera', () => {
    const tocon: Obstaculo = { tipo: 'tocon', x: 51, y: 50, variante: 0.5 }
    const { estado } = golpear(con('hacha', tocon), CONFIG_RECURSOS.tocon.golpes, 51, 50)
    expect(estado.obstaculos).toEqual([])
    expect(estado.materiales.madera).toBe(CONFIG_RECURSOS.tocon.madera)
    expect(casillaBloqueada(mapaTransitabilidad(estado), 51, 50)).toBe(false)
  })

  it('el pico no toca un tocón; en parcela ajena el tocón tampoco se quita', () => {
    const tocon: Obstaculo = { tipo: 'tocon', x: 51, y: 50, variante: 0.5 }
    const e = con('pico', tocon)
    expect(usar(e, 51, 50).estado.obstaculos).toBe(e.obstaculos)
    const ajena: EstadoJuego = {
      ...con('hacha', tocon),
      valle: {
        ...limpio.valle,
        parcelas: limpio.valle.parcelas.map((p) => ({ ...p, estado: 'en-venta' as const })),
      },
    }
    expect(usar(ajena, 51, 50)).toMatchObject({ ok: false, error: 'no-propia' })
  })

  it('el botín (madera y piedra) coincide con data/recursos.json en cada terreno', () => {
    for (const t of TERRENOS) {
      const ea = deTerreno(t, con('hacha', arbol))
      const ga = recursosJson.arbol.golpes[t]
      const a = golpear({ ...ea, rng: rngQue(false) }, ga, 51, 50).estado
      expect(a.materiales.madera).toBe(recursosJson.arbol.madera[t])
      expect(a.materiales.piedra).toBe(0)
      const er = deTerreno(t, con('pico', roca))
      const r = golpear(er, recursosJson.roca.golpes[t], 49, 50).estado
      expect(r.materiales.piedra).toBe(recursosJson.roca.piedra[t])
      expect(r.materiales.madera).toBe(0)
      expect(r.obstaculos).toEqual([])
    }
  })
})

describe('reglas de la herramienta', () => {
  it('sin energía se rechaza y el estado no cambia nada', () => {
    const e = { ...con('hacha', arbol), energia: 0 }
    const copia = structuredClone(e)
    const r = usar(e, 51, 50)
    expect(r).toMatchObject({ ok: false, error: 'sin-energia' })
    expect(r.estado).toBe(e)
    expect(e).toEqual(copia)
  })

  it('en parcela ajena se rechaza con no-propia y no cambia nada', () => {
    const ajena = (nuevo: string): EstadoJuego => ({
      ...limpio,
      valle: {
        ...limpio.valle,
        parcelas: limpio.valle.parcelas.map((p) => ({ ...p, estado: nuevo as 'en-venta' })),
      },
    })
    const e = { ...ajena('en-venta'), herramienta: 'hacha' as const, obstaculos: [arbol] }
    const r = usar(e, 51, 50)
    expect(r).toMatchObject({ ok: false, error: 'no-propia' })
    expect(r.estado).toBe(e)
  })

  it('inventario lleno avisa y no pierde recursos: la madera se da y el plantón perdido se anuncia', () => {
    const n = CONFIG_RECURSOS.arbol.golpes[terrenoDeCasilla(limpio, 51, 50) as 'prado']
    const e: EstadoJuego = {
      ...con('hacha', { ...arbol, golpes: n - 1 }),
      inventario: llena(),
      rng: rngQue(true),
    }
    const r = usar(e, 51, 50)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const tipos = r.eventos.map((v) => v.tipo)
    expect(tipos).toContain('planton-perdido')
    expect(r.estado.materiales.madera).toBe(
      CONFIG_RECURSOS.arbol.madera[terrenoDeCasilla(limpio, 51, 50) as 'prado'],
    )
    expect(cantidadDe(r.estado.inventario, 'planton')).toBe(0)
    expect(r.estado.inventario).toEqual(e.inventario)
    // La madera y la piedra van a los materiales, que no tienen capacidad: nunca se pierden.
    const piedra = golpear(
      { ...con('pico', { ...roca, golpes: 1 }), inventario: llena() },
      CONFIG_RECURSOS.roca.golpes.prado,
      49,
      50,
    ).estado
    expect(piedra.materiales.piedra).toBeGreaterThan(0)
  })
})
