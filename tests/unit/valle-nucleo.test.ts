import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  casillasRio,
  claveCasilla,
  CONFIG_VALLE,
  crearEstadoInicial,
  decorarValle,
  ladoValle,
  mapaTransitabilidad,
  rioVertical,
} from '../../src/core'
import huella from './fixtures/huella-valle-m1.json'

const h = (x: unknown): string => createHash('sha256').update(JSON.stringify(x)).digest('hex')

describe('río y decoración en el núcleo (M2-02)', () => {
  // Huella tomada con la implementación de M1 (src/game/valle) antes de moverla al núcleo.
  // El valle actual es de 8×8 parcelas de 20 casillas (M1-T01); la huella es del valle antiguo
  // de 6×6 de 16, así que se fija aquí la configuración de entonces para seguir comprobando que
  // el algoritmo no ha cambiado.
  const CONFIG_M1 = {
    ...CONFIG_VALLE,
    parcelasPorLado: 6,
    casillasPorParcela: 16,
    anchoRio: 4,
    densidadDecoracion: {
      prado: { arbol: 0.015, roca: 0.006 },
      bosque: { arbol: 0.16, roca: 0.01 },
      rocoso: { arbol: 0.012, roca: 0.1 },
    },
  }
  it.each([1, 42, 12345])('con la semilla %i produce exactamente lo mismo que en M1', (semilla) => {
    const { valle } = crearEstadoInicial({ semilla, dineroInicial: 0, configValle: CONFIG_M1 })
    const lado = ladoValle(valle)
    const rio = casillasRio(valle, CONFIG_M1.anchoRio)
    const claves = new Set(rio.map((c) => claveCasilla(lado, c.x, c.y)))
    const deco = decorarValle(valle, semilla, claves, CONFIG_M1.densidadDecoracion)
    const esperado = huella[String(semilla) as keyof typeof huella]
    expect(rio).toHaveLength(esperado.rio)
    expect(h(rio)).toBe(esperado.rioHash)
    expect(deco).toHaveLength(esperado.deco)
    expect(h(deco)).toBe(esperado.decoHash)
  })

  it('el estado guarda los obstáculos de M1, salvo unos pocos quitados para evitar bolsas', () => {
    for (const semilla of [1, 42, 12345]) {
      const e = crearEstadoInicial({ semilla, dineroInicial: 0 })
      const lado = ladoValle(e.valle)
      const claves = new Set(casillasRio(e.valle).map((c) => claveCasilla(lado, c.x, c.y)))
      const crudos = decorarValle(e.valle, semilla, claves)
      const guardados = new Set(e.obstaculos.map((o) => h(o)))
      expect(e.obstaculos.every((o) => crudos.some((c) => h(c) === h(o)))).toBe(true)
      expect(guardados.size).toBe(e.obstaculos.length)
      expect(crudos.length - e.obstaculos.length).toBeLessThan(crudos.length * 0.05)
    }
  })
})

describe('vados', () => {
  it.each([1, 42, 12345, 7, 99])(
    'hay vados y son casillas de río transitables (semilla %i)',
    (s) => {
      const e = crearEstadoInicial({ semilla: s, dineroInicial: 0 })
      const lado = ladoValle(e.valle)
      const rio = new Set(casillasRio(e.valle).map((c) => claveCasilla(lado, c.x, c.y)))
      expect(e.cauce.vados.length).toBeGreaterThan(0)
      const m = mapaTransitabilidad(e)
      for (const k of e.cauce.vados) {
        expect(rio.has(k)).toBe(true)
        expect(m.bloqueada[k]).toBe(0)
      }
      // Grosor de data/ por franja y entre min y max franjas.
      const vertical = rioVertical(e.valle)
      const franjas = new Set(
        e.cauce.vados.map((k) => (vertical ? Math.floor(k / lado) : k % lado)),
      )
      expect(franjas.size).toBeGreaterThanOrEqual(
        CONFIG_VALLE.vados.min * CONFIG_VALLE.vados.grosor,
      )
      expect(franjas.size).toBeLessThanOrEqual(CONFIG_VALLE.vados.max * CONFIG_VALLE.vados.grosor)
    },
  )

  it('son deterministas por semilla y varían entre semillas', () => {
    const a = crearEstadoInicial({ semilla: 5, dineroInicial: 0 }).cauce
    expect(crearEstadoInicial({ semilla: 5, dineroInicial: 0 }).cauce).toEqual(a)
    const distintos = new Set(
      Array.from({ length: 20 }, (_, i) =>
        JSON.stringify(crearEstadoInicial({ semilla: i, dineroInicial: 0 }).cauce.vados),
      ),
    )
    expect(distintos.size).toBeGreaterThan(5)
  })
})
