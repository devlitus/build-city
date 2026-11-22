import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  CONFIG_VALLAS,
  crearEstadoInicial,
  ladoValle,
  motivoNoArar,
  validarVallas,
  vallaEn,
  vallasVacias,
  VERSION_FORMATO,
  type Comando,
  type EstadoJuego,
} from './index'
import { casillasRio } from './rio'

const base = crearEstadoInicial({ semilla: 42, dineroInicial: 100_000 })
const C = base.valle.casillasPorParcela
const N = base.valle.parcelasPorLado
const LADO = ladoValle(base.valle)

const ok = (e: EstadoJuego, c: Comando): EstadoJuego => {
  const r = aplicarComando(e, c)
  if (!r.ok) throw new Error(`${c.tipo}: ${r.error}`)
  return r.estado
}
const error = (e: EstadoJuego, c: Comando) => {
  const r = aplicarComando(e, c)
  return r.ok ? 'ok' : r.error
}

/** Parcela sin río que no contiene la aparición. */
const iParcela = base.valle.parcelas.findIndex(
  (_, i) =>
    !base.valle.rio.includes(i) &&
    i !== Math.floor(base.aparicion.y / C) * N + Math.floor(base.aparicion.x / C),
)
const px = (iParcela % N) * C
const py = Math.floor(iParcela / N) * C

/** Parcela propia sin árboles ni rocas, en Modo Plano y con madera de sobra. */
function escenario(extra: Partial<EstadoJuego> = {}): EstadoJuego {
  const e = ok(base, { tipo: 'ComprarParcela', indice: iParcela })
  return { ...e, obstaculos: [], modo: 'plano', ...extra }
}
/** Una columna de otra parcela (sin comprar) junto a la propia. */
const AJENA_X = px === 0 ? px + C : px - 1
const lim = escenario()
const MADERA = lim.materiales.madera

/** Casillas (x, y) de una fila de `n` casillas desde (x0, y0). */
const fila = (x0: number, y0: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ x: x0 + i, y: y0 }))
const colocar = (
  _e: EstadoJuego,
  casillas: readonly { x: number; y: number }[],
  tipoValla: 'valla' | 'puerta' = 'valla',
): Comando => ({ tipo: 'ColocarVallas', casillas, tipoValla })
const en = (e: EstadoJuego, x: number, y: number) => vallaEn(e.vallas, y * LADO + x)

describe('estado de las vallas', () => {
  it('empieza vacío, con una casilla por carácter y sin subir la versión del formato', () => {
    expect(base.vallas).toBe(vallasVacias(LADO))
    expect(base.vallas).toHaveLength(LADO * LADO)
    expect(VERSION_FORMATO).toBe(11)
  })

  it('los costes salen de data/vallas.json', () => {
    expect(CONFIG_VALLAS.coste.valla.madera).toBeGreaterThan(0)
    expect(CONFIG_VALLAS.coste.puerta.madera).toBeGreaterThan(0)
  })
})

describe('ColocarVallas', () => {
  it('coloca y cobra por casilla', () => {
    const casillas = fila(px + 2, py + 2, 4)
    const r = aplicarComando(lim, colocar(lim, casillas))
    if (!r.ok) throw new Error(r.error)
    for (const q of casillas) expect(en(r.estado, q.x, q.y)).toBe('valla')
    expect(r.estado.materiales.madera).toBe(MADERA - 4 * CONFIG_VALLAS.coste.valla.madera)
    expect(r.estado.materiales.piedra).toBe(lim.materiales.piedra)
    expect(r.eventos).toEqual([
      {
        tipo: 'vallas-colocadas',
        tipoValla: 'valla',
        casillas: 4,
        madera: 4 * CONFIG_VALLAS.coste.valla.madera,
      },
    ])
  })

  it('sin madera no coloca ni cobra', () => {
    const e = {
      ...lim,
      materiales: { ...lim.materiales, madera: 2 * CONFIG_VALLAS.coste.valla.madera - 1 },
    }
    const r = aplicarComando(e, colocar(e, fila(px + 2, py + 2, 2)))
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.error).toBe('materiales-insuficientes')
    expect(r.estado).toBe(e)
    // Con la madera justa sí.
    const justo = {
      ...e,
      materiales: { ...e.materiales, madera: 2 * CONFIG_VALLAS.coste.valla.madera },
    }
    expect(ok(justo, colocar(justo, fila(px + 2, py + 2, 2))).materiales.madera).toBe(0)
  })

  it('no coloca sobre edificio, obstáculo ni río', () => {
    const casa = {
      id: 1,
      tipo: 'caja-envio' as const,
      x: px + 5,
      y: py + 5,
      obra: null,
    }
    const conEdificio = escenario({
      edificios: [casa],
      siguienteIdEdificio: 2,
      obstaculos: [{ tipo: 'arbol', x: px + 8, y: py + 8, variante: 0.5 }],
    })
    const motivos = (e: EstadoJuego, casillas: { x: number; y: number }[]) =>
      validarVallas(e, casillas, 'valla').casillas.map((c) => c.motivo)
    expect(
      motivos(conEdificio, [
        { x: px + 5, y: py + 5 },
        { x: px + 6, y: py + 5 },
      ]),
    ).toEqual(['ocupada', 'ocupada'])
    expect(motivos(conEdificio, [{ x: px + 8, y: py + 8 }])).toEqual(['obstaculo'])
    expect(error(conEdificio, colocar(conEdificio, [{ x: px + 8, y: py + 8 }]))).toBe(
      'sin-casillas-validas',
    )
    // Río (también un vado cuenta como río): se marca propia la parcela del río.
    const iRio = base.valle.rio[0] as number
    const parcelas = base.valle.parcelas.map((p, i) =>
      i === iRio ? { ...p, estado: 'propia' as const } : p,
    )
    const conRio = escenario({ valle: { ...base.valle, parcelas } })
    const agua = casillasRio(conRio.valle, conRio.cauce.ancho).filter(
      (k) => Math.floor(k.y / C) * N + Math.floor(k.x / C) === iRio,
    )
    expect(agua.length).toBeGreaterThan(0)
    expect(motivos(conRio, agua)).toEqual(agua.map(() => 'agua'))
    const vado = conRio.cauce.vados[0]
    if (vado !== undefined) {
      const q = { x: vado % LADO, y: Math.floor(vado / LADO) }
      if (Math.floor(q.y / C) * N + Math.floor(q.x / C) === iRio) {
        expect(motivos(conRio, [q])).toEqual(['agua'])
      }
    }
  })

  it('no coloca sobre tierra arada ni planta', () => {
    const i = (py + 3) * LADO + px + 3
    const arada = { ...lim, tierra: lim.tierra.slice(0, i) + 'a' + lim.tierra.slice(i + 1) }
    const r = validarVallas(arada, [{ x: px + 3, y: py + 3 }], 'valla')
    expect(r.casillas[0]?.motivo).toBe('cultivo')
    const conPlanta = { ...arada, plantas: [[i, 0, 0, 0, 0, 0] as const] }
    expect(validarVallas(conPlanta, [{ x: px + 3, y: py + 3 }], 'puerta').validas).toEqual([])
  })

  it('puerta ocupa casilla igual que valla', () => {
    const e = ok(lim, colocar(lim, [{ x: px + 2, y: py + 2 }], 'puerta'))
    expect(en(e, px + 2, py + 2)).toBe('puerta')
    expect(e.materiales.madera).toBe(MADERA - CONFIG_VALLAS.coste.puerta.madera)
    // Ni valla ni puerta pueden ir encima de otra (se quita primero).
    expect(error(e, colocar(e, [{ x: px + 2, y: py + 2 }], 'valla'))).toBe('sin-casillas-validas')
    expect(error(e, colocar(e, [{ x: px + 2, y: py + 2 }], 'puerta'))).toBe('sin-casillas-validas')
    const v = ok(lim, colocar(lim, [{ x: px + 2, y: py + 2 }], 'valla'))
    expect(error(v, colocar(v, [{ x: px + 2, y: py + 2 }], 'puerta'))).toBe('sin-casillas-validas')
  })

  it('línea parcialmente inválida: coloca solo las válidas y cobra solo esas (duplicadas, una vez)', () => {
    // Dos casillas dentro de la parcela, una repetida, y una fuera (parcela sin comprar).
    const casillas = [
      { x: px + 2, y: py + 2 },
      { x: px + 3, y: py + 2 },
      { x: px + 3, y: py + 2 },
      { x: AJENA_X, y: py + 2 },
    ]
    const r = aplicarComando(lim, colocar(lim, casillas))
    if (!r.ok) throw new Error(r.error)
    expect(en(r.estado, px + 2, py + 2)).toBe('valla')
    expect(en(r.estado, px + 3, py + 2)).toBe('valla')
    expect(en(r.estado, AJENA_X, py + 2)).toBeUndefined()
    expect(r.estado.materiales.madera).toBe(MADERA - 2 * CONFIG_VALLAS.coste.valla.madera)
    const v = validarVallas(lim, casillas, 'valla')
    expect(v.casillas.map((c) => c.motivo)).toEqual([undefined, undefined, 'no-propia'])
    expect(v.costeMadera).toBe(2 * CONFIG_VALLAS.coste.valla.madera)
  })

  it('fuera de parcela propia o del valle no se coloca (y ninguna válida es error)', () => {
    expect(error(lim, colocar(lim, [{ x: AJENA_X, y: py }]))).toBe('sin-casillas-validas')
    expect(
      error(
        lim,
        colocar(lim, [
          { x: -1, y: 0 },
          { x: LADO, y: 0 },
        ]),
      ),
    ).toBe('sin-casillas-validas')
    expect(error(lim, colocar(lim, []))).toBe('sin-casillas-validas')
    const v = validarVallas(
      lim,
      [
        { x: AJENA_X, y: py },
        { x: -3, y: 2 },
      ],
      'valla',
    )
    expect(v.casillas.map((c) => c.motivo)).toEqual(['no-propia', 'fuera-del-valle'])
  })

  it('rechaza parámetros inválidos y el Modo Vida', () => {
    expect(
      error(lim, { tipo: 'ColocarVallas', casillas: [{ x: 1.5, y: 2 }], tipoValla: 'valla' }),
    ).toBe('parametro-invalido')
    expect(
      error(lim, { tipo: 'ColocarVallas', casillas: fila(px, py, 1), tipoValla: 'muro' as never }),
    ).toBe('parametro-invalido')
    const vida = { ...lim, modo: 'vida' as const }
    expect(error(vida, colocar(vida, fila(px + 2, py + 2, 1)))).toBe('solo-en-plano')
  })

  it('bloquea-paso: las vallas que encierran terreno alcanzable se rechazan enteras, sin cobrar', () => {
    const cx = px + 10
    const cy = py + 10
    const cuatro = [
      { x: cx, y: cy - 1 },
      { x: cx, y: cy + 1 },
      { x: cx - 1, y: cy },
      { x: cx + 1, y: cy },
    ]
    const r = aplicarComando(lim, colocar(lim, cuatro))
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.error).toBe('bloquea-paso')
    expect(r.estado).toBe(lim)
    expect(validarVallas(lim, cuatro, 'valla').bloqueaPaso).toBe(true)
    // Tres vallas dejan un hueco: se puede.
    expect(ok(lim, colocar(lim, cuatro.slice(0, 3))).materiales.madera).toBe(
      MADERA - 3 * CONFIG_VALLAS.coste.valla.madera,
    )
  })

  it('bloquea-paso: con una puerta puesta antes sí se puede cerrar el cercado', () => {
    const cx = px + 10
    const cy = py + 10
    const conPuerta = ok(lim, colocar(lim, [{ x: cx + 1, y: cy }], 'puerta'))
    const tres = [
      { x: cx, y: cy - 1 },
      { x: cx, y: cy + 1 },
      { x: cx - 1, y: cy },
    ]
    const cerrado = ok(conPuerta, colocar(conPuerta, tres))
    expect(en(cerrado, cx, cy - 1)).toBe('valla')
    expect(en(cerrado, cx + 1, cy)).toBe('puerta')
    // Y la puerta puede ir también en el mismo comando que cierra: no bloquea, no se evalúa.
    expect(validarVallas(lim, [{ x: cx + 1, y: cy }], 'puerta').bloqueaPaso).toBe(false)
    // Una valla ya puesta cuenta como cerrada para el siguiente tramo.
    const parcial = ok(lim, colocar(lim, tres))
    expect(error(parcial, colocar(parcial, [{ x: cx + 1, y: cy }]))).toBe('bloquea-paso')
  })
})

describe('QuitarVallas', () => {
  const puestas = ok(
    ok(lim, colocar(lim, fila(px + 2, py + 2, 4))),
    colocar(lim, [{ x: px + 2, y: py + 5 }], 'puerta'),
  )

  it('quitar reembolsa según data/vallas.json', () => {
    const casillas = [...fila(px + 2, py + 2, 4), { x: px + 2, y: py + 5 }]
    const r = aplicarComando(puestas, { tipo: 'QuitarVallas', casillas })
    if (!r.ok) throw new Error(r.error)
    const { valla, puerta } = CONFIG_VALLAS.coste
    const esperado =
      Math.floor(4 * valla.madera * CONFIG_VALLAS.reembolsoQuitar) +
      Math.floor(puerta.madera * CONFIG_VALLAS.reembolsoQuitar)
    expect(r.estado.materiales.madera).toBe(puestas.materiales.madera + esperado)
    expect(esperado).toBeGreaterThan(0)
    expect(r.estado.vallas).toBe(vallasVacias(LADO))
    expect(r.eventos).toEqual([{ tipo: 'vallas-quitadas', casillas: 5, madera: esperado }])
  })

  it('solo quita las casillas que tienen valla; sin ninguna es error', () => {
    const r = ok(puestas, {
      tipo: 'QuitarVallas',
      casillas: [
        { x: px + 2, y: py + 2 },
        { x: px + 2, y: py + 2 },
        { x: px + 9, y: py + 9 },
      ],
    })
    expect(en(r, px + 2, py + 2)).toBeUndefined()
    expect(en(r, px + 3, py + 2)).toBe('valla')
    expect(error(puestas, { tipo: 'QuitarVallas', casillas: [{ x: px + 9, y: py + 9 }] })).toBe(
      'sin-casillas-validas',
    )
  })

  it('para cambiar una valla por puerta se quita y se pone', () => {
    const q = ok(puestas, { tipo: 'QuitarVallas', casillas: [{ x: px + 2, y: py + 2 }] })
    expect(en(ok(q, colocar(q, [{ x: px + 2, y: py + 2 }], 'puerta')), px + 2, py + 2)).toBe(
      'puerta',
    )
  })
})

describe('coherencia con Construir y arar', () => {
  const conValla = ok(lim, colocar(lim, [{ x: px + 5, y: py + 5 }]))
  const conPuerta = ok(lim, colocar(lim, [{ x: px + 5, y: py + 5 }], 'puerta'))
  const zona = (e: EstadoJuego): EstadoJuego =>
    ok(e, { tipo: 'PintarZona', x0: px, y0: py, x1: px + C - 1, y1: py + C - 1, zona: 'almacen' })
  const cultivo = (e: EstadoJuego): EstadoJuego =>
    ok(e, { tipo: 'PintarZona', x0: px, y0: py, x1: px + C - 1, y1: py + C - 1, zona: 'cultivo' })

  it('Construir sobre una valla o una puerta se rechaza como ocupada', () => {
    for (const e of [conValla, conPuerta]) {
      const z = zona(e)
      expect(
        error(z, { tipo: 'Construir', tipoEdificio: 'caja-envio', x: px + 4, y: py + 5 }),
      ).toBe('ocupada')
      // A un lado sí se puede construir.
      expect(
        error(z, { tipo: 'Construir', tipoEdificio: 'caja-envio', x: px + 10, y: py + 10 }),
      ).toBe('ok')
    }
  })

  it('MoverEdificio sobre una valla se rechaza', () => {
    let e = zona(conValla)
    e = ok(e, { tipo: 'Construir', tipoEdificio: 'caja-envio', x: px + 10, y: py + 10 })
    const terminado = {
      ...e,
      edificios: e.edificios.map((b) => ({ ...b, obra: null })),
    }
    expect(error(terminado, { tipo: 'MoverEdificio', id: 1, x: px + 4, y: py + 5 })).toBe('ocupada')
  })

  it('las vallas cuentan como bloqueadas en el bloquea-paso de Construir', () => {
    // Anillo de 3 vallas alrededor de (cx, cy) y un edificio que cerraría el cuarto lado.
    const cx = px + 10
    const cy = py + 10
    const e = zona(
      ok(
        lim,
        colocar(lim, [
          { x: cx, y: cy - 1 },
          { x: cx, y: cy + 1 },
          { x: cx - 1, y: cy },
        ]),
      ),
    )
    // `caja-envio` es 2x1: su huella (cx+1, cy) y (cx+2, cy) cierra el cuarto lado.
    expect(error(e, { tipo: 'Construir', tipoEdificio: 'caja-envio', x: cx + 1, y: cy })).toBe(
      'bloquea-paso',
    )
  })

  it('no se ara sobre una valla ni una puerta', () => {
    const z = cultivo(conValla)
    expect(motivoNoArar(z, px + 5, py + 5)).toBe('ocupada')
    expect(motivoNoArar(cultivo(conPuerta), px + 5, py + 5)).toBe('ocupada')
    expect(motivoNoArar(z, px + 6, py + 5)).toBeUndefined()
  })
})

describe('determinismo', () => {
  it('mismo estado y comando dan el mismo resultado y no mutan el estado', () => {
    const c = colocar(lim, fila(px + 2, py + 2, 3))
    const copia = JSON.stringify(lim)
    const a = aplicarComando(lim, c)
    const b = aplicarComando(lim, c)
    expect(a).toEqual(b)
    expect(JSON.stringify(lim)).toBe(copia)
  })
})
