import type { Obstaculo } from '../core'

/**
 * ¿Cambió lo que se ve de los obstáculos entre dos listas del núcleo? Solo cuentan tipo, casilla y
 * variante: contar golpes o el día de plantado no cambia el modelo. Compara por posición en la
 * lista (el núcleo conserva el orden: talar sustituye el árbol por su tocón en el mismo sitio y
 * quitar una roca o un tocón solo elimina su entrada); un orden distinto da un falso positivo,
 * que solo cuesta reconstruir las mallas. Pura.
 */
export function obstaculosCambiaron(
  antes: readonly Obstaculo[],
  despues: readonly Obstaculo[],
): boolean {
  if (antes === despues) return false
  if (antes.length !== despues.length) return true
  for (let i = 0; i < antes.length; i++) {
    const a = antes[i]
    const d = despues[i]
    if (!a || !d) return true
    if (a !== d && (a.tipo !== d.tipo || a.x !== d.x || a.y !== d.y || a.variante !== d.variante)) {
      return true
    }
  }
  return false
}
