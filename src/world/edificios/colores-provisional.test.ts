/* eslint-disable @typescript-eslint/no-non-null-assertion -- aserciones de catálogo conocido en tests */
import { describe, expect, it } from 'vitest'
import { TIPOS_EDIFICIO } from '../../core'
import { colorHex, paletaJuego } from '../paleta'
import { DATOS_OBRA } from './obra-datos'

describe('colores de las formas provisionales', () => {
  it('cada tipo del núcleo tiene colores y todos existen en la paleta', () => {
    const nombres = [DATOS_OBRA.colores.cimientos, DATOS_OBRA.colores.andamios]
    for (const tipo of TIPOS_EDIFICIO) {
      const c = DATOS_OBRA.colores.edificios[tipo]
      expect(c).toBeDefined()
      nombres.push(c!.paredes, c!.tejado)
    }
    for (const n of nombres) expect(() => colorHex(paletaJuego, n)).not.toThrow()
  })
})
