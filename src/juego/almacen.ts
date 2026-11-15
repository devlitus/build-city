import {
  aplicarComando,
  type Comando,
  type ErrorComando,
  type EstadoJuego,
  type EventoJuego,
} from '../core'

/** Lo que reciben los suscriptores tras cada `despachar`. */
export type Notificacion =
  | { readonly ok: true; readonly comando: Comando; readonly eventos: readonly EventoJuego[] }
  | { readonly ok: false; readonly comando: Comando; readonly error: ErrorComando }

export type Suscriptor = (notificacion: Notificacion) => void

/** Vista de solo lectura del almacén: lo único que la escena y la UI necesitan para leer. */
export interface LectorEstado {
  readonly estado: EstadoJuego
}

/**
 * Guarda el estado del núcleo. Es la única vía de cambio: `despachar(comando)`.
 * El estado es `readonly` y no hay setters, así la escena y la UI no pueden mutarlo.
 */
export class Almacen implements LectorEstado {
  #estado: EstadoJuego
  readonly #suscriptores = new Set<Suscriptor>()

  constructor(estadoInicial: EstadoJuego) {
    this.#estado = estadoInicial
  }

  get estado(): EstadoJuego {
    return this.#estado
  }

  /** Aplica el comando; si el núcleo lo acepta actualiza el estado. Notifica en ambos casos. */
  despachar(comando: Comando): Notificacion {
    const resultado = aplicarComando(this.#estado, comando)
    let notificacion: Notificacion
    if (resultado.ok) {
      this.#estado = resultado.estado
      notificacion = { ok: true, comando, eventos: resultado.eventos }
    } else {
      notificacion = { ok: false, comando, error: resultado.error }
    }
    for (const suscriptor of [...this.#suscriptores]) suscriptor(notificacion)
    return notificacion
  }

  /** Devuelve la función que cancela la suscripción. */
  suscribir(suscriptor: Suscriptor): () => void {
    this.#suscriptores.add(suscriptor)
    return () => {
      this.#suscriptores.delete(suscriptor)
    }
  }
}

export function crearAlmacen(estadoInicial: EstadoJuego): Almacen {
  return new Almacen(estadoInicial)
}
