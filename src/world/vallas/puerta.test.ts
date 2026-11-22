import { describe, expect, it } from 'vitest'
import { anguloHoja, avanzarApertura, CONFIG_PUERTA } from './puerta'

const C = { radioApertura: 2, velocidad: 2, anguloMaximo: 90 }

describe('apertura de la puerta', () => {
  it('abre al acercarse, con velocidad limitada', () => {
    expect(avanzarApertura(0, 1, 100, C)).toBeCloseTo(0.2, 9)
    expect(avanzarApertura(0.5, 1, 100, C)).toBeCloseTo(0.7, 9)
    expect(avanzarApertura(0.95, 1, 1000, C)).toBe(1)
  })

  it('cierra al alejarse', () => {
    expect(avanzarApertura(1, 5, 100, C)).toBeCloseTo(0.8, 9)
    expect(avanzarApertura(0.1, 5, 1000, C)).toBe(0)
  })

  it('el radio es exclusivo y una distancia no finita cuenta como lejos', () => {
    expect(avanzarApertura(0.5, 2, 100, C)).toBeLessThan(0.5)
    expect(avanzarApertura(0.5, Number.NaN, 100, C)).toBeLessThan(0.5)
    expect(avanzarApertura(0.5, Infinity, 100, C)).toBeLessThan(0.5)
  })

  it('sin tiempo o con entradas raras no se mueve ni sale de 0..1', () => {
    expect(avanzarApertura(0.4, 0, 0, C)).toBe(0.4)
    expect(avanzarApertura(0.4, 0, -5, C)).toBe(0.4)
    expect(avanzarApertura(0.4, 0, Number.NaN, C)).toBe(0.4)
    expect(avanzarApertura(7, 0, 0, C)).toBe(1)
    expect(avanzarApertura(Number.NaN, 0, 0, C)).toBe(0)
  })

  it('tarda lo mismo en dos pasos que en uno', () => {
    const a = avanzarApertura(avanzarApertura(0, 1, 100, C), 1, 100, C)
    expect(a).toBeCloseTo(avanzarApertura(0, 1, 200, C), 9)
  })

  it('los datos cargan y el ángulo es lineal en radianes', () => {
    expect(CONFIG_PUERTA.radioApertura).toBeGreaterThan(0)
    expect(anguloHoja(0, C)).toBe(0)
    expect(anguloHoja(1, C)).toBeCloseTo(Math.PI / 2, 9)
    expect(anguloHoja(2, C)).toBeCloseTo(Math.PI / 2, 9)
  })
})
