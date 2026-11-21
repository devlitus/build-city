import type { LectorEstado, Suscriptor } from '../juego/almacen'

/** Lo que la UI necesita del almacén: leer el estado y enterarse de los cambios (no crea ni muta). */
export interface FuenteEstado extends LectorEstado {
  suscribir(suscriptor: Suscriptor): () => void
}
