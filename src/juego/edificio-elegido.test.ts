import { describe, expect, it, vi } from 'vitest'
import { crearCanalEdificioElegido } from './edificio-elegido'

describe('canal del edificio elegido', () => {
  it('empieza sin elegir y elegir cambia el valor', () => {
    const c = crearCanalEdificioElegido()
    expect(c.actual).toBeNull()
    c.elegir('tienda')
    expect(c.actual).toBe('tienda')
    c.elegir(null)
    expect(c.actual).toBeNull()
  })

  it('avisa a los oyentes solo cuando cambia', () => {
    const c = crearCanalEdificioElegido()
    const oyente = vi.fn()
    c.suscribir(oyente)
    c.elegir('casa')
    c.elegir('casa')
    expect(oyente).toHaveBeenCalledTimes(1)
    expect(oyente).toHaveBeenLastCalledWith('casa')
    c.elegir('cobertizo')
    c.elegir(null)
    expect(oyente.mock.calls.map((a) => a[0])).toEqual(['casa', 'cobertizo', null])
  })

  it('darse de baja deja de avisar', () => {
    const c = crearCanalEdificioElegido()
    const oyente = vi.fn()
    const baja = c.suscribir(oyente)
    baja()
    c.elegir('tienda')
    expect(oyente).not.toHaveBeenCalled()
  })
})
