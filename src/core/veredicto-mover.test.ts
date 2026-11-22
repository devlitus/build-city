/* eslint-disable @typescript-eslint/no-non-null-assertion -- aserciones de ids y catálogo conocidos en tests */
import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  colocacionValida,
  crearEstadoInicial,
  defEdificio,
  edificioEnCasilla,
  huellaDe,
  ladoValle,
  reembolso,
  rotacionDe,
  veredictoMover,
  type Comando,
  type EstadoJuego,
  type TipoEdificio,
} from './index'

/** Plano con todas las parcelas propias, vivienda a la izquierda y almacén a la derecha. */
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

function ok(e: EstadoJuego, c: Comando): EstadoJuego {
  const r = aplicarComando(e, c)
  if (!r.ok) throw new Error(`rechazado: ${r.error}`)
  return r.estado
}

/** Primer sitio válido para `tipo` en `e` (sin mirar costes). */
function sitio(e: EstadoJuego, tipo: TipoEdificio): { x: number; y: number } {
  const lado = ladoValle(e.valle)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if (colocacionValida(e, tipo, x, y, { ignorarCostes: true }).valida) return { x, y }
    }
  }
  throw new Error(`sin sitio para ${tipo}`)
}

/** Construye `tipo` y lo da por terminado (obra: null). */
function conEdificio(tipo: TipoEdificio): { e: EstadoJuego; id: number; x: number; y: number } {
  const s = sitio(base, tipo)
  const id = base.siguienteIdEdificio
  const e = ok(base, { tipo: 'Construir', tipoEdificio: tipo, ...s })
  return { e, id, ...s }
}

describe('edificioEnCasilla', () => {
  it('devuelve el edificio que cubre la casilla, en toda su huella, y nada fuera', () => {
    const c = conEdificio('cobertizo')
    const lado = ladoValle(c.e.valle)
    const h = huellaDe(defEdificio('cobertizo')!, c.x, c.y, 0)
    for (const [x, y] of [
      [h.x0, h.y0],
      [h.x1, h.y1],
      [h.x0, h.y1],
    ] as const) {
      expect(edificioEnCasilla(c.e, x, y, lado)?.id).toBe(c.id)
    }
    expect(edificioEnCasilla(c.e, h.x1 + 1, h.y0, lado)).toBeUndefined()
    expect(edificioEnCasilla(c.e, h.x0, h.y0 - 1, lado)).toBeUndefined()
  })
  it('respeta el giro y no falla fuera del valle ni con coordenadas raras', () => {
    const c = conEdificio('cobertizo')
    const lado = ladoValle(c.e.valle)
    const girado = ok(
      { ...c.e, edificios: c.e.edificios.map((b) => ({ ...b, obra: null })) },
      {
        tipo: 'MoverEdificio',
        id: c.id,
        x: c.x,
        y: c.y,
        rotacion: 1,
      },
    )
    const b = girado.edificios[0]!
    const h = huellaDe(defEdificio('cobertizo')!, b.x, b.y, rotacionDe(b))
    expect(edificioEnCasilla(girado, h.x1, h.y1, lado)?.id).toBe(c.id)
    expect(edificioEnCasilla(girado, -1, 0, lado)).toBeUndefined()
    expect(edificioEnCasilla(girado, lado, 0, lado)).toBeUndefined()
    expect(edificioEnCasilla(girado, 1.5, 0, lado)).toBeUndefined()
    expect(edificioEnCasilla({ edificios: [] }, 0, 0, lado)).toBeUndefined()
  })
})

describe('veredictoMover', () => {
  it('una obra no se mueve: en-obra, igual que MoverEdificio', () => {
    const c = conEdificio('cobertizo')
    const v = veredictoMover(c.e, c.id, c.x, c.y, 0)
    expect(v).toMatchObject({ valida: false, motivo: 'en-obra' })
    expect(
      aplicarComando(c.e, { tipo: 'MoverEdificio', id: c.id, x: c.x, y: c.y, rotacion: 0 }),
    ).toMatchObject({ ok: false, error: 'en-obra' })
  })
  it('un id inexistente dice edificio-inexistente', () => {
    expect(veredictoMover(base, 999, 0, 0, 0)).toMatchObject({
      valida: false,
      motivo: 'edificio-inexistente',
    })
  })
  it('terminado: válido en su sitio y rojo en el agua o fuera del valle; nunca pide dinero', () => {
    const c = conEdificio('cobertizo')
    const e = { ...c.e, edificios: c.e.edificios.map((b) => ({ ...b, obra: null })) }
    expect(veredictoMover(e, c.id, c.x, c.y, 0)).toEqual({ valida: true })
    const fuera = veredictoMover(e, c.id, -5, -5, 0)
    expect(fuera.valida).toBe(false)
    if (!fuera.valida) expect(fuera.faltan).toEqual({ dinero: 0, madera: 0, piedra: 0 })
    const pobre = { ...e, dinero: 0, materiales: { madera: 0, piedra: 0 } }
    expect(veredictoMover(pobre, c.id, c.x, c.y, 1).valida).toBe(
      aplicarComando(pobre, { tipo: 'MoverEdificio', id: c.id, x: c.x, y: c.y, rotacion: 1 }).ok,
    )
  })
})

describe('vista previa del reembolso = lo que aplica el núcleo', () => {
  const diferencia = (antes: EstadoJuego, despues: EstadoJuego) => ({
    dinero: despues.dinero - antes.dinero,
    madera: despues.materiales.madera - antes.materiales.madera,
    piedra: despues.materiales.piedra - antes.materiales.piedra,
  })

  it.each(['cobertizo', 'caja-envio', 'tienda'] as const)(
    'DemolerEdificio de %s devuelve exactamente reembolso()',
    (tipo) => {
      const c = conEdificio(tipo)
      let e = c.e
      // Terminada: se avanza la obra a mano (no es lo que se prueba aquí).
      e = { ...e, edificios: e.edificios.map((b) => ({ ...b, obra: null })) }
      const previa = reembolso(e, c.id)!
      expect(previa.accion).toBe('demoler')
      expect(diferencia(e, ok(e, { tipo: 'DemolerEdificio', id: c.id }))).toEqual(previa.coste)
    },
  )

  it.each(['cobertizo', 'caja-envio', 'tienda'] as const)(
    'CancelarObra de %s devuelve exactamente reembolso() (todo lo pagado)',
    (tipo) => {
      const c = conEdificio(tipo)
      const previa = reembolso(c.e, c.id)!
      expect(previa.accion).toBe('cancelar')
      expect(previa.coste).toEqual(c.e.edificios[0]!.pagado)
      expect(diferencia(c.e, ok(c.e, { tipo: 'CancelarObra', id: c.id }))).toEqual(previa.coste)
    },
  )

  it('la casa terminada no tiene vista previa y DemolerEdificio la rechaza', () => {
    const c = conEdificio('casa')
    const e = { ...c.e, edificios: c.e.edificios.map((b) => ({ ...b, obra: null })) }
    expect(reembolso(e, c.id)).toBeUndefined()
    expect(aplicarComando(e, { tipo: 'DemolerEdificio', id: c.id })).toMatchObject({
      ok: false,
      error: 'no-demolible',
    })
  })
})
