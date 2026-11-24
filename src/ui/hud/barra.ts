import { cultivoDeSemilla, type Cultivo } from '../../core/cultivos'
import { HERRAMIENTAS, type Herramienta, type ObjetoId } from '../../core/inventario'

/** Una ranura de la barra: qué herramienta es, su tecla (1-9) y si es la activa del estado. */
export interface VistaRanura {
  readonly herramienta: Herramienta
  readonly tecla: number
  readonly activa: boolean
  /** Cultivo de la semilla elegida, solo en la ranura «semillas» (si hay una elegida). */
  readonly cultivo?: Cultivo
}

/** Ranuras de la barra (puro): exactamente una `activa`, la que indica `activa` (el estado). */
export function vistaBarra(
  activa: Herramienta,
  herramientas: readonly Herramienta[] = HERRAMIENTAS,
  semillaElegida: ObjetoId | null = null,
): readonly VistaRanura[] {
  const cultivo = cultivoDeSemilla(semillaElegida)
  return herramientas.map((herramienta, i) => ({
    herramienta,
    tecla: i + 1,
    activa: herramienta === activa,
    ...(herramienta === 'semillas' && cultivo !== undefined ? { cultivo } : {}),
  }))
}

export function barrasIguales(a: readonly VistaRanura[], b: readonly VistaRanura[]): boolean {
  return (
    a.length === b.length &&
    a.every((r, i) => r.activa === b[i]?.activa && r.cultivo === b[i]?.cultivo)
  )
}
