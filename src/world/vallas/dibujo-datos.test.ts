import { describe, expect, it } from 'vitest'
import { cargarDibujoVallas, DATOS_DIBUJO_VALLAS } from './dibujo-datos'

describe('datos del dibujo de vallas', () => {
  it('el JSON del repositorio es válido', () => {
    expect(DATOS_DIBUJO_VALLAS.tabla.alturas.length).toBeGreaterThan(0)
  })
  it('rechaza un color que no está en la paleta', () => {
    const malo = {
      ...DATOS_DIBUJO_VALLAS,
      poste: { ...DATOS_DIBUJO_VALLAS.poste, color: 'noExiste' },
    }
    expect(() => cargarDibujoVallas(malo)).toThrow(/paleta/)
  })
  it('rechaza una hoja que no cabe entre los postes', () => {
    const malo = {
      ...DATOS_DIBUJO_VALLAS,
      puerta: { ...DATOS_DIBUJO_VALLAS.puerta, largoHoja: 0.99 },
    }
    expect(() => cargarDibujoVallas(malo)).toThrow(/hoja/)
  })
  it('rechaza medidas no positivas', () => {
    const malo = { ...DATOS_DIBUJO_VALLAS, poste: { ...DATOS_DIBUJO_VALLAS.poste, ancho: 0 } }
    expect(() => cargarDibujoVallas(malo)).toThrow()
  })
})
