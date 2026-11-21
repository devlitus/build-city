import { describe, expect, it } from 'vitest'
import { crearEstadoInicial } from '../core'
import personajeJson from '../../data/personaje.json'
import puebloJson from '../../data/pueblo.json'
import {
  bordeSur,
  cargarPueblo,
  centroPlaza,
  huellasPueblo,
  puntosCamino,
  zonasLlanasPueblo,
} from './pueblo-datos'
import { dentroDelValle } from './terreno/coordenadas'

const valle = crearEstadoInicial({ semilla: 1 }).valle

describe('datos del pueblo', () => {
  it('los datos del pueblo cumplen el esquema', () => {
    expect(() => cargarPueblo(puebloJson)).not.toThrow()
    expect(() => cargarPueblo({ ...puebloJson, casas: [] })).toThrow()
    expect(() =>
      cargarPueblo({ ...puebloJson, plaza: { x: 0, distanciaAlBorde: -1, radio: 8 } }),
    ).toThrow()
  })

  it('ningún edificio del pueblo cae dentro de una parcela', () => {
    const huellas = huellasPueblo(valle)
    expect(huellas.length).toBeGreaterThan(3)
    for (const huella of huellas) {
      for (const p of huella) expect(dentroDelValle(p.x, p.z, valle)).toBe(false)
    }
  })

  it('la plaza está a menos de 1 minuto andando del centro', () => {
    const c = centroPlaza(valle)
    const distancia = Math.hypot(c.x, c.z)
    expect(distancia).toBeLessThanOrEqual(personajeJson.velocidadAndar * 60)
  })

  it('el primer edificio está a 80 m o menos del borde sur', () => {
    const borde = bordeSur(valle)
    const masCercano = Math.min(...huellasPueblo(valle).flatMap((h) => h.map((p) => p.z - borde)))
    expect(masCercano).toBeGreaterThan(0)
    expect(masCercano).toBeLessThanOrEqual(80)
  })

  it('el camino va del borde sur del valle a la plaza, sin saltos mayores que el paso', () => {
    const puntos = puntosCamino(valle, undefined, 2)
    const primero = puntos[0]
    const ultimo = puntos[puntos.length - 1]
    expect(primero?.z).toBe(bordeSur(valle))
    expect(ultimo?.z).toBeLessThanOrEqual(centroPlaza(valle).z)
    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1]
      const b = puntos[i]
      expect(Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.z ?? 0) - (a?.z ?? 0))).toBeLessThanOrEqual(
        2 + 1e-9,
      )
    }
  })

  it('las zonas llanas cubren la plaza y arrancan en el borde sur', () => {
    const zonas = zonasLlanasPueblo(valle)
    expect(zonas).toHaveLength(2)
    expect(zonas[1]?.az).toBe(bordeSur(valle))
  })
})
