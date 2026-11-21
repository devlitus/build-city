import { describe, expect, it } from 'vitest'
import { haHabidoDesmayo, duracionDesmayo, opacidadDesmayo } from './fundido-desmayo'

const c = { fundidoASegundos: 1, negroSegundos: 2, fundidoDeSegundos: 4 }

describe('opacidadDesmayo', () => {
  it('sube a negro, se mantiene y vuelve a la escena', () => {
    expect(opacidadDesmayo(0, c)).toBe(0)
    expect(opacidadDesmayo(0.5, c)).toBe(0.5)
    expect(opacidadDesmayo(1, c)).toBe(1)
    expect(opacidadDesmayo(2.9, c)).toBe(1)
    expect(opacidadDesmayo(5, c)).toBe(0.5)
    expect(opacidadDesmayo(7, c)).toBe(0)
    expect(opacidadDesmayo(-1, c)).toBe(0)
  })
  it('la duración total suma los tres tramos y los datos son válidos', () => {
    expect(duracionDesmayo(c)).toBe(7)
    expect(duracionDesmayo()).toBeGreaterThan(0)
  })
  it('el evento desmayo se detecta solo en notificaciones aceptadas', () => {
    const comando = { tipo: 'AvanzarTiempo', minutos: 1 } as const
    expect(haHabidoDesmayo({ ok: true, comando, eventos: [{ tipo: 'desmayo' }] })).toBe(true)
    expect(haHabidoDesmayo({ ok: true, comando, eventos: [] })).toBe(false)
    expect(haHabidoDesmayo({ ok: false, comando, error: 'x' as never })).toBe(false)
  })
})
