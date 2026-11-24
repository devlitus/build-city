import { Color, DoubleSide, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three'
import type { Valle } from '../../core'
import type { ResumenTrazo } from '../../juego/trazo-plano'
import { color } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import { casillaAMetros, ladoCasillas } from '../terreno/coordenadas'
import { DATOS_PLANO } from './plano-datos'

export interface VistaPreviaTrazo {
  readonly objeto: Object3D
  /** Pinta las casillas del trazo (verdes las válidas, rojas las inválidas) o lo oculta con `null`. */
  mostrar(resumen: ResumenTrazo | null): void
  destruir(): void
}

/**
 * Vista previa del trazo de vallas y caminos: una sola `InstancedMesh` de casillas planas, con
 * color por instancia (válida, inválida o a quitar). No decide nada de reglas: pinta el veredicto
 * que le da `resumenTrazo`.
 */
export function crearVistaPreviaTrazo(valle: Valle, altura: FuncionAltura): VistaPreviaTrazo {
  // Un trazo en L nunca pasa de lado + lado - 1 casillas.
  const capacidad = ladoCasillas(valle) * 2
  const geometria = new PlaneGeometry(0.92, 0.92)
  geometria.rotateX(-Math.PI / 2)
  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: DATOS_PLANO.trazo.opacidad,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  })
  const malla = new InstancedMesh(geometria, material, capacidad)
  malla.name = 'trazo-vista-previa'
  malla.frustumCulled = false
  malla.renderOrder = 2
  malla.visible = false
  malla.count = 0
  const cValida = new Color(color('trazoValido'))
  const cInvalida = new Color(color('trazoInvalido'))
  const cQuitar = new Color(color('trazoQuitar'))
  const auxiliar = new Object3D()
  let ultima: ResumenTrazo | null = null

  return {
    objeto: malla,
    mostrar(resumen) {
      if (resumen === ultima) return
      ultima = resumen
      if (!resumen) {
        malla.visible = false
        malla.count = 0
        return
      }
      const n = Math.min(capacidad, resumen.casillas.length)
      for (let i = 0; i < n; i++) {
        const c = resumen.casillas[i]
        if (!c) continue
        const p = casillaAMetros(c.x, c.y, valle)
        auxiliar.position.set(p.x, altura(p.x, p.z) + DATOS_PLANO.trazo.separacion, p.z)
        auxiliar.updateMatrix()
        malla.setMatrixAt(i, auxiliar.matrix)
        malla.setColorAt(i, !c.valida ? cInvalida : resumen.quitar ? cQuitar : cValida)
      }
      malla.count = n
      malla.instanceMatrix.needsUpdate = true
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true
      malla.visible = n > 0
    },
    destruir() {
      geometria.dispose()
      material.dispose()
      malla.dispose()
    },
  }
}
