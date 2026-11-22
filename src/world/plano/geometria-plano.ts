import type { Valle } from '../../core'
import type { FuncionAltura } from '../terreno/altura'
import { ladoMetros } from '../terreno/coordenadas'

/** Segmento recto en el plano del suelo, en metros. */
export interface Arista {
  readonly ax: number
  readonly az: number
  readonly bx: number
  readonly bz: number
}

/** Aristas de 1 m de la rejilla sobre las parcelas propias, sin duplicar las compartidas. */
export function aristasRejilla(valle: Valle): Arista[] {
  const c = valle.casillasPorParcela
  const lado = ladoMetros(valle)
  const mitad = lado / 2
  const propia = new Uint8Array(lado * lado)
  for (const p of valle.parcelas) {
    if (p.estado !== 'propia') continue
    for (let j = 0; j < c; j++)
      for (let i = 0; i < c; i++) propia[(p.fila * c + j) * lado + p.columna * c + i] = 1
  }
  const es = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < lado && y < lado && propia[y * lado + x] === 1
  const salida: Arista[] = []
  for (let y = 0; y < lado; y++)
    for (let x = 0; x < lado; x++) {
      if (!es(x, y)) continue
      const x0 = x - mitad
      const z0 = y - mitad
      salida.push({ ax: x0, az: z0, bx: x0 + 1, bz: z0 }) // norte
      salida.push({ ax: x0, az: z0, bx: x0, bz: z0 + 1 }) // oeste
      if (!es(x, y + 1)) salida.push({ ax: x0, az: z0 + 1, bx: x0 + 1, bz: z0 + 1 })
      if (!es(x + 1, y)) salida.push({ ax: x0 + 1, az: z0, bx: x0 + 1, bz: z0 + 1 })
    }
  return salida
}

export interface LindesValle {
  /** Lindes de parcelas propias (también las que comparten con una ajena). */
  readonly propias: Arista[]
  /** Resto de lindes. */
  readonly otras: Arista[]
}

/** Lindes únicas entre todas las parcelas, separadas según toquen o no una parcela propia. */
export function aristasLindes(valle: Valle): LindesValle {
  const n = valle.parcelasPorLado
  const c = valle.casillasPorParcela
  const mitad = ladoMetros(valle) / 2
  const propia = (f: number, col: number): boolean =>
    f >= 0 && col >= 0 && f < n && col < n && valle.parcelas[f * n + col]?.estado === 'propia'
  const propias: Arista[] = []
  const otras: Arista[] = []
  // Líneas horizontales (z constante): k separa la fila k-1 de la k.
  for (let k = 0; k <= n; k++)
    for (let col = 0; col < n; col++) {
      const z = k * c - mitad
      const a: Arista = { ax: col * c - mitad, az: z, bx: (col + 1) * c - mitad, bz: z }
      ;(propia(k - 1, col) || propia(k, col) ? propias : otras).push(a)
    }
  // Líneas verticales (x constante): k separa la columna k-1 de la k.
  for (let k = 0; k <= n; k++)
    for (let f = 0; f < n; f++) {
      const x = k * c - mitad
      const a: Arista = { ax: x, az: f * c - mitad, bx: x, bz: (f + 1) * c - mitad }
      ;(propia(f, k - 1) || propia(f, k) ? propias : otras).push(a)
    }
  return { propias, otras }
}

/**
 * Pares de vértices (x, y, z) para `LineSegments`: cada arista se muestrea cada `paso` m como
 * mucho y se eleva `separacion` m sobre `altura`, para que la línea siga el relieve sin hundirse.
 */
export function segmentosSobreTerreno(
  aristas: readonly Arista[],
  altura: FuncionAltura,
  paso: number,
  separacion: number,
): Float32Array {
  const tramos = aristas.map((a) =>
    Math.max(1, Math.ceil(Math.hypot(a.bx - a.ax, a.bz - a.az) / paso)),
  )
  const total = tramos.reduce((s, t) => s + t, 0)
  const datos = new Float32Array(total * 6)
  let o = 0
  const punto = (x: number, z: number): void => {
    datos[o++] = x
    datos[o++] = altura(x, z) + separacion
    datos[o++] = z
  }
  aristas.forEach((a, i) => {
    const t = tramos[i] ?? 1
    for (let s = 0; s < t; s++) {
      const u0 = s / t
      const u1 = (s + 1) / t
      punto(a.ax + (a.bx - a.ax) * u0, a.az + (a.bz - a.az) * u0)
      punto(a.ax + (a.bx - a.ax) * u1, a.az + (a.bz - a.az) * u1)
    }
  })
  return datos
}

/** Valor CSS `filter` que quita `cantidad` (0..1) de saturación al lienzo. */
export function filtroDesaturacion(cantidad: number): string {
  const c = Math.min(1, Math.max(0, cantidad))
  return c === 0 ? 'none' : `saturate(${(1 - c).toFixed(3)})`
}
