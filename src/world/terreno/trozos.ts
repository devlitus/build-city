import type { Valle } from '../../core'
import { ladoMetros, type PuntoMetros } from './coordenadas'

/**
 * Trozos de terreno: cuadrados de `casillasPorParcela` m alineados con las parcelas.
 * El trozo (cx, cz) del valle va de 0 a parcelasPorLado - 1; los índices negativos o
 * >= parcelasPorLado son trozos de colinas fuera del valle. cx crece al este, cz al sur.
 */

type Medidas = Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>

export interface Trozo {
  readonly cx: number
  readonly cz: number
}

/** Rectángulo en metros: incluye `xMin`/`zMin` y excluye `xMax`/`zMax` cuando es de un trozo. */
export interface RangoMetros {
  readonly xMin: number
  readonly xMax: number
  readonly zMin: number
  readonly zMax: number
}

/** Lado de un trozo en metros (= casillas por parcela). */
export function ladoTrozo(valle: Medidas): number {
  return valle.casillasPorParcela
}

/** Trozos de colinas que se añaden por cada lado del valle para cubrir `radioMetros`. */
export function anilloDeTrozos(valle: Medidas, radioMetros: number): number {
  return Math.ceil(Math.max(0, radioMetros) / ladoTrozo(valle))
}

/** Trozo que contiene el punto; un punto del borde pertenece solo al trozo de su lado este/sur. */
export function trozoDeMetros(xm: number, zm: number, valle: Medidas): Trozo {
  const mitad = ladoMetros(valle) / 2
  const t = ladoTrozo(valle)
  return { cx: Math.floor((xm + mitad) / t), cz: Math.floor((zm + mitad) / t) }
}

/** Esquina noroeste del trozo en metros. */
export function esquinaDeTrozo(trozo: Trozo, valle: Medidas): PuntoMetros {
  const mitad = ladoMetros(valle) / 2
  const t = ladoTrozo(valle)
  return { x: trozo.cx * t - mitad, z: trozo.cz * t - mitad }
}

/** Rectángulo en metros que ocupa el trozo. */
export function rangoDeTrozo(trozo: Trozo, valle: Medidas): RangoMetros {
  const { x, z } = esquinaDeTrozo(trozo, valle)
  const t = ladoTrozo(valle)
  return { xMin: x, xMax: x + t, zMin: z, zMax: z + t }
}

/** Casilla global (x, y) de la esquina noroeste del trozo. */
export function casillaDeTrozo(trozo: Trozo, valle: Medidas): { x: number; y: number } {
  const t = ladoTrozo(valle)
  return { x: trozo.cx * t, y: trozo.cz * t }
}

/** Trozo que contiene la casilla global (x, y). */
export function trozoDeCasilla(x: number, y: number, valle: Medidas): Trozo {
  const t = ladoTrozo(valle)
  return { cx: Math.floor(x / t), cz: Math.floor(y / t) }
}

/** Trozos existentes (valle + anillo de `anillo` trozos) cuyo rectángulo corta el rango. */
export function trozosVisibles(rango: RangoMetros, valle: Medidas, anillo: number): Trozo[] {
  const minimo = -anillo
  const maximo = valle.parcelasPorLado + anillo - 1
  const a = trozoDeMetros(rango.xMin, rango.zMin, valle)
  const b = trozoDeMetros(rango.xMax, rango.zMax, valle)
  const resultado: Trozo[] = []
  for (let cz = Math.max(minimo, a.cz); cz <= Math.min(maximo, b.cz); cz++)
    for (let cx = Math.max(minimo, a.cx); cx <= Math.min(maximo, b.cx); cx++)
      resultado.push({ cx, cz })
  return resultado
}

/** Todos los trozos del valle y su anillo de colinas. */
export function todosLosTrozos(valle: Medidas, anillo: number): Trozo[] {
  const mitad = ladoMetros(valle) / 2 + anillo * ladoTrozo(valle)
  return trozosVisibles({ xMin: -mitad, xMax: mitad - 1e-6, zMin: -mitad, zMax: mitad - 1e-6 }, valle, anillo)
}
