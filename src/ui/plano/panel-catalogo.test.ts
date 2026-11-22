import { describe, expect, it } from 'vitest'
import { crearEstadoInicial } from '../../core'
import { datosPanelCatalogo } from './panel-catalogo'

const base = crearEstadoInicial({ semilla: 1 })

describe('datosPanelCatalogo', () => {
  it('lista los edificios con su huella y días', () => {
    const cobertizo = datosPanelCatalogo(base).find((e) => e.tipo === 'cobertizo')
    expect(cobertizo).toMatchObject({ ancho: 4, alto: 3, dias: 2 })
  })

  it('la casa no muestra costes (es gratis)', () => {
    expect(datosPanelCatalogo(base).find((e) => e.tipo === 'casa')?.costes).toEqual([])
  })

  it('marca lo que falta de dinero y de cada material', () => {
    const d = datosPanelCatalogo({ ...base, dinero: 100, materiales: { madera: 30, piedra: 4 } })
    expect(d.find((e) => e.tipo === 'cobertizo')?.costes).toEqual([
      { clave: 'dinero', cantidad: 300, falta: 200 },
      { clave: 'madera', cantidad: 50, falta: 20 },
      { clave: 'piedra', cantidad: 10, falta: 6 },
    ])
  })

  it('sin faltas, ninguna línea en rojo', () => {
    const d = datosPanelCatalogo({
      ...base,
      dinero: 10000,
      materiales: { madera: 999, piedra: 999 },
    })
    expect(d.flatMap((e) => e.costes).every((l) => l.falta === 0)).toBe(true)
  })
})
