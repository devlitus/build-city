import { describe, expect, it } from 'vitest'
import { alturaHorizonte, radioInteriorHorizonte } from './horizonte'
import { PARAMETROS_HORIZONTE as P } from './horizonte-parametros'

const R = radioInteriorHorizonte(160)

describe('alturaHorizonte', () => {
  it('arranca por debajo del terreno exterior (sin rendijas)', () => {
    for (let i = 0; i < 64; i++) {
      expect(alturaHorizonte(R, (i / 64) * Math.PI * 2, R)).toBeCloseTo(-P.profundidadBase, 5)
    }
  })

  it('es continua al dar la vuelta completa', () => {
    const r = R + P.anchoAnillo * P.fraccionCresta
    expect(alturaHorizonte(r, 0, R)).toBeCloseTo(alturaHorizonte(r, Math.PI * 2, R), 5)
  })

  it('la cresta supera la altura mínima en todos los ángulos y hay cimas nevadas', () => {
    const r = R + P.anchoAnillo * P.fraccionCresta
    let max = 0
    for (let i = 0; i < 360; i++) {
      const h = alturaHorizonte(r, (i / 360) * Math.PI * 2, R)
      expect(h).toBeGreaterThanOrEqual(P.alturaMinima - 1e-6)
      max = Math.max(max, h)
    }
    expect(max).toBeGreaterThan(P.alturaPicos * P.umbralNieve)
  })
})
