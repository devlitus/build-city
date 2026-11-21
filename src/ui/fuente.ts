import type { Comando } from '../core'
import type { LectorEstado, Suscriptor } from '../juego/almacen'

/** Lo que la UI necesita del almacén: leer el estado y enterarse de los cambios (no crea ni muta). */
export interface FuenteEstado extends LectorEstado {
  suscribir(suscriptor: Suscriptor): () => void
}

/** Además de leer, puede enviar comandos (único modo en que la UI cambia la partida). */
export interface FuenteDespacho extends FuenteEstado {
  despachar(comando: Comando): unknown
}
