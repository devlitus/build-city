import { describe, expect, it } from 'vitest'
import { crearEstadoInicial, type EstadoJuego } from '../../core'
import { comandoUsarHerramienta } from '../../juego/entrada'
import { casillaAMetros } from '../terreno/coordenadas'
import { casillaIndicada, puntosIndicador } from './indicador-datos'

const base = crearEstadoInicial({ semilla: 1 })
const estado = (
  herramienta: EstadoJuego['herramienta'],
  orientacion: EstadoJuego['personaje']['orientacion'] = 'sur',
): EstadoJuego => ({
  ...base,
  modo: 'vida',
  herramienta,
  obstaculos: [{ tipo: 'arbol', x: 50, y: 51, variante: 0.5 }],
  personaje: { x: 50.7, y: 50.3, orientacion },
})
const tecla = { code: 'KeyE', altKey: false, ctrlKey: false, metaKey: false }

describe('casillaIndicada', () => {
  it('marca exactamente la casilla que usará E (aun con un árbol delante)', () => {
    for (const h of ['azada', 'semillas', 'regadera', 'mano'] as const) {
      for (const o of ['norte', 'sur', 'este', 'oeste'] as const) {
        const e = estado(h, o)
        const cmd = comandoUsarHerramienta(tecla, false, e)
        expect(cmd).toBeDefined()
        expect(casillaIndicada(e)).toEqual({ x: cmd?.x, y: cmd?.y })
      }
    }
  })

  it('sin herramienta de cultivo, en Modo Plano o fuera del valle no hay indicador', () => {
    expect(casillaIndicada(estado('hacha'))).toBeUndefined()
    expect(casillaIndicada(estado('pico'))).toBeUndefined()
    expect(casillaIndicada({ ...estado('azada'), modo: 'plano' })).toBeUndefined()
    const borde = {
      ...estado('azada', 'norte'),
      personaje: { x: 3.5, y: 0.5, orientacion: 'norte' as const },
    }
    expect(casillaIndicada(borde)).toBeUndefined()
  })
})

describe('puntosIndicador', () => {
  it('cuadro de 1 m centrado en la casilla y a la altura del terreno', () => {
    const p = puntosIndicador(10, 20, base.valle, (x, z) => x + z, 2, 0.1)
    expect(p.length).toBe(9 * 3)
    const c = casillaAMetros(10, 20, base.valle)
    expect(p[0]).toBeCloseTo(c.x - 0.5)
    expect(p[2]).toBeCloseTo(c.z - 0.5)
    expect(p[1]).toBeCloseTo(c.x - 0.5 + (c.z - 0.5) + 0.1)
    expect(p[8 * 3]).toBeCloseTo(c.x + 0.5)
    expect(p[8 * 3 + 2]).toBeCloseTo(c.z + 0.5)
  })
})
