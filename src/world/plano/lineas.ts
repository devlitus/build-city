import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  type Object3D,
} from 'three'

export interface LineasDinamicas {
  readonly objeto: Object3D
  /** Sustituye los vértices (pares de puntos x, y, z). */
  fijar(vertices: Float32Array): void
  destruir(): void
}

/** Un único `LineSegments` con color y opacidad fijos, sin niebla. */
export function crearLineas(
  nombre: string,
  color: number,
  opacidad: number,
  orden: number,
): LineasDinamicas {
  const geometria = new BufferGeometry()
  const material = new LineBasicMaterial({
    color,
    transparent: opacidad < 1,
    opacity: opacidad,
    depthWrite: false,
    fog: false,
  })
  const lineas = new LineSegments(geometria, material)
  lineas.name = nombre
  lineas.frustumCulled = false
  lineas.renderOrder = orden
  return {
    objeto: lineas,
    fijar(vertices) {
      geometria.setAttribute('position', new BufferAttribute(vertices, 3))
      geometria.setDrawRange(0, vertices.length / 3)
    },
    destruir() {
      geometria.dispose()
      material.dispose()
    },
  }
}
