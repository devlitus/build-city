import type { PerspectiveCamera } from 'three'
import type { FuncionAltura } from '../terreno/altura'
import { DATOS_CAMARA, type DatosCamara } from './camara-datos'
import {
  alturaMinimaCamara,
  aplicarGiro,
  aplicarInclinacion,
  limitarDistancia,
  posicionOrbita,
  type Punto3,
} from './orbita'
import type { Pose } from './transicion'

export interface CamaraPlano {
  /** Si es `false` ignora el ratón y no toca la cámara. */
  habilitada: boolean
  /** Coloca el objetivo (sobre el terreno) y el giro al entrar en Modo Plano. */
  entrar(pies: Punto3, yaw: number): void
  /** Pose actual (posición y punto mirado), sin tocar la cámara. */
  pose(): Pose
  /** Aplica la pose a la cámara si está habilitada. */
  actualizar(): void
  destruir(): void
}

/**
 * Cámara de plano: órbita alrededor de un punto del valle, vista desde arriba. Rueda = zoom,
 * arrastrar con el botón derecho = girar e inclinar (con límites). El clic izquierdo queda libre
 * para seleccionar parcelas.
 */
export function crearCamaraPlano(
  camara: PerspectiveCamera,
  elemento: HTMLElement,
  altura: FuncionAltura,
  datos: DatosCamara = DATOS_CAMARA,
): CamaraPlano {
  const cfg = datos.plano
  let habilitada = false
  let objetivo: Punto3 = { x: 0, y: 0, z: 0 }
  let yaw = 0
  let inclinacion = cfg.inclinacion.inicial
  let distancia = cfg.distancia.inicial
  let girando = false

  const BOTON_DERECHO = 2

  const calcularPose = (): Pose => {
    const p = posicionOrbita(objetivo, yaw, inclinacion, distancia)
    const y = alturaMinimaCamara(p.y, altura(p.x, p.z), datos.margenTerreno)
    return { posicion: { x: p.x, y, z: p.z }, objetivo }
  }

  const alPulsar = (e: PointerEvent): void => {
    if (!habilitada || e.button !== BOTON_DERECHO) return
    girando = true
    try {
      elemento.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura el giro sigue mientras el puntero esté sobre el lienzo.
    }
  }
  const alSoltar = (e: PointerEvent): void => {
    if (e.button !== BOTON_DERECHO && e.type !== 'pointercancel') return
    girando = false
    if (elemento.hasPointerCapture(e.pointerId)) elemento.releasePointerCapture(e.pointerId)
  }
  const alMover = (e: PointerEvent): void => {
    if (!habilitada || !girando) return
    yaw = aplicarGiro(yaw, e.movementX, datos.sensibilidad)
    inclinacion = aplicarInclinacion(
      inclinacion,
      e.movementY,
      datos.sensibilidad,
      cfg.inclinacion.min,
      cfg.inclinacion.max,
    )
  }
  const alRodar = (e: WheelEvent): void => {
    if (!habilitada) return
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1 / datos.pasoZoom : datos.pasoZoom
    distancia = limitarDistancia(distancia, factor, cfg.distancia.min, cfg.distancia.max)
  }
  const alMenuContextual = (e: Event): void => {
    if (habilitada) e.preventDefault()
  }

  elemento.addEventListener('pointerdown', alPulsar)
  elemento.addEventListener('pointerup', alSoltar)
  elemento.addEventListener('pointercancel', alSoltar)
  elemento.addEventListener('pointermove', alMover)
  elemento.addEventListener('wheel', alRodar, { passive: false })
  elemento.addEventListener('contextmenu', alMenuContextual)

  return {
    get habilitada() {
      return habilitada
    },
    set habilitada(valor) {
      habilitada = valor
      if (!valor) girando = false
    },
    entrar(pies, yawInicial) {
      objetivo = { x: pies.x, y: altura(pies.x, pies.z), z: pies.z }
      yaw = yawInicial
    },
    pose: calcularPose,
    actualizar() {
      if (!habilitada) return
      const { posicion, objetivo: o } = calcularPose()
      camara.position.set(posicion.x, posicion.y, posicion.z)
      camara.lookAt(o.x, o.y, o.z)
    },
    destruir() {
      habilitada = false
      elemento.removeEventListener('pointerdown', alPulsar)
      elemento.removeEventListener('pointerup', alSoltar)
      elemento.removeEventListener('pointercancel', alSoltar)
      elemento.removeEventListener('pointermove', alMover)
      elemento.removeEventListener('wheel', alRodar)
      elemento.removeEventListener('contextmenu', alMenuContextual)
    },
  }
}
