import { describe, expect, it } from 'vitest'
import { comandoDeTeclaRegadera } from './depuracion-regadera'

const tecla = (code: string, extra: object = {}) => ({
  code,
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...extra,
})

describe('atajo de depuración de la regadera', () => {
  it('F8 mejora la regadera', () => {
    expect(comandoDeTeclaRegadera(tecla('F8'))).toEqual({ tipo: 'MejorarRegadera' })
  })
  it('ignora otras teclas, repeticiones y combinaciones', () => {
    expect(comandoDeTeclaRegadera(tecla('F7'))).toBeUndefined()
    expect(comandoDeTeclaRegadera(tecla('F8', { repeat: true }))).toBeUndefined()
    expect(comandoDeTeclaRegadera(tecla('F8', { ctrlKey: true }))).toBeUndefined()
  })
})
