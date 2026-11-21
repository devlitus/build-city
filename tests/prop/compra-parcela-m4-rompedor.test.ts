/**
 * Rompedor · M4-T05 Panel de parcela y compra (crítico: dinero y parcelas).
 * Ataques: el panel (`datosPanelParcela`) frente a lo que cobra el núcleo en secuencias de compras
 * válidas e inválidas con dinero variable; curva exacta de precios contra un oráculo propio leído
 * de `data/economia.json`; índices raros en el panel y en el canal de selección; dinero corrupto.
 * No repite lo que ya cubre `parcelas-rompedor.test.ts` (M3) ni `economia-rompedor.test.ts`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { aplicarComando, crearEstadoInicial, type EstadoJuego } from '../../src/core'
import { crearCanalSeleccionParcela } from '../../src/juego/seleccion-parcela'
import { datosPanelParcela } from '../../src/ui/plano/panel-parcela'

// ---------------------------------------------------------------- utilidades

interface DatosEconomia {
  precioBase: number
  factorTerreno: Record<string, number>
  factorFertilidad: Record<string, number>
  factorAgua: Record<string, number>
  subidaPorCompra: number
  atenuacionSubida: number
  subidaMinima: number
}
const ECO = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../data/economia.json'), 'utf8'),
) as DatosEconomia

/** Fracción exacta de un decimal corto de los datos (0,4 → 4/10). */
function frac(x: number): [bigint, bigint] {
  const s = String(x)
  const [ent = '0', dec = ''] = s.split('.')
  return [BigInt(ent + dec), 10n ** BigInt(dec.length)]
}

/**
 * Oráculo independiente del precio: base × factores × Π_{i<n}(1 + max(mín, subida·aten^i)),
 * redondeado a la decena (mitades arriba), mínimo 10.
 */
function precioOraculo(e: EstadoJuego, indice: number): number {
  const p = e.valle.parcelas[indice]
  if (!p) throw new Error('índice')
  let [num, den] = frac(ECO.precioBase)
  for (const f of [
    ECO.factorTerreno[p.terreno],
    ECO.factorFertilidad[p.fertilidad],
    ECO.factorAgua[p.agua],
  ]) {
    const [a, b] = frac(f as number)
    num *= a
    den *= b
  }
  const [sn, sd] = frac(ECO.subidaPorCompra)
  const [an, ad] = frac(ECO.atenuacionSubida)
  const [mn, md] = frac(ECO.subidaMinima)
  for (let i = 0; i < e.comprasHechas; i++) {
    const rn = sn * an ** BigInt(i)
    const rd = sd * ad ** BigInt(i)
    const [un, ud] = rn * md >= mn * rd ? [rn, rd] : [mn, md]
    num *= ud + un
    den *= ud
  }
  const decenas = (num + 5n * den) / (10n * den)
  return Math.max(10, Number(decenas * 10n))
}

function propias(e: EstadoJuego): number[] {
  return e.valle.parcelas.flatMap((p, i) => (p.estado === 'propia' ? [i] : []))
}

function conexo4(e: EstadoJuego): boolean {
  const n = e.valle.parcelasPorLado
  const ps = propias(e)
  if (ps.length === 0) return true
  const set = new Set(ps)
  const vistas = new Set([ps[0] as number])
  const pila = [ps[0] as number]
  while (pila.length > 0) {
    const i = pila.pop() as number
    const f = Math.floor(i / n)
    const c = i % n
    const vecinas: Array<[number, number]> = [
      [f - 1, c],
      [f + 1, c],
      [f, c - 1],
      [f, c + 1],
    ]
    for (const [ff, cc] of vecinas) {
      if (ff < 0 || cc < 0 || ff >= n || cc >= n) continue
      const j = ff * n + cc
      if (set.has(j) && !vistas.has(j)) {
        vistas.add(j)
        pila.push(j)
      }
    }
  }
  return vistas.size === ps.length
}

const BASE = crearEstadoInicial({ semilla: 11, dineroInicial: 1100 })
const TOTAL = BASE.valle.parcelas.length

// ---------------------------------------------------------------- propiedad principal

type Paso =
  | { readonly k: 'comprar'; readonly indice: number }
  | { readonly k: 'ingreso'; readonly cantidad: number }

const arbPaso: fc.Arbitrary<Paso> = fc.oneof(
  {
    weight: 6,
    arbitrary: fc
      .integer({ min: 0, max: TOTAL - 1 })
      .map((indice) => ({ k: 'comprar' as const, indice })),
  },
  {
    weight: 1,
    arbitrary: fc
      .constantFrom(-1, TOTAL, 1.5, Number.NaN, -0, Infinity)
      .map((indice) => ({ k: 'comprar' as const, indice })),
  },
  // Ingresos simulados (cosechas/ventas): el dinero varía entre compras.
  {
    weight: 2,
    arbitrary: fc
      .integer({ min: 0, max: 3000 })
      .map((cantidad) => ({ k: 'ingreso' as const, cantidad })),
  },
)

describe('M4-T05 · panel ⇔ núcleo en secuencias de compras', () => {
  it('propiedad: precio del panel = oráculo = evento = bajada de dinero; comprable ⇔ ok; invariantes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 5000 }),
        fc.array(arbPaso, { minLength: 1, maxLength: 80 }),
        (semilla, dinero, pasos) => {
          let e = crearEstadoInicial({ semilla, dineroInicial: dinero })
          const compradas = new Set<number>()
          for (const paso of pasos) {
            if (paso.k === 'ingreso') {
              e = { ...e, dinero: e.dinero + paso.cantidad }
              continue
            }
            const { indice } = paso
            const d = datosPanelParcela(e, indice)
            const r = aplicarComando(e, { tipo: 'ComprarParcela', indice })
            if (d === undefined) {
              // El panel no se abre: el comando tampoco puede comprar.
              expect(r.ok).toBe(false)
              continue
            }
            const normal = indice + 0
            expect(d.propia).toBe(e.valle.parcelas[normal]?.estado === 'propia')
            if (!d.propia) expect(d.precio).toBe(precioOraculo(e, normal))
            else expect(d.precio).toBeUndefined()
            expect(d.comprable).toBe(r.ok)
            if (d.motivo === 'fondos-insuficientes') {
              expect(d.falta).toBe((d.precio as number) - e.dinero)
              expect(Number.isSafeInteger(d.falta) && d.falta > 0).toBe(true)
            } else expect(d.falta).toBe(0)
            if (r.ok) {
              expect(compradas.has(normal)).toBe(false)
              compradas.add(normal)
              expect(r.eventos).toEqual([
                { tipo: 'parcela-comprada', indice: normal, precio: d.precio },
              ])
              expect(e.dinero - r.estado.dinero).toBe(d.precio)
            } else {
              expect(r.error).toBe(d.motivo)
              expect(r.estado).toBe(e)
            }
            e = r.estado
            expect(e.dinero).toBeGreaterThanOrEqual(0)
            expect(Number.isSafeInteger(e.dinero)).toBe(true)
            expect(e.comprasHechas).toBe(compradas.size)
            expect(propias(e)).toEqual([...compradas].sort((a, b) => a - b))
            expect(conexo4(e)).toBe(true)
          }
        },
      ),
      { numRuns: 150 },
    )
  })

  it('tras comprar, ninguna parcela muestra «comprable» si el comando la rechazaría (recorrido completo del valle)', () => {
    let e = crearEstadoInicial({ semilla: 3, dineroInicial: 10_000_000 })
    // Compra en espiral desde la esquina para recorrer todos los motivos.
    for (let paso = 0; paso < TOTAL; paso++) {
      for (let i = 0; i < TOTAL; i++) {
        const d = datosPanelParcela(e, i)
        const r = aplicarComando(e, { tipo: 'ComprarParcela', indice: i })
        expect(d?.comprable).toBe(r.ok)
        if (r.ok) expect(d?.precio).toBe(precioOraculo(e, i))
      }
      const siguiente = e.valle.parcelas.findIndex((_, i) => datosPanelParcela(e, i)?.comprable)
      if (siguiente < 0) break
      const r = aplicarComando(e, { tipo: 'ComprarParcela', indice: siguiente })
      if (!r.ok) throw new Error('compra válida rechazada')
      e = r.estado
    }
    expect(propias(e).length).toBe(TOTAL)
    expect(e.comprasHechas).toBe(TOTAL)
    expect(e.dinero).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------- índices raros

describe('M4-T05 · índices raros en el panel y en el canal de selección', () => {
  it('NaN, -1, fuera de rango, decimales e infinitos no abren el panel ni lanzan; -0 es la parcela 0', () => {
    for (const i of [Number.NaN, -1, TOTAL, TOTAL + 1, 1.5, -0.5, Infinity, -Infinity, 2 ** 53]) {
      expect(() => datosPanelParcela(BASE, i)).not.toThrow()
      expect(datosPanelParcela(BASE, i)).toBeUndefined()
    }
    const cero = datosPanelParcela(BASE, -0)
    expect(cero).toMatchObject({ ...datosPanelParcela(BASE, 0), indice: -0 })
  })

  it('un índice que no es number (string "0") no muestra precio ni deja comprar', () => {
    const d = datosPanelParcela(BASE, '0' as unknown as number)
    expect(d?.comprable ?? false).toBe(false)
    expect(d?.precio).toBeUndefined()
    const r = aplicarComando(BASE, { tipo: 'ComprarParcela', indice: '0' as unknown as number })
    expect(r.ok).toBe(false)
  })

  it('el canal acepta índices raros sin romper y el panel con ese índice sigue cerrado', () => {
    const canal = crearCanalSeleccionParcela()
    const vistos: Array<number | null> = []
    canal.suscribir((i) => vistos.push(i))
    for (const i of [Number.NaN, -1, TOTAL, 1.5, null, 0, null]) {
      expect(() => canal.seleccionar(i)).not.toThrow()
      const actual = canal.actual
      if (actual !== null && actual !== 0) expect(datosPanelParcela(BASE, actual)).toBeUndefined()
    }
    expect(canal.actual).toBeNull()
    expect(vistos.at(-1)).toBeNull()
  })
})

// ---------------------------------------------------------------- dinero corrupto

describe('M4-T05 · dinero corrupto', () => {
  it('con dinero NaN, negativo, infinito o fraccionario el panel coincide con el comando y no compra gratis', () => {
    const indice = 2 * BASE.valle.parcelasPorLado + 2
    for (const dinero of [Number.NaN, -1, -Infinity, Infinity, 1e20, 0.5]) {
      const e = { ...BASE, dinero }
      const d = datosPanelParcela(e, indice)
      const r = aplicarComando(e, { tipo: 'ComprarParcela', indice })
      expect(d?.comprable).toBe(r.ok)
      expect(r.ok).toBe(false)
      expect(r.estado).toBe(e)
    }
  })

  // S3: con dinero corrupto `falta` sale NaN, Infinity, negativo o fraccionario (el texto del panel
  // mostraría «Te faltan NaN monedas» o una cantidad negativa). No toca el estado.
  it.todo('con dinero corrupto `falta` es siempre un entero seguro > 0 (#118)')
})
