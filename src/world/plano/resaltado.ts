import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
} from 'three'
import type { Valle } from '../../core'
import { color } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import { ladoMetros } from '../terreno/coordenadas'

/** Separación sobre el suelo (m) para que el plano no parpadee con el terreno. */
const SEPARACION = 0.12
const OPACIDAD = 0.35

export interface ResaltadoParcela {
  readonly objeto: Object3D
  /** Muestra la parcela `indice` (índice en `valle.parcelas`) o lo oculta con `null`. */
  mostrar(indice: number | null): void
  destruir(): void
}

/**
 * Plano translúcido que sigue el relieve de la parcela indicada (una malla de 1 m por celda).
 * La geometría se reutiliza: solo se reescriben las posiciones al cambiar de parcela.
 */
export function crearResaltadoParcela(valle: Valle, altura: FuncionAltura): ResaltadoParcela {
  const celdas = valle.casillasPorParcela
  const n = celdas + 1
  const mitad = ladoMetros(valle) / 2
  const posiciones = new Float32Array(n * n * 3)
  const indices = new Uint16Array(celdas * celdas * 6)
  let t = 0
  for (let j = 0; j < celdas; j++)
    for (let i = 0; i < celdas; i++) {
      const a = j * n + i
      indices.set([a, a + n, a + n + 1, a, a + n + 1, a + 1], t)
      t += 6
    }
  const geometria = new BufferGeometry()
  const atributo = new BufferAttribute(posiciones, 3)
  geometria.setAttribute('position', atributo)
  geometria.setIndex(new BufferAttribute(indices, 1))

  const material = new MeshBasicMaterial({
    color: color('resaltadoParcela'),
    transparent: true,
    opacity: OPACIDAD,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  })
  const malla = new Mesh(geometria, material)
  malla.name = 'resaltado-parcela'
  malla.frustumCulled = false
  malla.renderOrder = 2
  malla.visible = false
  let actual: number | null = null

  return {
    objeto: malla,
    mostrar(indice) {
      if (indice === actual) return
      actual = indice
      malla.visible = indice !== null
      if (indice === null) return
      const fila = Math.floor(indice / valle.parcelasPorLado)
      const columna = indice % valle.parcelasPorLado
      const x0 = columna * celdas - mitad
      const z0 = fila * celdas - mitad
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const x = x0 + i
          const z = z0 + j
          posiciones.set([x, altura(x, z) + SEPARACION, z], (j * n + i) * 3)
        }
      atributo.needsUpdate = true
      geometria.computeBoundingSphere()
    },
    destruir() {
      geometria.dispose()
      material.dispose()
    },
  }
}
