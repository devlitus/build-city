import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import paletaJson from '../../data/paleta.json'
import { cargarPaleta, color, colorHex, esquemaPaleta } from './paleta'

describe('paleta', () => {
  it('la paleta cumple el esquema', () => {
    expect(v.safeParse(esquemaPaleta, paletaJson).success).toBe(true)
  })

  it('todos los colores son hexadecimales válidos', () => {
    for (const [nombre, hex] of Object.entries(paletaJson)) {
      expect(hex, nombre).toMatch(/^#[0-9a-f]{6}$/i)
    }
    expect(() => cargarPaleta({ malo: '#xyz' })).toThrow(/Paleta inválida/)
  })

  it('un nombre inexistente lanza un error claro', () => {
    const paleta = cargarPaleta(paletaJson)
    expect(() => colorHex(paleta, 'fucsia')).toThrow('Color "fucsia" no existe en la paleta')
    expect(() => color('toString')).toThrow(/toString/)
  })

  it('convierte el hexadecimal a número', () => {
    expect(color('prado')).toBe(0x8fbf5c)
  })
})
