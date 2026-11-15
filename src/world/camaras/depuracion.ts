import { Euler, Vector3, type PerspectiveCamera } from 'three'

/**
 * Cámara libre de depuración. Solo se carga con `import.meta.env.DEV`
 * (nunca entra en la build de producción).
 *
 * Teclas: F2 activa/desactiva · WASD mover · E/Espacio subir · Q/Ctrl bajar ·
 * Mayús rápido · arrastrar con el ratón para mirar · rueda para cambiar la velocidad.
 *
 * Las velocidades son solo de depuración (no son balance de juego), por eso
 * viven aquí como constantes con nombre y no en `data/`.
 */
const TECLA_ALTERNAR = 'F2'
const VELOCIDAD_INICIAL = 30 // m/s
const VELOCIDAD_MIN = 2
const VELOCIDAD_MAX = 400
const MULTIPLICADOR_RAPIDO = 4
const FACTOR_RUEDA = 1.1
const SENSIBILIDAD_RATON = 0.0025 // rad/píxel
const LIMITE_CABECEO = Math.PI / 2 - 0.01

export interface CamaraDepuracion {
  readonly activa: boolean
  alternar(): void
  /** Mueve la cámara según las teclas pulsadas; `dt` en segundos. */
  actualizar(dt: number): void
  destruir(): void
}

/** Crea la cámara libre sobre la cámara de la escena; al desactivarla restaura su pose. */
export function crearCamaraDepuracion(
  camara: PerspectiveCamera,
  elemento: HTMLElement,
): CamaraDepuracion {
  const pulsadas = new Set<string>()
  const euler = new Euler(0, 0, 0, 'YXZ')
  const adelante = new Vector3()
  const derecha = new Vector3()
  const guardadaPos = new Vector3()
  const guardadaRot = camara.quaternion.clone()
  let activa = false
  let arrastrando = false
  let velocidad = VELOCIDAD_INICIAL

  const activar = (): void => {
    guardadaPos.copy(camara.position)
    guardadaRot.copy(camara.quaternion)
    euler.setFromQuaternion(camara.quaternion)
    activa = true
  }
  const desactivar = (): void => {
    camara.position.copy(guardadaPos)
    camara.quaternion.copy(guardadaRot)
    activa = false
    arrastrando = false
    pulsadas.clear()
  }
  const alternar = (): void => {
    if (activa) desactivar()
    else activar()
  }

  const alAbajo = (e: KeyboardEvent): void => {
    if (e.code === TECLA_ALTERNAR) {
      e.preventDefault()
      alternar()
      return
    }
    if (activa) {
      pulsadas.add(e.code)
      if (e.code === 'Space') e.preventDefault()
    }
  }
  const alArriba = (e: KeyboardEvent): void => {
    pulsadas.delete(e.code)
  }
  const alPulsar = (e: PointerEvent): void => {
    if (!activa) return
    arrastrando = true
    elemento.setPointerCapture(e.pointerId)
  }
  const alSoltar = (e: PointerEvent): void => {
    arrastrando = false
    if (elemento.hasPointerCapture(e.pointerId)) elemento.releasePointerCapture(e.pointerId)
  }
  const alMover = (e: PointerEvent): void => {
    if (!activa || !arrastrando) return
    euler.y -= e.movementX * SENSIBILIDAD_RATON
    euler.x -= e.movementY * SENSIBILIDAD_RATON
    euler.x = Math.max(-LIMITE_CABECEO, Math.min(LIMITE_CABECEO, euler.x))
    camara.quaternion.setFromEuler(euler)
  }
  const alRodar = (e: WheelEvent): void => {
    if (!activa) return
    e.preventDefault()
    const f = e.deltaY < 0 ? FACTOR_RUEDA : 1 / FACTOR_RUEDA
    velocidad = Math.max(VELOCIDAD_MIN, Math.min(VELOCIDAD_MAX, velocidad * f))
  }
  const alPerderFoco = (): void => {
    pulsadas.clear()
    arrastrando = false
  }

  window.addEventListener('keydown', alAbajo)
  window.addEventListener('keyup', alArriba)
  window.addEventListener('blur', alPerderFoco)
  elemento.addEventListener('pointerdown', alPulsar)
  elemento.addEventListener('pointerup', alSoltar)
  elemento.addEventListener('pointercancel', alSoltar)
  elemento.addEventListener('pointermove', alMover)
  elemento.addEventListener('wheel', alRodar, { passive: false })

  const eje = (mas: string[], menos: string[]): number =>
    (mas.some((k) => pulsadas.has(k)) ? 1 : 0) - (menos.some((k) => pulsadas.has(k)) ? 1 : 0)

  return {
    get activa() {
      return activa
    },
    alternar,
    actualizar: (dt) => {
      if (!activa) return
      const avance = eje(['KeyW'], ['KeyS'])
      const lateral = eje(['KeyD'], ['KeyA'])
      const vertical = eje(['KeyE', 'Space'], ['KeyQ', 'ControlLeft', 'ControlRight'])
      if (avance === 0 && lateral === 0 && vertical === 0) return
      const rapido = pulsadas.has('ShiftLeft') || pulsadas.has('ShiftRight')
      const paso = velocidad * (rapido ? MULTIPLICADOR_RAPIDO : 1) * dt
      camara.getWorldDirection(adelante)
      derecha.crossVectors(adelante, camara.up).normalize()
      camara.position
        .addScaledVector(adelante, avance * paso)
        .addScaledVector(derecha, lateral * paso)
        .addScaledVector(camara.up, vertical * paso)
    },
    destruir: () => {
      if (activa) desactivar()
      window.removeEventListener('keydown', alAbajo)
      window.removeEventListener('keyup', alArriba)
      window.removeEventListener('blur', alPerderFoco)
      elemento.removeEventListener('pointerdown', alPulsar)
      elemento.removeEventListener('pointerup', alSoltar)
      elemento.removeEventListener('pointercancel', alSoltar)
      elemento.removeEventListener('pointermove', alMover)
      elemento.removeEventListener('wheel', alRodar)
    },
  }
}
