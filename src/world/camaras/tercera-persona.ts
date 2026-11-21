import type { PerspectiveCamera } from 'three'
import type { FuncionAltura } from '../terreno/altura'
import { DATOS_CAMARA, type DatosCamara } from './camara-datos'
import {
  acercar,
  alturaMinimaCamara,
  aplicarGiro,
  aplicarInclinacion,
  factorSeguimiento,
  limitarDistancia,
  posicionOrbita,
  puntoHombro,
  type Punto3,
} from './orbita'

export interface TerceraPersona {
  /**
   * Si es `false` (p. ej. con la cámara libre de depuración) ignora el ratón, suelta el
   * *pointer lock* y no toca la cámara.
   */
  habilitada: boolean
  /** Hacia dónde mira la cámara en el suelo (rad); 0 = norte, crece a la derecha. */
  readonly yaw: number
  /**
   * Mueve la cámara tras `dt` segundos siguiendo los `pies` del personaje y devuelve el punto
   * que mira (con su altura real), que usan las sombras.
   */
  actualizar(dt: number, pies: Punto3): Punto3
  destruir(): void
}

/**
 * Cámara en tercera persona sobre el hombro del personaje. Órbita con el ratón: con *pointer lock*
 * (clic en el lienzo; Esc lo suelta) o, si no se puede, arrastrando con el botón. Alt+rueda acerca
 * y aleja dentro de los límites (la rueda sola elige herramienta). Sigue con suavizado exponencial y nunca baja del terreno.
 */
export function crearTerceraPersona(
  camara: PerspectiveCamera,
  elemento: HTMLElement,
  altura: FuncionAltura,
  datos: DatosCamara = DATOS_CAMARA,
): TerceraPersona {
  let habilitada = true
  let yaw = 0
  let inclinacion = datos.inclinacion.inicial
  let distancia = datos.distancia.inicial
  let arrastrando = false
  let movido = false
  let seguido: Punto3 | null = null

  const bloqueado = (): boolean => document.pointerLockElement === elemento
  const girar = (dx: number, dy: number): void => {
    yaw = aplicarGiro(yaw, dx, datos.sensibilidad)
    inclinacion = aplicarInclinacion(
      inclinacion,
      dy,
      datos.sensibilidad,
      datos.inclinacion.min,
      datos.inclinacion.max,
    )
  }

  const alPulsar = (e: PointerEvent): void => {
    if (!habilitada) return
    arrastrando = true
    movido = false
    try {
      elemento.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura el arrastre sigue funcionando mientras el puntero esté sobre el lienzo.
    }
  }
  const alSoltar = (e: PointerEvent): void => {
    arrastrando = false
    if (elemento.hasPointerCapture(e.pointerId)) elemento.releasePointerCapture(e.pointerId)
  }
  const alMover = (e: PointerEvent): void => {
    if (!habilitada) return
    if (bloqueado()) {
      girar(e.movementX, e.movementY)
    } else if (arrastrando) {
      if (e.movementX !== 0 || e.movementY !== 0) movido = true
      girar(e.movementX, e.movementY)
    }
  }
  const alHacerClic = (): void => {
    // Un clic limpio captura el ratón; tras arrastrar no (el arrastre ya orbitó).
    if (!habilitada || bloqueado() || movido) return
    try {
      // En navegadores sin soporte devuelve `undefined`; si se rechaza, queda el arrastre.
      const r = elemento.requestPointerLock() as Promise<void> | undefined
      r?.catch(() => undefined)
    } catch {
      // Sin pointer lock: se orbita arrastrando.
    }
  }
  const alRodar = (e: WheelEvent): void => {
    // Solo con Alt: la rueda sola elige herramienta (`juego/entrada.ts`).
    if (!habilitada || !e.altKey) return
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1 / datos.pasoZoom : datos.pasoZoom
    distancia = limitarDistancia(distancia, factor, datos.distancia.min, datos.distancia.max)
  }

  elemento.addEventListener('pointerdown', alPulsar)
  elemento.addEventListener('pointerup', alSoltar)
  elemento.addEventListener('pointercancel', alSoltar)
  elemento.addEventListener('pointermove', alMover)
  elemento.addEventListener('click', alHacerClic)
  elemento.addEventListener('wheel', alRodar, { passive: false })

  return {
    get habilitada() {
      return habilitada
    },
    set habilitada(valor) {
      habilitada = valor
      if (!valor) {
        arrastrando = false
        if (bloqueado()) document.exitPointerLock()
      }
    },
    get yaw() {
      return yaw
    },
    actualizar(dt, pies) {
      // Deshabilitada, el punto mirado sigue exacto: al volver no hay barrido desde lejos.
      const f = habilitada && seguido ? factorSeguimiento(dt, datos.rapidezSeguimiento) : 1
      seguido = seguido
        ? {
            x: acercar(seguido.x, pies.x, f),
            y: acercar(seguido.y, pies.y, f),
            z: acercar(seguido.z, pies.z, f),
          }
        : pies
      const mirado = puntoHombro(seguido, yaw, datos.alturaHombro, datos.desplazamientoLateral)
      if (!habilitada) return mirado
      const p = posicionOrbita(mirado, yaw, inclinacion, distancia)
      const y = alturaMinimaCamara(p.y, altura(p.x, p.z), datos.margenTerreno)
      camara.position.set(p.x, y, p.z)
      camara.lookAt(mirado.x, mirado.y, mirado.z)
      return mirado
    },
    destruir() {
      habilitada = false
      if (bloqueado()) document.exitPointerLock()
      elemento.removeEventListener('pointerdown', alPulsar)
      elemento.removeEventListener('pointerup', alSoltar)
      elemento.removeEventListener('pointercancel', alSoltar)
      elemento.removeEventListener('pointermove', alMover)
      elemento.removeEventListener('click', alHacerClic)
      elemento.removeEventListener('wheel', alRodar)
    },
  }
}
