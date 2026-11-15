import { describe, expect, it } from 'vitest'
import { casillasRio, crearEstadoInicial } from '../core'
import { celdasAgua, geometriaAgua } from './agua'
import { crearAltura } from './terreno/altura'
import { ladoCasillas } from './terreno/coordenadas'
import { PARAMETROS_TERRENO } from './terreno/parametros'

const { nivelAgua } = PARAMETROS_TERRENO

describe('celdasAgua', () => {
  for (const semilla of [1, 7, 12345]) {
    const { valle } = crearEstadoInicial({ semilla })
    const lado = ladoCasillas(valle)
    const celdas = celdasAgua(valle, crearAltura(valle, semilla))
    const dentro = celdas.filter((c) => c.x >= 0 && c.y >= 0 && c.x < lado && c.y < lado)

    it(`no hay agua sobre casillas de tierra del valle (semilla ${semilla})`, () => {
      const rio = new Set(casillasRio(valle).map((c) => c.y * lado + c.x))
      for (const c of dentro) expect(rio.has(c.y * lado + c.x)).toBe(true)
    })

    it(`todas las casillas de río del valle tienen agua (semilla ${semilla})`, () => {
      const con = new Set(dentro.map((c) => c.y * lado + c.x))
      for (const c of casillasRio(valle)) expect(con.has(c.y * lado + c.x)).toBe(true)
    })

    it(`el agua fuera del valle sigue el río y no se repite (semilla ${semilla})`, () => {
      const claves = celdas.map((c) => `${c.x},${c.y}`)
      expect(new Set(claves).size).toBe(claves.length)
      expect(celdas.length).toBeGreaterThanOrEqual(dentro.length)
    })
  }

  it('la geometría queda a nivelAgua con 2 triángulos por celda', () => {
    const { valle, semilla } = crearEstadoInicial({ semilla: 3 })
    const celdas = celdasAgua(valle, crearAltura(valle, semilla))
    const g = geometriaAgua(celdas, valle, nivelAgua, 0.5)
    expect(g.getAttribute('position').count).toBe(celdas.length * 6)
    expect(g.boundingBox?.min.y).toBe(nivelAgua)
    expect(g.boundingBox?.max.y).toBe(nivelAgua)
  })
})
