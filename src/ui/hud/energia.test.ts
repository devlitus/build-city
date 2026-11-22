import { describe, expect, it } from 'vitest'
import { crearEstadoInicial, ENERGIA_MAXIMA, ENERGIA_TRAS_DESMAYO } from '../../core'
import { vistaEnergia, vistasEnergiaIguales } from './energia'

describe('vistaEnergia', () => {
  it('coincide con la energía del núcleo', () => {
    const e = crearEstadoInicial({ semilla: 1 })
    expect(vistaEnergia(e)).toMatchObject({ actual: ENERGIA_MAXIMA, fraccion: 1, baja: false })
    expect(vistaEnergia({ energia: ENERGIA_TRAS_DESMAYO })).toMatchObject({
      actual: ENERGIA_TRAS_DESMAYO,
      fraccion: ENERGIA_TRAS_DESMAYO / ENERGIA_MAXIMA,
    })
  })
  it('marca nivel bajo a partir del 25 %', () => {
    expect(vistaEnergia({ energia: 26 }).baja).toBe(false)
    expect(vistaEnergia({ energia: 25 }).baja).toBe(true)
    expect(vistaEnergia({ energia: 0 })).toMatchObject({ fraccion: 0, baja: true })
  })
  it('acota fuera de rango y con máximo 0', () => {
    expect(vistaEnergia({ energia: -5 }).fraccion).toBe(0)
    expect(vistaEnergia({ energia: 500 }).fraccion).toBe(1)
    expect(vistaEnergia({ energia: 3 }, 0).fraccion).toBe(0)
  })
  it('compara vistas por valor', () => {
    const a = vistaEnergia({ energia: 40 })
    expect(vistasEnergiaIguales(a, vistaEnergia({ energia: 40 }))).toBe(true)
    expect(vistasEnergiaIguales(a, vistaEnergia({ energia: 36 }))).toBe(false)
  })
})
