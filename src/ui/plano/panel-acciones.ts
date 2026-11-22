import { defEdificio, reembolso, type Comando, type Coste, type EstadoJuego } from '../../core'
import { formatearMonedas } from '../hud/formato'
import { t } from '../textos'

/** Lo que muestra el panel de confirmación de la herramienta Demoler. */
export interface VistaAcciones {
  readonly id: number
  /** Clave de texto del nombre del edificio (`catalogo.edificio.<tipo>`). */
  readonly nombre: string
  /**
   * `demoler` un edificio terminado, `cancelar` una obra en curso (100 %) o `no-demolible`
   * (la casa terminada: el panel lo dice y no deja confirmar).
   */
  readonly accion: 'demoler' | 'cancelar' | 'no-demolible'
  /** Lo que devuelve el núcleo (`reembolso`); todo 0 si no se puede quitar. */
  readonly devuelve: Coste
  /** Comando que envía Confirmar; `null` si no hay nada que confirmar. */
  readonly comando: Comando | null
}

const NADA: Coste = { dinero: 0, madera: 0, piedra: 0 }

/**
 * Vista del panel de confirmación del edificio `id`. El reembolso sale de `reembolso()` del
 * núcleo, la misma función que usa el comando al aplicarse, así que lo mostrado es lo devuelto.
 * Pura. `null` si el edificio no existe.
 */
export function vistaAcciones(
  estado: Pick<EstadoJuego, 'edificios'>,
  id: number,
): VistaAcciones | null {
  const e = estado.edificios.find((b) => b.id === id)
  if (!e || !defEdificio(e.tipo)) return null
  const nombre = `catalogo.edificio.${e.tipo}`
  const r = reembolso(estado, id)
  if (!r) return { id, nombre, accion: 'no-demolible', devuelve: NADA, comando: null }
  return {
    id,
    nombre,
    accion: r.accion === 'cancelar' ? 'cancelar' : 'demoler',
    devuelve: r.coste,
    comando: { tipo: r.accion === 'cancelar' ? 'CancelarObra' : 'DemolerEdificio', id },
  }
}

/** «Se devuelve: 150 monedas, 25 madera» (solo las partidas > 0), o que no se devuelve nada. Pura. */
export function textoDevuelve(coste: Coste): string {
  const partes: string[] = []
  if (coste.dinero > 0) partes.push(t('acciones.dinero', { n: formatearMonedas(coste.dinero) }))
  if (coste.madera > 0) partes.push(t('acciones.madera', { n: coste.madera }))
  if (coste.piedra > 0) partes.push(t('acciones.piedra', { n: coste.piedra }))
  return partes.length === 0
    ? t('acciones.nada')
    : t('acciones.devuelve', { lista: partes.join(', ') })
}
