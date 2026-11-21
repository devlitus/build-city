import { describe, expect, it } from 'vitest'
import {
  aplicarComando,
  CONFIG_TIEMPO,
  crearEstadoInicial,
  minutosDeJuegoPorMs,
  type Comando,
  type EstadoJuego,
} from '.'

function aplicar(estado: EstadoJuego, c: Comando) {
  const r = aplicarComando(estado, c)
  if (!r.ok) throw new Error(r.error)
  return r
}

describe('tiempo del núcleo', () => {
  it('x2 avanza el doble de minutos por paso', () => {
    expect(minutosDeJuegoPorMs(50, 2)).toBeCloseTo(2 * minutosDeJuegoPorMs(50, 1), 10)
    const e2 = aplicar(crearEstadoInicial({ semilla: 1 }), {
      tipo: 'CambiarVelocidad',
      velocidad: 2,
    })
    expect(e2.estado.velocidad).toBe(2)
  })

  it('en pausa no avanza ni el reloj ni el personaje', () => {
    const base = aplicar(crearEstadoInicial({ semilla: 1 }), { tipo: 'Pausar' }).estado
    expect(aplicar(base, { tipo: 'AvanzarTiempo', minutos: 30 }).estado.minutoDelDia).toBe(
      base.minutoDelDia,
    )
    const m = aplicar(base, { tipo: 'MoverPersonaje', dx: 1, dy: 0, ms: 500 })
    expect(m.estado.personaje).toEqual(base.personaje)
  })

  it('a las 02:00 se dispara el desmayo', () => {
    const e = crearEstadoInicial({ semilla: 1 })
    const r = aplicar(e, {
      tipo: 'AvanzarTiempo',
      minutos: CONFIG_TIEMPO.horaFin - e.minutoDelDia + 1,
    })
    expect(r.eventos.some((ev) => ev.tipo === 'desmayo')).toBe(true)
    expect(r.estado.dia).toBe(e.dia + 1)
  })

  it('un día de 06:00 a 02:00 dura ≈ 15 min reales a x1 y un tercio a x3', () => {
    const jornada = CONFIG_TIEMPO.horaFin - CONFIG_TIEMPO.horaInicio
    const ms = 15 * 60_000
    expect(minutosDeJuegoPorMs(ms, 1)).toBeCloseTo(jornada, 6)
    expect(minutosDeJuegoPorMs(ms / 3, 3)).toBeCloseTo(jornada, 6)
  })
})
