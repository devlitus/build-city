/* eslint-disable @typescript-eslint/no-non-null-assertion -- catálogo e índices conocidos en tests */
/**
 * Rompedor · M6 (tareas críticas M6-T01 vallas y M6-T04 caminos).
 * Ataques sobre el núcleo, con oráculos propios (huellas, agua y alcance recalculados aquí):
 * - conservación de madera y piedra: colocar + quitar (con casillas repetidas, mezclas de valla y
 *   puerta, casillas sin nada) nunca devuelve más de lo pagado;
 * - atomicidad: todo rechazo devuelve el mismo estado, sin mutarlo;
 * - secuencias aleatorias de vallas, puertas, caminos, edificios, labranza, plantones, paseos y
 *   cambios de día: nunca dos cosas incompatibles en una casilla, nunca fuera de lo propio,
 *   colocar vallas nunca quita casillas alcanzables (salvo las propias vallas) ni encierra al
 *   personaje, y el cobro/reembolso es exacto por casilla cambiada;
 * - el personaje, corriendo sobre camino (× multiplicador), no atraviesa una valla.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  aplicarComando,
  anadirObjeto,
  casillasRio,
  CONFIG_CAMINOS,
  CONFIG_EDIFICIOS,
  CONFIG_INVENTARIO,
  CONFIG_PERSONAJE,
  CONFIG_VALLAS,
  crearEstadoInicial,
  esCaracterArada,
  ladoValle,
  type Comando,
  type EstadoJuego,
  type Rotacion,
  type TipoEdificio,
} from '../../src/core'

type XY = { x: number; y: number }

/** Huella girada calculada a mano (independiente de `huellaDe`). */
function huella(tipo: string, x: number, y: number, r: unknown): [number, number][] {
  const def = CONFIG_EDIFICIOS.edificios[tipo as TipoEdificio]
  const impar = r === 1 || r === 3
  const an = impar ? def.alto : def.ancho
  const al = impar ? def.ancho : def.alto
  const celdas: [number, number][] = []
  for (let j = y; j < y + al; j++) for (let i = x; i < x + an; i++) celdas.push([i, j])
  return celdas
}

const R = 14 // semiancho de la ventana de juego

/** Centro de la ventana: la aparición está junto al borde sur, así que se sube un poco. */
function centro(e: EstadoJuego): { cx: number; cy: number } {
  return { cx: Math.floor(e.aparicion.x), cy: Math.floor(e.aparicion.y) - R - 2 }
}

/** Valle con todas las parcelas propias, zonas pintadas cerca de la aparición, Modo Plano. */
function preparar(semilla: number): EstadoJuego {
  let e = crearEstadoInicial({ semilla, dineroInicial: 100_000 })
  e = {
    ...e,
    valle: {
      ...e.valle,
      parcelas: e.valle.parcelas.map((p) => ({ ...p, estado: 'propia' as const })),
    },
  }
  const { cx: ax, cy: ay } = centro(e)
  const paso = (c: Comando) => {
    const r = aplicarComando(e, c)
    if (r.ok) e = r.estado
  }
  paso({ tipo: 'PintarZona', x0: ax - R, y0: ay - R, x1: ax - 1, y1: ay + R, zona: 'vivienda' })
  paso({ tipo: 'PintarZona', x0: ax + 2, y0: ay - R, x1: ax + R, y1: ay + R, zona: 'cultivo' })
  paso({ tipo: 'CambiarModo', modo: 'plano' })
  // Sin árboles ni rocas en el huerto de pruebas ni en la franja del muro (el resto se conserva).
  const libre = (o: { x: number; y: number }) =>
    (o.x >= ax - 5 && o.x <= ax + 7 && o.y >= ay - 4 && o.y <= ay + 3) ||
    (o.x >= ax - 14 && o.x <= ax - 1 && o.y >= ay - 8 && o.y <= ay + 8)
  e = { ...e, obstaculos: e.obstaculos.filter((o) => !libre(o)) }
  const cap = CONFIG_INVENTARIO.capacidadBase
  const inv = anadirObjeto(e.inventario, 'planton', 30, cap) ?? e.inventario
  return { ...e, inventario: inv, dinero: 5_000, materiales: { madera: 200, piedra: 60 } }
}

const ESTADOS = [3, 17, 2026].map(preparar)

/** Agua (vados incluidos), vados y obstáculos por índice. */
function fijos(e: EstadoJuego) {
  const lado = ladoValle(e.valle)
  const agua = new Set(casillasRio(e.valle, e.cauce.ancho).map((c) => c.y * lado + c.x))
  const vados = new Set(e.cauce.vados)
  return { lado, agua, vados }
}

function mapaHuellas(e: EstadoJuego): Set<number> {
  const lado = ladoValle(e.valle)
  const m = new Set<number>()
  for (const b of e.edificios) {
    for (const [i, j] of huella(b.tipo, b.x, b.y, b.rotacion ?? 0)) m.add(j * lado + i)
  }
  return m
}

/**
 * Casillas alcanzables (4-conexas) desde la aparición con un BFS propio: bloquean el agua sin vado,
 * los obstáculos que no son plantones, las huellas y las vallas (no las puertas).
 */
function alcance(e: EstadoJuego): Uint8Array {
  const { lado, agua, vados } = fijos(e)
  const huellas = mapaHuellas(e)
  const obst = new Set(
    e.obstaculos.filter((o) => o.tipo !== 'planton').map((o) => o.y * lado + o.x),
  )
  const bloq = (k: number) =>
    (agua.has(k) && !vados.has(k)) || obst.has(k) || huellas.has(k) || e.vallas[k] === 'v'
  const vista = new Uint8Array(lado * lado)
  const ini = Math.floor(e.aparicion.y) * lado + Math.floor(e.aparicion.x)
  if (bloq(ini)) return vista
  const cola = [ini]
  vista[ini] = 1
  while (cola.length > 0) {
    const k = cola.pop()!
    const x = k % lado
    for (const v of [k - lado, k + lado, x > 0 ? k - 1 : -1, x < lado - 1 ? k + 1 : -1]) {
      if (v >= 0 && v < lado * lado && vista[v] === 0 && !bloq(v)) {
        vista[v] = 1
        cola.push(v)
      }
    }
  }
  return vista
}

function cajaPersonaje(p: { x: number; y: number }): [number, number][] {
  const m = CONFIG_PERSONAJE.tamanoCaja / 2
  const r: [number, number][] = []
  for (let j = Math.floor(p.y - m); j <= Math.ceil(p.y + m) - 1; j++)
    for (let i = Math.floor(p.x - m); i <= Math.ceil(p.x + m) - 1; i++) r.push([i, j])
  return r
}

/** ¿El círculo del personaje se mete en alguna casilla con valla? (holgura de 1e-6 de la colisión) */
function pisaValla(e: EstadoJuego): XY | undefined {
  const lado = ladoValle(e.valle)
  const { x, y } = e.personaje
  const rad = CONFIG_PERSONAJE.radio
  for (const [i, j] of cajaPersonaje(e.personaje)) {
    if (e.vallas[j * lado + i] !== 'v') continue
    const cx = Math.min(Math.max(x, i), i + 1)
    const cy = Math.min(Math.max(y, j), j + 1)
    if (Math.hypot(x - cx, y - cy) < rad - 1e-6) return { x: i, y: j }
  }
  return undefined
}

/** Invariantes de vallas y caminos que deben valer en cualquier estado alcanzado por comandos. */
function comprobarInvariantes(e: EstadoJuego): void {
  const { lado, agua } = fijos(e)
  const huellas = mapaHuellas(e)
  const obst = new Set(e.obstaculos.map((o) => o.y * lado + o.x))
  const plantas = new Set(e.plantas.map((p) => p[0]))
  const c = e.valle.casillasPorParcela
  expect(e.vallas.length).toBe(lado * lado)
  expect(e.caminos.length).toBe(lado * lado)
  for (let k = 0; k < lado * lado; k++) {
    const v = e.vallas[k]
    const cam = e.caminos[k] === 'c'
    if (v === '.' && !cam) continue
    const x = k % lado
    const y = Math.floor(k / lado)
    const p = e.valle.parcelas[Math.floor(y / c) * e.valle.parcelasPorLado + Math.floor(x / c)]
    const ctx = { x, y, v, cam }
    expect({ ...ctx, propia: p?.estado }).toEqual({ ...ctx, propia: 'propia' })
    expect({ ...ctx, agua: agua.has(k) }).toEqual({ ...ctx, agua: false })
    expect({ ...ctx, obst: obst.has(k) }).toEqual({ ...ctx, obst: false })
    expect({ ...ctx, edificio: huellas.has(k) }).toEqual({ ...ctx, edificio: false })
    expect({ ...ctx, arada: esCaracterArada(e.tierra[k]) }).toEqual({ ...ctx, arada: false })
    expect({ ...ctx, planta: plantas.has(k) }).toEqual({ ...ctx, planta: false })
    // Camino bajo valla, nunca (bajo puerta sí).
    expect(v === 'v' && cam).toBe(false)
  }
  // El personaje no pisa vallas y sigue en lo alcanzable.
  expect(pisaValla(e)).toBeUndefined()
  const vista = alcance(e)
  expect(vista[Math.floor(e.personaje.y) * lado + Math.floor(e.personaje.x)]).toBe(1)
  for (const n of [e.dinero, e.materiales.madera, e.materiales.piedra]) {
    expect(Number.isSafeInteger(n) && n >= 0).toBe(true)
  }
}

const coste = (t: 'valla' | 'puerta') => CONFIG_VALLAS.coste[t].madera

/** Cambios de la cadena: índices donde `antes[i] !== despues[i]`. */
function diferencias(antes: string, despues: string): number[] {
  const r: number[] = []
  for (let i = 0; i < antes.length; i++) if (antes[i] !== despues[i]) r.push(i)
  return r
}

/** Línea de casillas (con posibles repeticiones) cerca de la aparición. */
const arbLinea = fc.record({
  dx: fc.oneof(fc.integer({ min: -R, max: R }), fc.integer({ min: -4, max: 6 })),
  dy: fc.oneof(fc.integer({ min: -R, max: R }), fc.integer({ min: -3, max: 2 })),
  dir: fc.constantFrom<[number, number]>([1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]),
  largo: fc.integer({ min: 1, max: 8 }),
  repetir: fc.nat(3),
})
type Linea = typeof arbLinea extends fc.Arbitrary<infer T> ? T : never

function casillasDe(e: EstadoJuego, l: Linea): XY[] {
  const ax = centro(e).cx + l.dx
  const ay = centro(e).cy + l.dy
  const r: XY[] = []
  for (let i = 0; i < l.largo; i++) r.push({ x: ax + l.dir[0] * i, y: ay + l.dir[1] * i })
  for (let i = 0; i < l.repetir; i++) r.push(r[i % r.length]!)
  return r
}

/** El estado sin `vallas`, `caminos` ni `materiales`, para comparar el resto. */
function resto(e: EstadoJuego): Record<string, unknown> {
  const r: Record<string, unknown> = { ...e }
  delete r.vallas
  delete r.caminos
  delete r.materiales
  return r
}

describe('M6 rompedor · conservación de madera y piedra', () => {
  it('colocar vallas/puertas y quitarlas (con repetidas y casillas vacías) nunca crea madera', () => {
    fc.assert(
      fc.property(
        fc.nat(2),
        fc.array(fc.tuple(arbLinea, fc.constantFrom<'valla' | 'puerta'>('valla', 'puerta')), {
          minLength: 1,
          maxLength: 4,
        }),
        fc.array(arbLinea, { minLength: 1, maxLength: 4 }),
        (si, poner, quitar) => {
          let e = ESTADOS[si]!
          const madera0 = e.materiales.madera
          let pagado = 0
          for (const [l, t] of poner) {
            const r = aplicarComando(e, {
              tipo: 'ColocarVallas',
              casillas: casillasDe(e, l),
              tipoValla: t,
            })
            if (!r.ok) continue
            const n = diferencias(e.vallas, r.estado.vallas).length
            expect(e.materiales.madera - r.estado.materiales.madera).toBe(n * coste(t))
            pagado += n * coste(t)
            e = r.estado
          }
          // Quitar en varias tandas con repeticiones y casillas sin valla, y al final todo.
          const lado = ladoValle(e.valle)
          for (const l of quitar) {
            const r = aplicarComando(e, { tipo: 'QuitarVallas', casillas: casillasDe(e, l) })
            if (r.ok) e = r.estado
          }
          const todas: XY[] = []
          for (let k = 0; k < e.vallas.length; k++) {
            if (e.vallas[k] !== '.') todas.push({ x: k % lado, y: Math.floor(k / lado) })
          }
          if (todas.length > 0) {
            const r = aplicarComando(e, { tipo: 'QuitarVallas', casillas: [...todas, ...todas] })
            expect(r.ok).toBe(true)
            if (r.ok) e = r.estado
          }
          expect(e.vallas).not.toMatch(/[vp]/)
          // Nunca más de lo que se tenía, y se pierde exactamente lo no reembolsado.
          expect(e.materiales.madera).toBeLessThanOrEqual(madera0)
          expect(madera0 - e.materiales.madera).toBe(pagado * (1 - CONFIG_VALLAS.reembolsoQuitar))
        },
      ),
      { numRuns: 150, seed: 6 },
    )
  })

  it('colocar caminos y quitarlos (con repetidas) nunca crea piedra; el reembolso es por casilla', () => {
    fc.assert(
      fc.property(
        fc.nat(2),
        fc.array(arbLinea, { minLength: 1, maxLength: 5 }),
        fc.array(arbLinea, { minLength: 1, maxLength: 5 }),
        (si, poner, quitar) => {
          let e = ESTADOS[si]!
          const piedra0 = e.materiales.piedra
          for (const l of [...poner, ...quitar].map((l, i) => [l, i < poner.length] as const)) {
            const [linea, colocar] = l
            const r = aplicarComando(e, {
              tipo: colocar ? 'ColocarCamino' : 'QuitarCamino',
              casillas: casillasDe(e, linea),
            })
            if (!r.ok) {
              expect(r.estado).toBe(e)
              continue
            }
            const n = diferencias(e.caminos, r.estado.caminos).length
            const delta = r.estado.materiales.piedra - e.materiales.piedra
            expect(delta).toBe(
              colocar ? -n * CONFIG_CAMINOS.costePiedra : n * CONFIG_CAMINOS.reembolsoPiedra,
            )
            e = r.estado
          }
          const colocados = [...e.caminos].filter((c) => c === 'c').length
          // Lo que queda colocado vale como mucho lo pagado; nunca se gana piedra.
          expect(
            e.materiales.piedra + colocados * CONFIG_CAMINOS.reembolsoPiedra,
          ).toBeLessThanOrEqual(piedra0)
        },
      ),
      { numRuns: 150, seed: 6 },
    )
  })
})

describe('M6 rompedor · atomicidad', () => {
  it('cerco cerrado, sin madera, fuera del Plano o parámetro raro: mismo estado y sin mutar', () => {
    const e0 = ESTADOS[0]!
    const { cx: ax, cy: ay } = centro(e0)
    // Anillo cerrado de 7×7 a la izquierda de la aparición (zona vivienda, sin edificios).
    const anillo: XY[] = []
    for (let i = 0; i < 7; i++) {
      anillo.push({ x: ax - 10 + i, y: ay - 3 }, { x: ax - 10 + i, y: ay + 3 })
      anillo.push({ x: ax - 10, y: ay - 3 + i }, { x: ax - 4, y: ay - 3 + i })
    }
    const copia = JSON.stringify(e0)
    const casos: Comando[] = [
      { tipo: 'ColocarVallas', casillas: anillo, tipoValla: 'valla' },
      { tipo: 'ColocarVallas', casillas: [{ x: ax + 3, y: ay }], tipoValla: 'valla' },
      { tipo: 'ColocarVallas', casillas: [{ x: ax + 3, y: ay + 0.5 }], tipoValla: 'puerta' },
      { tipo: 'ColocarVallas', casillas: [{ x: ax + 3, y: ay }], tipoValla: 'muro' as never },
      { tipo: 'QuitarVallas', casillas: [{ x: ax + 3, y: ay }] },
      { tipo: 'ColocarCamino', casillas: [{ x: -1, y: -1 }] },
      { tipo: 'QuitarCamino', casillas: [{ x: ax + 3, y: ay }] },
    ]
    const pobre = { ...e0, materiales: { madera: 1, piedra: 1 } }
    const vida = { ...e0, modo: 'vida' as const }
    for (const [e, c] of [
      ...casos.map((c) => [e0, c] as const),
      [pobre, casos[1]!] as const,
      [pobre, { tipo: 'ColocarCamino', casillas: [{ x: ax + 3, y: ay }] }] as const,
      [vida, casos[1]!] as const,
      [vida, { tipo: 'ColocarCamino', casillas: [{ x: ax + 3, y: ay }] }] as const,
    ]) {
      const r = aplicarComando(e, c as Comando)
      if (e === e0 && c === casos[1]) {
        expect(r.ok).toBe(true)
        continue
      }
      expect({ c, ok: r.ok }).toEqual({ c, ok: false })
      expect(r.estado).toBe(e)
    }
    expect(JSON.stringify(e0)).toBe(copia)
  })
})

/** Pasos de la secuencia aleatoria. */
type Paso =
  | { k: 'V'; l: Linea; t: 'valla' | 'puerta' }
  | { k: 'QV'; l: Linea }
  | { k: 'C'; l: Linea }
  | { k: 'QC'; l: Linea }
  | { k: 'B'; tipo: TipoEdificio; dx: number; dy: number; r: Rotacion }
  | { k: 'M'; i: number; dx: number; dy: number }
  | { k: 'D'; i: number }
  | { k: 'H'; hs: ('azada' | 'semillas' | 'mano' | 'hacha')[]; dx: number; dy: number }
  | { k: 'A'; pasos: { dx: number; dy: number; ms: number; corre: boolean }[] }
  | { k: 'Z' }

const d = fc.integer({ min: -R, max: R })
const arbPaso: fc.Arbitrary<Paso> = fc.oneof(
  {
    weight: 4,
    arbitrary: fc.record({
      k: fc.constant('V' as const),
      l: arbLinea,
      t: fc.constantFrom<'valla' | 'puerta'>('valla', 'valla', 'puerta'),
    }),
  },
  { weight: 1, arbitrary: fc.record({ k: fc.constant('QV' as const), l: arbLinea }) },
  { weight: 3, arbitrary: fc.record({ k: fc.constant('C' as const), l: arbLinea }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant('QC' as const), l: arbLinea }) },
  {
    weight: 2,
    arbitrary: fc.record({
      k: fc.constant('B' as const),
      tipo: fc.constantFrom<TipoEdificio>('tienda', 'caja-envio', 'cobertizo'),
      dx: d,
      dy: d,
      r: fc.constantFrom<Rotacion>(0, 1, 2, 3),
    }),
  },
  { weight: 1, arbitrary: fc.record({ k: fc.constant('M' as const), i: fc.nat(), dx: d, dy: d }) },
  { weight: 1, arbitrary: fc.record({ k: fc.constant('D' as const), i: fc.nat() }) },
  {
    weight: 3,
    arbitrary: fc.record({
      k: fc.constant('H' as const),
      hs: fc.oneof(
        fc.constant<('azada' | 'semillas' | 'mano' | 'hacha')[]>(['azada', 'semillas']),
        fc.array(
          fc.constantFrom<'azada' | 'semillas' | 'mano' | 'hacha'>(
            'azada',
            'semillas',
            'mano',
            'hacha',
          ),
          { minLength: 1, maxLength: 3 },
        ),
      ),
      // Huerto pequeño en zona de cultivo para que arar, sembrar y poner vallas coincidan.
      dx: fc.integer({ min: -3, max: 5 }),
      dy: fc.integer({ min: -2, max: 1 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      k: fc.constant('A' as const),
      pasos: fc.array(
        fc.record({
          dx: fc.constantFrom(-1, 0, 1),
          dy: fc.constantFrom(-1, 0, 1),
          ms: fc.integer({ min: 16, max: 1000 }),
          corre: fc.boolean(),
        }),
        { minLength: 1, maxLength: 12 },
      ),
    }),
  },
  { weight: 1, arbitrary: fc.constant({ k: 'Z' as const }) },
)

describe('M6 rompedor · secuencias aleatorias', () => {
  it('nunca hay estados imposibles; colocar vallas solo quita del alcance sus propias casillas', () => {
    fc.assert(
      fc.property(fc.nat(2), fc.array(arbPaso, { minLength: 1, maxLength: 18 }), (si, pasos) => {
        let e = ESTADOS[si]!
        const lado = ladoValle(e.valle)
        const { cx: ax, cy: ay } = centro(e)
        const aplicar = (c: Comando) => {
          const r = aplicarComando(e, c)
          if (!r.ok) expect(r.estado).toBe(e)
          return r
        }
        const enModo = (m: 'vida' | 'plano') => {
          const r = aplicar({ tipo: 'CambiarModo', modo: m })
          if (r.ok) e = r.estado
        }
        for (const p of pasos) {
          if (p.k === 'V') {
            const antesAlcance = alcance(e)
            const r = aplicar({
              tipo: 'ColocarVallas',
              casillas: casillasDe(e, p.l),
              tipoValla: p.t,
            })
            if (r.ok) {
              const cambios = diferencias(e.vallas, r.estado.vallas)
              for (const k of cambios) {
                expect(e.vallas[k]).toBe('.')
                expect(r.estado.vallas[k]).toBe(p.t === 'valla' ? 'v' : 'p')
              }
              expect(e.materiales.madera - r.estado.materiales.madera).toBe(
                cambios.length * coste(p.t),
              )
              expect(resto(r.estado)).toEqual(resto(e))
              expect(r.estado.caminos).toBe(e.caminos)
              const despues = alcance(r.estado)
              const nuevas = new Set(cambios)
              for (let k = 0; k < antesAlcance.length; k++) {
                if (antesAlcance[k] === 1 && !nuevas.has(k)) {
                  expect({ k, alcanzable: despues[k] }).toEqual({ k, alcanzable: 1 })
                }
              }
              e = r.estado
            }
          } else if (p.k === 'QV') {
            const r = aplicar({ tipo: 'QuitarVallas', casillas: casillasDe(e, p.l) })
            if (r.ok) {
              const cambios = diferencias(e.vallas, r.estado.vallas)
              const nv = cambios.filter((k) => e.vallas[k] === 'v').length
              const np = cambios.filter((k) => e.vallas[k] === 'p').length
              for (const k of cambios) expect(r.estado.vallas[k]).toBe('.')
              const devuelto = r.estado.materiales.madera - e.materiales.madera
              expect(devuelto).toBeLessThanOrEqual(nv * coste('valla') + np * coste('puerta'))
              expect(devuelto).toBeGreaterThanOrEqual(0)
              expect(resto(r.estado)).toEqual(resto(e))
              e = r.estado
            }
          } else if (p.k === 'C' || p.k === 'QC') {
            const r = aplicar({
              tipo: p.k === 'C' ? 'ColocarCamino' : 'QuitarCamino',
              casillas: casillasDe(e, p.l),
            })
            if (r.ok) {
              const n = diferencias(e.caminos, r.estado.caminos).length
              expect(r.estado.materiales.piedra - e.materiales.piedra).toBe(
                p.k === 'C' ? -n * CONFIG_CAMINOS.costePiedra : n * CONFIG_CAMINOS.reembolsoPiedra,
              )
              expect(r.estado.vallas).toBe(e.vallas)
              expect(resto(r.estado)).toEqual(resto(e))
              e = r.estado
            }
          } else if (p.k === 'B') {
            const r = aplicar({
              tipo: 'Construir',
              tipoEdificio: p.tipo,
              x: ax + p.dx,
              y: ay + p.dy,
              rotacion: p.r,
            })
            if (r.ok) e = r.estado
          } else if (p.k === 'M' || p.k === 'D') {
            const terminados = e.edificios.filter((b) => b.obra === null && b.tipo !== 'casa')
            const b = terminados[p.i % Math.max(1, terminados.length)]
            if (!b) continue
            const r = aplicar(
              p.k === 'M'
                ? { tipo: 'MoverEdificio', id: b.id, x: ax + p.dx, y: ay + p.dy }
                : { tipo: 'DemolerEdificio', id: b.id },
            )
            if (r.ok) e = r.estado
          } else if (p.k === 'H') {
            // El personaje «camina» hasta una casilla alcanzable libre junto al objetivo.
            const tx = ax + p.dx
            const ty = ay + p.dy
            const vista = alcance(e)
            const huellas = mapaHuellas(e)
            const plantones = new Set(e.obstaculos.map((o) => o.y * lado + o.x))
            let destino: XY | undefined
            for (const [ox, oy] of [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ] as const) {
              const x = tx + ox
              const y = ty + oy
              const k = y * lado + x
              if (x < 0 || y < 0 || x >= lado || y >= lado) continue
              if (vista[k] === 1 && !huellas.has(k) && e.vallas[k] !== 'v' && !plantones.has(k)) {
                destino = { x, y }
                break
              }
            }
            if (!destino) continue
            e = { ...e, personaje: { ...e.personaje, x: destino.x + 0.5, y: destino.y + 0.5 } }
            enModo('vida')
            for (const h of p.hs) {
              let r = aplicar({ tipo: 'ElegirHerramienta', herramienta: h })
              if (r.ok) e = r.estado
              if (h === 'semillas') {
                const s = e.inventario.find((q) => q.objeto.startsWith('semilla-'))
                if (s) {
                  r = aplicar({ tipo: 'ElegirSemilla', objeto: s.objeto })
                  if (r.ok) e = r.estado
                }
              }
              r = aplicar({ tipo: 'UsarHerramienta', x: tx, y: ty })
              if (r.ok) e = r.estado
            }
            enModo('plano')
          } else if (p.k === 'A') {
            enModo('vida')
            for (const m of p.pasos) {
              const r = aplicar({ tipo: 'MoverPersonaje', ...m })
              if (r.ok) e = r.estado
            }
            enModo('plano')
          } else {
            // Cambio de día por desmayo (crecen plantones, terminan obras, despierta en casa).
            enModo('vida')
            const r = aplicar({ tipo: 'AvanzarTiempo', minutos: 24 * 60 })
            if (r.ok) e = r.estado
            enModo('plano')
          }
          comprobarInvariantes(e)
        }
      }),
      { numRuns: 60, seed: 6 },
    )
  }, 60_000)
})

describe('M6 rompedor · colisión con camino', () => {
  it('corriendo sobre camino hacia un muro de vallas, nunca lo cruza', () => {
    const base = ESTADOS[1]!
    fc.assert(
      fc.property(
        fc.integer({ min: -4, max: 4 }),
        fc.array(
          fc.record({
            ms: fc.integer({ min: 1, max: 5000 }),
            corre: fc.boolean(),
            dy: fc.constantFrom(0, 0, 0.3, -0.3),
          }),
          {
            minLength: 5,
            maxLength: 40,
          },
        ),
        (oy, pasos) => {
          // Un tramo de camino que acaba en un muro vertical de 15 vallas (no encierra nada).
          const { cx: ax, cy: ay } = centro(base)
          let e: EstadoJuego = base
          const y0 = ay + oy
          const muroX = ax - 2
          const muro: XY[] = []
          for (let j = -7; j <= 7; j++) muro.push({ x: muroX, y: ay + j })
          const camino: XY[] = []
          for (let i = muroX - 10; i < muroX; i++) camino.push({ x: i, y: y0 })
          let r = aplicarComando(e, { tipo: 'ColocarCamino', casillas: camino })
          if (r.ok) e = r.estado
          r = aplicarComando(e, { tipo: 'ColocarVallas', casillas: muro, tipoValla: 'valla' })
          if (!r.ok) return // la aparición o el río estorban en esta semilla: nada que probar
          e = r.estado
          const enMuro = new Set(diferencias(base.vallas, e.vallas))
          if (enMuro.size < 15) return
          // Arranca sobre el camino, a 6 casillas del muro, en Modo Vida.
          e = { ...e, modo: 'vida', personaje: { ...e.personaje, x: muroX - 6 + 0.5, y: y0 + 0.5 } }
          for (const m of pasos) {
            const s = aplicarComando(e, {
              tipo: 'MoverPersonaje',
              dx: 1,
              dy: m.dy,
              ms: m.ms,
              corre: m.corre,
            })
            expect(s.ok).toBe(true)
            if (s.ok) e = s.estado
            // Mientras esté a la altura del muro, su círculo no pasa de la cara oeste.
            if (Math.abs(e.personaje.y - (ay + 0.5)) < 6.5) {
              expect(e.personaje.x + CONFIG_PERSONAJE.radio).toBeLessThanOrEqual(muroX + 1e-9)
            }
            expect(pisaValla(e)).toBeUndefined()
          }
        },
      ),
      { numRuns: 80, seed: 6 },
    )
  })
})

describe('M6 rompedor · cerco ceñido al hogar', () => {
  it('vallas ceñidas a la tienda-hogar, demolerla y volver a construir dentro: nunca despierta encerrado', () => {
    let e = ESTADOS[0]!
    const { cx, cy } = centro(e)
    const ok = (c: Comando) => {
      const r = aplicarComando(e, c)
      expect({ c, error: r.ok ? undefined : r.error }).toEqual({ c, error: undefined })
      if (r.ok) e = r.estado
    }
    const desmayo = () => {
      ok({ tipo: 'CambiarModo', modo: 'vida' })
      ok({ tipo: 'AvanzarTiempo', minutos: 24 * 60 })
      ok({ tipo: 'CambiarModo', modo: 'plano' })
      comprobarInvariantes(e)
    }
    // Tienda 3×3 en vivienda (hogar provisional sin casa) y anillo de vallas pegado a su huella.
    const x0 = cx - 10
    const y0 = cy - 1
    // El cerco se cierra con la tienda aún en obra (el personaje sigue en la aparición).
    ok({ tipo: 'Construir', tipoEdificio: 'tienda', x: x0, y: y0 })
    const anillo: XY[] = []
    for (let i = -1; i <= 3; i++) {
      anillo.push({ x: x0 + i, y: y0 - 1 }, { x: x0 + i, y: y0 + 3 })
      if (i >= 0 && i <= 2) anillo.push({ x: x0 - 1, y: y0 + i }, { x: x0 + 3, y: y0 + i })
    }
    ok({ tipo: 'ColocarVallas', casillas: anillo, tipoValla: 'valla' })
    expect([...e.vallas].filter((c) => c === 'v').length).toBe(16)
    desmayo() // la puerta de la tienda queda tapada: despierta fuera del cerco
    const id = e.edificios.find((b) => b.tipo === 'tienda')!.id
    ok({ tipo: 'DemolerEdificio', id })
    desmayo() // sin hogar: en la aparición
    // El hueco de 3×3 queda aislado; construir dentro no quita alcance…
    ok({ tipo: 'Construir', tipoEdificio: 'tienda', x: x0, y: y0 })
    desmayo() // …y la nueva tienda-hogar no debe hacer despertar dentro del cerco
    // Cambiar una valla por una puerta reabre el cerco.
    ok({ tipo: 'QuitarVallas', casillas: [{ x: x0 + 1, y: y0 + 3 }] })
    ok({ tipo: 'ColocarVallas', casillas: [{ x: x0 + 1, y: y0 + 3 }], tipoValla: 'puerta' })
    comprobarInvariantes(e)
  })
})
