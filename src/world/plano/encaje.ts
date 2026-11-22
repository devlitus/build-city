import { huellaDe, type DefEdificio, type Rotacion } from '../../core'

/**
 * Esquina superior izquierda de la huella (ya girada) para que la casilla bajo el cursor quede
 * en el centro de la huella; en lados pares, el centro es la casilla `floor(n / 2)` contando
 * desde la esquina. Pura.
 */
export function esquinaDeHuella(
  def: Pick<DefEdificio, 'ancho' | 'alto'>,
  casilla: { readonly x: number; readonly y: number },
  rotacion: Rotacion,
): { x: number; y: number } {
  const h = huellaDe(def, 0, 0, rotacion)
  const an = h.x1 + 1
  const al = h.y1 + 1
  return { x: casilla.x - Math.floor(an / 2), y: casilla.y - Math.floor(al / 2) }
}
