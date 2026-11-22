import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { color } from '../paleta'
import { escalaParticula, type SistemaParticulas } from './particulas'

export interface MallaParticulas {
  readonly objeto: InstancedMesh
  /** Vuelca el estado del sistema a las instancias. Llamar cada fotograma. */
  sincronizar(): void
  destruir(): void
}

/**
 * Dibuja un `SistemaParticulas` con un único `InstancedMesh` de cubitos (capacidad fija, un solo
 * dibujado). Los colores salen de la paleta por nombre.
 */
export function crearMallaParticulas(
  sistema: SistemaParticulas,
  capacidad: number,
): MallaParticulas {
  const geometria = new BoxGeometry(1, 1, 1)
  const material = new MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true })
  const malla = new InstancedMesh(geometria, material, capacidad)
  malla.name = 'particulas'
  malla.count = 0
  malla.frustumCulled = false // las instancias se mueven: la esfera inicial no vale
  malla.castShadow = false
  malla.receiveShadow = false

  const matriz = new Matrix4()
  const posicion = new Vector3()
  const escala = new Vector3()
  const giro = new Quaternion()
  const eje = new Vector3(1, 1, 0).normalize()
  const tono = new Color()
  const colores = new Map<string, Color>()

  return {
    objeto: malla,
    sincronizar: () => {
      const vivas = sistema.vivas
      malla.count = vivas.length
      vivas.forEach((p, i) => {
        const e = p.tamano * escalaParticula(p.edad, p.vida)
        posicion.set(p.x, p.y, p.z)
        escala.set(e, e, e)
        // Giran con la edad para que no parezcan cubos quietos.
        giro.setFromAxisAngle(eje, p.edad * 12)
        matriz.compose(posicion.set(p.x, p.y, p.z), giro, escala)
        malla.setMatrixAt(i, matriz)
        let c = colores.get(p.color)
        if (!c) {
          c = tono.clone().set(color(p.color))
          colores.set(p.color, c)
        }
        malla.setColorAt(i, c)
      })
      malla.instanceMatrix.needsUpdate = true
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    },
    destruir: () => {
      malla.removeFromParent()
      malla.dispose()
      geometria.dispose()
      material.dispose()
    },
  }
}
