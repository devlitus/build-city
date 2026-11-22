import type { EstadoJuego } from './estado'
import { ladoValle } from './mapa'

/**
 * Caminos de grava (M6-T04). `EstadoJuego.caminos` es una cadena de `lado*lado` caracteres
 * (índice y*lado+x): `.` nada, `c` camino. No bloquean el paso: solo aceleran al personaje.
 *
 * Módulo hoja (solo importa tipos y `ladoValle`): lo comparten `estado`, `construccion`,
 * `labranza`, `vallas` y `recursos` sin ciclos. Las reglas y los comandos viven en `caminos.ts`.
 */
export const CARACTER_SIN_CAMINO = '.'
export const CARACTER_CAMINO = 'c'

/** Cadena de caminos vacía para un valle de `lado` casillas por lado. */
export function caminosVacios(lado: number): string {
  return CARACTER_SIN_CAMINO.repeat(lado * lado)
}

/** ¿Hay camino en la casilla (x, y)? `false` fuera del valle o si el estado no trae `caminos`. */
export function hayCamino(
  estado: Pick<EstadoJuego, 'valle'> & Partial<Pick<EstadoJuego, 'caminos'>>,
  x: number,
  y: number,
): boolean {
  const lado = ladoValle(estado.valle)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= lado || y >= lado) {
    return false
  }
  return typeof estado.caminos === 'string' && estado.caminos[y * lado + x] === CARACTER_CAMINO
}
