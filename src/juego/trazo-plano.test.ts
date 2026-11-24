import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  CONFIG_CAMINOS,
  CONFIG_VALLAS,
  crearEstadoInicial,
  type Comando,
  type EstadoJuego,
} from '../core'
import {
  comandoDeTrazo,
  crearCanalTrazoPlano,
  firmaResumen,
  resumenTrazo,
  trazoEnviable,
} from './trazo-plano'

const base = crearEstadoInicial({ semilla: 42, dineroInicial: 100_000 })
const C = base.valle.casillasPorParcela
const N = base.valle.parcelasPorLado
const iParcela = base.valle.parcelas.findIndex(
  (_, i) =>
    !base.valle.rio.includes(i) &&
    i !== Math.floor(base.aparicion.y / C) * N + Math.floor(base.aparicion.x / C),
)
const px = (iParcela % N) * C
const py = Math.floor(iParcela / N) * C

function escenario(extra: Partial<EstadoJuego> = {}): EstadoJuego {
  const r = aplicarComando(base, { tipo: 'ComprarParcela', indice: iParcela })
  if (!r.ok) throw new Error(r.error)
  return {
    ...r.estado,
    obstaculos: [],
    modo: 'plano',
    materiales: { madera: 100, piedra: 100 },
    ...extra,
  }
}
const fila = (x0: number, y0: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ x: x0 + i, y: y0 }))
const ok = (e: EstadoJuego, c: Comando): EstadoJuego => {
  const r = aplicarComando(e, c)
  if (!r.ok) throw new Error(r.error)
  return r.estado
}

describe('resumenTrazo', () => {
  it('vallas: coste total de las válidas y rojas las inválidas con su motivo', () => {
    const e = escenario()
    const casillas = [...fila(px + 1, py + 1, 3), { x: px - 1, y: py + 1 }]
    const r = resumenTrazo(e, 'vallas', casillas, false)
    expect(r.recurso).toBe('madera')
    expect(r.validas).toBe(3)
    expect(r.invalidas).toBe(1)
    expect(r.cantidad).toBe(3 * CONFIG_VALLAS.coste.valla.madera)
    expect(r.casillas.map((c) => c.valida)).toEqual([true, true, true, false])
    expect(['no-propia', 'fuera-del-valle']).toContain(r.motivo)
    expect(trazoEnviable(r)).toBe(true)
  })

  it('puertas cuestan lo suyo', () => {
    const r = resumenTrazo(escenario(), 'puertas', fila(px + 1, py + 1, 2), false)
    expect(r.cantidad).toBe(2 * CONFIG_VALLAS.coste.puerta.madera)
  })

  it('caminos: coste en piedra, y casilla con valla en rojo con motivo valla', () => {
    let e = escenario()
    e = ok(e, { tipo: 'ColocarVallas', casillas: [{ x: px + 2, y: py + 1 }], tipoValla: 'valla' })
    const r = resumenTrazo(e, 'caminos', fila(px + 1, py + 1, 3), false)
    expect(r.recurso).toBe('piedra')
    expect(r.validas).toBe(2)
    expect(r.cantidad).toBe(2 * CONFIG_CAMINOS.costePiedra)
    expect(r.casillas[1]).toMatchObject({ valida: false, motivo: 'valla' })
  })

  it('valla sobre camino sale en rojo con motivo camino', () => {
    let e = escenario()
    e = ok(e, { tipo: 'ColocarCamino', casillas: [{ x: px + 1, y: py + 1 }] })
    const r = resumenTrazo(e, 'vallas', [{ x: px + 1, y: py + 1 }], false)
    expect(r.validas).toBe(0)
    expect(r.motivo).toBe('camino')
    expect(trazoEnviable(r)).toBe(false)
  })

  it('sin material: no se puede soltar', () => {
    const e = escenario({ materiales: { madera: 0, piedra: 0 } })
    const v = resumenTrazo(e, 'vallas', fila(px + 1, py + 1, 2), false)
    expect(v.sinFondos).toBe(true)
    expect(trazoEnviable(v)).toBe(false)
    const c = resumenTrazo(e, 'caminos', fila(px + 1, py + 1, 2), false)
    expect(c.sinFondos).toBe(true)
  })

  it('quitar vallas: reembolso y casillas vacías en rojo', () => {
    let e = escenario()
    e = ok(e, { tipo: 'ColocarVallas', casillas: fila(px + 1, py + 1, 2), tipoValla: 'valla' })
    const r = resumenTrazo(e, 'vallas', fila(px + 1, py + 1, 3), true)
    expect(r.quitar).toBe(true)
    expect(r.validas).toBe(2)
    expect(r.motivo).toBe('nada-que-quitar')
    expect(r.cantidad).toBe(
      Math.floor(2 * CONFIG_VALLAS.coste.valla.madera * CONFIG_VALLAS.reembolsoQuitar),
    )
    expect(r.sinFondos).toBe(false)
  })

  it('quitar caminos: reembolso de piedra', () => {
    let e = escenario()
    e = ok(e, { tipo: 'ColocarCamino', casillas: fila(px + 1, py + 1, 2) })
    const r = resumenTrazo(e, 'caminos', fila(px + 1, py + 1, 3), true)
    expect(r.validas).toBe(2)
    expect(r.cantidad).toBe(2 * CONFIG_CAMINOS.reembolsoPiedra)
    expect(r.recurso).toBe('piedra')
  })
})

describe('comandoDeTrazo', () => {
  const e = escenario()
  const casillas = [...fila(px + 1, py + 1, 2), { x: px - 1, y: py + 1 }]
  it('envía solo las casillas válidas con el comando de la herramienta', () => {
    const dos = fila(px + 1, py + 1, 2)
    expect(comandoDeTrazo(resumenTrazo(e, 'vallas', casillas, false))).toEqual({
      tipo: 'ColocarVallas',
      casillas: dos,
      tipoValla: 'valla',
    })
    expect(comandoDeTrazo(resumenTrazo(e, 'puertas', casillas, false))).toMatchObject({
      tipoValla: 'puerta',
    })
    expect(comandoDeTrazo(resumenTrazo(e, 'caminos', casillas, false))).toEqual({
      tipo: 'ColocarCamino',
      casillas: dos,
    })
  })
  it('con Mayús, los comandos de quitar', () => {
    const v = ok(e, {
      tipo: 'ColocarVallas',
      casillas: fila(px + 1, py + 1, 2),
      tipoValla: 'valla',
    })
    expect(comandoDeTrazo(resumenTrazo(v, 'vallas', casillas, true)).tipo).toBe('QuitarVallas')
    expect(comandoDeTrazo(resumenTrazo(v, 'puertas', casillas, true)).tipo).toBe('QuitarVallas')
    expect(comandoDeTrazo(resumenTrazo(v, 'caminos', casillas, true)).tipo).toBe('QuitarCamino')
  })
  it('el comando enviado lo acepta el núcleo', () => {
    const r = resumenTrazo(e, 'vallas', casillas, false)
    expect(aplicarComando(e, comandoDeTrazo(r)).ok).toBe(true)
  })
})

describe('canal del trazo', () => {
  it('avisa solo cuando el resumen cambia y permite desuscribirse', () => {
    const e = escenario()
    const c = crearCanalTrazoPlano()
    let n = 0
    const baja = c.suscribir(() => n++)
    const r = resumenTrazo(e, 'vallas', fila(px + 1, py + 1, 2), false)
    c.fijar(r)
    c.fijar({ ...r })
    expect(n).toBe(1)
    expect(firmaResumen(null)).toBe('')
    c.fijar(null)
    expect(n).toBe(2)
    expect(c.resumen).toBeNull()
    baja()
    c.fijar(r)
    expect(n).toBe(2)
  })
})
