import { describe, expect, it } from 'vitest'
import { aplicarComando, crearEstadoInicial, tiempoDetenido, type Comando } from '.'

const base = crearEstadoInicial({ semilla: 1 })

function aplicar(estado: typeof base, comando: Comando): typeof base {
  const r = aplicarComando(estado, comando)
  expect(r.ok).toBe(true)
  return r.estado
}

describe('Modo Plano en el núcleo', () => {
  it('entrar en Plano pausa (ajuste activo por defecto)', () => {
    expect(base.pausarEnPlano).toBe(true)
    expect(tiempoDetenido(base)).toBe(false)
    const plano = aplicar(base, { tipo: 'CambiarModo', modo: 'plano' })
    expect(tiempoDetenido(plano)).toBe(true)
    const t = aplicar(plano, { tipo: 'AvanzarTiempo', minutos: 10 })
    expect(t.minutoDelDia).toBe(plano.minutoDelDia)
  })

  it.each([1, 2, 3])('salir restaura la velocidad previa (x%i) y reanuda', (velocidad) => {
    const rapido = aplicar(base, { tipo: 'CambiarVelocidad', velocidad })
    const plano = aplicar(rapido, { tipo: 'CambiarModo', modo: 'plano' })
    expect(plano.velocidad).toBe(velocidad)
    const vida = aplicar(plano, { tipo: 'CambiarModo', modo: 'vida' })
    expect(vida.velocidad).toBe(velocidad)
    expect(tiempoDetenido(vida)).toBe(false)
  })

  it('salir de Plano con pausa del jugador previa sigue pausado', () => {
    const pausado = aplicar(base, { tipo: 'Pausar' })
    const plano = aplicar(pausado, { tipo: 'CambiarModo', modo: 'plano' })
    const vida = aplicar(plano, { tipo: 'CambiarModo', modo: 'vida' })
    expect(vida.pausado).toBe(true)
    expect(tiempoDetenido(vida)).toBe(true)
  })

  it('con el ajuste desactivado no pausa, pero el personaje no anda', () => {
    const sinPausa = aplicar(base, { tipo: 'FijarPausarEnPlano', activo: false })
    const plano = aplicar(sinPausa, { tipo: 'CambiarModo', modo: 'plano' })
    expect(tiempoDetenido(plano)).toBe(false)
    const t = aplicar(plano, { tipo: 'AvanzarTiempo', minutos: 10 })
    expect(t.minutoDelDia).toBe(plano.minutoDelDia + 10)
    const m = aplicar(plano, { tipo: 'MoverPersonaje', dx: 1, dy: 0, ms: 100 })
    expect(m.personaje).toEqual(plano.personaje)
  })

  it('con el ajuste desactivado la pausa del jugador sigue valiendo', () => {
    const e = aplicar(aplicar(base, { tipo: 'FijarPausarEnPlano', activo: false }), {
      tipo: 'Pausar',
    })
    expect(tiempoDetenido({ ...e, modo: 'plano' })).toBe(true)
  })

  it('FijarPausarEnPlano rechaza valores no booleanos', () => {
    const r = aplicarComando(base, { tipo: 'FijarPausarEnPlano', activo: 1 as unknown as boolean })
    expect(r.ok).toBe(false)
  })
})
