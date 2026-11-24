import { describe, expect, it, vi } from 'vitest'
import { crearCacheModelos } from './carga-cache'

describe('caché de modelos de edificios', () => {
  it('pedir dos veces el mismo modelo carga una sola vez', async () => {
    const cargar = vi.fn((clave: string) => Promise.resolve({ clave }))
    const cache = crearCacheModelos(cargar)
    const [a, b] = await Promise.all([cache.pedir('casa_terminado'), cache.pedir('casa_terminado')])
    await cache.pedir('casa_terminado')
    expect(cargar).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('claves distintas cargan por separado', async () => {
    const cargar = vi.fn((clave: string) => Promise.resolve(clave))
    const cache = crearCacheModelos(cargar)
    await cache.pedir('a')
    await cache.pedir('b')
    expect(cargar).toHaveBeenCalledTimes(2)
  })

  it('listo() es undefined mientras carga y devuelve el modelo después', async () => {
    let resolver: (v: string) => void = () => {}
    const cache = crearCacheModelos(() => new Promise<string>((r) => (resolver = r)))
    const p = cache.pedir('x')
    expect(cache.listo('x')).toBeUndefined()
    resolver('modelo')
    await p
    expect(cache.listo('x')).toBe('modelo')
  })

  it('un fallo no se memoiza y permite reintentar', async () => {
    const cargar = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce('ok')
    const cache = crearCacheModelos<string>(cargar)
    await expect(cache.pedir('x')).rejects.toThrow('red')
    expect(cache.listo('x')).toBeUndefined()
    await expect(cache.pedir('x')).resolves.toBe('ok')
    expect(cargar).toHaveBeenCalledTimes(2)
  })
})
