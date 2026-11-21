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
  /** Entorno PMREM del mismo cielo (para `scene.environment`). Cambia al regenerarse. */
  readonly entorno: Texture
  /** Mueve el sol del cielo visible (barato, cada fotograma). */
  fijarSol(direccion: Vector3, turbidez: number, rayleigh: number): void
  /**
   * Regenera el entorno PMREM con el sol y la atmósfera dados (caro: hay que llamarlo solo cuando
   * el sol haya cambiado de forma apreciable). Devuelve la nueva textura de entorno.
   */
  regenerarEntorno(direccion: Vector3, turbidez: number, rayleigh: number): Texture
  destruir(): void
}

function fijarUniformes(sky: Sky, direccion: Vector3, turbidez: number, rayleigh: number): void {
  const u = sky.material.uniforms
  u['sunPosition']?.value.copy(direccion)
  if (u['turbidity']) u['turbidity'].value = turbidez
  if (u['rayleigh']) u['rayleigh'].value = rayleigh
}

/**
 * Cielo físico (`Sky`) más su entorno PMREM, que ilumina los materiales PBR con el mismo sol que
 * la luz direccional. El entorno se genera al crear y solo se regenera a petición.
 */
export function crearCielo(renderer: WebGLRenderer, datos: DatosCielo = DATOS_CIELO): Cielo {
  const sol = vectorSol(datos)
  const objeto = crearSky(datos, sol)
  const escenaEntorno = new Scene()
  const skyEntorno = crearSky(datos, sol)
  escenaEntorno.add(skyEntorno)
  const pmrem = new PMREMGenerator(renderer)
  let objetivo = pmrem.fromScene(escenaEntorno, 0, 0.1, 200)
  return {
    objeto,
    get entorno() {
      return objetivo.texture
    },
    fijarSol(direccion, turbidez, rayleigh) {
      fijarUniformes(objeto, direccion, turbidez, rayleigh)
    },
    regenerarEntorno(direccion, turbidez, rayleigh) {
      fijarUniformes(skyEntorno, direccion, turbidez, rayleigh)
      const anterior = objetivo
      objetivo = pmrem.fromScene(escenaEntorno, 0, 0.1, 200)
      anterior.dispose()
      return objetivo.texture
    },
    destruir() {
      objeto.geometry.dispose()
      objeto.material.dispose()
      skyEntorno.geometry.dispose()
      skyEntorno.material.dispose()
      pmrem.dispose()
      objetivo.dispose()
    },
  }
}
