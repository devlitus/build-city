import { describe, expect, it } from 'vitest'
import { circuloSolapaBloqueo } from './colision'
import { aplicarComando } from './comandos'
import { CONFIG_PERSONAJE } from './datos/personaje'
import { CONFIG_CAMINOS } from './datos/caminos'
import { crearEstadoInicial } from './estado'
import { ladoValle, mapaTransitabilidad } from './mapa'

const SEMILLAS = [1, 2, 3, 7, 42, 99, 2024, 12345]

function libre(semilla: number) {
  return { ...crearEstadoInicial({ semilla, dineroInicial: 0 }), obstaculos: [] }
}

describe('MoverPersonaje: velocidades', () => {
  it('andar y correr usan sus velocidades', () => {
    const e = libre(42)
    const paso = (corre: boolean | undefined) => {
      const base = { tipo: 'MoverPersonaje', dx: 0, dy: -1, ms: 200 } as const
      const r = aplicarComando(e, corre === undefined ? base : { ...base, corre })
      if (!r.ok) throw new Error(r.error)
      return e.personaje.y - r.estado.personaje.y
    }
    expect(paso(undefined)).toBeCloseTo((CONFIG_PERSONAJE.velocidadAndar * 200) / 1000, 6)
    expect(paso(false)).toBeCloseTo((CONFIG_PERSONAJE.velocidadAndar * 200) / 1000, 6)
    expect(paso(true)).toBeCloseTo((CONFIG_PERSONAJE.velocidadCorrer * 200) / 1000, 6)
    expect(CONFIG_PERSONAJE.velocidadCorrer).toBeGreaterThan(CONFIG_PERSONAJE.velocidadAndar)
  })

  it('velocidad sobre camino × multiplicador (andar y correr); fuera del camino no cambia', () => {
    const e = libre(42)
    const x = Math.floor(e.personaje.x)
    const y = Math.floor(e.personaje.y)
    const lado = ladoValle(e.valle)
    const celdas = e.caminos.split('')
    celdas[y * lado + x] = 'c'
    const sobre = { ...e, caminos: celdas.join('') }
    const lejos = { ...e, caminos: celdas.join('').replace('c', '.') }
    const avance = (est: typeof e, corre: boolean) => {
      const r = aplicarComando(est, { tipo: 'MoverPersonaje', dx: 0, dy: -1, ms: 100, corre })
      if (!r.ok) throw new Error(r.error)
      return e.personaje.y - r.estado.personaje.y
    }
    const m = CONFIG_CAMINOS.multiplicadorVelocidad
    expect(m).toBeGreaterThan(1)
    expect(avance(sobre, false)).toBeCloseTo((CONFIG_PERSONAJE.velocidadAndar * 100 * m) / 1000, 6)
    expect(avance(sobre, true)).toBeCloseTo((CONFIG_PERSONAJE.velocidadCorrer * 100 * m) / 1000, 6)
    expect(avance(lejos, false)).toBeCloseTo((CONFIG_PERSONAJE.velocidadAndar * 100) / 1000, 6)
    expect(avance(lejos, true)).toBeCloseTo((CONFIG_PERSONAJE.velocidadCorrer * 100) / 1000, 6)
    // Un camino en una casilla vecina no afecta.
    const vecina = [...e.caminos]
    vecina[y * lado + x + 1] = 'c'
    const otra = { ...e, caminos: vecina.join('') }
    expect(avance(otra, false)).toBeCloseTo((CONFIG_PERSONAJE.velocidadAndar * 100) / 1000, 6)
  })

  it('correr sobre camino con el tope de ms no atraviesa un muro', () => {
    const e = libre(42)
    const x = Math.floor(e.personaje.x)
    const y = Math.floor(e.personaje.y)
    const lado = ladoValle(e.valle)
    const celdas = e.caminos.split('')
    celdas[y * lado + x] = 'c'
    // Casa (7×5) justo al norte: su borde sur queda en y (borde de la casilla y-1).
    const casa = {
      id: 1,
      tipo: 'casa',
      x: x - 3,
      y: y - 5,
      obra: null,
      pagado: { dinero: 0, madera: 0, piedra: 0 },
    } as never
    const s = { ...e, caminos: celdas.join(''), edificios: [casa], siguienteIdEdificio: 2 }
    const ms = CONFIG_PERSONAJE.maxMsPorComando
    // Sin muro llegaría mucho más allá de la casa: el avance pedido es mayor que la holgura.
    const pedido =
      (CONFIG_PERSONAJE.velocidadCorrer * CONFIG_CAMINOS.multiplicadorVelocidad * ms) / 1000
    expect(pedido).toBeGreaterThan(s.personaje.y - y)
    const r = aplicarComando(s, { tipo: 'MoverPersonaje', dx: 0, dy: -1, ms, corre: true })
    if (!r.ok) throw new Error(r.error)
    expect(r.estado.personaje.y).toBeGreaterThanOrEqual(y + CONFIG_PERSONAJE.radio - 1e-9)
    expect(
      circuloSolapaBloqueo(
        mapaTransitabilidad(r.estado),
        r.estado.personaje.x,
        r.estado.personaje.y,
        CONFIG_PERSONAJE.radio,
      ),
    ).toBe(false)
  })

  it('`corre` que no es booleano es un parámetro inválido', () => {
    const r = aplicarComando(libre(42), {
      tipo: 'MoverPersonaje',
      dx: 1,
      dy: 0,
      ms: 100,
      corre: 1 as unknown as boolean,
    })
    expect(r.ok).toBe(false)
  })

  it('dirección cero no mueve', () => {
    const e = libre(42)
    for (const corre of [false, true]) {
      const r = aplicarComando(e, { tipo: 'MoverPersonaje', dx: 0, dy: 0, ms: 200, corre })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.estado).toBe(e)
    }
  })
})

describe('aparición y radio (deuda #49)', () => {
  it.each(SEMILLAS)('el círculo del personaje no solapa nada al aparecer (semilla %i)', (s) => {
    const e = crearEstadoInicial({ semilla: s, dineroInicial: 0 })
    const lado = ladoValle(e.valle)
    const { radio } = CONFIG_PERSONAJE
    expect(e.personaje.x).toBeGreaterThan(radio)
    expect(e.personaje.y).toBeLessThan(lado - radio)
    expect(circuloSolapaBloqueo(mapaTransitabilidad(e), e.personaje.x, e.personaje.y, radio)).toBe(
      false,
    )
  })
})
