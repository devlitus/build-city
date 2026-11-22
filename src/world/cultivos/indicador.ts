import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
} from 'three'
import type { LectorEstado } from '../../juego/almacen'
import { color } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import {
  OPACIDAD_INDICADOR,
  SUBDIVISIONES_INDICADOR,
  casillaIndicada,
  puntosIndicador,
} from './indicador-datos'

export interface Indicador {
  readonly objeto: Object3D
  /** Una vez por fotograma: recoloca el cuadro en la casilla objetivo o lo oculta. */
  actualizar(): void
  destruir(): void
}

/** Cuadro de 1 m sobre la casilla donde actuará la azada, las semillas, la regadera o la mano. */
export function crearIndicador(lector: LectorEstado, altura: FuncionAltura): Indicador {
  const n = SUBDIVISIONES_INDICADOR
  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new BufferAttribute(new Float32Array((n + 1) ** 2 * 3), 3))
  const indices: number[] = []
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i
      const b = a + 1
      const c = a + n + 1
      indices.push(a, c, b, b, c, c + 1)
    }
  }
  geometria.setIndex(indices)
  const material = new MeshBasicMaterial({
    color: color('indicadorCultivo'),
    transparent: true,
    opacity: OPACIDAD_INDICADOR,
    depthWrite: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    fog: false,
  })
  const malla = new Mesh(geometria, material)
  malla.visible = false
  malla.frustumCulled = false
  malla.renderOrder = 2

  let x = NaN
  let y = NaN
  return {
    objeto: malla,
    actualizar: () => {
      const c = casillaIndicada(lector.estado)
      if (!c) {
        malla.visible = false
        return
      }
      malla.visible = true
      if (c.x === x && c.y === y) return
      x = c.x
      y = c.y
      const pos = geometria.getAttribute('position') as BufferAttribute
      pos.array.set(puntosIndicador(x, y, lector.estado.valle, altura))
      pos.needsUpdate = true
    },
    destruir: () => {
      geometria.dispose()
      material.dispose()
    },
  }
}
