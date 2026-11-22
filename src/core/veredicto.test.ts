import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  crearEstadoInicial,
  MOTIVOS_VEREDICTO,
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

  it('un caso inválido seguro: parcela sin comprar → no-propia, igual que Construir', () => {
    // (0, 0) es una esquina del valle que no es propia al empezar.
    const v = veredictoColocacion(plano, 'caja-envio', 0, 0, 1)
    expect(v).toEqual({
      valida: false,
      motivo: 'no-propia',
      faltan: { dinero: 0, madera: 0, piedra: 0 },
    })
    const r = aplicarComando(plano, {
      tipo: 'Construir',
      tipoEdificio: 'caja-envio',
      x: 0,
      y: 0,
      rotacion: 1,
    })
    expect(r).toMatchObject({ ok: false, error: 'no-propia' })
  })

  it('fuera del Modo Plano dice solo-en-plano, como Construir', () => {
    expect(veredictoColocacion(base, 'casa', 0, 0, 0)).toMatchObject({
      valida: false,
      motivo: 'solo-en-plano',
    })
  })

  it('día en el límite: limite-de-dia (no se ve válido)', () => {
    const e = { ...plano, dia: Number.MAX_SAFE_INTEGER }
    const v = veredictoColocacion(e, 'casa', 0, 0, 0)
    const r = aplicarComando(e, { tipo: 'Construir', tipoEdificio: 'casa', x: 0, y: 0 })
    expect(v.valida).toBe(r.ok)
    expect(MOTIVOS_VEREDICTO).toContain('limite-de-dia')
  })

  it('estado mal formado: estado-invalido', () => {
    const e = { ...plano, siguienteIdEdificio: 1.5 }
    expect(veredictoColocacion(e, 'caja-envio', 0, 0, 0)).toMatchObject({
      valida: false,
      motivo: 'estado-invalido',
    })
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
