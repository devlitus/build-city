import { defEdificio, huellaDe, rotacionDe, type Edificio, type Valle } from '../../core'
import type { EtapaObra } from './carga'
import { casillaAMetros } from '../terreno/coordenadas'
import type { Huella } from '../terreno/aplanar'

type Medidas = Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>

/** Huella ya girada de un edificio, o `undefined` si su tipo no está en el catálogo. */
export function huellaEdificio(e: Edificio): Huella | undefined {
  const def = defEdificio(e.tipo)
  return def && huellaDe(def, e.x, e.y, rotacionDe(e))
}

/** Giro (rad) alrededor de Y que lleva la puerta del modelo (+z, sur) al lado que dice el núcleo. */
export function giroEdificio(e: Pick<Edificio, 'rotacion'>): number {
  // Sentido horario visto desde arriba: 1 cuarto lleva el sur al oeste (-x).
  return 0 - rotacionDe(e) * (Math.PI / 2)
}

/** Centro (metros) de la huella: ahí se coloca el modelo, centrado en su huella. */
export function centroHuella(huella: Huella, valle: Medidas): { x: number; z: number } {
  const a = casillaAMetros(huella.x0, huella.y0, valle)
  const b = casillaAMetros(huella.x1, huella.y1, valle)
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }
}

/**
 * Clave de cambio de lo que se ve de un edificio: id, tipo, esquina, giro y etapa. Si es igual
 * entre dos fotogramas no hay que reconstruir nada.
 */
export function claveEdificio(
  e: Pick<Edificio, 'id' | 'tipo' | 'x' | 'y' | 'rotacion'>,
  etapa: EtapaObra,
): string {
  return `${e.id}|${e.tipo}|${e.x},${e.y}|${rotacionDe(e)}|${etapa}`
}
