import type { Obstaculo, Valle } from '../core'
import { casillaAMetros, type PuntoMetros } from './terreno/coordenadas'
import type { DatosVegetacion } from './vegetacion-datos'

/*
 * Colocación de la vegetación: funciones puras (sin three.js, sin Math.random). Toda la
 * variación sale de un hash con semilla, así la misma semilla da siempre el mismo valle.
 */

type Rango = { readonly min: number; readonly max: number }

/** Hash entero de (semilla, a, b, c) a un número en [0, 1). Determinista y sin estado. */
export function hash(semilla: number, a: number, b: number, c = 0): number {
  let h = semilla | 0
  for (const n of [a, b, c]) {
    h = Math.imul(h ^ (Math.floor(n) | 0), 0x9e3779b1)
    h ^= h >>> 15
    h = Math.imul(h, 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
  }
  return (h >>> 0) / 4294967296
}

function mezclar(rango: Rango, t: number): number {
  return rango.min + (rango.max - rango.min) * t
}

/** Clave única de una celda de 1 m (casilla global, también fuera del valle). */
export function claveCelda(x: number, y: number): number {
  return (y + 4096) * 8192 + (x + 4096)
}

/** Colocación de una pieza: posición en el plano (m) y variante 0–1. */
export interface Colocacion {
  readonly x: number
  readonly z: number
  readonly variante: number
}

/** Colocación de un obstáculo del núcleo. */
export interface ColocacionObstaculo extends Colocacion {
  readonly tipo: Obstaculo['tipo']
}

/** Posición en metros de un obstáculo: el centro de su casilla. */
export function posicionObstaculo(
  obstaculo: Pick<Obstaculo, 'x' | 'y'>,
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
): PuntoMetros {
  return casillaAMetros(obstaculo.x, obstaculo.y, valle)
}

/** Una colocación por cada obstáculo del núcleo, en el mismo orden y en su casilla exacta. */
export function colocarObstaculos(
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
  obstaculos: readonly Obstaculo[],
): ColocacionObstaculo[] {
  return obstaculos.map((o) => {
    const p = posicionObstaculo(o, valle)
    return { tipo: o.tipo, x: p.x, z: p.z, variante: o.variante }
  })
}

/** Casillas ocupadas por obstáculos del núcleo (claves de `claveCelda`). */
export function celdasOcupadas(obstaculos: readonly Obstaculo[]): Set<number> {
  return new Set(obstaculos.map((o) => claveCelda(o.x, o.y)))
}

/** Forma de copa de un árbol, decidida por su variante y la semilla. */
export function tipoCopa(
  variante: number,
  semilla: number,
  datos: Pick<DatosVegetacion['arbol'], 'proporcionPino'>,
): 'pino' | 'redondo' {
  return hash(semilla, variante * 1e6, 11) < datos.proporcionPino ? 'pino' : 'redondo'
}

/** Escala, giro (rad) y tono (-1 a 1) de una pieza, deterministas por variante y semilla. */
export interface Variacion {
  readonly escala: number
  readonly giro: number
  readonly tono: number
}

export function variacionDe(variante: number, semilla: number, escala: Rango): Variacion {
  const k = variante * 1e6
  return {
    escala: mezclar(escala, hash(semilla, k, 21)),
    giro: hash(semilla, k, 22) * Math.PI * 2,
    tono: hash(semilla, k, 23) * 2 - 1,
  }
}
