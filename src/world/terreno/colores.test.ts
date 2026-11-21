import { describe, expect, it } from 'vitest'
import { paletaJuego } from '../paleta'
import { colorDeCara, hashCara, nombreColorBase, type DatosCara } from './colores'
import { PARAMETROS_TERRENO } from './parametros'

const { colores, nivelAgua } = PARAMETROS_TERRENO

const llana: DatosCara = { terreno: 'prado', altura: 0.5, pendiente: 0, x: 3, z: 4 }

describe('color de cara', () => {
  it('el color de cara depende del tipo y la altura', () => {
    const base = (c: Partial<DatosCara>): string =>
      nombreColorBase({ ...llana, ...c }, nivelAgua, colores)
    expect(base({ terreno: 'prado' })).toBe('prado')
    expect(base({ terreno: 'bosque' })).toBe('bosque')
    expect(base({ terreno: 'rocoso' })).toBe('roca')
    expect(base({ altura: colores.alturaArena - 0.01 })).toBe('arena')
    expect(base({ altura: nivelAgua - 0.1 })).toBe('lecho')
    expect(base({ terreno: undefined, altura: 3 })).toBe('bosque')
    expect(base({ terreno: undefined, altura: colores.alturaRoca + 1 })).toBe('roca')
    expect(base({ terreno: undefined, altura: colores.alturaNieve + 1 })).toBe('nieve')
    expect(base({ pendiente: colores.pendienteRoca + 0.1 })).toBe('roca')
    // Y el color final cambia con el tipo.
    const prado = colorDeCara(llana, 1, paletaJuego)
    const bosque = colorDeCara({ ...llana, terreno: 'bosque' }, 1, paletaJuego)
    expect(prado).not.toEqual(bosque)
  })

  it('la variación queda dentro del margen', () => {
    const base = colorDeCara({ ...llana, x: 0, z: 0 }, 1, paletaJuego, {
      ...PARAMETROS_TERRENO,
      colores: { ...colores, variacion: 0 },
    })
    let distintos = 0
    for (let i = 0; i < 300; i++) {
      const c = colorDeCara({ ...llana, x: i * 1.3, z: i * 0.7 }, 7, paletaJuego)
      for (let k = 0; k < 3; k++) {
        const razon = (c[k] ?? 0) / (base[k] ?? 1)
        expect(razon).toBeGreaterThanOrEqual(1 - colores.variacion - 1e-9)
        // Puede quedar recortado a 1, pero nunca superar el margen.
        expect(razon).toBeLessThanOrEqual(1 + colores.variacion + 1e-9)
      }
      if (c[0] !== base[0]) distintos++
    }
    expect(distintos).toBeGreaterThan(200)
  })

  it('es determinista y depende de la semilla', () => {
    expect(hashCara(5.5, 2.5, 3)).toBe(hashCara(5.5, 2.5, 3))
    expect(hashCara(5.5, 2.5, 3)).not.toBe(hashCara(5.5, 2.5, 4))
    expect(colorDeCara(llana, 9, paletaJuego)).toEqual(colorDeCara(llana, 9, paletaJuego))
  })
})
