/**
 * Transición de cámara entre Vida y Plano (lógica pura, sin three.js).
 *
 * La transición guarda solo la pose de partida y el progreso; el destino se pasa en cada
 * fotograma, porque puede moverse (la cámara de tercera persona sigue al personaje). Es
 * interrumpible: `invertir` parte de la pose actual, así que no hay saltos.
 */

export interface Punto {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Pose de cámara: dónde está y qué punto mira. */
export interface Pose {
  readonly posicion: Punto
  readonly objetivo: Punto
}

export interface Transicion {
  /** Pose de la que parte. */
  readonly desde: Pose
  /** Progreso lineal en [0, 1]. */
  readonly progreso: number
  /** Duración total (s) de este tramo. */
  readonly duracion: number
}

/** Fracción mínima de la duración completa que dura una inversión (evita tirones por tramos ínfimos). */
const FRACCION_MINIMA = 0.15

const acotar01 = (t: number): number => (Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0)

/** Curva suave (smoothstep): 0 en t=0, 1 en t=1, pendiente nula en los extremos, monótona. */
export function suavizado(t: number): number {
  const x = acotar01(t)
  return x * x * (3 - 2 * x)
}

const mezclar = (a: number, b: number, k: number): number => a + (b - a) * k

function mezclarPunto(a: Punto, b: Punto, k: number): Punto {
  return { x: mezclar(a.x, b.x, k), y: mezclar(a.y, b.y, k), z: mezclar(a.z, b.z, k) }
}

/** Mezcla dos poses con `k` en [0, 1] (0 = `a`, 1 = `b`). */
export function mezclarPose(a: Pose, b: Pose, k: number): Pose {
  return {
    posicion: mezclarPunto(a.posicion, b.posicion, k),
    objetivo: mezclarPunto(a.objetivo, b.objetivo, k),
  }
}

/** Empieza una transición desde `desde` con la duración dada (s). */
export function iniciarTransicion(desde: Pose, duracion: number): Transicion {
  return { desde, progreso: 0, duracion: duracion > 0 ? duracion : Number.EPSILON }
}

/** Avanza `dt` segundos. */
export function avanzarTransicion(t: Transicion, dt: number): Transicion {
  if (!(dt > 0)) return t
  return { ...t, progreso: acotar01(t.progreso + dt / t.duracion) }
}

export function transicionTerminada(t: Transicion): boolean {
  return t.progreso >= 1
}

/** Pose actual de la transición hacia `destino` (la pose viva del destino en este fotograma). */
export function poseDeTransicion(t: Transicion, destino: Pose): Pose {
  return mezclarPose(t.desde, destino, suavizado(t.progreso))
}

/**
 * Invierte la transición en curso: la nueva parte de la pose actual (calculada hacia
 * `destinoActual`) y vuelve al origen. Dura proporcionalmente a lo recorrido, con un mínimo.
 */
export function invertirTransicion(
  t: Transicion,
  destinoActual: Pose,
  duracionCompleta: number,
): Transicion {
  const fraccion = Math.max(FRACCION_MINIMA, t.progreso)
  return iniciarTransicion(poseDeTransicion(t, destinoActual), duracionCompleta * fraccion)
}
