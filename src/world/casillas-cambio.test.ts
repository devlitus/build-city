import { describe, expect, it } from 'vitest'
import { casillasCambiadas, conVecinas } from './casillas-cambio'

describe('casillasCambiadas', () => {
  it('sin cambios no devuelve nada', () => {
    expect(casillasCambiadas('..v.', '..v.')).toEqual([])
  })
  it('devuelve solo las casillas distintas (colocar, quitar y cambiar de tipo)', () => {
    expect(casillasCambiadas('.v.p', 'vv..')).toEqual([0, 3])
    expect(casillasCambiadas('v', 'p')).toEqual([0])
  })
  it('sin dibujo previo salen las casillas no vacías', () => {
    expect(casillasCambiadas(undefined, '.v.p')).toEqual([1, 3])
  })
})

describe('conVecinas', () => {
  it('añade las cuatro vecinas de una casilla interior', () => {
    expect(conVecinas([4], 3)).toEqual([1, 3, 4, 5, 7])
  })
  it('no sale del valle por los bordes ni entre filas', () => {
    expect(conVecinas([0], 3)).toEqual([0, 1, 3])
    expect(conVecinas([2], 3)).toEqual([1, 2, 5])
    expect(conVecinas([8], 3)).toEqual([5, 7, 8])
  })
  it('no repite casillas comunes', () => {
    expect(conVecinas([4, 5], 3)).toEqual([1, 2, 3, 4, 5, 7, 8])
    expect(conVecinas([], 3)).toEqual([])
  })
})
