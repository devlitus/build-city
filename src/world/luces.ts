import { DirectionalLight, HemisphereLight, type Scene } from 'three'

// Colores provisionales de las luces: se sustituyen por la paleta en M0-T06.
const COLORES_LUCES_PROVISIONALES = {
  sol: 0xfff1d6,
  cielo: 0xbcdcec,
  suelo: 0x8a7a5a,
} as const

/** Semilado del área cubierta por la cámara de sombras (unidades de mundo). */
const AREA_SOMBRAS = 30

/** Añade el sol direccional con sombras y la luz de hemisferio. */
export function añadirLuces(escena: Scene): { sol: DirectionalLight; hemisferio: HemisphereLight } {
  const hemisferio = new HemisphereLight(
    COLORES_LUCES_PROVISIONALES.cielo,
    COLORES_LUCES_PROVISIONALES.suelo,
    1.0,
  )
  escena.add(hemisferio)

  const sol = new DirectionalLight(COLORES_LUCES_PROVISIONALES.sol, 2.2)
  sol.position.set(20, 30, 14)
  sol.castShadow = true
  sol.shadow.mapSize.set(2048, 2048)
  const c = sol.shadow.camera
  c.left = -AREA_SOMBRAS
  c.right = AREA_SOMBRAS
  c.top = AREA_SOMBRAS
  c.bottom = -AREA_SOMBRAS
  c.near = 1
  c.far = 90
  c.updateProjectionMatrix()
  sol.shadow.bias = -0.0004
  sol.shadow.normalBias = 0.05
  escena.add(sol)
  escena.add(sol.target)

  return { sol, hemisferio }
}
