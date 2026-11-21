import { describe, expect, it } from 'vitest'
import type { Notificacion } from '../../juego/almacen'
import { t } from '../textos'
import { textoAviso } from './avisos'

const comando = { tipo: 'UsarHerramienta', x: 1, y: 1 } as const

describe('textoAviso', () => {
  it('avisa cuando el plantón de un árbol talado no cabe en el inventario', () => {
    const n: Notificacion = {
      ok: true,
      comando,
      eventos: [{ tipo: 'planton-perdido', x: 1, y: 1 }],
    }
    expect(textoAviso(n)).toBe(t('avisos.plantonPerdido'))
    expect(textoAviso(n)).not.toBe('avisos.plantonPerdido')
  })

  it('avisa del rechazo por inventario lleno', () => {
    const n: Notificacion = { ok: false, comando, error: 'inventario-lleno' }
    expect(textoAviso(n)).toBe(t('avisos.inventarioLleno'))
  })

  it('no avisa de lo demás', () => {
    expect(textoAviso({ ok: true, comando, eventos: [] })).toBeUndefined()
    expect(textoAviso({ ok: false, comando, error: 'sin-energia' })).toBeUndefined()
  })
})
