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

/** Centro (metros) de cada casilla de la huella: lo que el edificio pisa de verdad. */
export function puntosCentros(huella: Huella, valle: Medidas): { x: number; z: number }[] {
  const puntos: { x: number; z: number }[] = []
  for (let y = huella.y0; y <= huella.y1; y++) {
    for (let x = huella.x0; x <= huella.x1; x++) puntos.push(casillaAMetros(x, y, valle))
  }
  return puntos
}

/** Esquinas de la rejilla (metros), incluidas las exteriores de la huella. */
export function puntosEsquinas(huella: Huella, valle: Medidas): { x: number; z: number }[] {
  const puntos: { x: number; z: number }[] = []
  // La esquina noroeste de la casilla (x, y) es su centro menos 0,5 m.
  for (let y = huella.y0; y <= huella.y1 + 1; y++) {
    for (let x = huella.x0; x <= huella.x1 + 1; x++) {
      const c = casillaAMetros(x, y, valle)
      puntos.push({ x: c.x - 0.5, z: c.z - 0.5 })
    }
  }
  return puntos
}

/**
 * Altura de asiento del edificio: media de la altura del terreno en los centros de casilla de
 * la huella. Las esquinas exteriores no cuentan: junto al río caen en el cauce y hundirían el
 * edificio.
 */
export function alturaAsiento(huella: Huella, valle: Medidas, altura: FuncionAltura): number {
  const a = puntosCentros(huella, valle).map((p) => altura(p.x, p.z))
  return a.reduce((s, h) => s + h, 0) / a.length
}

/**
 * Zócalo que tapa la pendiente bajo el edificio: arriba llega a la altura de asiento y abajo al
 * punto más bajo del terreno (esquinas y centros) menos el margen de `data/terreno.json`.
 */
export function zocalo(
  huella: Huella,
  valle: Medidas,
  altura: FuncionAltura,
  parametros: ParametrosTerreno = PARAMETROS_TERRENO,
): DatosZocalo {
  const cotaSuperior = alturaAsiento(huella, valle, altura)
  const puntos = [...puntosCentros(huella, valle), ...puntosEsquinas(huella, valle)]
  const minimo = Math.min(...puntos.map((p) => altura(p.x, p.z)))
  const cotaInferior = Math.min(minimo, cotaSuperior) - parametros.zocalo.margen
  return { cotaSuperior, cotaInferior, alto: cotaSuperior - cotaInferior }
}
