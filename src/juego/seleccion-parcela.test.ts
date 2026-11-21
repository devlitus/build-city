import { describe, expect, it } from 'vitest'
import { crearCanalSeleccionParcela } from './seleccion-parcela'

describe('canal de parcela seleccionada', () => {
  it('avisa solo cuando cambia y permite desuscribirse', () => {
    const c = crearCanalSeleccionParcela()
    const vistos: (number | null)[] = []
    const baja = c.suscribir((i) => vistos.push(i))
    c.seleccionar(3)
    c.seleccionar(3)
    c.seleccionar(null)
    baja()
    c.seleccionar(5)
    expect(vistos).toEqual([3, null])
    expect(c.actual).toBe(5)
  })
})
