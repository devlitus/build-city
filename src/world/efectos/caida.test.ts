import { describe, expect, it } from 'vitest'
import {
  DIRECCION_CAIDA_POR_DEFECTO,
  anguloCaida,
  anguloSacudida,
  direccionCaida,
  ejeCaida,
  escalaDesvanecer,
} from './caida'

describe('direccionCaida', () => {
  const casos = [
    { nombre: 'granjero al oeste', arbol: { x: 5, z: 5 }, granjero: { x: 3, z: 5 } },
    { nombre: 'granjero al norte', arbol: { x: 5, z: 5 }, granjero: { x: 5, z: 2 } },
    { nombre: 'granjero en diagonal', arbol: { x: 5, z: 5 }, granjero: { x: 3, z: 3 } },
    { nombre: 'granjero en la otra diagonal', arbol: { x: -2, z: 4 }, granjero: { x: 1, z: 9 } },
    { nombre: 'coordenadas negativas', arbol: { x: -10, z: -10 }, granjero: { x: -9.5, z: -10.2 } },
  ]

  it.each(casos)('la dirección de caída es opuesta al granjero ($nombre)', (c) => {
    const d = direccionCaida(c.arbol, c.granjero)
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1, 10)
    // Del granjero al árbol: misma dirección que (árbol - granjero), nunca hacia el granjero.
    const haciaGranjero = { x: c.granjero.x - c.arbol.x, z: c.granjero.z - c.arbol.z }
    expect(d.x * haciaGranjero.x + d.z * haciaGranjero.z).toBeLessThan(0)
    const largo = Math.hypot(haciaGranjero.x, haciaGranjero.z)
    expect(d.x * haciaGranjero.x + d.z * haciaGranjero.z).toBeCloseTo(-largo, 10)
  })

  it('con el granjero en el mismo punto usa la dirección por defecto (unitaria)', () => {
    const d = direccionCaida({ x: 4, z: 4 }, { x: 4, z: 4 })
    expect(d).toEqual(DIRECCION_CAIDA_POR_DEFECTO)
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1, 10)
  })
})

describe('ejeCaida', () => {
  it('girar alrededor del eje inclina la copa hacia la dirección de caída', () => {
    for (const d of [
      { x: 1, z: 0 },
      { x: 0, z: -1 },
      { x: Math.SQRT1_2, z: Math.SQRT1_2 },
    ]) {
      const k = ejeCaida(d)
      const theta = 0.1
      // Vector arriba (0,1,0) girado un ángulo pequeño: u + θ (k × u), con k × u = (kz*0.. )
      // k = (kx, 0, kz), u = (0, 1, 0): k × u = (-kz, 0, kx)
      const copa = { x: -k.z * theta, z: k.x * theta }
      expect(copa.x * d.x + copa.z * d.z).toBeGreaterThan(0)
    }
  })
})

describe('anguloCaida', () => {
  it('empieza en 0, crece sin pasos hacia atrás y se queda en el ángulo final', () => {
    expect(anguloCaida(0, 1, 90)).toBe(0)
    expect(anguloCaida(0.5, 1, 90)).toBeLessThan(anguloCaida(0.8, 1, 90))
    expect(anguloCaida(1, 1, 90)).toBe(90)
    expect(anguloCaida(5, 1, 90)).toBe(90)
  })
})

describe('anguloSacudida y escalaDesvanecer', () => {
  it('la sacudida se apaga y vale 0 fuera de su duración', () => {
    expect(anguloSacudida(-1, 0.3, 4, 18)).toBe(0)
    expect(anguloSacudida(0.3, 0.3, 4, 18)).toBe(0)
    const maximo = Math.max(
      ...[0.01, 0.02, 0.03, 0.04].map((t) => Math.abs(anguloSacudida(t, 0.3, 4, 18))),
    )
    expect(maximo).toBeLessThanOrEqual(4)
  })

  it('el árbol caído encoge de 1 a 0 al final', () => {
    expect(escalaDesvanecer(0.5, 1, 0.8)).toBe(1)
    expect(escalaDesvanecer(0.9, 1, 0.8)).toBeCloseTo(0.5, 10)
    expect(escalaDesvanecer(1, 1, 0.8)).toBe(0)
  })
})
