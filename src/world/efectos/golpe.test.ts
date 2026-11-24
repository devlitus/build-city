import { describe, expect, it } from 'vitest'
import type { EventoJuego } from '../../core'
import { describirGolpe } from './golpe'

const golpeado = (obstaculo: 'arbol' | 'roca' | 'planton' | 'tocon'): EventoJuego => ({
  tipo: 'obstaculo-golpeado',
  obstaculo,
  x: 3,
  y: 4,
  restantes: 2,
})
const quitado = (obstaculo: 'arbol' | 'roca' | 'planton' | 'tocon'): EventoJuego => ({
  tipo: 'obstaculo-quitado',
  obstaculo,
  x: 3,
  y: 4,
  madera: 0,
  piedra: 0,
  plantones: 0,
})

describe('describirGolpe', () => {
  it('un golpe a un árbol lo sacude, con astillas y sonido de madera', () => {
    expect(describirGolpe(golpeado('arbol'))).toEqual({
      x: 3,
      y: 4,
      material: 'madera',
      fase: 'golpe',
      arbol: 'sacudir',
      sonido: 'golpe-madera',
    })
  })

  it('talar un árbol lo hace caer con el sonido de la caída', () => {
    const d = describirGolpe(quitado('arbol'))
    expect(d).toMatchObject({ fase: 'quitado', arbol: 'caer', sonido: 'caida', material: 'madera' })
  })

  it('las rocas sueltan piedra y no mueven ningún árbol', () => {
    expect(describirGolpe(golpeado('roca'))).toMatchObject({
      material: 'piedra',
      arbol: 'ninguno',
      sonido: 'golpe-piedra',
    })
    expect(describirGolpe(quitado('roca'))).toMatchObject({
      material: 'piedra',
      arbol: 'ninguno',
      sonido: 'rotura',
    })
  })

  it('plantones y tocones sueltan astillas sin animar árboles', () => {
    for (const o of ['planton', 'tocon'] as const) {
      expect(describirGolpe(golpeado(o))).toMatchObject({ material: 'madera', arbol: 'ninguno' })
      expect(describirGolpe(quitado(o))).toMatchObject({ arbol: 'ninguno', sonido: 'rotura' })
    }
  })

  it('ignora los eventos que no son de golpes', () => {
    expect(describirGolpe({ tipo: 'planton-perdido', x: 1, y: 1 })).toBeUndefined()
  })
})
