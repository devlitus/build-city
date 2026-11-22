import { describe, expect, it } from 'vitest'
import { DATOS_EFECTOS } from './efectos-datos'
import { envolvente, generarRuido } from './sonido-sintesis'

describe('envolvente', () => {
  it('sube durante el ataque, baja después y vale 0 fuera de la duración', () => {
    expect(envolvente(-0.1, 1, 0.1)).toBe(0)
    expect(envolvente(0, 1, 0.1)).toBe(0)
    expect(envolvente(0.05, 1, 0.1)).toBeCloseTo(0.5, 10)
    expect(envolvente(0.1, 1, 0.1)).toBeCloseTo(1, 10)
    expect(envolvente(0.5, 1, 0.1)).toBeLessThan(envolvente(0.2, 1, 0.1))
    expect(envolvente(1, 1, 0.1)).toBe(0)
  })

  it('sin ataque empieza al máximo', () => {
    expect(envolvente(0, 1, 0)).toBe(1)
  })
})

describe('generarRuido', () => {
  it('es determinista, acotado en [-1, 1] y de la longitud pedida', () => {
    const a = generarRuido(1000, 1000, 1, 0.01, 5)
    const b = generarRuido(1000, 1000, 1, 0.01, 5)
    expect(a).toHaveLength(1000)
    expect([...a]).toEqual([...b])
    expect(Math.max(...a)).toBeLessThanOrEqual(1)
    expect(Math.min(...a)).toBeGreaterThanOrEqual(-1)
    expect([...generarRuido(1000, 1000, 1, 0.01, 6)]).not.toEqual([...a])
  })

  it('la cola es más suave que el principio', () => {
    const r = generarRuido(1000, 1000, 1, 0.01, 1)
    const energia = (d: Float32Array) => d.reduce((s, v) => s + v * v, 0)
    expect(energia(r.slice(800))).toBeLessThan(energia(r.slice(10, 210)))
  })
})

describe('datos de sonidos', () => {
  it('el ataque no supera la duración en ningún sonido', () => {
    const { volumenGeneral, ...sonidos } = DATOS_EFECTOS.sonidos
    expect(volumenGeneral).toBeLessThanOrEqual(1)
    for (const s of Object.values(sonidos)) expect(s.ataque).toBeLessThan(s.duracion)
  })
})
