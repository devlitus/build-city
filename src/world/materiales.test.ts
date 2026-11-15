import { describe, expect, it } from 'vitest'
import { materialDe } from './materiales'

describe('materiales', () => {
  it('pedir dos veces el mismo color devuelve el mismo material', () => {
    expect(materialDe('prado')).toBe(materialDe('prado'))
    expect(materialDe('prado')).not.toBe(materialDe('roca'))
  })

  it('es plano y sin brillo', () => {
    const m = materialDe('teja')
    expect(m.flatShading).toBe(true)
    expect(m.roughness).toBe(1)
    expect(m.metalness).toBe(0)
    expect(m.color.getHex()).toBe(0xc4553b)
  })

  it('un color inexistente lanza error', () => {
    expect(() => materialDe('nada')).toThrow(/nada/)
  })
})
