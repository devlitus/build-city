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

  it('día en el límite: limite-de-dia con certeza (el sitio es válido con un día normal)', () => {
    // Parcela propia sin río ni aparición, zona vivienda pintada y Modo Plano.
    const N = base.valle.parcelasPorLado
    const C = base.valle.casillasPorParcela
    const ia = Math.floor(base.aparicion.y / C) * N + Math.floor(base.aparicion.x / C)
    const i = base.valle.parcelas.findIndex((_, k) => !base.valle.rio.includes(k) && k !== ia)
    const px = (i % N) * C
    const py = Math.floor(i / N) * C
    let e = ok({ ...plano, dinero: 100_000 }, { tipo: 'ComprarParcela', indice: i })
    e = { ...e, obstaculos: [] }
    e = ok(e, {
      tipo: 'PintarZona',
      x0: px,
      y0: py,
      x1: px + C - 1,
      y1: py + C - 1,
      zona: 'vivienda',
    })
    const x = px + 1
    const y = py + 1
    // 1. Con un día normal es válido: ningún otro motivo tapa el que se prueba.
    expect(veredictoColocacion(e, 'casa', x, y, 0)).toEqual({ valida: true })
    // 2 y 3. En el límite del día, fantasma y comando dan el mismo rechazo.
    const limite = { ...e, dia: Number.MAX_SAFE_INTEGER }
    expect(veredictoColocacion(limite, 'casa', x, y, 0)).toEqual({
      valida: false,
      motivo: 'limite-de-dia',
      faltan: { dinero: 0, madera: 0, piedra: 0 },
    })
    expect(aplicarComando(limite, { tipo: 'Construir', tipoEdificio: 'casa', x, y })).toMatchObject(
      { ok: false, error: 'limite-de-dia' },
    )
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
