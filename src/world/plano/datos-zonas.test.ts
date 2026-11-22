import { describe, expect, it } from 'vitest'
import { hexARgb, pixelesZonas, rellenarRectangulo } from './datos-zonas'

const colores = {
  cultivo: [1, 2, 3],
  huerto: [4, 5, 6],
  vivienda: [7, 8, 9],
  almacen: [10, 11, 12],
} as const

describe('datos de la capa de zonas', () => {
  it('hexARgb separa los canales', () => {
    expect(hexARgb('#102030')).toEqual([16, 32, 48])
  })

  it('pixelesZonas colorea cada casilla con su zona y deja el resto transparente', () => {
    const p = pixelesZonas('.chva', colores)
    expect([...p.slice(0, 4)]).toEqual([0, 0, 0, 0])
    expect([...p.slice(4, 8)]).toEqual([1, 2, 3, 255])
    expect([...p.slice(8, 12)]).toEqual([4, 5, 6, 255])
    expect([...p.slice(12, 16)]).toEqual([7, 8, 9, 255])
    expect([...p.slice(16, 20)]).toEqual([10, 11, 12, 255])
  })

  it('rellenarRectangulo pinta solo el rectángulo, recortado al valle', () => {
    const lado = 4
    const p = new Uint8Array(lado * lado * 4)
    rellenarRectangulo(p, lado, { x0: 2, y0: 2, x1: 9, y1: 9 }, [9, 9, 9])
    const opacas = [...Array(lado * lado).keys()].filter((i) => p[i * 4 + 3] === 255)
    expect(opacas).toEqual([10, 11, 14, 15])
    rellenarRectangulo(p, lado, null, [9, 9, 9])
    expect(p.every((b) => b === 0)).toBe(true)
  })
})
