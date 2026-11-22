/* eslint-disable @typescript-eslint/no-non-null-assertion -- valores conocidos en tests */
/**
 * Rompedor · M3-T03 Talar y picar (núcleo). Pasada ligera sobre recursos.ts, herramientas.ts,
 * objetivo.ts y comandoUsarHerramienta: conservación del botín, energía, rechazos que no tocan el
 * estado, el tocón y el objetivo delante.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  aplicarComando,
  capacidadInventario,
  casillaAlAlcance,
  casillaBloqueada,
  casillaDeEnfrente,
  cantidadDe,
  colocacionValida,
  CONFIG_RECURSOS,
  costeEnergia,
  crearEstadoInicial,
  ENERGIA_MAXIMA,
  inventarioValido,
  ladoValle,
  mapaTransitabilidad,
  motivoNoArar,
  objetivoDelante,
  puedePlantarPlanton,
  terrenoDeCasilla,
  CARACTER_ZONA,
  type Comando,
  type EstadoJuego,
  type Obstaculo,
  type Orientacion,
} from '../../src/core'
import { comandoUsarHerramienta } from '../../src/juego/entrada'

const base = crearEstadoInicial({ semilla: 1 })
const LADO = ladoValle(base.valle)
const C = base.valle.casillasPorParcela
const limpio: EstadoJuego = {
  ...base,
  valle: { ...base.valle, parcelas: base.valle.parcelas.map((p) => ({ ...p, estado: 'propia' })) },
  obstaculos: [],
  inventario: [],
  materiales: { madera: 0, piedra: 0 },
  edificios: [],
  energia: ENERGIA_MAXIMA,
  modo: 'vida',
  pausado: false,
}
const TIPOS = ['arbol', 'roca', 'tocon', 'planton'] as const
const ORIENTACIONES: readonly Orientacion[] = ['norte', 'sur', 'este', 'oeste']
const clave = (x: number, y: number) => `${x},${y}`

/** Escenario: personaje en (px, py) con obstáculos en algunas vecinas; una parcela puede ser ajena. */
const escenario = fc
  .record({
    px: fc.integer({ min: 3, max: LADO - 4 }),
    py: fc.integer({ min: 3, max: LADO - 4 }),
    vecinas: fc.array(
      fc.record({
        dx: fc.integer({ min: -1, max: 1 }),
        dy: fc.integer({ min: -1, max: 1 }),
        tipo: fc.constantFrom(...TIPOS),
        golpes: fc.option(fc.integer({ min: 0, max: 4 }), { nil: undefined }),
      }),
      { minLength: 4, maxLength: 12 },
    ),
    herramienta: fc.constantFrom('hacha' as const, 'pico' as const),
    ajena: fc.option(fc.integer({ min: 0, max: base.valle.parcelas.length - 1 }), {
      nil: undefined,
    }),
    rng: fc.integer({ min: 0, max: 2 ** 31 - 1 }),
    inventarioLleno: fc.boolean(),
  })
  .map(({ px, py, vecinas, ajena, rng, inventarioLleno, herramienta }): EstadoJuego => {
    const vistos = new Set<string>()
    const obstaculos: Obstaculo[] = []
    for (const v of vecinas) {
      if (v.dx === 0 && v.dy === 0) continue // el personaje no está encima de un obstáculo
      const x = px + v.dx
      const y = py + v.dy
      if (vistos.has(clave(x, y))) continue
      vistos.add(clave(x, y))
      obstaculos.push(
        v.golpes === undefined
          ? { tipo: v.tipo, x, y, variante: 0.5 }
          : { tipo: v.tipo, x, y, variante: 0.5, golpes: v.golpes },
      )
    }
    const parcelas = limpio.valle.parcelas.map((p, i) =>
      i === ajena ? { ...p, estado: 'en-venta' as const } : p,
    )
    const cap = capacidadInventario([])
    return {
      ...limpio,
      rng,
      herramienta,
      valle: { ...limpio.valle, parcelas },
      obstaculos,
      personaje: { x: px + 0.5, y: py + 0.5, orientacion: 'sur' },
      inventario: inventarioLleno
        ? Array.from({ length: cap }, () => ({ objeto: 'patata' as const, cantidad: 99 }))
        : [],
    }
  })

type Op = Comando | { readonly tipo: 'energia'; readonly valor: number }
const op: fc.Arbitrary<Op> = fc.oneof(
  {
    weight: 2,
    arbitrary: fc
      .constantFrom('hacha', 'hacha', 'pico', 'pico', 'mano', 'azada')
      .map((herramienta): Op => ({ tipo: 'ElegirHerramienta', herramienta })),
  },
  {
    weight: 20,
    arbitrary: fc
      .tuple(fc.constantFrom(-1, 0, 1, -1, 1, 2, -2), fc.constantFrom(-1, 0, 1, -1, 1, 2, -2))
      .map(([dx, dy]): Op => ({ tipo: 'UsarHerramienta', x: dx, y: dy })),
  },
  { weight: 1, arbitrary: fc.constant<Op>({ tipo: 'Pausar' }) },
  { weight: 2, arbitrary: fc.constant<Op>({ tipo: 'Reanudar' }) },
  {
    weight: 1,
    arbitrary: fc
      .constantFrom('vida', 'vida', 'plano')
      .map((modo): Op => ({ tipo: 'CambiarModo', modo })),
  },
  {
    weight: 2,
    arbitrary: fc.integer({ min: 0, max: ENERGIA_MAXIMA }).map((valor): Op => ({
      tipo: 'energia',
      valor,
    })),
  },
)

/** Usar es relativo a la casilla del personaje (que no se mueve en estas secuencias). */
function absoluto(e: EstadoJuego, o: Op): Op {
  if (o.tipo !== 'UsarHerramienta') return o
  return {
    tipo: 'UsarHerramienta',
    x: Math.floor(e.personaje.x) + o.x,
    y: Math.floor(e.personaje.y) + o.y,
  }
}

function botinEsperado(tipo: Obstaculo['tipo'], e: EstadoJuego, x: number, y: number) {
  const t = terrenoDeCasilla(e, x, y)!
  if (tipo === 'arbol') return { madera: CONFIG_RECURSOS.arbol.madera[t], piedra: 0 }
  if (tipo === 'roca') return { madera: 0, piedra: CONFIG_RECURSOS.roca.piedra[t] }
  if (tipo === 'tocon') return { madera: CONFIG_RECURSOS.tocon.madera, piedra: 0 }
  return { madera: 0, piedra: 0 }
}

function correr(inicial: EstadoJuego, ops: readonly Op[], comprobar = true): EstadoJuego {
  let e = inicial
  for (const crudo of ops) {
    if (crudo.tipo === 'energia') {
      e = { ...e, energia: crudo.valor }
      continue
    }
    const c = absoluto(e, crudo)
    const r = aplicarComando(e, c as Comando)
    if (comprobar) verificarPaso(e, c as Comando, r)
    e = r.estado
  }
  return e
}

function verificarPaso(antes: EstadoJuego, c: Comando, r: ReturnType<typeof aplicarComando>): void {
  const despues = r.estado
  // Un rechazo nunca cambia nada (misma referencia).
  if (!r.ok) {
    expect(despues).toBe(antes)
    return
  }
  // Invariantes globales.
  expect(despues.energia).toBeGreaterThanOrEqual(0)
  expect(despues.energia).toBeLessThanOrEqual(ENERGIA_MAXIMA)
  expect(despues.materiales.madera).toBeGreaterThanOrEqual(0)
  expect(despues.materiales.piedra).toBeGreaterThanOrEqual(0)
  expect(inventarioValido(despues.inventario)).toBe(true)
  expect(despues.inventario.length).toBeLessThanOrEqual(capacidadInventario(despues.edificios))
  const casillas = new Set(despues.obstaculos.map((o) => clave(o.x, o.y)))
  expect(casillas.size).toBe(despues.obstaculos.length)
  if (c.tipo !== 'UsarHerramienta') return

  // Energía: exactamente el coste de la herramienta.
  expect(antes.energia - despues.energia).toBe(costeEnergia(antes.herramienta))
  // Conservación del botín: el delta de materiales es la suma de lo anunciado y lo anunciado
  // coincide con data/recursos.json según el tipo y el terreno de lo que había en la casilla.
  let madera = 0
  let piedra = 0
  let plantones = 0
  const talados = new Set<string>()
  for (const ev of r.eventos) {
    if (ev.tipo !== 'obstaculo-quitado') continue
    const previo = antes.obstaculos.find((o) => o.x === ev.x && o.y === ev.y)
    expect(previo?.tipo).toBe(ev.obstaculo)
    expect({ madera: ev.madera, piedra: ev.piedra }).toEqual(
      botinEsperado(ev.obstaculo, antes, ev.x, ev.y),
    )
    madera += ev.madera
    piedra += ev.piedra
    plantones += ev.plantones
    if (ev.obstaculo === 'arbol') talados.add(clave(ev.x, ev.y))
  }
  // La mano planta un plantón del inventario (M5-06): gasta 1 y deja un obstáculo nuevo.
  const plantados = new Set<string>()
  for (const ev of r.eventos) {
    if (ev.tipo !== 'planton-plantado') continue
    expect(antes.herramienta).toBe('mano')
    expect(antes.obstaculos.some((o) => o.x === ev.x && o.y === ev.y)).toBe(false)
    expect(despues.obstaculos.filter((o) => o.x === ev.x && o.y === ev.y)).toEqual([
      expect.objectContaining({ tipo: 'planton' }),
    ])
    plantones -= 1
    plantados.add(clave(ev.x, ev.y))
  }
  expect(despues.materiales.madera - antes.materiales.madera).toBe(madera)
  expect(despues.materiales.piedra - antes.materiales.piedra).toBe(piedra)
  expect(cantidadDe(despues.inventario, 'planton') - cantidadDe(antes.inventario, 'planton')).toBe(
    plantones,
  )
  // Ningún tocón aparece sin haber talado un árbol en esa casilla.
  const toconesAntes = new Set(
    antes.obstaculos.filter((o) => o.tipo === 'tocon').map((o) => clave(o.x, o.y)),
  )
  for (const o of despues.obstaculos) {
    if (o.tipo !== 'tocon') continue
    expect(toconesAntes.has(clave(o.x, o.y)) || talados.has(clave(o.x, o.y))).toBe(true)
  }
  // Ningún obstáculo nuevo (fuera de tocones de árboles talados y plantones plantados) ni movido.
  for (const o of despues.obstaculos) {
    if (plantados.has(clave(o.x, o.y))) continue
    expect(antes.obstaculos.some((a) => a.x === o.x && a.y === o.y)).toBe(true)
  }
}

describe('Rompedor M3-T03 · talar y picar', () => {
  it('secuencias aleatorias: rechazos intactos, energía exacta, botín = datos, sin tocones fantasma', () => {
    fc.assert(
      fc.property(escenario, fc.array(op, { maxLength: 60 }), (e, ops) => {
        correr(e, ops)
      }),
      { numRuns: 150 },
    )
  })

  it('golpear hasta el final: cada obstáculo da su botín una sola vez (árbol + tocón, roca)', () => {
    fc.assert(
      fc.property(escenario, (e) => {
        // Todos los golpes posibles con hacha y luego con pico, con energía llena en cada golpe.
        let s: EstadoJuego = e
        const golpear = (h: 'hacha' | 'pico') => {
          s = { ...s, herramienta: h }
          for (let i = 0; i < 30; i++) {
            for (const o of e.obstaculos) {
              s = { ...s, energia: ENERGIA_MAXIMA }
              const r = aplicarComando(s, { tipo: 'UsarHerramienta', x: o.x, y: o.y })
              s = r.estado
            }
          }
        }
        golpear('hacha')
        golpear('pico')
        let madera = 0
        let piedra = 0
        for (const o of e.obstaculos) {
          if (terrenoDeCasilla(e, o.x, o.y) === undefined) continue
          const propia =
            e.valle.parcelas[Math.floor(o.y / C) * e.valle.parcelasPorLado + Math.floor(o.x / C)]
              ?.estado === 'propia'
          if (!propia) continue
          const b = botinEsperado(o.tipo, e, o.x, o.y)
          madera += b.madera
          piedra += b.piedra
          // Un árbol talado deja un tocón que el hacha también quita.
          if (o.tipo === 'arbol') madera += CONFIG_RECURSOS.tocon.madera
        }
        expect(s.materiales).toEqual({ madera, piedra })
        // Lo propio queda limpio; lo ajeno, intacto.
        for (const o of s.obstaculos) {
          const original = e.obstaculos.find((a) => a.x === o.x && a.y === o.y)
          expect(original).toEqual(o)
        }
      }),
      { numRuns: 80 },
    )
  })

  it('determinismo: misma semilla y mismos comandos dan el mismo estado (el plantón usa el RNG)', () => {
    fc.assert(
      fc.property(escenario, fc.array(op, { maxLength: 30 }), (e, ops) => {
        expect(correr(e, ops, false)).toEqual(correr(e, ops, false))
      }),
      { numRuns: 60 },
    )
  })

  it('objetivoDelante: siempre al alcance de UsarHerramienta y nunca detrás', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.double({ min: 5, max: 15, noNaN: true }),
        fc.constantFrom(...ORIENTACIONES),
        fc.array(
          fc.record({ x: fc.integer({ min: 2, max: 18 }), y: fc.integer({ min: 2, max: 18 }) }),
          { maxLength: 12 },
        ),
        (x, y, orientacion, cs) => {
          const obstaculos: Obstaculo[] = cs.map((c) => ({ tipo: 'arbol', ...c, variante: 0 }))
          const obj = objetivoDelante({ x, y }, orientacion, { obstaculos })
          expect(casillaAlAlcance({ x, y }, obj.x, obj.y)).toBe(true)
          if (obj.tipo === 'casilla') {
            expect(obj).toEqual({ tipo: 'casilla', ...casillaDeEnfrente({ x, y, orientacion }) })
            return
          }
          const d = { norte: [0, -1], sur: [0, 1], este: [1, 0], oeste: [-1, 0] }[orientacion]
          const vx = obj.x + 0.5 - x
          const vy = obj.y + 0.5 - y
          // El centro del obstáculo nunca queda detrás del personaje.
          expect(vx * d[0]! + vy * d[1]!).toBeGreaterThanOrEqual(-1e-9)
        },
      ),
      { numRuns: 400 },
    )
  })

  it('E apunta a lo mismo que objetivoDelante y el comando se acepta por alcance', () => {
    fc.assert(
      fc.property(escenario, fc.constantFrom(...ORIENTACIONES), (e, orientacion) => {
        const s: EstadoJuego = {
          ...e,
          herramienta: 'hacha',
          personaje: { ...e.personaje, orientacion },
        }
        const cmd = comandoUsarHerramienta(
          { code: 'KeyE', altKey: false, ctrlKey: false, metaKey: false },
          false,
          s,
        )!
        const obj = objetivoDelante(s.personaje, orientacion, s)
        expect(cmd).toEqual({ tipo: 'UsarHerramienta', x: obj.x, y: obj.y })
        const r = aplicarComando(s, cmd)
        if (!r.ok) expect(r.error).not.toBe('fuera-de-alcance')
      }),
      { numRuns: 150 },
    )
  })

  it('el tocón bloquea el paso, la obra, el arado y el plantón, y el personaje no lo atraviesa', () => {
    const tx = 52
    const ty = 50
    const lado = LADO
    const zonas = limpio.zonas.split('')
    zonas[ty * lado + tx] = CARACTER_ZONA.cultivo
    const e: EstadoJuego = {
      ...limpio,
      zonas: zonas.join(''),
      herramienta: 'hacha',
      inventario: [{ objeto: 'planton', cantidad: 1 }],
      obstaculos: [{ tipo: 'tocon', x: tx, y: ty, variante: 0.3 }],
      personaje: { x: 50.5, y: 50.5, orientacion: 'este' },
    }
    expect(casillaBloqueada(mapaTransitabilidad(e), tx, ty)).toBe(true)
    expect(motivoNoArar(e, tx, ty)).toBe('obstaculo')
    expect(puedePlantarPlanton(e, tx, ty)).toBe(false)
    const obra = colocacionValida(e, 'caja-envio', tx, ty)
    expect(obra.valida).toBe(false)
    // Andar hacia el este durante mucho rato: la caja del personaje nunca entra en la casilla.
    let s = e
    for (let i = 0; i < 40; i++) {
      s = aplicarComando(s, { tipo: 'MoverPersonaje', dx: 1, dy: 0, ms: 100 }).estado
    }
    expect(s.personaje.x).toBeLessThan(tx)
  })

  it('materiales al borde del entero seguro: talar se rechaza sin cambiar nada', () => {
    const e: EstadoJuego = {
      ...limpio,
      herramienta: 'hacha',
      materiales: { madera: Number.MAX_SAFE_INTEGER, piedra: 0 },
      obstaculos: [{ tipo: 'tocon', x: 51, y: 50, variante: 0.3 }],
      personaje: { x: 50.5, y: 50.5, orientacion: 'este' },
    }
    const r = aplicarComando(e, { tipo: 'UsarHerramienta', x: 51, y: 50 })
    expect(r.ok).toBe(false)
    expect(r.estado).toBe(e)
  })

  it.todo(
    'el desbordamiento del botín se rechaza con limite-de-recursos, no estado-invalido (#133)',
  )
})
