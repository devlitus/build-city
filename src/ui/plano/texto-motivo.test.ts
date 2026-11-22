import { describe, expect, it } from 'vitest'
import { MOTIVOS_COLOCACION } from '../../core'
import { textoMotivo } from './texto-motivo'

const nada = { dinero: 0, madera: 0, piedra: 0 }

describe('textoMotivo', () => {
  it('cubre todos los motivos de colocación con un texto propio', () => {
    for (const m of MOTIVOS_COLOCACION) {
      const texto = textoMotivo(m, nada)
      expect(texto).not.toBe('')
      expect(texto).not.toContain('construir.motivo')
    }
  })

  it('cada motivo tiene un texto distinto', () => {
    const textos = MOTIVOS_COLOCACION.map((m) => textoMotivo(m, nada))
    expect(new Set(textos).size).toBe(textos.length)
  })

  it('materiales y fondos dicen lo que falta', () => {
    expect(textoMotivo('materiales-insuficientes', { dinero: 0, madera: 10, piedra: 0 })).toBe(
      'Falta: 10 madera',
    )
    expect(textoMotivo('materiales-insuficientes', { dinero: 0, madera: 10, piedra: 5 })).toBe(
      'Falta: 10 madera, 5 piedra',
    )
    expect(textoMotivo('fondos-insuficientes', { dinero: 150, madera: 3, piedra: 0 })).toBe(
      'Falta: 150 monedas, 3 madera',
    )
  })

  it('mensajes del plan', () => {
    expect(textoMotivo('zona-incompatible', nada)).toBe('Zona no compatible')
    expect(textoMotivo('no-propia', nada)).toBe('Fuera de tus parcelas')
    expect(textoMotivo('obstaculo', nada)).toBe('Hay un árbol o una roca')
    expect(textoMotivo('ocupada', nada)).toBe('Ocupado')
    expect(textoMotivo('bloquea-paso', nada)).toBe('Bloquearía el paso')
  })
})
