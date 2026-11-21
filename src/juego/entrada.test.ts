import { describe, expect, it } from 'vitest'
import { crearTeclas, direccionRelativa, instalarEntrada } from './entrada'

const W = { adelante: true, atras: false, izquierda: false, derecha: false }

describe('direccionRelativa', () => {
  it('con yaw 0 la cámara mira al norte: W va al norte (-y), alejándose de la cámara', () => {
    const d = direccionRelativa(W, 0)
    expect(d.dx).toBeCloseTo(0, 9)
    expect(d.dy).toBeCloseTo(-1, 9)
  })

  it('W con la cámara girada 90° mueve en X', () => {
    const d = direccionRelativa(W, Math.PI / 2)
    expect(d.dx).toBeCloseTo(1, 9)
    expect(d.dy).toBeCloseTo(0, 9)
  })

  it('A y D van a los lados de la cámara', () => {
    const d = direccionRelativa({ ...W, adelante: false, derecha: true }, 0)
    expect(d.dx).toBeCloseTo(1, 9)
    expect(d.dy).toBeCloseTo(0, 9)
    const i = direccionRelativa({ ...W, adelante: false, izquierda: true }, 0)
    expect(i.dx).toBeCloseTo(-1, 9)
  })

  it('las diagonales salen normalizadas', () => {
    for (const yaw of [0, 0.7, 2, -3]) {
      const d = direccionRelativa({ ...W, derecha: true }, yaw)
      expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(1, 9)
    }
  })

  it('sin teclas, o con teclas opuestas, la dirección es cero', () => {
    const cero = { adelante: false, atras: false, izquierda: false, derecha: false }
    expect(direccionRelativa(cero, 1.2)).toEqual({ dx: 0, dy: 0 })
    expect(direccionRelativa({ ...cero, adelante: true, atras: true }, 1.2)).toEqual({
      dx: 0,
      dy: 0,
    })
  })
})

describe('instalarEntrada', () => {
  function objetivoFalso() {
    const oyentes = new Map<string, (e: never) => void>()
    return {
      oyentes,
      addEventListener: (t: string, f: (e: never) => void) => void oyentes.set(t, f),
      removeEventListener: (t: string) => void oyentes.delete(t),
    }
  }
  const tecla = (code: string, extra: object = {}) => ({ code, target: null, ...extra })

  it('Mayús activa correr y WASD marca las direcciones', () => {
    const o = objetivoFalso()
    const t = crearTeclas()
    instalarEntrada(o as unknown as Window, t)
    o.oyentes.get('keydown')?.(tecla('KeyW') as never)
    o.oyentes.get('keydown')?.(tecla('ShiftLeft') as never)
    expect(t.adelante).toBe(true)
    expect(t.correr).toBe(true)
    o.oyentes.get('keyup')?.(tecla('ShiftLeft') as never)
    expect(t.correr).toBe(false)
  })

  it('al perder el foco se sueltan todas las teclas', () => {
    const o = objetivoFalso()
    const t = crearTeclas()
    instalarEntrada(o as unknown as Window, t)
    o.oyentes.get('keydown')?.(tecla('KeyD') as never)
    o.oyentes.get('blur')?.(undefined as never)
    expect(t).toEqual(crearTeclas())
  })

  it('Ctrl+tecla no mueve; quitar los oyentes los retira', () => {
    const o = objetivoFalso()
    const t = crearTeclas()
    const quitar = instalarEntrada(o as unknown as Window, t)
    o.oyentes.get('keydown')?.(tecla('KeyW', { ctrlKey: true }) as never)
    expect(t.adelante).toBe(false)
    quitar()
    expect(o.oyentes.size).toBe(0)
  })
})
