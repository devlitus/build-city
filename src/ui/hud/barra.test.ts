import { describe, expect, it } from 'vitest'
import { HERRAMIENTAS } from '../../core/inventario'
import { vistaBarra } from './barra'

describe('vistaBarra', () => {
  it('resalta solo la herramienta activa del estado, para cada una', () => {
    for (const h of HERRAMIENTAS) {
      const activas = vistaBarra(h).filter((r) => r.activa)
      expect(activas.map((r) => r.herramienta)).toEqual([h])
    }
  })

  it('numera las ranuras desde 1 en el orden de las herramientas', () => {
    expect(vistaBarra('azada').map((r) => [r.tecla, r.herramienta])).toEqual(
      HERRAMIENTAS.map((h, i) => [i + 1, h]),
    )
  })
})
