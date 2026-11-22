import { describe, expect, it } from 'vitest'
import { progresoObra } from './index'

describe('progresoObra', () => {
  const obra = { diaInicio: 2, diaFin: 6 }
  it('0 al empezar y 1 al llegar al día de fin', () => {
    expect(progresoObra({ obra }, 2)).toBe(0)
    expect(progresoObra({ obra }, 4)).toBe(0.5)
    expect(progresoObra({ obra }, 6)).toBe(1)
  })
  it('se queda en [0, 1] fuera del rango', () => {
    expect(progresoObra({ obra }, 0)).toBe(0)
    expect(progresoObra({ obra }, 99)).toBe(1)
  })
  it('sin obra o de duración nula cuenta como terminada', () => {
    expect(progresoObra({ obra: null }, 0)).toBe(1)
    expect(progresoObra({ obra: { diaInicio: 3, diaFin: 3 } }, 3)).toBe(1)
  })
})
