import type { Valle } from '../../core'
import { casillaAMetros } from './coordenadas'
import type { FuncionAltura } from './altura'
import { PARAMETROS_TERRENO, type ParametrosTerreno } from './parametros'

type Medidas = Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>

/** Rectángulo de casillas globales, extremos incluidos (la huella ya girada la da el núcleo). */
export interface Huella {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** Datos del zócalo: caja entre `cotaInferior` y `cotaSuperior` (metros), sobre la huella. */
export interface DatosZocalo {
  readonly cotaSuperior: number
  readonly cotaInferior: number
  readonly alto: number
}

/**
 * Puntos de muestreo (metros) de la huella: las esquinas de la rejilla (incluidas las
 * exteriores de la huella) y el centro de cada casilla.
 */
export function puntosMuestreo(huella: Huella, valle: Medidas): { x: number; z: number }[] {
  const puntos: { x: number; z: number }[] = []
  // La esquina noroeste de la casilla (x, y) es su centro menos 0,5 m.
  for (let y = huella.y0; y <= huella.y1 + 1; y++) {
    for (let x = huella.x0; x <= huella.x1 + 1; x++) {
      const c = casillaAMetros(x, y, valle)
      puntos.push({ x: c.x - 0.5, z: c.z - 0.5 })
    }
  }
  for (let y = huella.y0; y <= huella.y1; y++) {
    for (let x = huella.x0; x <= huella.x1; x++) {
      puntos.push(casillaAMetros(x, y, valle))
    }
  }
  return puntos
}

function alturas(huella: Huella, valle: Medidas, altura: FuncionAltura): number[] {
  return puntosMuestreo(huella, valle).map((p) => altura(p.x, p.z))
}

/** Altura de asiento del edificio: media de la altura del terreno en los puntos de la huella. */
export function alturaAsiento(huella: Huella, valle: Medidas, altura: FuncionAltura): number {
  const a = alturas(huella, valle, altura)
  return a.reduce((s, h) => s + h, 0) / a.length
}

/**
 * Zócalo que tapa la pendiente bajo el edificio: llega arriba hasta la altura de asiento y
 * abajo hasta el punto más bajo del terreno en la huella menos el margen de `data/terreno.json`.
 */
export function zocalo(
  huella: Huella,
  valle: Medidas,
  altura: FuncionAltura,
  parametros: ParametrosTerreno = PARAMETROS_TERRENO,
): DatosZocalo {
  const a = alturas(huella, valle, altura)
  const cotaSuperior = a.reduce((s, h) => s + h, 0) / a.length
  const cotaInferior = Math.min(...a, cotaSuperior) - parametros.zocalo.margen
  return { cotaSuperior, cotaInferior, alto: cotaSuperior - cotaInferior }
}
