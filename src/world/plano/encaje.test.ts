import { describe, expect, it } from 'vitest'
import { defEdificio, huellaDe, type DefEdificio } from '../../core'
import { esquinaDeHuella } from './encaje'

describe('esquinaDeHuella', () => {
  it('el cursor queda en el centro de la huella (casa 7×5)', () => {
    const casa = defEdificio('casa') as DefEdificio
    expect(esquinaDeHuella(casa, { x: 50, y: 40 }, 0)).toEqual({ x: 47, y: 38 })
    expect(esquinaDeHuella(casa, { x: 50, y: 40 }, 1)).toEqual({ x: 48, y: 37 })
    expect(esquinaDeHuella(casa, { x: 50, y: 40 }, 2)).toEqual({ x: 47, y: 38 })
    expect(esquinaDeHuella(casa, { x: 50, y: 40 }, 3)).toEqual({ x: 48, y: 37 })
  })

  it('la huella resultante siempre contiene la casilla del cursor', () => {
    for (const tipo of ['tienda', 'caja-envio', 'cobertizo', 'casa'] as const) {
      const def = defEdificio(tipo) as DefEdificio
      for (const r of [0, 1, 2, 3] as const) {
        const e = esquinaDeHuella(def, { x: 20, y: 30 }, r)
        const h = huellaDe(def, e.x, e.y, r)
        expect(h.x0 <= 20 && 20 <= h.x1 && h.y0 <= 30 && 30 <= h.y1).toBe(true)
      }
    }
  })

  it('con huella par el cursor cae en la casilla floor(n/2) desde la esquina', () => {
    const caja = defEdificio('caja-envio') as DefEdificio // 2×1
    expect(esquinaDeHuella(caja, { x: 10, y: 10 }, 0)).toEqual({ x: 9, y: 10 })
  })
})
