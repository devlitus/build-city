// Forma automática de la valla: elige pieza y giro según los vecinos.
// Función pura, sin three.js. El eje y del núcleo crece hacia el sur y x hacia el este.

/** Bits de la máscara de vecinos. */
export const LADO_N = 1
export const LADO_E = 2
export const LADO_S = 4
export const LADO_O = 8

/** Máscara de 0 a 15: suma de LADO_N, LADO_E, LADO_S y LADO_O. */
export type MascaraVecinos = number

export type PiezaValla = 'poste' | 'extremo' | 'recta' | 'esquina' | 'te' | 'cruz'

/** Giro en cuartos de vuelta, en sentido horario visto desde arriba (N -> E -> S -> O). */
export type GiroValla = 0 | 1 | 2 | 3

export interface FormaValla {
  pieza: PiezaValla
  giro: GiroValla
}

/**
 * Máscara de referencia (giro 0) de cada pieza:
 * - poste: sin lados.
 * - extremo: conecta N.
 * - recta: conecta N y S (giro 1: E y O).
 * - esquina: conecta N y E.
 * - te: conecta N, E y S (le falta O).
 * - cruz: conecta los cuatro.
 */
export const MASCARA_REFERENCIA: Record<PiezaValla, MascaraVecinos> = {
  poste: 0,
  extremo: LADO_N,
  recta: LADO_N | LADO_S,
  esquina: LADO_N | LADO_E,
  te: LADO_N | LADO_E | LADO_S,
  cruz: LADO_N | LADO_E | LADO_S | LADO_O,
}

/** Gira una máscara `giro` cuartos de vuelta en sentido horario. */
export function girarMascara(mascara: MascaraVecinos, giro: number): MascaraVecinos {
  const k = ((giro % 4) + 4) % 4
  return ((mascara << k) | (mascara >> (4 - k))) & 15
}

const PIEZAS: PiezaValla[] = ['poste', 'extremo', 'recta', 'esquina', 'te', 'cruz']
const GIROS: GiroValla[] = [0, 1, 2, 3]

/** Pieza y giro que conectan exactamente los lados de la máscara. */
export function formaValla(vecinos: MascaraVecinos): FormaValla {
  const m = vecinos & 15
  for (const pieza of PIEZAS) {
    for (const giro of GIROS) {
      if (girarMascara(MASCARA_REFERENCIA[pieza], giro) === m) return { pieza, giro }
    }
  }
  throw new Error(`Máscara inválida: ${vecinos}`)
}

/**
 * Construye la máscara de una casilla a partir de una consulta.
 * `esValla` debe devolver true también para las puertas (las conecta).
 */
export function mascaraVecinos(
  esValla: (x: number, y: number) => boolean,
  x: number,
  y: number,
): MascaraVecinos {
  let m = 0
  if (esValla(x, y - 1)) m |= LADO_N
  if (esValla(x + 1, y)) m |= LADO_E
  if (esValla(x, y + 1)) m |= LADO_S
  if (esValla(x - 1, y)) m |= LADO_O
  return m
}
