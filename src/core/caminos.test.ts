import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import caminosJson from '../../data/caminos.json'
import { conTierraLabrable } from '../../tests/unit/fixtures/labranza'
import {
  aplicarComando,
  CONFIG_CAMINOS,
  crearEstadoInicial,
  hayCamino,
  puedePlantarPlanton,
  validarVallas,
  zonasVacias,
  ladoValle,
  validarCaminos,
  type EstadoJuego,
} from './index'
import { EsquemaConfigCaminos } from './datos/esquemas'
import { aguaDe } from './zonas'

const base = crearEstadoInicial({ semilla: 1 })
const lado = ladoValle(base.valle)
/** Cuadrado 5×5 propio alrededor de (50, 50), sin obstáculos, Modo Plano, con 10 de piedra y 50 de madera. */
const e0: EstadoJuego = {
  ...conTierraLabrable(base, 50, 50),
  modo: 'plano',
  materiales: { madera: 50, piedra: 10 },
}
const vida = (e: EstadoJuego): EstadoJuego => ({ ...e, modo: 'vida' })
const conVallas = (e: EstadoJuego, ...c: [number, number, string][]): EstadoJuego => {
  const celdas = e.vallas.split('')
  for (const [x, y, t] of c) celdas[y * lado + x] = t
  return { ...e, vallas: celdas.join('') }
}
const coloca = (e: EstadoJuego, ...c: [number, number][]) =>
  aplicarComando(e, { tipo: 'ColocarCamino', casillas: c.map(([x, y]) => ({ x, y })) })
const quita = (e: EstadoJuego, ...c: [number, number][]) =>
  aplicarComando(e, { tipo: 'QuitarCamino', casillas: c.map(([x, y]) => ({ x, y })) })
const error = (r: ReturnType<typeof aplicarComando>) => (r.ok ? undefined : r.error)
function ok(r: ReturnType<typeof aplicarComando>): EstadoJuego {
  if (!r.ok) throw new Error(`rechazado: ${r.error}`)
  return r.estado
}

describe('data/caminos.json', () => {
  it('cumple el esquema y el multiplicador es +30 %', () => {
    expect(v.safeParse(EsquemaConfigCaminos, caminosJson).success).toBe(true)
    expect(CONFIG_CAMINOS.multiplicadorVelocidad).toBe(1.3)
  })
  it('rechaza un reembolso mayor que el coste y multiplicadores < 1', () => {
    const mal = (c: object) => v.safeParse(EsquemaConfigCaminos, { ...caminosJson, ...c }).success
    expect(mal({ reembolsoPiedra: CONFIG_CAMINOS.costePiedra + 1 })).toBe(false)
    expect(mal({ multiplicadorVelocidad: 0.9 })).toBe(false)
    expect(mal({ extra: 1 })).toBe(false)
  })
})

describe('ColocarCamino', () => {
  it('estado inicial: sin caminos, cadena de lado*lado', () => {
    expect(base.caminos).toBe('.'.repeat(lado * lado))
  })

  it('coloca y cobra', () => {
    const r = coloca(e0, [50, 50], [51, 50], [52, 50])
    const e = ok(r)
    expect(hayCamino(e, 50, 50) && hayCamino(e, 51, 50) && hayCamino(e, 52, 50)).toBe(true)
    expect(hayCamino(e, 49, 50)).toBe(false)
    expect(e.materiales.piedra).toBe(10 - 3 * CONFIG_CAMINOS.costePiedra)
    expect(e.materiales.madera).toBe(50)
    expect(r.ok && r.eventos).toEqual([
      { tipo: 'caminos-colocados', casillas: 3, piedra: 3 * CONFIG_CAMINOS.costePiedra },
    ])
    expect(e0.caminos).toBe(base.caminos) // no muta
  })

  it('sin piedra no coloca ni cobra', () => {
    const justo = CONFIG_CAMINOS.costePiedra * 2 - 1
    const e = { ...e0, materiales: { madera: 5, piedra: justo } }
    const r = coloca(e, [50, 50], [51, 50])
    expect(error(r)).toBe('materiales-insuficientes')
    expect(r.estado).toBe(e)
    expect(coloca({ ...e0, materiales: { madera: 0, piedra: 0 } }, [50, 50]).ok).toBe(false)
  })

  it('no sobre cultivo (tierra arada o planta), ni río, ni edificio, ni obstáculo', () => {
    const arada = ok(
      aplicarComando(
        { ...vida(e0), personaje: { x: 50.5, y: 50.5, orientacion: 'sur' }, herramienta: 'azada' },
        { tipo: 'UsarHerramienta', x: 50, y: 51 },
      ),
    )
    expect(arada.tierra[51 * lado + 50]).not.toBe('.')
    expect(error(coloca({ ...arada, modo: 'plano' }, [50, 51]))).toBe('sin-casillas-validas')
    const conPlanta = { ...arada, plantas: [[51 * lado + 50, 0, 0, 0, 0, 0]] as const }
    expect(validarCaminos(conPlanta, [{ x: 50, y: 51 }]).casillas[0]?.valida).toBe(false)
    expect(validarCaminos(arada, [{ x: 50, y: 51 }]).casillas[0]?.motivo).toBe('arada')
    const soloPlanta = { ...e0, plantas: [[51 * lado + 50, 0, 0, 0, 0, 0]] as const }
    expect(validarCaminos(soloPlanta, [{ x: 50, y: 51 }]).casillas[0]?.motivo).toBe('ocupada')

    // Río: todo el valle propio y se elige una casilla de agua (los vados cuentan como río).
    const propias = {
      ...e0,
      valle: {
        ...e0.valle,
        parcelas: e0.valle.parcelas.map((p) => ({ ...p, estado: 'propia' as const })),
      },
    }
    const agua = [...aguaDe(propias.valle, propias.cauce.ancho, lado)][0] as number
    const q = { x: agua % lado, y: Math.floor(agua / lado) }
    expect(validarCaminos(propias, [q]).casillas[0]?.motivo).toBe('agua')
    expect(error(aplicarComando(propias, { tipo: 'ColocarCamino', casillas: [q] }))).toBe(
      'sin-casillas-validas',
    )
    const vado = propias.cauce.vados[0]
    expect(vado).toBeDefined()
    expect(
      validarCaminos(propias, [
        { x: (vado as number) % lado, y: Math.floor((vado as number) / lado) },
      ]).validas,
    ).toBe(0)

    // Edificio y obstáculo.
    const conEdificio: EstadoJuego = {
      ...e0,
      edificios: [{ id: 1, tipo: 'cobertizo', x: 50, y: 50, obra: null, pagado: {} } as never],
      siguienteIdEdificio: 2,
    }
    expect(validarCaminos(conEdificio, [{ x: 50, y: 50 }]).casillas[0]?.motivo).toBe('ocupada')
    const conArbol: EstadoJuego = {
      ...e0,
      obstaculos: [{ x: 49, y: 49, tipo: 'roca' } as never],
    }
    expect(validarCaminos(conArbol, [{ x: 49, y: 49 }]).casillas[0]?.motivo).toBe('obstaculo')
  })

  it('línea parcialmente inválida: coloca y cobra solo las válidas; duplicados una vez', () => {
    const r = coloca(e0, [50, 50], [50, 50], [-1, 0], [0, 0], [51, 50])
    const e = ok(r)
    expect(hayCamino(e, 50, 50) && hayCamino(e, 51, 50)).toBe(true)
    expect(e.materiales.piedra).toBe(10 - 2 * CONFIG_CAMINOS.costePiedra)
    expect(e.caminos.split('c').length - 1).toBe(2)
  })

  it('fuera de parcela propia no se coloca', () => {
    // (0, 0) está en una parcela sin comprar.
    expect(error(coloca(e0, [0, 0]))).toBe('sin-casillas-validas')
    const v1 = validarCaminos(e0, [
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
      { x: 50, y: 50 },
    ])
    expect(v1.casillas.map((c) => c.motivo)).toEqual(['no-propia', 'fuera-del-valle', undefined])
    expect(v1.validas).toBe(1)
    expect(v1.coste).toBe(CONFIG_CAMINOS.costePiedra)
  })

  it('una casilla que ya tiene camino no se vuelve a cobrar', () => {
    const e = ok(coloca(e0, [50, 50]))
    expect(error(coloca(e, [50, 50]))).toBe('sin-casillas-validas')
    const e2 = ok(coloca(e, [50, 50], [51, 50]))
    expect(e2.materiales.piedra).toBe(e.materiales.piedra - CONFIG_CAMINOS.costePiedra)
  })

  it('parámetros inválidos', () => {
    for (const casillas of [null, 3, [{ x: 1.5, y: 0 }], [{ x: NaN, y: 0 }], [null], [{ x: 1 }]]) {
      const r = aplicarComando(e0, { tipo: 'ColocarCamino', casillas: casillas as never })
      expect(error(r)).toBe('parametro-invalido')
      expect(r.estado).toBe(e0)
    }
    expect(error(coloca(e0))).toBe('sin-casillas-validas')
  })

  it('no bloquea el paso: el personaje puede cruzar un camino', () => {
    const e = ok(coloca({ ...e0, personaje: { x: 49.5, y: 50.5, orientacion: 'este' } }, [50, 50]))
    const r = ok(aplicarComando(vida(e), { tipo: 'MoverPersonaje', dx: 1, dy: 0, ms: 200 }))
    expect(r.personaje.x).toBeGreaterThan(49.5)
  })
})

describe('QuitarCamino', () => {
  it('quitar reembolsa', () => {
    const e = ok(coloca(e0, [50, 50], [51, 50]))
    const r = quita(e, [50, 50], [51, 50], [51, 50], [52, 50])
    const f = ok(r)
    expect(f.caminos).toBe(base.caminos)
    expect(f.materiales.piedra).toBe(e.materiales.piedra + 2 * CONFIG_CAMINOS.reembolsoPiedra)
    expect(r.ok && r.eventos).toEqual([
      { tipo: 'caminos-quitados', casillas: 2, piedra: 2 * CONFIG_CAMINOS.reembolsoPiedra },
    ])
  })

  it('sin ninguna casilla con camino es un error y no cambia nada', () => {
    const r = quita(e0, [50, 50])
    expect(error(r)).toBe('sin-casillas-validas')
    expect(r.estado).toBe(e0)
    expect(error(aplicarComando(e0, { tipo: 'QuitarCamino', casillas: 'x' as never }))).toBe(
      'parametro-invalido',
    )
  })

  it('el reembolso no desborda los materiales', () => {
    const e = ok(coloca(e0, [50, 50]))
    const lleno = { ...e, materiales: { madera: 0, piedra: Number.MAX_SAFE_INTEGER } }
    if (CONFIG_CAMINOS.reembolsoPiedra > 0) {
      expect(error(quita(lleno, [50, 50]))).toBe('limite-de-recursos')
    }
  })
})

describe('coherencia con construir y arar', () => {
  it('Construir y MoverEdificio rechazan pisar un camino (ocupada)', () => {
    const e = ok(coloca(e0, [50, 50]))
    const plano: EstadoJuego = {
      ...e,
      modo: 'plano',
      dinero: 100000,
      materiales: { madera: 999, piedra: 999 },
    }
    // Zona compatible con el cobertizo a su alrededor.
    const c = plano.valle.casillasPorParcela
    expect(c).toBeGreaterThan(0)
    const r = aplicarComando(plano, { tipo: 'Construir', tipoEdificio: 'cobertizo', x: 49, y: 49 })
    expect(error(r)).toBe('ocupada')
  })

  it('la azada rechaza una casilla con camino', () => {
    const e = ok(coloca(e0, [50, 51]))
    const r = aplicarComando(
      { ...vida(e), personaje: { x: 50.5, y: 50.5, orientacion: 'sur' }, herramienta: 'azada' },
      { tipo: 'UsarHerramienta', x: 50, y: 51 },
    )
    expect(error(r)).toBe('ocupada')
  })

  const cobertizo = (x: number, y: number) =>
    ({
      id: 1,
      tipo: 'cobertizo',
      x,
      y,
      obra: null,
      pagado: { dinero: 0, madera: 0, piedra: 0 },
    }) as never

  it('MoverEdificio rechaza una huella que pisa un camino (ocupada)', () => {
    const e = ok(coloca(e0, [50, 50]))
    const plano: EstadoJuego = { ...e, edificios: [cobertizo(44, 44)], siguienteIdEdificio: 2 }
    expect(error(aplicarComando(plano, { tipo: 'MoverEdificio', id: 1, x: 49, y: 49 }))).toBe(
      'ocupada',
    )
  })

  it('entre edificios: la casilla contigua es válida y la de la huella no', () => {
    const e: EstadoJuego = { ...e0, edificios: [cobertizo(48, 50)], siguienteIdEdificio: 2 }
    const r = validarCaminos(e, [
      { x: 52, y: 50 },
      { x: 47, y: 51 },
      { x: 48, y: 50 },
      { x: 51, y: 52 },
    ])
    expect(r.casillas.map((c) => c.motivo)).toEqual([undefined, undefined, 'ocupada', 'ocupada'])
    expect(ok(coloca(e, [52, 50], [47, 51])).caminos.split('c').length - 1).toBe(2)
  })
})

describe('Modo Plano', () => {
  it('fuera del Modo Plano ColocarCamino y QuitarCamino dan solo-en-plano y no cambian nada', () => {
    const conCamino = ok(coloca(e0, [50, 50]))
    for (const e of [vida(e0), vida(conCamino)]) {
      for (const r of [coloca(e, [51, 50]), quita(e, [50, 50])]) {
        expect(error(r)).toBe('solo-en-plano')
        expect(r.estado).toBe(e)
      }
    }
  })
})

describe('integración con vallas', () => {
  it('camino bajo una puerta sí, bajo una valla no', () => {
    const e = conVallas(e0, [50, 50, 'p'], [51, 50, 'v'])
    const r = validarCaminos(e, [
      { x: 50, y: 50 },
      { x: 51, y: 50 },
    ])
    expect(r.casillas.map((c) => c.motivo)).toEqual([undefined, 'valla'])
    const f = ok(coloca(e, [50, 50], [51, 50]))
    expect(hayCamino(f, 50, 50)).toBe(true)
    expect(hayCamino(f, 51, 50)).toBe(false)
    expect(f.materiales.piedra).toBe(10 - CONFIG_CAMINOS.costePiedra)
    expect(error(coloca(conVallas(e0, [51, 50, 'v']), [51, 50]))).toBe('sin-casillas-validas')
  })

  it('puerta sí, valla no sobre una casilla con camino', () => {
    const e = ok(coloca(e0, [50, 50]))
    const v = validarVallas(e, [{ x: 50, y: 50 }], 'valla')
    expect(v.casillas[0]?.motivo).toBe('camino')
    expect(v.validas).toEqual([])
    expect(
      aplicarComando(e, { tipo: 'ColocarVallas', casillas: [{ x: 50, y: 50 }], tipoValla: 'valla' })
        .ok,
    ).toBe(false)
    expect(validarVallas(e, [{ x: 50, y: 50 }], 'puerta').validas).toEqual([{ x: 50, y: 50 }])
    const f = ok(
      aplicarComando(e, {
        tipo: 'ColocarVallas',
        casillas: [{ x: 50, y: 50 }],
        tipoValla: 'puerta',
      }),
    )
    expect(hayCamino(f, 50, 50)).toBe(true)
    expect(f.vallas[50 * lado + 50]).toBe('p')
  })
})

describe('plantones', () => {
  it('no se planta un plantón sobre camino, valla ni puerta', () => {
    const libre: EstadoJuego = { ...e0, zonas: zonasVacias(lado) }
    expect(puedePlantarPlanton(libre, 49, 49)).toBe(true)
    expect(puedePlantarPlanton(ok(coloca(libre, [49, 49])), 49, 49)).toBe(false)
    expect(puedePlantarPlanton(conVallas(libre, [49, 49, 'v']), 49, 49)).toBe(false)
    expect(puedePlantarPlanton(conVallas(libre, [49, 49, 'p']), 49, 49)).toBe(false)
    expect(puedePlantarPlanton(ok(coloca(libre, [49, 49])), 48, 49)).toBe(true)
  })
})
