import type { Valle } from '../../core'

/**
 * Convención: casilla global (x, y) del núcleo con x al este e y al sur (fila 0 = norte);
 * 1 casilla = 1 m. El valle está centrado en el origen. En three.js el eje Y es la altura
 * y +z apunta al sur. Estas funciones solo dependen del lado del valle.
 */

type Medidas = Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>

/** Punto en el plano del suelo, en metros (x al este, z al sur). */
export interface PuntoMetros {
  readonly x: number
  readonly z: number
}

/** Casilla global del núcleo. */
export interface CasillaGlobal {
  readonly x: number
  readonly y: number
}

/** Lado del valle en casillas. */
export function ladoCasillas(valle: Medidas): number {
  return valle.parcelasPorLado * valle.casillasPorParcela
}

/** Lado del valle en metros (1 casilla = 1 m). */
export function ladoMetros(valle: Medidas): number {
  return ladoCasillas(valle)
}

/** Centro de la casilla (x, y) en metros. */
export function casillaAMetros(x: number, y: number, valle: Medidas): PuntoMetros {
  const mitad = ladoMetros(valle) / 2
  return { x: x + 0.5 - mitad, z: y + 0.5 - mitad }
}

/** Casilla que contiene el punto (puede quedar fuera del valle: índices negativos o >= lado). */
export function metrosACasilla(xm: number, zm: number, valle: Medidas): CasillaGlobal {
  const mitad = ladoMetros(valle) / 2
  return { x: Math.floor(xm + mitad), y: Math.floor(zm + mitad) }
}

/** ¿El punto está dentro del cuadrado del valle (bordes incluidos)? */
export function dentroDelValle(xm: number, zm: number, valle: Medidas): boolean {
  const mitad = ladoMetros(valle) / 2
  return Math.abs(xm) <= mitad && Math.abs(zm) <= mitad
}
