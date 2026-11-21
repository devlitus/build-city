import { describe, expect, it } from 'vitest'
import { CONFIG_HERRAMIENTAS } from './datos/herramientas'
import type { Obstaculo } from './decoracion'
import { crearEstadoInicial } from './estado'
import { casillaAlAlcance } from './herramientas'
import { objetivoDelante } from './objetivo'

const arbol = (x: number, y: number): Obstaculo => ({ tipo: 'arbol', x, y, variante: 0.5 })
const con = (...obstaculos: Obstaculo[]) => ({ obstaculos })
// Personaje en el centro de la casilla (10, 10).
const P = { x: 10.5, y: 10.5 }

describe('objetivoDelante', () => {
  it('elige el más cercano', () => {
    const lejos = arbol(10, 12)
    const cerca = arbol(10, 11)
    const r = objetivoDelante(P, 'sur', con(lejos, cerca), { alcance: 3, anguloCono: 90 })
    expect(r).toMatchObject({ tipo: 'obstaculo', x: 10, y: 11, obstaculo: cerca })
  })

  it('ignora lo que está detrás', () => {
    const r = objetivoDelante(P, 'sur', con(arbol(10, 9)))
    expect(r.tipo).toBe('casilla')
  })

  it('ignora lo que está fuera de alcance', () => {
    const r = objetivoDelante(P, 'sur', con(arbol(10, 13)), { alcance: 1.6, anguloCono: 100 })
    expect(r).toEqual({ tipo: 'casilla', x: 10, y: 11 })
  })

  it('ignora lo que está fuera del cono', () => {
    const r = objetivoDelante(P, 'sur', con(arbol(11, 10)), { alcance: 3, anguloCono: 60 })
    expect(r.tipo).toBe('casilla')
  })

  it('sin obstáculos devuelve la casilla delante', () => {
    expect(objetivoDelante(P, 'este', con())).toEqual({ tipo: 'casilla', x: 11, y: 10 })
    expect(objetivoDelante(P, 'norte', con())).toEqual({ tipo: 'casilla', x: 10, y: 9 })
  })

  it('el objetivo siempre está al alcance de UsarHerramienta, aun con un alcance de datos grande', () => {
    const e = crearEstadoInicial({ semilla: 1, dineroInicial: 0 })
    const obstaculos: Obstaculo[] = []
    for (let x = 5; x <= 16; x++) for (let y = 5; y <= 16; y++) obstaculos.push(arbol(x, y))
    for (const orient of ['norte', 'sur', 'este', 'oeste'] as const) {
      for (const pos of [P, { x: 10.01, y: 10.99 }, { x: 10.99, y: 10.01 }]) {
        const r = objetivoDelante(pos, orient, { obstaculos }, { alcance: 3, anguloCono: 180 })
        expect(casillaAlAlcance(pos, r.x, r.y)).toBe(true)
      }
    }
    const r = objetivoDelante(P, 'sur', { obstaculos: e.obstaculos })
    expect(casillaAlAlcance(P, r.x, r.y)).toBe(true)
  })

  it('los datos por defecto se cargan', () => {
    expect(CONFIG_HERRAMIENTAS.alcance).toBeGreaterThan(0)
  })
})
