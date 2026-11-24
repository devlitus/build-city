import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cancelaTrazoPuntero, casillasTrazo } from './trazo'

describe('cancelaTrazoPuntero', () => {
  it('el botón derecho cancela, sea pointerdown o pointermove', () => {
    expect(cancelaTrazoPuntero({ button: 2, buttons: 3 })).toBe(true)
    expect(cancelaTrazoPuntero({ button: 2, buttons: 0 })).toBe(true)
    expect(cancelaTrazoPuntero({ button: -1, buttons: 3 })).toBe(true)
  })
  it('el izquierdo, el central y el movimiento normal no cancelan', () => {
    expect(cancelaTrazoPuntero({ button: 0, buttons: 1 })).toBe(false)
    expect(cancelaTrazoPuntero({ button: -1, buttons: 1 })).toBe(false)
    expect(cancelaTrazoPuntero({ button: 1, buttons: 4 })).toBe(false)
  })
})

describe('casillasTrazo', () => {
  it('A = B da una casilla', () => {
    expect(casillasTrazo({ x: 3, y: 4 }, { x: 3, y: 4 })).toEqual([{ x: 3, y: 4 }])
  })

  it('línea recta horizontal y vertical', () => {
    expect(casillasTrazo({ x: 1, y: 2 }, { x: 4, y: 2 })).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ])
    expect(casillasTrazo({ x: 5, y: 3 }, { x: 5, y: 1 })).toEqual([
      { x: 5, y: 3 },
      { x: 5, y: 2 },
      { x: 5, y: 1 },
    ])
  })

  it('L con el eje largo primero', () => {
    // dx = 3 > dy = 1: primero x, luego y.
    expect(casillasTrazo({ x: 0, y: 0 }, { x: 3, y: 1 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
    ])
    // dy = 3 > dx = 1: primero y, luego x (hacia atrás).
    expect(casillasTrazo({ x: 2, y: 0 }, { x: 1, y: 3 })).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ])
  })

  it('no repite casillas', () => {
    const c = casillasTrazo({ x: 0, y: 0 }, { x: 5, y: 5 })
    expect(new Set(c.map((q) => `${q.x},${q.y}`)).size).toBe(c.length)
  })

  it('propiedad: empieza en A, acaba en B, contiguas, sin repetir y de longitud |dx|+|dy|+1', () => {
    const coord = fc.integer({ min: -40, max: 40 })
    fc.assert(
      fc.property(coord, coord, coord, coord, (ax, ay, bx, by) => {
        const a = { x: ax, y: ay }
        const b = { x: bx, y: by }
        const c = casillasTrazo(a, b)
        expect(c[0]).toEqual(a)
        expect(c[c.length - 1]).toEqual(b)
        expect(c).toHaveLength(Math.abs(bx - ax) + Math.abs(by - ay) + 1)
        expect(new Set(c.map((q) => `${q.x},${q.y}`)).size).toBe(c.length)
        for (let i = 1; i < c.length; i++) {
          const p = c[i - 1] as { x: number; y: number }
          const q = c[i] as { x: number; y: number }
          expect(Math.abs(q.x - p.x) + Math.abs(q.y - p.y)).toBe(1)
        }
      }),
    )
  })
})
