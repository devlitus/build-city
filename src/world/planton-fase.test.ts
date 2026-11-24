import { describe, expect, it } from 'vitest'
import { faseDePlanton } from './planton-fase'

describe('faseDePlanton', () => {
  it('reparte las fases a partes iguales entre el plantado y diasCrecimiento', () => {
    // 4 días, 4 fases: una por día.
    expect([0, 1, 2, 3].map((d) => faseDePlanton(10, 10 + d, 4, 4))).toEqual([0, 1, 2, 3])
    // 4 días, 2 fases: cambia a mitad de camino.
    expect([0, 1, 2, 3].map((d) => faseDePlanton(10, 10 + d, 4, 2))).toEqual([0, 0, 1, 1])
  })

  it('nunca pasa de la última fase ni baja de la primera', () => {
    expect(faseDePlanton(10, 99, 4, 4)).toBe(3)
    expect(faseDePlanton(10, 5, 4, 4)).toBe(0)
  })

  it('sin día de plantado o con una sola fase vale 0', () => {
    expect(faseDePlanton(undefined, 9, 4, 4)).toBe(0)
    expect(faseDePlanton(1, 9, 4, 1)).toBe(0)
  })
})
