import { describe, expect, it } from 'vitest'
import {
  CONFIG_VALLE,
  casillaEnPunto,
  generarValle,
  indiceParcelaEnPunto,
  ladoValle,
  parcelaEnPunto,
} from './index'

const valle = generarValle(CONFIG_VALLE, 1).valle
const lado = ladoValle(valle)
const mitad = lado / 2
const P = valle.casillasPorParcela

describe('parcelaEnPunto / casillaEnPunto', () => {
  it('parcelaEn en el centro de cada parcela', () => {
    for (let fila = 0; fila < valle.parcelasPorLado; fila++)
      for (let col = 0; col < valle.parcelasPorLado; col++) {
        const x = (col + 0.5) * P - mitad
        const z = (fila + 0.5) * P - mitad
        const indice = fila * valle.parcelasPorLado + col
        const r = parcelaEnPunto(valle, x, z)
        expect(r?.indice).toBe(indice)
        expect(r?.parcela).toBe(valle.parcelas[indice])
      }
  })

  it('casillaEn devuelve la casilla global del punto', () => {
    expect(casillaEnPunto(valle, -mitad + 0.5, -mitad + 0.5)).toEqual({ x: 0, y: 0 })
    expect(casillaEnPunto(valle, 0.2, -0.2)).toEqual({ x: lado / 2, y: lado / 2 - 1 })
    expect(casillaEnPunto(valle, mitad - 0.01, mitad - 0.01)).toEqual({ x: lado - 1, y: lado - 1 })
  })

  it('regla en las lindes: la linde pertenece a la parcela del este/sur', () => {
    const linde = P - mitad // linde entre filas/columnas 0 y 1
    const centro0 = -mitad + P / 2
    expect(indiceParcelaEnPunto(valle, linde, centro0)).toBe(1)
    expect(indiceParcelaEnPunto(valle, linde - 1e-9, centro0)).toBe(0)
    expect(indiceParcelaEnPunto(valle, centro0, linde)).toBe(valle.parcelasPorLado)
    expect(indiceParcelaEnPunto(valle, centro0, linde - 1e-9)).toBe(0)
    // Esquina: sur y este a la vez.
    expect(indiceParcelaEnPunto(valle, linde, linde)).toBe(valle.parcelasPorLado + 1)
  })

  it('el borde oeste/norte está dentro y el este/sur fuera', () => {
    expect(indiceParcelaEnPunto(valle, -mitad, -mitad)).toBe(0)
    expect(indiceParcelaEnPunto(valle, mitad, 0)).toBeNull()
    expect(indiceParcelaEnPunto(valle, 0, mitad)).toBeNull()
  })

  it('fuera del valle → null (también NaN e Infinity)', () => {
    expect(parcelaEnPunto(valle, -mitad - 0.01, 0)).toBeNull()
    expect(parcelaEnPunto(valle, 0, -mitad - 0.01)).toBeNull()
    expect(parcelaEnPunto(valle, 1000, 1000)).toBeNull()
    expect(casillaEnPunto(valle, mitad + 1, 0)).toBeNull()
    for (const malo of [NaN, Infinity, -Infinity]) {
      expect(casillaEnPunto(valle, malo, 0)).toBeNull()
      expect(parcelaEnPunto(valle, 0, malo)).toBeNull()
      expect(indiceParcelaEnPunto(valle, malo, malo)).toBeNull()
    }
  })
})
