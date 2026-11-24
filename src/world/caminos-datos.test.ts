import { describe, expect, it } from 'vitest'
import {
  cargarDibujoCaminos,
  contornoLosa,
  DATOS_DIBUJO_CAMINOS as D,
  parametrosLosa,
  piedrasDeCasilla,
} from './caminos-datos'

describe('datos del dibujo de caminos', () => {
  it('rechaza un color que no está en la paleta', () => {
    const malo = { ...D, losa: { ...D.losa, colorA: 'noExiste' } }
    expect(() => cargarDibujoCaminos(malo)).toThrow(/paleta/)
  })
  it('rechaza una escala mínima mayor que la máxima', () => {
    const malo = { ...D, losa: { ...D.losa, escalaMin: 2, escalaMax: 1 } }
    expect(() => cargarDibujoCaminos(malo)).toThrow(/escala/)
  })
})

describe('contornoLosa', () => {
  it('tiene 4 * puntosPorLado puntos dentro de la losa y es determinista', () => {
    const c = contornoLosa(D.losa)
    expect(c).toHaveLength(4 * D.losa.puntosPorLado)
    expect(contornoLosa(D.losa)).toEqual(c)
    for (const [x, z] of c) {
      expect(Math.abs(x)).toBeLessThanOrEqual(D.losa.lado / 2 + 1e-9)
      expect(Math.abs(z)).toBeLessThanOrEqual(D.losa.lado / 2 + 1e-9)
    }
  })
  it('el borde es irregular si hay irregularidad y recto si no', () => {
    const irregular = contornoLosa(D.losa)
    const recto = contornoLosa({ ...D.losa, irregularidad: 0 })
    expect(irregular).not.toEqual(recto)
    expect(recto[0]).toEqual([-D.losa.lado / 2, -D.losa.lado / 2])
  })
})

describe('parametrosLosa y piedrasDeCasilla', () => {
  it('son deterministas por casilla y respetan los rangos', () => {
    for (let i = 0; i < 200; i++) {
      const p = parametrosLosa(i, D)
      expect(parametrosLosa(i, D)).toEqual(p)
      expect([0, 1, 2, 3]).toContain(p.giro)
      expect(p.escala).toBeGreaterThanOrEqual(D.losa.escalaMin)
      expect(p.escala).toBeLessThanOrEqual(D.losa.escalaMax)
      expect(p.tono).toBeGreaterThanOrEqual(0)
      expect(p.tono).toBeLessThan(1)
    }
  })
  it('las piedras caen dentro de la casilla y con claves únicas', () => {
    const claves = new Set<number>()
    for (let i = 0; i < 100; i++) {
      const piedras = piedrasDeCasilla(i, D)
      expect(piedras).toHaveLength(D.piedras.porCasilla)
      expect(piedrasDeCasilla(i, D)).toEqual(piedras)
      for (const q of piedras) {
        expect(Math.abs(q.dx)).toBeLessThanOrEqual(0.5 - D.piedras.margen)
        expect(Math.abs(q.dz)).toBeLessThanOrEqual(0.5 - D.piedras.margen)
        expect(q.radio).toBeGreaterThan(0)
        expect(q.radio).toBeLessThanOrEqual(D.piedras.radio)
        claves.add(q.clave)
      }
    }
    expect(claves.size).toBe(100 * D.piedras.porCasilla)
  })
  it('casillas distintas tienen piedras distintas', () => {
    expect(piedrasDeCasilla(1, D)).not.toEqual(piedrasDeCasilla(2, D))
  })
})
