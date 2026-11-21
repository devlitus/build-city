import {
  Color,
  type DirectionalLight,
  type Fog,
  type HemisphereLight,
  type Scene,
  Vector3,
} from 'three'
import type { WebGLRenderer } from 'three'
import type { Cielo } from './cielo'
import { anguloEntre, DATOS_LUZ, luzDelDia, type Vec3 } from './luz-dia'

export interface LuzEscena {
  /** Aplica la luz de unos minutos del juego a sol, hemisferio, niebla, cielo y exposición. */
  actualizar(minutoDelDia: number): void
}

/**
 * Aplica `luzDelDia` a la escena (solo dibuja; no toca el estado). El entorno PMREM es caro, así
 * que se regenera únicamente cuando el sol real se ha movido más de `umbralEntornoGrados` desde la
 * última vez; entre regeneraciones solo cambia `environmentIntensity` (gratis). Los saltos de
 * entorno quedan así acotados a unos pocos grados de sol.
 */
export function crearLuzEscena(
  escena: Scene,
  renderer: WebGLRenderer,
  cielo: Cielo,
  luces: { sol: DirectionalLight; hemisferio: HemisphereLight },
): LuzEscena {
  const distancia = luces.sol.position.length()
  const dirSol = new Vector3()
  const colorTmp = new Color()
  let ultimoEntorno: Vec3 | null = null

  return {
    actualizar(minutoDelDia) {
      const l = luzDelDia(minutoDelDia)
      dirSol.set(l.direccionSol.x, l.direccionSol.y, l.direccionSol.z)
      cielo.fijarSol(dirSol, l.turbidez, l.rayleigh)
      if (
        ultimoEntorno === null ||
        anguloEntre(ultimoEntorno, l.direccionSol) > DATOS_LUZ.umbralEntornoGrados
      ) {
        escena.environment = cielo.regenerarEntorno(dirSol, l.turbidez, l.rayleigh)
        ultimoEntorno = l.direccionSol
      }
      escena.environmentIntensity = l.intensidadEntorno

      const d = l.direccionLuz
      luces.sol.position.set(d.x * distancia, d.y * distancia, d.z * distancia)
      luces.sol.color.setHex(l.colorSol)
      luces.sol.intensity = l.intensidadSol
      luces.hemisferio.color.setHex(l.hemisferioCielo)
      luces.hemisferio.groundColor.setHex(l.hemisferioSuelo)
      luces.hemisferio.intensity = l.intensidadHemisferio
      ;(escena.fog as Fog).color.copy(colorTmp.setHex(l.colorNiebla))
      renderer.toneMappingExposure = l.exposicion
    },
  }
}
