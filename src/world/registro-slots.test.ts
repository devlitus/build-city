import { describe, expect, it } from 'vitest'
import { RegistroSlots } from './registro-slots'

describe('RegistroSlots', () => {
  it('asigna huecos consecutivos y reutiliza el de una clave existente', () => {
    const r = new RegistroSlots()
    expect(r.asignar(10)).toEqual({ slot: 0, nuevo: true })
    expect(r.asignar(20)).toEqual({ slot: 1, nuevo: true })
    expect(r.asignar(10)).toEqual({ slot: 0, nuevo: false })
    expect(r.cuenta).toBe(2)
  })
  it('al quitar, el último ocupa el hueco liberado', () => {
    const r = new RegistroSlots()
    ;[10, 20, 30].forEach((k) => r.asignar(k))
    expect(r.quitar(10)).toEqual({ desde: 2, hasta: 0 })
    expect(r.slotDe(30)).toBe(0)
    expect(r.slotDe(10)).toBeUndefined()
    expect(r.cuenta).toBe(2)
  })
  it('quitar el último no mueve nada y quitar una ausente devuelve undefined', () => {
    const r = new RegistroSlots()
    ;[1, 2].forEach((k) => r.asignar(k))
    expect(r.quitar(2)).toEqual({ desde: 1, hasta: 1 })
    expect(r.quitar(99)).toBeUndefined()
    expect(r.cuenta).toBe(1)
  })
})
