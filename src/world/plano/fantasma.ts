import { BoxGeometry, Mesh, MeshBasicMaterial, type Object3D } from 'three'
import {
  defEdificio,
  huellaDe,
  veredictoColocacion,
  type EstadoJuego,
  type Rotacion,
  type TipoEdificio,
  type Valle,
  type Veredicto,
} from '../../core'
import { color } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import { ladoMetros } from '../terreno/coordenadas'
import { esquinaDeHuella } from './encaje'
import { DATOS_PLANO } from './plano-datos'

/** Colocación que se está previsualizando: lo mismo que enviará `Construir` al hacer clic. */
export interface ColocacionFantasma {
  readonly tipo: TipoEdificio
  readonly x: number
  readonly y: number
  readonly rotacion: Rotacion
  readonly veredicto: Veredicto
}

export interface Fantasma {
  readonly objeto: Object3D
  /** Última colocación mostrada, o `null` si no hay fantasma. */
  readonly actual: ColocacionFantasma | null
  /**
   * Coloca el fantasma con el cursor en el centro de la huella y lo pinta de azul (válido) o rojo
   * (inválido) según `veredictoColocacion` del núcleo. Solo recalcula si cambia la casilla, el
   * tipo, el giro o el estado. Con `tipo` o `casilla` a `null` lo oculta.
   */
  actualizar(
    estado: EstadoJuego,
    tipo: TipoEdificio | null,
    casilla: { x: number; y: number } | null,
    rotacion: Rotacion,
  ): ColocacionFantasma | null
  destruir(): void
}

/** Caja translúcida con la huella del edificio que se va a colocar. */
export function crearFantasma(valle: Valle, altura: FuncionAltura): Fantasma {
  const mitad = ladoMetros(valle) / 2
  const geometria = new BoxGeometry(1, 1, 1)
  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: DATOS_PLANO.fantasma.opacidad,
    depthWrite: false,
    fog: false,
  })
  const malla = new Mesh(geometria, material)
  malla.name = 'fantasma-edificio'
  malla.renderOrder = 3
  malla.visible = false
  const colorValido = color('fantasmaValido')
  const colorInvalido = color('fantasmaInvalido')

  let actual: ColocacionFantasma | null = null
  let ultimoEstado: EstadoJuego | null = null

  return {
    objeto: malla,
    get actual() {
      return actual
    },
    actualizar(estado, tipo, casilla, rotacion) {
      const def = tipo === null ? undefined : defEdificio(tipo)
      if (tipo === null || !def || casilla === null) {
        malla.visible = false
        actual = null
        ultimoEstado = null
        return null
      }
      const esquina = esquinaDeHuella(def, casilla, rotacion)
      // El estado del núcleo es inmutable (cada comando crea uno nuevo), así que comparar la
      // referencia con `===` basta para saber si cambió algo que pueda alterar el veredicto.
      if (
        actual &&
        ultimoEstado === estado &&
        actual.tipo === tipo &&
        actual.x === esquina.x &&
        actual.y === esquina.y &&
        actual.rotacion === rotacion
      ) {
        return actual
      }
      ultimoEstado = estado
      const veredicto = veredictoColocacion(estado, tipo, esquina.x, esquina.y, rotacion)
      actual = { tipo, x: esquina.x, y: esquina.y, rotacion, veredicto }

      const h = huellaDe(def, esquina.x, esquina.y, rotacion)
      const an = h.x1 - h.x0 + 1
      const al = h.y1 - h.y0 + 1
      const x0 = h.x0 - mitad
      const z0 = h.y0 - mitad
      // Base sobre el punto más alto de la huella (esquinas y centro), para no hundirse.
      const muestras: Array<[number, number]> = [
        [x0, z0],
        [x0 + an, z0],
        [x0, z0 + al],
        [x0 + an, z0 + al],
        [x0 + an / 2, z0 + al / 2],
      ]
      const base =
        Math.max(...muestras.map(([x, z]) => altura(x, z))) + DATOS_PLANO.fantasma.separacion
      const alto = DATOS_PLANO.fantasma.altura
      malla.scale.set(an, alto, al)
      malla.position.set(x0 + an / 2, base + alto / 2, z0 + al / 2)
      material.color.setHex(veredicto.valida ? colorValido : colorInvalido)
      malla.visible = true
      return actual
    },
    destruir() {
      geometria.dispose()
      material.dispose()
    },
  }
}
