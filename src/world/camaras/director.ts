import type { PerspectiveCamera } from 'three'
import type { ModoJuego } from '../../core'
import type { FuncionAltura } from '../terreno/altura'
import { DATOS_CAMARA, type DatosCamara } from './camara-datos'
import { alturaMinimaCamara, type Punto3 } from './orbita'
import type { CamaraPlano } from './plano'
import type { TerceraPersona } from './tercera-persona'
import {
  avanzarTransicion,
  invertirTransicion,
  iniciarTransicion,
  poseDeTransicion,
  transicionTerminada,
  type Pose,
  type Transicion,
} from './transicion'

export interface DirectorCamara {
  /** Si es `false` (cámara libre de depuración) no toca la cámara. */
  seguimiento: boolean
  /** Una vez por fotograma; devuelve el punto que mira la cámara (para las sombras). */
  actualizar(dt: number, pies: Punto3, modo: ModoJuego): Punto3
}

/**
 * Elige quién manda en la cámara según el modo del juego y dirige la transición entre la
 * tercera persona (Vida) y la cámara de plano. El cambio de modo se detecta aquí, en el dibujo.
 */
export function crearDirectorCamara(
  camara: PerspectiveCamera,
  tercera: TerceraPersona,
  plano: CamaraPlano,
  altura: FuncionAltura,
  datos: DatosCamara = DATOS_CAMARA,
): DirectorCamara {
  let seguimiento = true
  let modoPrevio: ModoJuego = 'vida'
  let transicion: Transicion | null = null
  // Última pose que la tercera persona dio a la cámara: punto de partida sin salto hacia el Plano.
  let ultimaPoseVida: Pose = tercera.pose

  const poseDe = (modo: ModoJuego): Pose => (modo === 'plano' ? plano.pose() : tercera.pose)

  const aplicar = (pose: Pose): void => {
    const { posicion: p, objetivo: o } = pose
    const y = alturaMinimaCamara(p.y, altura(p.x, p.z), datos.margenTerreno)
    camara.position.set(p.x, y, p.z)
    camara.lookAt(o.x, o.y, o.z)
  }

  return {
    get seguimiento() {
      return seguimiento
    },
    set seguimiento(valor) {
      seguimiento = valor
    },
    actualizar(dt, pies, modo) {
      plano.habilitada = false
      // En Vida estable la tercera persona mueve la cámara y sigue con suavizado; en cualquier otro
      // caso solo calcula su pose (deshabilitada, el seguimiento es exacto).
      const vidaEstable = modo === modoPrevio && !transicion && modo === 'vida'
      tercera.habilitada = vidaEstable && seguimiento
      const mirado = tercera.actualizar(dt, pies)
      if (vidaEstable) {
        ultimaPoseVida = tercera.pose
        return mirado
      }

      if (modo !== modoPrevio) {
        if (transicion) {
          // A mitad: invierte desde donde está (la pose actual hacia el destino anterior).
          transicion = invertirTransicion(transicion, poseDe(modoPrevio), datos.transicionDuracion)
        } else {
          if (modo === 'plano') plano.entrar(pies, tercera.yaw)
          transicion = iniciarTransicion(
            modoPrevio === 'vida' ? ultimaPoseVida : poseDe(modoPrevio),
            datos.transicionDuracion,
          )
        }
        modoPrevio = modo
      }

      if (transicion) {
        transicion = avanzarTransicion(transicion, dt)
        const pose = poseDeTransicion(transicion, poseDe(modo))
        if (seguimiento) aplicar(pose)
        if (transicionTerminada(transicion)) transicion = null
        return pose.objetivo
      }

      if (modo === 'plano') {
        plano.habilitada = seguimiento
        plano.actualizar()
        return plano.pose().objetivo
      }
      return mirado
    },
  }
}
