import { describe, expect, it } from 'vitest'
import {
  CONFIG_VALLE,
  TERRENOS,
  casillasRio,
  claveCasilla,
  crearEstadoInicial,
  generarValle,
  rioVertical,
  type Valle,
} from './index'

const SEMILLAS = [1, 2, 3, 42, 99, 12345]
const valleDe = (semilla: number): Valle => generarValle(CONFIG_VALLE, semilla).valle

describe('valle a escala 3D', () => {
  it('genera 64 parcelas de 20×20', () => {
    const valle = valleDe(1)
    expect(valle.parcelasPorLado).toBe(8)
    expect(valle.casillasPorParcela).toBe(20)
    expect(valle.parcelas).toHaveLength(64)
    expect(valle.parcelasPorLado * valle.casillasPorParcela).toBe(160)
  })

  it('misma semilla → mismo valle', () => {
    for (const s of SEMILLAS) expect(valleDe(s)).toEqual(valleDe(s))
    expect(valleDe(1)).not.toEqual(valleDe(2))
  })

  it('el río conecta dos bordes opuestos', () => {
    for (const s of SEMILLAS) {
      const valle = valleDe(s)
      const lado = valle.parcelasPorLado * valle.casillasPorParcela
      const vertical = rioVertical(valle)
      const rio = casillasRio(valle, CONFIG_VALLE.anchoRio)
      const claves = new Set(rio.map((c) => claveCasilla(lado, c.x, c.y)))
      const eje = (c: { x: number; y: number }) => (vertical ? c.y : c.x)
      const entrada = rio.filter((c) => eje(c) === 0)
      expect(entrada.length).toBeGreaterThan(0)
      // Recorrido 4-conexo desde el borde de entrada.
      const vistas = new Set<number>()
      const pendientes = entrada.map((c) => claveCasilla(lado, c.x, c.y))
      pendientes.forEach((k) => vistas.add(k))
      while (pendientes.length > 0) {
        const k = pendientes.pop() as number
        const x = k % lado
        const y = (k - x) / lado
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= lado || ny >= lado) continue
          const v = claveCasilla(lado, nx, ny)
          if (claves.has(v) && !vistas.has(v)) {
            vistas.add(v)
            pendientes.push(v)
          }
        }
      }
      // Todo el cauce es una sola pieza y llega al borde opuesto.
      expect(rio.every((c) => vistas.has(claveCasilla(lado, c.x, c.y)))).toBe(true)
      expect(rio.some((c) => eje(c) === lado - 1)).toBe(true)
    }
  })

  it('el río tiene entre 1 y 2 vados', () => {
    const { min, max, grosor } = CONFIG_VALLE.vados
    for (const s of SEMILLAS) {
      const e = crearEstadoInicial({ semilla: s })
      const lado = e.valle.parcelasPorLado * e.valle.casillasPorParcela
      const vertical = rioVertical(e.valle)
      const ejes = [
        ...new Set(e.cauce.vados.map((k) => (vertical ? Math.floor(k / lado) : k % lado))),
      ].sort((a, b) => a - b)
      // Cada vado es una franja de `grosor` filas/columnas consecutivas.
      let franjas = 0
      let previo = Number.NEGATIVE_INFINITY
      for (const a of ejes) {
        if (a !== previo + 1) franjas++
        previo = a
      }
      expect(ejes.length).toBe(franjas * grosor)
      expect(franjas).toBeGreaterThanOrEqual(min)
      expect(franjas).toBeLessThanOrEqual(max)
    }
  })

  it('hay al menos una parcela de cada tipo', () => {
    for (const s of SEMILLAS) {
      const tipos = new Set(valleDe(s).parcelas.map((p) => p.terreno))
      for (const t of TERRENOS) expect(tipos.has(t)).toBe(true)
    }
  })
})
