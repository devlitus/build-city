import { casillaBloqueada, type MapaTransitabilidad } from './mapa'

/**
 * Colisión de un círculo (el personaje) contra las casillas bloqueadas, que son cajas alineadas
 * de 1×1. Funciones puras. Fuera del valle cuenta como bloqueado (`casillaBloqueada`).
 */

/** Separación extra al empujar fuera de una caja, para no quedar tangente por redondeo. */
const HOLGURA = 1e-6
/** Pasadas de resolución por subpaso (una esquina entre dos cajas puede necesitar más de una). */
const PASADAS = 4
/** Fracción del radio que avanza como máximo cada subpaso (< 1: no hay efecto túnel). */
const FRACCION_PASO = 0.5

/** ¿El círculo (x, y, radio) solapa de verdad alguna casilla bloqueada? */
export function circuloSolapaBloqueo(
  mapa: MapaTransitabilidad,
  x: number,
  y: number,
  radio: number,
): boolean {
  const cx0 = Math.floor(x - radio)
  const cx1 = Math.floor(x + radio)
  const cy0 = Math.floor(y - radio)
  const cy1 = Math.floor(y + radio)
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      if (!casillaBloqueada(mapa, cx, cy)) continue
      const px = Math.min(Math.max(x, cx), cx + 1)
      const py = Math.min(Math.max(y, cy), cy + 1)
      const ddx = x - px
      const ddy = y - py
      if (ddx * ddx + ddy * ddy < radio * radio) return true
    }
  }
  return false
}

/**
 * Empuja el círculo fuera de las cajas bloqueadas por la normal (del punto más cercano de la caja
 * al centro). Solo se quita la componente hacia la pared: la tangencial se conserva (deslizamiento).
 */
export function resolverCirculo(
  mapa: MapaTransitabilidad,
  x: number,
  y: number,
  radio: number,
): { readonly x: number; readonly y: number } {
  let px = x
  let py = y
  for (let pasada = 0; pasada < PASADAS; pasada++) {
    let movido = false
    const cx0 = Math.floor(px - radio)
    const cx1 = Math.floor(px + radio)
    const cy0 = Math.floor(py - radio)
    const cy1 = Math.floor(py + radio)
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (!casillaBloqueada(mapa, cx, cy)) continue
        const qx = Math.min(Math.max(px, cx), cx + 1)
        const qy = Math.min(Math.max(py, cy), cy + 1)
        const ddx = px - qx
        const ddy = py - qy
        const d2 = ddx * ddx + ddy * ddy
        if (d2 >= radio * radio) continue
        if (d2 > 0) {
          const d = Math.sqrt(d2)
          const k = (radio + HOLGURA) / d
          px = qx + ddx * k
          py = qy + ddy * k
        } else {
          // Centro dentro de la caja: sale por la cara más cercana.
          const izq = px - cx
          const der = cx + 1 - px
          const arr = py - cy
          const aba = cy + 1 - py
          const m = Math.min(izq, der, arr, aba)
          if (m === izq) px = cx - radio - HOLGURA
          else if (m === der) px = cx + 1 + radio + HOLGURA
          else if (m === arr) py = cy - radio - HOLGURA
          else py = cy + 1 + radio + HOLGURA
        }
        movido = true
      }
    }
    if (!movido) break
  }
  return { x: px, y: py }
}

/**
 * Desplaza el círculo `(ddx, ddy)` desde `(x, y)` (posición válida) en subpasos acotados
 * (< radio) resolviendo cada uno. Garantiza que el resultado no solapa ninguna caja: si una
 * resolución no lo consigue, se conserva la última posición válida.
 */
export function moverCirculo(
  mapa: MapaTransitabilidad,
  x: number,
  y: number,
  ddx: number,
  ddy: number,
  radio: number,
): { readonly x: number; readonly y: number } {
  const largo = Math.hypot(ddx, ddy)
  if (!(largo > 0)) return { x, y }
  const pasos = Math.ceil(largo / (radio * FRACCION_PASO))
  const sx = ddx / pasos
  const sy = ddy / pasos
  let px = x
  let py = y
  for (let i = 0; i < pasos; i++) {
    const r = resolverCirculo(mapa, px + sx, py + sy, radio)
    if (circuloSolapaBloqueo(mapa, r.x, r.y, radio)) break
    px = r.x
    py = r.y
  }
  return { x: px, y: py }
}
