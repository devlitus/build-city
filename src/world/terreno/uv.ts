import type { Valle } from '../../core'
import { escalaRepeticion } from '../materiales-datos'
import type { FuncionAltura } from './altura'
import { esquinaDeTrozo, type Trozo } from './trozos'

/**
 * UV de un punto del suelo en metros globales: u = x / metros, v = z / metros. Al depender solo
 * de la posición (no del trozo) la textura es continua entre trozos vecinos. Pura.
 */
export function uvTerreno(x: number, z: number, metrosPorRepeticion: number): [number, number] {
  const escala = escalaRepeticion(metrosPorRepeticion)
  return [x * escala, z * escala]
}

/** UV del vértice (i, j) de un trozo (la esquina noroeste es el vértice (0, 0)). */
export function uvDeVerticeTrozo(
  trozo: Trozo,
  i: number,
  j: number,
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
  metrosPorRepeticion: number,
): [number, number] {
  const { x, z } = esquinaDeTrozo(trozo, valle)
  return uvTerreno(x + i, z + j, metrosPorRepeticion)
}

/**
 * Normal unitaria del terreno en (x, z) por diferencias centrales de la función de altura.
 * Depende solo de la posición, así los vértices de borde de dos trozos vecinos comparten
 * exactamente la misma normal (sin costuras de iluminación). Pura.
 */
export function normalDeAltura(
  altura: FuncionAltura,
  x: number,
  z: number,
  paso = 1,
): [number, number, number] {
  const dx = (altura(x + paso, z) - altura(x - paso, z)) / (2 * paso)
  const dz = (altura(x, z + paso) - altura(x, z - paso)) / (2 * paso)
  const largo = Math.hypot(dx, 1, dz)
  return [-dx / largo, 1 / largo, -dz / largo]
}
