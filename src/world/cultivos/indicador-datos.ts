import type { EstadoJuego } from '../../core'
import { ladoValle } from '../../core/mapa'
import { esHerramientaDeCultivo, objetivoDelante } from '../../core/objetivo'
import { casillaAMetros } from '../terreno/coordenadas'
import type { FuncionAltura } from '../terreno/altura'

/** Subdivisiones por lado del cuadro, para que se pegue a las pendientes. */
export const SUBDIVISIONES_INDICADOR = 4
/** Cuánto (m) se eleva el cuadro sobre el terreno para evitar el parpadeo. */
export const ELEVACION_INDICADOR = 0.04
/** Opacidad del cuadro. */
export const OPACIDAD_INDICADOR = 0.45

/**
 * Casilla que marca el indicador: la misma que usa `E` (`objetivoDelante`, la de enfrente del
 * personaje) cuando la herramienta activa es de cultivo, en Modo Vida y dentro del valle.
 * `undefined` si no hay que dibujarlo. Pura.
 */
export function casillaIndicada(
  estado: Pick<EstadoJuego, 'modo' | 'herramienta' | 'personaje' | 'obstaculos' | 'valle'>,
): { readonly x: number; readonly y: number } | undefined {
  if (estado.modo !== 'vida' || !esHerramientaDeCultivo(estado.herramienta)) return undefined
  const { x, y } = objetivoDelante(estado.personaje, estado.personaje.orientacion, estado)
  const lado = ladoValle(estado.valle)
  if (x < 0 || y < 0 || x >= lado || y >= lado) return undefined
  return { x, y }
}

/**
 * Vértices (x, y, z en metros, fila a fila) de un cuadro de 1 m sobre la casilla (x, y), siguiendo
 * la altura del terreno: `(n + 1)²` puntos con `n = SUBDIVISIONES_INDICADOR`. Pura.
 */
export function puntosIndicador(
  x: number,
  y: number,
  valle: Pick<EstadoJuego['valle'], 'parcelasPorLado' | 'casillasPorParcela'>,
  altura: FuncionAltura,
  n: number = SUBDIVISIONES_INDICADOR,
  elevacion: number = ELEVACION_INDICADOR,
): Float32Array {
  const centro = casillaAMetros(x, y, valle)
  const out = new Float32Array((n + 1) * (n + 1) * 3)
  let k = 0
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const px = centro.x - 0.5 + i / n
      const pz = centro.z - 0.5 + j / n
      out[k++] = px
      out[k++] = altura(px, pz) + elevacion
      out[k++] = pz
    }
  }
  return out
}
