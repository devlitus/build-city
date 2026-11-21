import { Group, type Object3D, type PerspectiveCamera } from 'three'
import type { LectorEstado } from '../../juego/almacen'
import type { FuncionAltura } from '../terreno/altura'
import { crearRejilla } from './rejilla'
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
  const rejilla = crearRejilla(altura)
  const grupo = new Group()
  grupo.name = 'plano'
  grupo.add(resaltado.objeto, rejilla.objeto)
  let firmaPropias: string | null = null
  /** Reconstruye la rejilla solo si cambian las parcelas propias (p. ej. al comprar). */
  const sincronizar = (): void => {
    const v = lector.estado.valle
    const firma = v.parcelas.map((p) => (p.estado === 'propia' ? '1' : '0')).join('')
    if (firma === firmaPropias) return
    firmaPropias = firma
    rejilla.actualizar(v)
  }
  return {
    objeto: grupo,
    get bajoCursor() {
      return seleccion.actual
    },
    actualizar() {
      const enPlano = lector.estado.modo === 'plano'
      grupo.visible = enPlano
      if (!enPlano) {
        seleccion.olvidar()
        resaltado.mostrar(null)
        return
      }
      sincronizar()
      resaltado.mostrar(seleccion.actualizar()?.indiceParcela ?? null)
    },
    destruir() {
      seleccion.destruir()
      resaltado.destruir()
      rejilla.destruir()
    },
  }
}
