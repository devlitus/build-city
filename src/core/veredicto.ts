import { colocacionValida, type MotivoColocacion } from './construccion'
import { materialesQueFaltan, type EstadoCatalogo } from './catalogo'
import type { EstadoColocacion } from './construccion'
import type { Coste, Rotacion, TipoEdificio } from './edificios'

/** Veredicto de colocar un edificio: válido, o el motivo y lo que falta de dinero y materiales. */
export type Veredicto =
  | { readonly valida: true }
  | { readonly valida: false; readonly motivo: MotivoColocacion; readonly faltan: Coste }

/**
 * Veredicto que muestra el fantasma del Modo Plano. Es exactamente `colocacionValida` (la misma
 * función que usa `Construir`) más las cantidades que faltan para pagar. Pura.
 */
export function veredictoColocacion(
  estado: EstadoColocacion & EstadoCatalogo,
  tipo: TipoEdificio,
  x: number,
  y: number,
  rotacion: Rotacion,
): Veredicto {
  const r = colocacionValida(estado, tipo, x, y, { rotacion })
  if (r.valida) return r
  return { valida: false, motivo: r.motivo, faltan: materialesQueFaltan(estado, tipo) }
}

/** ¿Dos veredictos dicen lo mismo? (para avisar a la interfaz solo si cambia) */
export function mismoVeredicto(a: Veredicto | null, b: Veredicto | null): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (a.valida || b.valida) return a.valida === b.valida
  return (
    a.motivo === b.motivo &&
    a.faltan.dinero === b.faltan.dinero &&
    a.faltan.madera === b.faltan.madera &&
    a.faltan.piedra === b.faltan.piedra
  )
}
