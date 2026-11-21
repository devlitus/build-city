import type { Valle } from '../../core'
import { ladoMetros, type PuntoMetros } from '../terreno/coordenadas'

/** Factor de escala para que un modelo de `alturaCaja` metros mida `alturaDeseada`. 1 si no tiene altura. */
export function escalaParaAltura(alturaCaja: number, alturaDeseada: number): number {
  return alturaCaja > 0 ? alturaDeseada / alturaCaja : 1
}

/**
 * Posición continua del personaje (casillas, centro de la caja, y al sur) a metros de three.js.
 * No suma 0,5: el estado ya guarda el centro, no la esquina de la casilla.
 */
export function personajeAMetros(
  x: number,
  y: number,
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
): PuntoMetros {
  const mitad = ladoMetros(valle) / 2
  return { x: x - mitad, z: y - mitad }
}
