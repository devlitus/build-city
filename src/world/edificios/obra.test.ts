import { describe, expect, it } from 'vitest'
import type { Edificio } from '../../core'
import { cargarObraVisual, DATOS_OBRA } from './obra-datos'
import { escalaTerminado, etapaDeEdificio, etapaObra } from './obra'

const u = DATOS_OBRA.umbrales

describe('etapaObra', () => {
  it('0 % → cimientos', () => {
    expect(etapaObra(0)).toBe('cimientos')
  })
  it('100 % → terminado', () => {
    expect(etapaObra(1)).toBe('terminado')
  })
  it('los umbrales de etapa son crecientes', () => {
    expect(u.andamios).toBeGreaterThan(0)
    expect(u.paredes).toBeGreaterThan(u.andamios)
    expect(u.terminado).toBeGreaterThan(u.paredes)
    expect(u.terminado).toBeLessThanOrEqual(1)
  })
  it('cada umbral cambia de etapa justo en su borde', () => {
    expect(etapaObra(u.andamios - 1e-9)).toBe('cimientos')
    expect(etapaObra(u.andamios)).toBe('andamios')
    expect(etapaObra(u.paredes - 1e-9)).toBe('andamios')
    expect(etapaObra(u.paredes)).toBe('paredes')
    expect(etapaObra(u.terminado - 1e-9)).toBe('paredes')
    expect(etapaObra(u.terminado)).toBe('terminado')
  })
  it('rechaza datos con umbrales no crecientes', () => {
    const malo = {
      ...DATOS_OBRA,
      umbrales: { andamios: 0.6, paredes: 0.5, terminado: 1 },
    }
    expect(() => cargarObraVisual(malo)).toThrow()
  })
})

describe('etapa de un edificio según el progreso del núcleo', () => {
  const obra = (diaInicio: number, diaFin: number): Pick<Edificio, 'obra'> => ({
    obra: { diaInicio, diaFin },
  })
  it('una obra de 3 días recorre las etapas con los días', () => {
    const e = obra(1, 4)
    expect(etapaDeEdificio(e, 1)).toBe('cimientos')
    expect(etapaDeEdificio(e, 2)).toBe('andamios')
    expect(etapaDeEdificio(e, 3)).toBe('paredes')
    expect(etapaDeEdificio(e, 4)).toBe('terminado')
  })
  it('un edificio terminado (obra null) se ve terminado', () => {
    expect(etapaDeEdificio({ obra: null }, 1)).toBe('terminado')
  })
})

describe('escalaTerminado', () => {
  const { duracion, escalaInicial } = DATOS_OBRA.aparicion
  it('empieza en la escala inicial y acaba en 1', () => {
    expect(escalaTerminado(0)).toBe(escalaInicial)
    expect(escalaTerminado(duracion)).toBe(1)
    expect(escalaTerminado(duracion * 5)).toBe(1)
  })
  it('crece de forma monótona', () => {
    let previa = escalaTerminado(0)
    for (let i = 1; i <= 10; i++) {
      const s = escalaTerminado((duracion * i) / 10)
      expect(s).toBeGreaterThanOrEqual(previa)
      previa = s
    }
  })
})
