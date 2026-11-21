import { HERRAMIENTAS, type Herramienta } from '../../core/inventario'

/** Una ranura de la barra: qué herramienta es, su tecla (1-9) y si es la activa del estado. */
export interface VistaRanura {
  readonly herramienta: Herramienta
  readonly tecla: number
  readonly activa: boolean
}

/** Ranuras de la barra (puro): exactamente una `activa`, la que indica `activa` (el estado). */
export function vistaBarra(
  activa: Herramienta,
  herramientas: readonly Herramienta[] = HERRAMIENTAS,
): readonly VistaRanura[] {
  return herramientas.map((herramienta, i) => ({
    herramienta,
    tecla: i + 1,
    activa: herramienta === activa,
  }))
}

export function barrasIguales(a: readonly VistaRanura[], b: readonly VistaRanura[]): boolean {
  return a.length === b.length && a.every((r, i) => r.activa === b[i]?.activa)
}
