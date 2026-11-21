import type { Object3D, PerspectiveCamera } from 'three'
import type { LectorEstado } from '../../juego/almacen'
import type { FuncionAltura } from '../terreno/altura'
import { crearResaltadoParcela } from './resaltado'
import { crearSeleccion, type BajoCursor } from './seleccion'

export interface CapaPlano {
  readonly objeto: Object3D
  /** Parcela y punto bajo el cursor; `null` fuera del Modo Plano o fuera del valle. */
  readonly bajoCursor: BajoCursor | null
  /** Una vez por fotograma: sigue el cursor y resalta la parcela solo en Modo Plano. */
  actualizar(): void
  destruir(): void
}

/** Capa del Modo Plano: selección de parcela con el ratón y su resaltado. */
export function crearCapaPlano(
  lector: LectorEstado,
  camara: PerspectiveCamera,
  lienzo: HTMLElement,
  terreno: Object3D,
  altura: FuncionAltura,
): CapaPlano {
  const { valle } = lector.estado
  const seleccion = crearSeleccion(camara, lienzo, terreno, valle)
  const resaltado = crearResaltadoParcela(valle, altura)
  return {
    objeto: resaltado.objeto,
    get bajoCursor() {
      return seleccion.actual
    },
    actualizar() {
      if (lector.estado.modo !== 'plano') {
        seleccion.olvidar()
        resaltado.mostrar(null)
        return
      }
      resaltado.mostrar(seleccion.actualizar()?.indiceParcela ?? null)
    },
    destruir() {
      seleccion.destruir()
      resaltado.destruir()
    },
  }
}
