import { describe, expect, it } from 'vitest'
import { circuloSolapaBloqueo } from './colision'
import { aplicarComando } from './comandos'
import { CONFIG_PERSONAJE } from './datos/personaje'
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
