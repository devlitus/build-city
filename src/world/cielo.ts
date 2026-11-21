import { PMREMGenerator, Scene, Vector3, type Texture, type WebGLRenderer } from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { DATOS_CIELO, direccionDelSol, type DatosCielo } from './cielo-datos'

/** Dirección unitaria hacia el sol de la escena, según `data/cielo.json`. */
export function vectorSol(datos: DatosCielo = DATOS_CIELO): Vector3 {
  const d = direccionDelSol(datos.sol.elevacion, datos.sol.azimut)
  return new Vector3(d.x, d.y, d.z)
}

function crearSky(datos: DatosCielo, sol: Vector3): Sky {
  const sky = new Sky()
  sky.scale.setScalar(datos.cielo.escala)
  const u = sky.material.uniforms
  u['sunPosition']?.value.copy(sol)
  if (u['turbidity']) u['turbidity'].value = datos.cielo.turbidez
  if (u['rayleigh']) u['rayleigh'].value = datos.cielo.rayleigh
  if (u['mieCoefficient']) u['mieCoefficient'].value = datos.cielo.mie
  if (u['mieDirectionalG']) u['mieDirectionalG'].value = datos.cielo.mieDireccional
  return sky
}

export interface Cielo {
  /** Cúpula visible: se añade a la escena. */
  readonly objeto: Sky
  /** Entorno PMREM del mismo cielo (para `scene.environment`). */
  readonly entorno: Texture
  destruir(): void
}

/**
 * Cielo físico (`Sky`) más su entorno PMREM, generado una sola vez (no por fotograma), que
 * ilumina los materiales PBR con el mismo sol que la luz direccional.
 */
export function crearCielo(renderer: WebGLRenderer, datos: DatosCielo = DATOS_CIELO): Cielo {
  const sol = vectorSol(datos)
  const objeto = crearSky(datos, sol)
  const escenaEntorno = new Scene()
  const skyEntorno = crearSky(datos, sol)
  escenaEntorno.add(skyEntorno)
  const pmrem = new PMREMGenerator(renderer)
  const objetivo = pmrem.fromScene(escenaEntorno, 0, 0.1, 200)
  pmrem.dispose()
  skyEntorno.geometry.dispose()
  skyEntorno.material.dispose()
  return {
    objeto,
    entorno: objetivo.texture,
    destruir() {
      objeto.geometry.dispose()
      objeto.material.dispose()
      objetivo.dispose()
    },
  }
}
