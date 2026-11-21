import type { Terreno } from '../../core'
import { colorHex, type Paleta } from '../paleta'
import { PARAMETROS_TERRENO, type ParametrosTerreno } from './parametros'

/** Color RGB con componentes en 0..1 (sRGB). */
export type Rgb = readonly [number, number, number]

/** Datos de una cara para decidir su color. */
export interface DatosCara {
  /** Tipo de la parcela que contiene la cara; `undefined` fuera del valle (colinas). */
  readonly terreno: Terreno | undefined
  /** Altura (m) del centro de la cara. */
  readonly altura: number
  /** Pendiente de la cara: desnivel / avance horizontal (0 = llana). */
  readonly pendiente: number
  /** Centro de la cara en metros, para la variación determinista. */
  readonly x: number
  readonly z: number
}

/** Nombre del color de paleta de cada tipo de parcela. */
const COLOR_DE_TERRENO: Readonly<Record<Terreno, string>> = {
  prado: 'prado',
  bosque: 'bosque',
  rocoso: 'roca',
}

/** Nombre del color base de una cara (sin variación): tipo de parcela, altura y pendiente. */
export function nombreColorBase(
  cara: DatosCara,
  nivelAgua: number,
  p: ParametrosTerreno['colores'],
): string {
  if (cara.altura > p.alturaNieve) return 'nieve'
  if (cara.altura < nivelAgua) return 'lecho'
  if (cara.altura < p.alturaArena) return 'arena'
  if (cara.pendiente > p.pendienteRoca || cara.altura > p.alturaRoca) return 'roca'
  return cara.terreno === undefined ? 'bosque' : COLOR_DE_TERRENO[cara.terreno]
}

/** Hash entero determinista de (x, z, semilla), en [0, 1). Sin `Math.random`. */
export function hashCara(x: number, z: number, semilla: number): number {
  // Se cuantifica a decímetros: la misma cara da siempre el mismo valor.
  let h = Math.imul(Math.round(x * 10), 0x27d4eb2d) ^ Math.imul(Math.round(z * 10), 0x165667b1)
  h = Math.imul(h ^ (semilla | 0), 0x9e3779b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function hexARgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * Color de una cara: color base según tipo, altura y pendiente, multiplicado por un factor
 * de brillo en [1 - variacion, 1 + variacion] derivado del hash de su posición y la semilla.
 */
export function colorDeCara(
  cara: DatosCara,
  semilla: number,
  paleta: Paleta,
  parametros: ParametrosTerreno = PARAMETROS_TERRENO,
): Rgb {
  const { variacion } = parametros.colores
  const base = hexARgb(
    colorHex(paleta, nombreColorBase(cara, parametros.nivelAgua, parametros.colores)),
  )
  const factor = 1 + (hashCara(cara.x, cara.z, semilla) * 2 - 1) * variacion
  return [
    Math.min(1, base[0] * factor),
    Math.min(1, base[1] * factor),
    Math.min(1, base[2] * factor),
  ]
}
