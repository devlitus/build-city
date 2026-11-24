import { describe, expect, it } from 'vitest'
import { normalDeAltura, uvDeVerticeTrozo, uvTerreno } from './uv'

const valle = { parcelasPorLado: 8, casillasPorParcela: 20 }

describe('UV del terreno', () => {
  it('la UV de un punto es la misma calculada desde dos trozos vecinos', () => {
    const t = valle.casillasPorParcela
    for (const j of [0, 5, t]) {
      // Borde este del trozo (2, 3) = borde oeste del trozo (3, 3), con distinto índice local.
      const desdeOeste = uvDeVerticeTrozo({ cx: 2, cz: 3 }, t, j, valle, 2.5)
      const desdeEste = uvDeVerticeTrozo({ cx: 3, cz: 3 }, 0, j, valle, 2.5)
      expect(desdeOeste).toEqual(desdeEste)
    }
    // Y el borde sur con el norte del trozo de abajo, en el anillo de colinas.
    expect(uvDeVerticeTrozo({ cx: -1, cz: 0 }, 7, t, valle, 2.5)).toEqual(
      uvDeVerticeTrozo({ cx: -1, cz: 1 }, 7, 0, valle, 2.5),
    )
  })

  it('UV = metros / metros por repeticion', () => {
    expect(uvTerreno(5, -10, 2.5)).toEqual([2, -4])
    const [u, v] = uvTerreno(7.5, 1.25, 2.5)
    expect(u).toBeCloseTo(3, 10)
    expect(v).toBeCloseTo(0.5, 10)
  })
})

describe('normal del terreno', () => {
  it('es vertical en el llano, unitaria e inclinada hacia donde baja el suelo', () => {
    const [lx, ly, lz] = normalDeAltura(() => 3, 4, 5)
    expect([Math.abs(lx), ly, Math.abs(lz)]).toEqual([0, 1, 0])
    const [nx, ny, nz] = normalDeAltura((x) => 0.5 * x, 0, 0)
    expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 10)
    expect(nx).toBeLessThan(0)
    expect(nz).toBeCloseTo(0, 10)
  })
})
