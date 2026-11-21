import type { Object3D, PerspectiveCamera } from 'three'
import type { LectorEstado } from '../../juego/almacen'
import { seleccionParcela } from '../../juego/seleccion-parcela'
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

  // Clic izquierdo sin arrastre (la cámara del plano se mueve arrastrando) sobre una parcela:
  // la anuncia al canal de selección de la UI. No decide nada de reglas.
  const UMBRAL_ARRASTRE_PX = 5
  let inicio: { x: number; y: number } | null = null
  const alPulsar = (e: PointerEvent): void => {
    inicio = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
  }
  const alSoltar = (e: PointerEvent): void => {
    const desde = inicio
    inicio = null
    if (!desde || e.button !== 0 || lector.estado.modo !== 'plano') return
    if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) > UMBRAL_ARRASTRE_PX) return
    const bajo = seleccion.actualizar()
    if (bajo) seleccionParcela.seleccionar(bajo.indiceParcela)
  }
  lienzo.addEventListener('pointerdown', alPulsar)
  lienzo.addEventListener('pointerup', alSoltar)

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
      lienzo.removeEventListener('pointerdown', alPulsar)
      lienzo.removeEventListener('pointerup', alSoltar)
      seleccion.destruir()
      resaltado.destruir()
    },
  }
}
