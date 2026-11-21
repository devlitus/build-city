import { describe, expect, it } from 'vitest'
import { CONFIG_TIEMPO, crearEstadoInicial } from '../core'
import { minutosDelPaso } from './bucle'
import { comandoDeTecla, type TeclaEntrada } from './tiempo'

const t = (code: string, extra: Partial<TeclaEntrada> = {}): TeclaEntrada => ({
  code,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  repeat: false,
  ...extra,
})

describe('comandoDeTecla', () => {
  it('Espacio alterna pausa y reanudar', () => {
    expect(comandoDeTecla(t('Space'), { pausado: false })).toEqual({ tipo: 'Pausar' })
    expect(comandoDeTecla(t('Space'), { pausado: true })).toEqual({ tipo: 'Reanudar' })
  })

  it('Alt+2 cambia a x2 (también con teclado numérico)', () => {
    const esperado = { tipo: 'CambiarVelocidad', velocidad: 2 }
    expect(comandoDeTecla(t('Digit2', { altKey: true }), { pausado: false })).toEqual(esperado)
    expect(comandoDeTecla(t('Numpad2', { altKey: true }), { pausado: false })).toEqual(esperado)
  })

  it('el número sin Alt no hace nada', () => {
    expect(comandoDeTecla(t('Digit2'), { pausado: false })).toBeUndefined()
  })

  it('Alt+4 y Ctrl+Alt+1 no hacen nada', () => {
    expect(comandoDeTecla(t('Digit4', { altKey: true }), { pausado: false })).toBeUndefined()
    expect(
      comandoDeTecla(t('Digit1', { altKey: true, ctrlKey: true }), { pausado: false }),
    ).toBeUndefined()
  })

  it('ignora la repetición de Espacio', () => {
    expect(comandoDeTecla(t('Space', { repeat: true }), { pausado: false })).toBeUndefined()
  })
})

describe('velocidad en el bucle', () => {
  it('a x3 el día dura un tercio de pasos', () => {
    const contar = (velocidad: number): number => {
      const e = { ...crearEstadoInicial({ semilla: 1 }), velocidad }
      const jornada = CONFIG_TIEMPO.horaFin - CONFIG_TIEMPO.horaInicio
      let resto = 0
      let minutos = 0
      let pasos = 0
      while (minutos < jornada) {
        const r = minutosDelPaso(e, 50, resto)
        minutos += r.minutos
        resto = r.resto
        pasos++
      }
      return pasos
    }
    const x1 = contar(1)
    expect(x1 * 50).toBeCloseTo(15 * 60_000, -3)
    expect(contar(3) / x1).toBeCloseTo(1 / 3, 2)
  })
})
