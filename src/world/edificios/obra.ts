import { progresoObra, type Edificio } from '../../core'
import type { EtapaObra } from './carga'
import { DATOS_OBRA, type DatosObraVisual } from './obra-datos'

/** Etapa visible de una obra según su avance [0, 1]: la última cuyo umbral se ha alcanzado. */
export function etapaObra(progreso: number, datos: DatosObraVisual = DATOS_OBRA): EtapaObra {
  const u = datos.umbrales
  if (progreso >= u.terminado) return 'terminado'
  if (progreso >= u.paredes) return 'paredes'
  if (progreso >= u.andamios) return 'andamios'
  return 'cimientos'
}

/** Etapa que se dibuja de un edificio el día `dia`: `etapaObra(progresoObra(...))`. */
export function etapaDeEdificio(edificio: Pick<Edificio, 'obra'>, dia: number): EtapaObra {
  return etapaObra(progresoObra(edificio, dia))
}

/**
 * Escala del edificio recién terminado con `t` s de animación: sube de `escalaInicial` a 1 con
 * salida suave (cúbica). Antes de empezar vale la inicial; pasada la duración, 1.
 */
export function escalaTerminado(t: number, datos: DatosObraVisual = DATOS_OBRA): number {
  const { duracion, escalaInicial } = datos.aparicion
  if (!(t > 0)) return escalaInicial
  if (t >= duracion) return 1
  const u = 1 - t / duracion
  return escalaInicial + (1 - escalaInicial) * (1 - u * u * u)
}
