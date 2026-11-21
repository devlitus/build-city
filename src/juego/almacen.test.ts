import { describe, expect, it, vi } from 'vitest'
import { crearEstadoInicial } from '../core'
import { crearAlmacen, type Notificacion } from './almacen'

const nuevo = () => crearAlmacen(crearEstadoInicial({ semilla: 1 }))

describe('Almacen', () => {
  it('despachar aplica el comando y notifica los eventos', () => {
    const almacen = nuevo()
    const antes = almacen.estado.minutoDelDia
    const recibidas: Notificacion[] = []
    almacen.suscribir((n) => recibidas.push(n))
    const resultado = almacen.despachar({ tipo: 'AvanzarTiempo', minutos: 5 })
    expect(resultado.ok).toBe(true)
    expect(almacen.estado.minutoDelDia).toBe(antes + 5)
    expect(recibidas).toHaveLength(1)
    expect(recibidas[0]).toMatchObject({ ok: true, comando: { tipo: 'AvanzarTiempo' } })
    expect(recibidas[0]?.ok && Array.isArray(recibidas[0].eventos)).toBe(true)
  })

  it('un comando rechazado no cambia el estado y se notifica como error', () => {
    const almacen = nuevo()
    const antes = almacen.estado
    const recibidas: Notificacion[] = []
    almacen.suscribir((n) => recibidas.push(n))
    almacen.despachar({ tipo: 'AvanzarTiempo', minutos: -1 })
    expect(almacen.estado).toBe(antes)
    expect(recibidas).toEqual([
      { ok: false, comando: { tipo: 'AvanzarTiempo', minutos: -1 }, error: 'parametro-invalido' },
    ])
  })

  it('cancelar la suscripción deja de notificar', () => {
    const almacen = nuevo()
    const fn = vi.fn()
    const cancelar = almacen.suscribir(fn)
    almacen.despachar({ tipo: 'Pausar' })
    expect(fn).toHaveBeenCalledTimes(1)
    cancelar()
    almacen.despachar({ tipo: 'Reanudar' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('no expone forma de mutar el estado desde fuera', () => {
    const almacen = nuevo()
    expect(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(almacen), 'estado')?.set).toBe(
      undefined,
    )
    expect(() => {
      ;(almacen as unknown as { estado: unknown }).estado = null
    }).toThrow()
  })
})
