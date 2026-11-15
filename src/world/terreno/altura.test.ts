import { describe, expect, it } from 'vitest'
import { casillasRio, crearEstadoInicial, type Valle } from '../../core'
import { alturaTerreno, crearAltura } from './altura'
import { casillaAMetros, ladoMetros } from './coordenadas'
import { PARAMETROS_TERRENO } from './parametros'

const { nivelAgua, cauce, colinas } = PARAMETROS_TERRENO

function valleDe(semilla: number): Valle {
  return crearEstadoInicial({ semilla }).valle
}

/** Centros (m) de las casillas del río. */
function centrosRio(valle: Valle): { x: number; z: number }[] {
  return casillasRio(valle).map((c) => casillaAMetros(c.x, c.y, valle))
}

describe('alturaTerreno', () => {
  it('las parcelas son casi llanas (pendiente máxima)', () => {
    for (const semilla of [1, 7, 12345]) {
      const valle = valleDe(semilla)
      const altura = crearAltura(valle, semilla)
      const mitad = ladoMetros(valle) / 2
      const rio = centrosRio(valle)
      // Se excluyen las casillas del río y su orilla (fondo plano + pendiente + 1 m de margen).
      const exclusion = cauce.mesetaRadio + cauce.anchoTransicion + 1.5
      const cercaDelRio = (x: number, z: number): boolean =>
        rio.some((c) => Math.hypot(c.x - x, c.z - z) < exclusion)
      let comprobados = 0
      let maxima = 0
      for (let x = -mitad; x <= mitad - 1; x += 0.9) {
        for (let z = -mitad; z <= mitad - 1; z += 0.9) {
          if (cercaDelRio(x, z) || cercaDelRio(x + 1, z) || cercaDelRio(x, z + 1)) continue
          const h = altura(x, z)
          maxima = Math.max(maxima, Math.abs(altura(x + 1, z) - h), Math.abs(altura(x, z + 1) - h))
          comprobados++
        }
      }
      expect(comprobados).toBeGreaterThan(1000)
      expect(maxima).toBeLessThanOrEqual(0.15)
    }
  })

  it('el cauce está por debajo del agua', () => {
    for (const semilla of [1, 7, 12345]) {
      const valle = valleDe(semilla)
      const altura = crearAltura(valle, semilla)
      for (const c of centrosRio(valle)) {
        for (const [dx, dz] of [
          [0, 0],
          [-0.45, -0.45],
          [0.45, -0.45],
          [-0.45, 0.45],
          [0.45, 0.45],
          [0.3, 0],
          [0, -0.3],
        ] as const) {
          expect(altura(c.x + dx, c.z + dz)).toBeLessThan(nivelAgua)
        }
      }
    }
  })

  it('es continua (sin saltos entre puntos vecinos)', () => {
    const semilla = 99
    const valle = valleDe(semilla)
    const altura = crearAltura(valle, semilla)
    const limite = ladoMetros(valle) / 2 + colinas.anchoSubida + 20
    let maxima = 0
    for (let x = -limite; x <= limite; x += 1.37) {
      for (let z = -limite; z <= limite; z += 1.37) {
        const h = altura(x, z)
        maxima = Math.max(
          maxima,
          Math.abs(altura(x + 0.1, z) - h),
          Math.abs(altura(x, z + 0.1) - h),
        )
      }
    }
    expect(maxima).toBeLessThan(0.25)
  })

  it('misma semilla -> mismas alturas', () => {
    const valle = valleDe(5)
    const a = crearAltura(valle, 5)
    const b = crearAltura(valle, 5)
    const otra = crearAltura(valle, 6)
    let distinta = false
    for (const [x, z] of [
      [0, 0],
      [13.3, -7.1],
      [-50.5, 60.2],
      [-95, 95],
    ] as const) {
      expect(a(x, z)).toBe(b(x, z))
      expect(alturaTerreno(x, z, valle, 5)).toBe(a(x, z))
      if (otra(x, z) !== a(x, z)) distinta = true
    }
    expect(distinta).toBe(true)
  })

  it('las colinas superan una altura mínima en el borde', () => {
    for (const semilla of [1, 7, 12345]) {
      const valle = valleDe(semilla)
      const altura = crearAltura(valle, semilla)
      const mitad = ladoMetros(valle) / 2
      const d = colinas.anchoSubida
      for (let t = -mitad; t <= mitad; t += 5) {
        for (const [x, z] of [
          [t, -mitad - d],
          [t, mitad + d],
          [-mitad - d, t],
          [mitad + d, t],
        ] as const) {
          expect(altura(x, z)).toBeGreaterThan(colinas.alturaMinima)
        }
      }
    }
  })
})
