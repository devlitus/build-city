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
  it('elige el más cercano, sea cual sea el orden de la lista', () => {
    const pos = { x: 10.5, y: 10.2 }
    const cerca = arbol(10, 11) // centro (10.5, 11.5): distancia 1.3
    const lejos = arbol(11, 11) // centro (11.5, 11.5): distancia ~1.64
    const cfg = { alcance: 3, anguloCono: 180 }
    for (const lista of [
      [cerca, lejos],
      [lejos, cerca],
    ]) {
      const r = objetivoDelante(pos, 'sur', con(...lista), cfg)
      expect(r).toMatchObject({ tipo: 'obstaculo', x: 10, y: 11, obstaculo: cerca })
    }
  })

  it('ignora lo que está detrás', () => {
    const r = objetivoDelante(P, 'sur', con(arbol(10, 9)))
    expect(r.tipo).toBe('casilla')
  })

  it('ignora lo que está fuera de alcance', () => {
    // El vecino está en el área 3x3 y en el cono, pero a 1.45 > alcance 1.2.
    const pos = { x: 10.5, y: 10.05 }
    const r = objetivoDelante(pos, 'sur', con(arbol(10, 11)), { alcance: 1.2, anguloCono: 100 })
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

describe('objetivoDelante con herramientas de cultivo', () => {
  const conH = (
    herramienta: 'azada' | 'semillas' | 'regadera' | 'mano' | 'hacha',
    ...o: Obstaculo[]
  ) => ({
    obstaculos: o,
    herramienta,
  })

  it('con la azada devuelve la casilla delante, aunque haya un obstáculo en el cono', () => {
    const r = objetivoDelante(P, 'sur', conH('azada', arbol(10, 11)))
    expect(r).toEqual({ tipo: 'casilla', x: 10, y: 11 })
  })

  it('semillas, regadera y mano también devuelven la casilla de suelo', () => {
    for (const h of ['semillas', 'regadera', 'mano'] as const) {
      expect(objetivoDelante(P, 'este', conH(h, arbol(11, 10)))).toEqual({
        tipo: 'casilla',
        x: 11,
        y: 10,
      })
    }
  })

  it('el hacha sigue prefiriendo el obstáculo', () => {
    expect(objetivoDelante(P, 'sur', conH('hacha', arbol(10, 11))).tipo).toBe('obstaculo')
  })

  it('la casilla delante en las cuatro direcciones y en diagonal', () => {
    const e = conH('azada')
    expect(objetivoDelante(P, 'norte', e)).toMatchObject({ x: 10, y: 9 })
    expect(objetivoDelante(P, 'sur', e)).toMatchObject({ x: 10, y: 11 })
    expect(objetivoDelante(P, 'este', e)).toMatchObject({ x: 11, y: 10 })
    expect(objetivoDelante(P, 'oeste', e)).toMatchObject({ x: 9, y: 10 })
    // «En diagonal»: personaje pegado a la esquina de su casilla; sigue siendo la contigua en la
    // orientación de 4 lados (la diagonal real es la deuda #107).
    const esquina = { x: 10.95, y: 10.95 }
    expect(objetivoDelante(esquina, 'sur', e)).toMatchObject({ x: 10, y: 11 })
    expect(objetivoDelante(esquina, 'este', e)).toMatchObject({ x: 11, y: 10 })
  })
})
