import { describe, expect, it } from 'vitest'
import modelosJson from '../../../data/cultivos-modelos.json'
import { cargarModelosCultivos, DATOS_MODELOS_CULTIVOS } from './modelos-datos'

describe('datos de modelos de cultivo', () => {
  it('el JSON del repositorio es válido y cubre todos los cultivos', () => {
    expect(Object.keys(DATOS_MODELOS_CULTIVOS.cultivos).sort()).toEqual([
      'fresa',
      'lechuga',
      'patata',
      'rabano',
      'zanahoria',
    ])
  })

  it('rechaza un color que no está en la paleta', () => {
    const malo = structuredClone(modelosJson)
    malo.cultivos.fresa.hojas.color = 'noExiste'
    expect(() => cargarModelosCultivos(malo)).toThrow(/noExiste/)
  })

  it('rechaza un cultivo ausente', () => {
    const malo = structuredClone(modelosJson) as { cultivos: Record<string, unknown> }
    delete malo.cultivos.patata
    expect(() => cargarModelosCultivos(malo)).toThrow()
  })
})
