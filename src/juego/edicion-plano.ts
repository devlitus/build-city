import type { CanalHerramientaPlano } from './herramienta-plano'

/**
 * Estado de interfaz de las herramientas Mover y Demoler del Modo Plano (no es estado de partida):
 * el edificio cogido para moverlo y el edificio pendiente de confirmar su demolición. La escena
 * escribe al hacer clic, la UI lee y confirma; el núcleo se entera solo por comandos.
 */
export interface EstadoEdicionPlano {
  /** Id del edificio que se está moviendo (el fantasma lo sigue), o `null`. */
  readonly cogido: number | null
  /** Id del edificio cuya demolición (o cancelación de obra) espera confirmación, o `null`. */
  readonly pendiente: number | null
}

export type OyenteEdicion = (estado: EstadoEdicionPlano) => void

export interface CanalEdicionPlano extends EstadoEdicionPlano {
  coger(id: number): void
  soltar(): void
  pedirQuitar(id: number): void
  descartar(): void
  suscribir(oyente: OyenteEdicion): () => void
}

export function crearCanalEdicionPlano(): CanalEdicionPlano {
  let cogido: number | null = null
  let pendiente: number | null = null
  const oyentes = new Set<OyenteEdicion>()
  const avisar = (): void => {
    for (const o of [...oyentes]) o({ cogido, pendiente })
  }
  return {
    get cogido() {
      return cogido
    },
    get pendiente() {
      return pendiente
    },
    coger(id) {
      if (cogido === id) return
      cogido = id
      avisar()
    },
    soltar() {
      if (cogido === null) return
      cogido = null
      avisar()
    },
    pedirQuitar(id) {
      if (pendiente === id) return
      pendiente = id
      avisar()
    },
    descartar() {
      if (pendiente === null) return
      pendiente = null
      avisar()
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
  }
}

/** Canal único de la aplicación, compartido por la escena y la UI. */
export const edicionPlano: CanalEdicionPlano = crearCanalEdicionPlano()

/**
 * Cambiar de herramienta cancela lo que estuviera a medias: salir de Mover suelta el edificio
 * cogido (queda donde estaba) y salir de Demoler descarta la confirmación pendiente.
 * Devuelve la función que quita el oyente.
 */
export function enlazarEdicion(
  herramienta: CanalHerramientaPlano,
  edicion: CanalEdicionPlano = edicionPlano,
): () => void {
  return herramienta.suscribir(({ herramienta: h }) => {
    if (h !== 'mover') {
      edicion.soltar()
    }
    if (h !== 'demoler') edicion.descartar()
  })
}
