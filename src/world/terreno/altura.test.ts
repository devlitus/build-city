import { describe, expect, it } from 'vitest'
import { casillasRio, crearEstadoInicial, type Valle } from '../../core'
import { alturaTerreno, crearAltura } from './altura'
import { casillaAMetros, ladoMetros } from './coordenadas'
import { PARAMETROS_TERRENO } from './parametros'
import { DATOS_PUEBLO, centroPlaza } from '../pueblo-datos'

const { nivelAgua, colinas } = PARAMETROS_TERRENO

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
      // Se excluyen solo las casillas del río y 1 m de orilla medido desde su BORDE
      // (distancia del punto al cuadrado de la casilla de río).
      const cercaDelRio = (x: number, z: number): boolean =>
        rio.some(
          (c) =>
            Math.hypot(
              Math.max(Math.abs(c.x - x) - 0.5, 0),
              Math.max(Math.abs(c.z - z) - 0.5, 0),
            ) <= 1,
        )
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

  it('ninguna casilla de tierra queda bajo el agua', () => {
    for (const semilla of [1, 7, 12345]) {
      const valle = valleDe(semilla)
      const altura = crearAltura(valle, semilla)
      const lado = ladoMetros(valle)
      const rio = new Set(casillasRio(valle).map((c) => c.y * lado + c.x))
      let comprobadas = 0
      for (let y = 0; y < lado; y++) {
        for (let x = 0; x < lado; x++) {
          if (rio.has(y * lado + x)) continue
          const c = casillaAMetros(x, y, valle)
          expect(altura(c.x, c.z)).toBeGreaterThan(nivelAgua + 0.3)
          comprobadas++
        }
      }
      expect(comprobadas).toBeGreaterThan(lado * lado * 0.5)
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
    // La orilla del cauce es un talud de 0,3 m (hasta ~4 m/m); el resto es suave.
    expect(maxima).toBeLessThan(0.5)
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
      // En el lado sur, la explanada del pueblo aplana a propósito la franja de la plaza y el
      // camino: se omite solo ese tramo (plaza.radio + margen + mezcla desde la x de la plaza);
      // el resto del lado sur y los otros tres lados se miden igual que antes.
      const { plaza, explanada } = DATOS_PUEBLO
      const franja = plaza.radio + explanada.margenPlaza + explanada.anchoMezcla
      let medidosSur = 0
      for (let t = -mitad; t <= mitad; t += 5) {
        for (const [x, z] of [
          [t, -mitad - d],
          [t, mitad + d],
          [-mitad - d, t],
          [mitad + d, t],
        ] as const) {
          if (z === mitad + d && Math.abs(x - centroPlaza(valle).x) < franja) continue
          if (z === mitad + d) medidosSur++
          expect(altura(x, z)).toBeGreaterThan(colinas.alturaMinima)
        }
      }
      expect(medidosSur).toBeGreaterThan(0)
    }
  })

  it('la zona del pueblo (plaza y camino) queda casi llana, a la cota de las parcelas', () => {
    for (const semilla of [1, 7, 12345]) {
      const valle = valleDe(semilla)
      const altura = crearAltura(valle, semilla)
      const mitad = ladoMetros(valle) / 2
      const c = centroPlaza(valle)
      const { plaza, explanada } = DATOS_PUEBLO
      const llano = plaza.radio + explanada.margenPlaza
      let comprobados = 0
      for (let a = 0; a < 2 * Math.PI; a += 0.4) {
        for (let r = 0; r <= llano; r += 3) {
          const h = altura(c.x + r * Math.cos(a), c.z + r * Math.sin(a))
          expect(Math.abs(h - PARAMETROS_TERRENO.alturaBase)).toBeLessThan(0.2)
          comprobados++
        }
      }
      // Camino: de 4 m del borde (ya fuera del valle) a la plaza.
      for (let z = mitad + 4; z <= c.z; z += 2) {
        for (const dx of [-explanada.semiAnchoCamino, 0, explanada.semiAnchoCamino]) {
          expect(Math.abs(altura(c.x + dx, z) - PARAMETROS_TERRENO.alturaBase)).toBeLessThan(0.2)
          comprobados++
        }
      }
      expect(comprobados).toBeGreaterThan(100)
    }
  })
})
