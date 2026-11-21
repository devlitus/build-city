import { DirectionalLight, HemisphereLight, type Scene } from 'three'
import { color } from './paleta'
import { vectorSol } from './cielo'
import { DATOS_CIELO } from './cielo-datos'

/** Holgura sobre el semilado del valle para la cámara de sombras (cubre el giro del sol). */
const HOLGURA_SOMBRAS = 1.25

/** Añade el sol direccional con sombras y la luz de hemisferio; `semiladoValle` (m) fija el área de sombras. */
export function añadirLuces(
  escena: Scene,
  semiladoValle = 30,
): { sol: DirectionalLight; hemisferio: HemisphereLight } {
  const areaSombras = semiladoValle * HOLGURA_SOMBRAS
  const escala = areaSombras / 30
  const hemisferio = new HemisphereLight(
    color('hemisferioCielo'),
    color('hemisferioSuelo'),
    DATOS_CIELO.intensidadHemisferio,
  )
  escena.add(hemisferio)

  const sol = new DirectionalLight(color('luzSol'), DATOS_CIELO.intensidadSol)
  // Misma dirección que el `Sky`: el sol de la escena y el del cielo coinciden.
  sol.position.copy(vectorSol().multiplyScalar(DATOS_CIELO.sol.distancia * escala))
  sol.castShadow = true
  sol.shadow.mapSize.set(2048, 2048)
  const c = sol.shadow.camera
  c.left = -areaSombras
  c.right = areaSombras
  c.top = areaSombras
  c.bottom = -areaSombras
  c.near = 1
  c.far = 90 * escala + 60
  c.updateProjectionMatrix()
  sol.shadow.bias = -0.0004
  sol.shadow.normalBias = 0.05
  escena.add(sol)
  escena.add(sol.target)

  return { sol, hemisferio }
}
