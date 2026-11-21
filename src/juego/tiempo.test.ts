import { describe, expect, it, vi } from 'vitest'
import { CONFIG_TIEMPO, crearEstadoInicial } from '../core'
import { minutosDelPaso } from './bucle'
import { crearAlmacen } from './almacen'
import { comandoDeTecla, instalarTeclasTiempo, type TeclaEntrada } from './tiempo'

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
  it('x2 avanza el doble de minutos por paso (minutosDelPaso)', () => {
    const e1 = crearEstadoInicial({ semilla: 1 })
    const e2 = { ...e1, velocidad: 2 }
    expect(minutosDelPaso(e2, 50, 0).minutos + minutosDelPaso(e2, 50, 0).resto).toBeCloseTo(
      2 * (minutosDelPaso(e1, 50, 0).minutos + minutosDelPaso(e1, 50, 0).resto),
      10,
    )
  })

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

describe('instalarTeclasTiempo', () => {
  type Oyente = (e: KeyboardEvent) => void
  function objetivoFalso() {
    const oyentes = new Set<Oyente>()
    return {
      oyentes,
      addEventListener: vi.fn((_t: string, f: Oyente) => void oyentes.add(f)),
      removeEventListener: vi.fn((_t: string, f: Oyente) => void oyentes.delete(f)),
      pulsar(code: string, target: unknown = null, extra: Partial<TeclaEntrada> = {}) {
        const preventDefault = vi.fn()
        const e = { ...t(code, extra), target, preventDefault } as unknown as KeyboardEvent
        for (const f of [...oyentes]) f(e)
        return preventDefault
      },
    }
  }
  const instalar = () => {
    const almacen = crearAlmacen(crearEstadoInicial({ semilla: 1 }))
    const objetivo = objetivoFalso()
    const quitar = instalarTeclasTiempo(
      almacen,
      objetivo as unknown as Pick<Window, 'addEventListener' | 'removeEventListener'>,
    )
    return { almacen, objetivo, quitar }
  }

  it('Espacio pausa y evita la acción por defecto', () => {
    const { almacen, objetivo } = instalar()
    const evitar = objetivo.pulsar('Space')
    expect(almacen.estado.pausado).toBe(true)
    expect(evitar).toHaveBeenCalled()
  })

  it('ignora las teclas dentro de un campo de texto', () => {
    const { almacen, objetivo } = instalar()
    for (const destino of [
      { tagName: 'INPUT' },
      { tagName: 'textarea' },
      { tagName: 'SELECT' },
      { tagName: 'DIV', isContentEditable: true },
    ]) {
      const evitar = objetivo.pulsar('Space', destino)
      expect(evitar).not.toHaveBeenCalled()
    }
    expect(almacen.estado.pausado).toBe(false)
    objetivo.pulsar('Space', { tagName: 'CANVAS' })
    expect(almacen.estado.pausado).toBe(true)
  })

  it('la función devuelta quita el oyente', () => {
    const { almacen, objetivo, quitar } = instalar()
    expect(objetivo.oyentes.size).toBe(1)
    quitar()
    expect(objetivo.oyentes.size).toBe(0)
    objetivo.pulsar('Space')
    expect(almacen.estado.pausado).toBe(false)
  })
})
