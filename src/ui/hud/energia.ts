import { ENERGIA_MAXIMA } from '../../core/energia'
import type { EstadoJuego } from '../../core/estado'

/** Por debajo de esta fracción de la energía máxima la barra se marca en alerta. */
export const FRACCION_ENERGIA_BAJA = 0.25

/** Lo que muestra la barra de energía. */
export interface VistaEnergia {
  /** Relleno de la barra, de 0 a 1. */
  readonly fraccion: number
  readonly actual: number
  readonly maximo: number
  readonly baja: boolean
}

/** Barra de energía (puro): sale solo de `estado.energia`, acotada a 0..máximo. */
export function vistaEnergia(
  estado: Pick<EstadoJuego, 'energia'>,
  maximo: number = ENERGIA_MAXIMA,
): VistaEnergia {
  const actual = Math.min(maximo, Math.max(0, Math.round(estado.energia)))
  const fraccion = maximo > 0 ? actual / maximo : 0
  return { fraccion, actual, maximo, baja: fraccion <= FRACCION_ENERGIA_BAJA }
}

export function vistasEnergiaIguales(a: VistaEnergia, b: VistaEnergia): boolean {
  return a.actual === b.actual && a.maximo === b.maximo
}
