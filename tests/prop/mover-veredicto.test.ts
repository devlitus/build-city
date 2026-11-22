import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  aplicarComando,
  crearEstadoInicial,
  ladoValle,
  veredictoMover,
  type Comando,
  type EstadoJuego,
  type Rotacion,
  type TipoEdificio,
} from '../../src/core'

const TIPOS: readonly TipoEdificio[] = ['casa', 'caja-envio', 'cobertizo', 'tienda']

/** Tres parcelas propias, zonas vivienda/almacén alternas, Modo Plano y unos edificios terminados. */
function preparar(semilla: number): EstadoJuego {
  let e = crearEstadoInicial({ semilla, dineroInicial: 500_000 })
  const paso = (c: Comando) => {
    const r = aplicarComando(e, c)
    if (r.ok) e = r.estado
  }
  const N = e.valle.parcelasPorLado
  for (let i = 0; i < N * N; i++) {
    if (e.valle.parcelas.filter((p) => p.estado === 'propia').length >= 3) break
    if (!e.valle.rio.includes(i)) paso({ tipo: 'ComprarParcela', indice: i })
  }
  const lado = ladoValle(e.valle)
  for (let x = 0; x < lado; x += 8) {
    const zona = (x / 8) % 2 === 0 ? 'vivienda' : 'almacen'
    paso({ tipo: 'PintarZona', x0: x, y0: 0, x1: x + 7, y1: lado - 1, zona })
  }
  paso({ tipo: 'CambiarModo', modo: 'plano' })
  // Construye lo que quepa en una rejilla gruesa de sitios y lo da por terminado.
  for (let y = 0; y < lado; y += 5) {
    for (let x = 0; x < lado; x += 8) {
      const t = TIPOS[((x / 8) * 3 + y) % TIPOS.length] as TipoEdificio
      paso({ tipo: 'Construir', tipoEdificio: t, x, y })
    }
  }
  return { ...e, edificios: e.edificios.map((b) => ({ ...b, obra: null })) }
}

const ESTADOS = [3, 7, 42].map(preparar)
const rot = fc.constantFrom<Rotacion>(0, 1, 2, 3)

describe('mover: el veredicto y el comando coinciden', () => {
  it('hay edificios con los que probar', () => {
    for (const e of ESTADOS) expect(e.edificios.length).toBeGreaterThan(0)
  })

  it('MoverEdificio tiene éxito ⇔ veredictoMover es válido, con el mismo motivo si falla', () => {
    fc.assert(
      fc.property(
        fc.nat(2),
        fc.nat(50),
        fc.integer({ min: -2, max: 165 }),
        fc.integer({ min: -2, max: 165 }),
        rot,
        (si, k, x, y, rotacion) => {
          const e = ESTADOS[si] as EstadoJuego
          const b = e.edificios[k % e.edificios.length]
          if (!b) return
          const v = veredictoMover(e, b.id, x, y, rotacion)
          const r = aplicarComando(e, { tipo: 'MoverEdificio', id: b.id, x, y, rotacion })
          expect(r.ok).toBe(v.valida)
          if (!r.ok && !v.valida) expect(r.error).toBe(v.motivo)
        },
      ),
      { numRuns: 300 },
    )
  })

  it('también con obras, ids inexistentes y un estado mal formado', () => {
    fc.assert(
      fc.property(
        fc.nat(2),
        fc.integer({ min: -1, max: 60 }),
        fc.integer({ min: 0, max: 159 }),
        fc.integer({ min: 0, max: 159 }),
        rot,
        fc.boolean(),
        (si, id, x, y, rotacion, roto) => {
          const base = ESTADOS[si] as EstadoJuego
          const obras = base.edificios.map((b, i) =>
            i % 2 === 0 ? { ...b, obra: { diaInicio: 0, diaFin: 1 } } : b,
          )
          const e: EstadoJuego = roto
            ? { ...base, edificios: obras, siguienteIdEdificio: 1.5 }
            : { ...base, edificios: obras }
          const v = veredictoMover(e, id, x, y, rotacion)
          const r = aplicarComando(e, { tipo: 'MoverEdificio', id, x, y, rotacion })
          expect(r.ok).toBe(v.valida)
          if (!r.ok && !v.valida) expect(r.error).toBe(v.motivo)
        },
      ),
      { numRuns: 200 },
    )
  })
})
