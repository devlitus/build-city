import { describe, expect, it } from 'vitest'
import type { Valle } from '../../core'
import {
  aristasLindes,
  aristasRejilla,
  filtroDesaturacion,
  segmentosSobreTerreno,
} from './geometria-plano'

function valleDePrueba(propias: number[]): Valle {
  const n = 3
  const parcelas = Array.from({ length: n * n }, (_, i) => ({
    fila: Math.floor(i / n),
    columna: i % n,
    estado: propias.includes(i) ? 'propia' : 'en-venta',
  }))
  return { parcelasPorLado: n, casillasPorParcela: 4, parcelas } as unknown as Valle
}

describe('segmentosSobreTerreno', () => {
  it('deja todos los puntos por encima de la altura del terreno', () => {
    const altura = (x: number, z: number): number => 2 * Math.sin(x * 1.3) + Math.cos(z * 0.7)
    const v = segmentosSobreTerreno(aristasLindes(valleDePrueba([4])).propias, altura, 0.5, 0.2)
    expect(v.length).toBeGreaterThan(0)
    for (let i = 0; i < v.length; i += 3) {
      const suelo = altura(v[i] ?? 0, v[i + 2] ?? 0)
      expect((v[i + 1] ?? 0) - suelo).toBeGreaterThan(0.19)
    }
  })

  it('muestrea cada arista al menos cada paso', () => {
    const v = segmentosSobreTerreno([{ ax: 0, az: 0, bx: 4, bz: 0 }], () => 0, 0.5, 0)
    expect(v.length / 6).toBe(8)
  })
})

describe('aristasLindes', () => {
  it('no duplica lindes y separa las de parcelas propias', () => {
    const l = aristasLindes(valleDePrueba([4])) // parcela central
    expect(l.propias).toHaveLength(4)
    expect(l.propias.length + l.otras.length).toBe(2 * 4 * 3)
  })
})

describe('aristasRejilla', () => {
  it('solo cubre las parcelas propias, sin duplicar aristas', () => {
    expect(aristasRejilla(valleDePrueba([]))).toHaveLength(0)
    // Una parcela de 4x4: 2*4*5 aristas.
    expect(aristasRejilla(valleDePrueba([4]))).toHaveLength(40)
    // Dos contiguas (4x8): 4*9 + 8*5 aristas.
    expect(aristasRejilla(valleDePrueba([3, 4]))).toHaveLength(76)
  })
})

describe('filtroDesaturacion', () => {
  it('quita saturación y se limita a 0..1', () => {
    expect(filtroDesaturacion(0)).toBe('none')
    expect(filtroDesaturacion(0.3)).toBe('saturate(0.700)')
    expect(filtroDesaturacion(5)).toBe('saturate(0.000)')
  })
})
