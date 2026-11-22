import { describe, expect, it } from 'vitest'
import {
  LADO_E,
  LADO_N,
  LADO_O,
  LADO_S,
  MASCARA_REFERENCIA,
  formaValla,
  girarMascara,
  mascaraVecinos,
} from './forma'

const N = LADO_N
const E = LADO_E
const S = LADO_S
const O = LADO_O

const CASOS: [string, number, string, number][] = [
  ['ninguno', 0, 'poste', 0],
  ['N', N, 'extremo', 0],
  ['E', E, 'extremo', 1],
  ['S', S, 'extremo', 2],
  ['O', O, 'extremo', 3],
  ['N+S', N | S, 'recta', 0],
  ['E+O', E | O, 'recta', 1],
  ['N+E', N | E, 'esquina', 0],
  ['E+S', E | S, 'esquina', 1],
  ['S+O', S | O, 'esquina', 2],
  ['O+N', O | N, 'esquina', 3],
  ['N+E+S', N | E | S, 'te', 0],
  ['E+S+O', E | S | O, 'te', 1],
  ['S+O+N', S | O | N, 'te', 2],
  ['O+N+E', O | N | E, 'te', 3],
  ['N+E+S+O', 15, 'cruz', 0],
]

describe('formaValla', () => {
  it.each(CASOS)('máscara %s', (_n, mascara, pieza, giro) => {
    expect(formaValla(mascara)).toEqual({ pieza, giro })
  })

  it('cubre las 16 máscaras sin repetir', () => {
    expect(new Set(CASOS.map((c) => c[1])).size).toBe(16)
  })

  it('la pieza girada conecta exactamente los lados de la máscara', () => {
    for (let m = 0; m < 16; m++) {
      const { pieza, giro } = formaValla(m)
      expect(girarMascara(MASCARA_REFERENCIA[pieza], giro)).toBe(m)
    }
  })
})

describe('mascaraVecinos', () => {
  it('lee N=y-1, E=x+1, S=y+1, O=x-1', () => {
    const celdas = new Set(['5,4', '6,5'])
    const esValla = (x: number, y: number) => celdas.has(`${x},${y}`)
    expect(mascaraVecinos(esValla, 5, 5)).toBe(N | E)
  })

  it('sin vecinos da 0 y rodeada da 15', () => {
    expect(mascaraVecinos(() => false, 0, 0)).toBe(0)
    expect(mascaraVecinos(() => true, 0, 0)).toBe(15)
  })
})
