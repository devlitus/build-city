import { describe, expect, it } from 'vitest'
import { DATOS_EFECTOS } from './efectos-datos'
import { SistemaParticulas, crearRafaga, escalaParticula } from './particulas'
import { paletaJuego } from '../paleta'

const { astillas, piedra } = DATOS_EFECTOS.particulas
const ORIGEN = { x: 1, y: 2, z: 3 }

describe('crearRafaga', () => {
  it('crea la cantidad pedida, con colores del tipo y vida acotada', () => {
    const r = crearRafaga(ORIGEN, 10, astillas, 7)
    expect(r).toHaveLength(10)
    for (const p of r) {
      expect(astillas.colores).toContain(p.color)
      expect(p.vida).toBeLessThanOrEqual(astillas.vida)
      expect(p.vida).toBeGreaterThan(0)
      expect(p.tamano).toBeLessThanOrEqual(astillas.tamano)
      expect(Math.hypot(p.vx, p.vz)).toBeLessThanOrEqual(astillas.rapidez + 1e-9)
      expect(p.vy).toBeGreaterThan(0)
    }
  })

  it('es determinista: misma semilla, mismas partículas; otra semilla, distintas', () => {
    expect(crearRafaga(ORIGEN, 6, piedra, 3)).toEqual(crearRafaga(ORIGEN, 6, piedra, 3))
    expect(crearRafaga(ORIGEN, 6, piedra, 3)).not.toEqual(crearRafaga(ORIGEN, 6, piedra, 4))
  })

  it('cantidad cero o negativa no crea nada', () => {
    expect(crearRafaga(ORIGEN, 0, astillas, 1)).toEqual([])
    expect(crearRafaga(ORIGEN, -3, astillas, 1)).toEqual([])
  })
})

describe('SistemaParticulas', () => {
  it('al pasar su vida no queda ninguna partícula (sin fugas)', () => {
    const s = new SistemaParticulas(DATOS_EFECTOS.particulas.capacidad, 9.8)
    s.emitir(crearRafaga(ORIGEN, 14, astillas, 1))
    s.emitir(crearRafaga(ORIGEN, 12, piedra, 2))
    expect(s.vivas).toHaveLength(26)
    for (let i = 0; i < 20; i++) s.actualizar(0.1)
    expect(s.vivas).toHaveLength(0)
  })

  it('respeta la capacidad descartando las que no caben', () => {
    const s = new SistemaParticulas(5, 9.8)
    s.emitir(crearRafaga(ORIGEN, 20, astillas, 1))
    expect(s.vivas).toHaveLength(5)
  })

  it('la gravedad las frena y las baja; las que tocan el suelo se retiran', () => {
    const s = new SistemaParticulas(10, 10)
    s.emitir([{ x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, vida: 5, tamano: 0.1, color: 'madera' }])
    s.actualizar(0.1, () => 0)
    expect(s.vivas[0]?.y).toBeLessThan(1)
    for (let i = 0; i < 10; i++) s.actualizar(0.1, () => 0)
    expect(s.vivas).toHaveLength(0)
  })
})

describe('escalaParticula y datos', () => {
  it('encoge de 1 a 0 con la edad', () => {
    expect(escalaParticula(0, 1)).toBe(1)
    expect(escalaParticula(0.5, 1)).toBeCloseTo(0.5, 10)
    expect(escalaParticula(2, 1)).toBe(0)
  })

  it('todos los colores de los efectos existen en la paleta', () => {
    for (const nombre of [...astillas.colores, ...piedra.colores])
      expect(paletaJuego).toHaveProperty(nombre)
  })
})
