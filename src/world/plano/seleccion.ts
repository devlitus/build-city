import { Raycaster, Vector2, type Object3D, type PerspectiveCamera } from 'three'
import { parcelaEnPunto, type Valle } from '../../core'
import type { PuntoMetros } from '../terreno/coordenadas'

/** Lo que hay bajo el cursor: punto del terreno en metros y parcela (índice en `valle.parcelas`). */
export interface BajoCursor {
  readonly punto: PuntoMetros
  readonly indiceParcela: number
}

export interface Seleccion {
  /**
   * Lanza el rayo del cursor contra el terreno y recuerda el resultado. Devuelve `null` si el
   * cursor no está sobre la página, no toca el terreno o el punto queda fuera del valle
   * (las colinas del anillo no se seleccionan).
   */
  actualizar(): BajoCursor | null
  /** Resultado del último `actualizar`. */
  readonly actual: BajoCursor | null
  /** Olvida el cursor (p. ej. al salir del Modo Plano). */
  olvidar(): void
  destruir(): void
}

/**
 * Seguimiento del cursor sobre el terreno. Solo traduce el ratón a un punto en metros y a una
 * parcela con `parcelaEnPunto` del núcleo; no contiene reglas de juego.
 */
export function crearSeleccion(
  camara: PerspectiveCamera,
  lienzo: HTMLElement,
  terreno: Object3D,
  valle: Valle,
): Seleccion {
  const rayo = new Raycaster()
  const ndc = new Vector2()
  let dentro = false
  let actual: BajoCursor | null = null

  const alMover = (e: PointerEvent): void => {
    const caja = lienzo.getBoundingClientRect()
    if (caja.width === 0 || caja.height === 0) return
    ndc.set(
      ((e.clientX - caja.left) / caja.width) * 2 - 1,
      -((e.clientY - caja.top) / caja.height) * 2 + 1,
    )
    dentro = true
  }
  const alSalir = (): void => {
    dentro = false
  }
  lienzo.addEventListener('pointermove', alMover)
  lienzo.addEventListener('pointerleave', alSalir)

  return {
    get actual() {
      return actual
    },
    actualizar() {
      actual = null
      if (!dentro) return null
      rayo.setFromCamera(ndc, camara)
      const impacto = rayo.intersectObject(terreno, true)[0]
      if (!impacto) return null
      const punto = { x: impacto.point.x, z: impacto.point.z }
      const r = parcelaEnPunto(valle, punto.x, punto.z)
      if (r) actual = { punto, indiceParcela: r.indice }
      return actual
    },
    olvidar() {
      actual = null
    },
    destruir() {
      lienzo.removeEventListener('pointermove', alMover)
      lienzo.removeEventListener('pointerleave', alSalir)
    },
  }
}
