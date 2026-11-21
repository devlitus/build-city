import { describe, expect, it } from 'vitest'
import { alfaDelAcumulador, avanzarAcumulador, minutosDelPaso } from './bucle'
import { CONFIG_BUCLE } from './config-bucle'

describe('avanzarAcumulador', () => {
  it('el acumulador da N pasos para N × dt', () => {
    expect(avanzarAcumulador(0, 3 * 50, 50, 10)).toEqual({ pasos: 3, resto: 0 })
  })

  it('no supera el máximo de pasos por fotograma', () => {
    const r = avanzarAcumulador(0, 60_000, 50, 5)
    expect(r.pasos).toBe(5)
    expect(r.resto).toBe(0)
  })

  it('el resto se conserva para el siguiente fotograma', () => {
    const a = avanzarAcumulador(0, 70, 50, 5)
    expect(a).toEqual({ pasos: 1, resto: 20 })
    const b = avanzarAcumulador(a.resto, 30, 50, 5)
    expect(b).toEqual({ pasos: 1, resto: 0 })
  })

  it('ignora entradas no válidas', () => {
    expect(avanzarAcumulador(0, Number.NaN, 50, 5)).toEqual({ pasos: 0, resto: 0 })
    expect(avanzarAcumulador(0, -10, 50, 5)).toEqual({ pasos: 0, resto: 0 })
  })
})

describe('minutosDelPaso', () => {
  const base = { pausado: false, modo: 'vida', velocidad: 1 } as const

  it('convierte tiempo real en minutos de juego y conserva la fracción', () => {
    // 1200 min de juego en 15 min reales: 80 min de juego por minuto real.
    const r = minutosDelPaso(base, 60_000, 0)
    expect(r.minutos).toBe(80)
    expect(r.resto).toBeCloseTo(0, 6)
    const f = minutosDelPaso(base, CONFIG_BUCLE.pasoFijoMs, 0.5)
    expect(f.minutos + f.resto).toBeCloseTo(0.5 + (CONFIG_BUCLE.pasoFijoMs * 80) / 60_000, 9)
  })

  it('la velocidad multiplica el avance', () => {
    expect(minutosDelPaso({ ...base, velocidad: 2 }, 60_000, 0).minutos).toBe(160)
  })

  it('en pausa no avanza y el resto se conserva', () => {
    expect(minutosDelPaso({ ...base, pausado: true }, 60_000, 0.3)).toEqual({
      minutos: 0,
      resto: 0.3,
    })
  })

  it('en Modo Plano no avanza', () => {
    expect(minutosDelPaso({ ...base, modo: 'plano' }, 60_000, 0).minutos).toBe(0)
  })
})

describe('alfaDelAcumulador', () => {
  it('es la fracción del paso fijo transcurrida, acotada a [0, 1]', () => {
    expect(alfaDelAcumulador(0, 50)).toBe(0)
    expect(alfaDelAcumulador(20, 50)).toBeCloseTo(0.4, 9)
    expect(alfaDelAcumulador(80, 50)).toBe(1)
    expect(alfaDelAcumulador(Number.NaN, 50)).toBe(1)
  })
})
