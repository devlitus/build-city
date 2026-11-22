import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  colocacionValida,
  crearEstadoInicial,
  mismoVeredicto,
  veredictoColocacion,
  type EstadoJuego,
} from './index'

const ok = (e: EstadoJuego, c: Parameters<typeof aplicarComando>[1]): EstadoJuego => {
  const r = aplicarComando(e, c)
  if (!r.ok) throw new Error(r.error)
  return r.estado
}

describe('veredictoColocacion', () => {
  const base = crearEstadoInicial({ semilla: 42, dineroInicial: 0 })
  const plano = ok(base, { tipo: 'CambiarModo', modo: 'plano' })

  it('coincide con colocacionValida y añade lo que falta', () => {
    const v = veredictoColocacion(plano, 'cobertizo', 0, 0, 1)
    const c = colocacionValida(plano, 'cobertizo', 0, 0, { rotacion: 1 })
    expect(v.valida).toBe(c.valida)
    if (!v.valida && !c.valida) {
      expect(v.motivo).toBe(c.motivo)
      expect(v.faltan).toEqual({
        dinero: 300,
        madera: Math.max(0, 50 - plano.materiales.madera),
        piedra: Math.max(0, 10 - plano.materiales.piedra),
      })
    }
  })

  it('mismoVeredicto compara motivo y cantidades', () => {
    const a = {
      valida: false,
      motivo: 'agua',
      faltan: { dinero: 0, madera: 0, piedra: 0 },
    } as const
    expect(mismoVeredicto(a, { ...a })).toBe(true)
    expect(mismoVeredicto(a, { ...a, faltan: { ...a.faltan, madera: 1 } })).toBe(false)
    expect(mismoVeredicto(a, { valida: true })).toBe(false)
    expect(mismoVeredicto({ valida: true }, { valida: true })).toBe(true)
    expect(mismoVeredicto(null, { valida: true })).toBe(false)
    expect(mismoVeredicto(null, null)).toBe(true)
  })
})
