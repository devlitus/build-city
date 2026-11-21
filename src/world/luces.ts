import { DirectionalLight, HemisphereLight, type Scene } from 'three'
import { color } from './paleta'
import { vectorSol } from './cielo'
import { DATOS_CIELO } from './cielo-datos'

/**
 * Añade el sol direccional y la luz de hemisferio. La cámara de sombras (área, mapa, bias) y la
 * posición final del sol las gestiona `crearSombras`, que sigue al objetivo de la cámara.
 */
export function añadirLuces(escena: Scene): { sol: DirectionalLight; hemisferio: HemisphereLight } {
  const hemisferio = new HemisphereLight(
    color('hemisferioCielo'),
    color('hemisferioSuelo'),
    DATOS_CIELO.intensidadHemisferio,
  )
  escena.add(hemisferio)

  const sol = new DirectionalLight(color('luzSol'), DATOS_CIELO.intensidadSol)
  // Misma dirección que el `Sky`: el sol de la escena y el del cielo coinciden.
  sol.position.copy(vectorSol().multiplyScalar(DATOS_CIELO.sol.distancia))
  sol.castShadow = true
  escena.add(sol)
  escena.add(sol.target)

  return { sol, hemisferio }
}
