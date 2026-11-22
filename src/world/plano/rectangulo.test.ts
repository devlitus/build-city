import { describe, expect, it } from 'vitest'
import { casillasDeArrastre, rectanguloDeArrastre } from './rectangulo'

describe('rectángulo de arrastre', () => {
  it('arrastre de A a B da todas las casillas del rectángulo', () => {
    const c = casillasDeArrastre({ x: 2, y: 5 }, { x: 4, y: 6 })
    expect(c).toHaveLength(6)
    expect(c).toEqual([
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 2, y: 6 },
      { x: 3, y: 6 },
      { x: 4, y: 6 },
    ])
  })

  it('funciona arrastrando en cualquier dirección', () => {
    const esperado = { x0: 2, y0: 5, x1: 4, y1: 6 }
    const esquinas = [
      [
        { x: 2, y: 5 },
        { x: 4, y: 6 },
      ],
      [
        { x: 4, y: 6 },
        { x: 2, y: 5 },
      ],
      [
        { x: 4, y: 5 },
        { x: 2, y: 6 },
      ],
      [
        { x: 2, y: 6 },
        { x: 4, y: 5 },
      ],
    ] as const
    for (const [a, b] of esquinas) {
      expect(rectanguloDeArrastre(a, b)).toEqual(esperado)
      expect(casillasDeArrastre(a, b)).toHaveLength(6)
    }
  })

  it('un clic sin arrastre es una casilla', () => {
    expect(casillasDeArrastre({ x: 7, y: 7 }, { x: 7, y: 7 })).toEqual([{ x: 7, y: 7 }])
  })
})
