/**
 * Lógica pura de la animación del granjero (sin three.js): qué clips suenan y a qué ritmo,
 * suavizado de la velocidad y giro. Los números salen de `data/animacion-personaje.json`.
 */
import type { DatosAnimacionPersonaje } from './animacion-datos'

export interface PesosAnimacion {
  readonly reposo: number
  readonly andar: number
  readonly correr: number
}

export interface EleccionAnimacion {
  readonly pesos: PesosAnimacion
  /** Multiplicador de velocidad de reproducción (cadencia). 1 en Reposo. */
  readonly timeScale: number
}

type Parametros = Pick<
  DatosAnimacionPersonaje,
  'velocidadAndar' | 'velocidadCorrer' | 'umbralParado' | 'ritmo'
>

const limitar = (x: number, min: number, max: number): number => Math.min(max, Math.max(min, x))

/**
 * Pesos de Reposo/Andar/Correr (suman 1) y `timeScale` según la velocidad horizontal (m/s).
 * Parado: Reposo puro. Entre el umbral y andar: Reposo→Andar. Entre andar y correr: Andar→Correr.
 * El ritmo es la velocidad dividida por la de referencia de los clips (mezclada con los pesos).
 */
export function elegirAnimacion(velocidad: number, p: Parametros): EleccionAnimacion {
  const v = Math.max(0, velocidad)
  if (v <= p.umbralParado) return { pesos: { reposo: 1, andar: 0, correr: 0 }, timeScale: 1 }

  let pesos: PesosAnimacion
  let referencia: number
  if (v < p.velocidadAndar) {
    const t = (v - p.umbralParado) / (p.velocidadAndar - p.umbralParado)
    pesos = { reposo: 1 - t, andar: t, correr: 0 }
    referencia = p.velocidadAndar
  } else if (v < p.velocidadCorrer) {
    const t = (v - p.velocidadAndar) / (p.velocidadCorrer - p.velocidadAndar)
    pesos = { reposo: 0, andar: 1 - t, correr: t }
    referencia = p.velocidadAndar + t * (p.velocidadCorrer - p.velocidadAndar)
  } else {
    pesos = { reposo: 0, andar: 0, correr: 1 }
    referencia = p.velocidadCorrer
  }
  return { pesos, timeScale: limitar(v / referencia, p.ritmo.minimo, p.ritmo.maximo) }
}

/** Velocidad horizontal (m/s) a partir del desplazamiento entre dos fotogramas. */
export function velocidadHorizontal(dx: number, dz: number, dt: number): number {
  return dt > 0 ? Math.hypot(dx, dz) / dt : 0
}

/** Acerca `actual` a `objetivo` con una exponencial independiente de la tasa de fotogramas. */
export function suavizar(actual: number, objetivo: number, rapidez: number, dt: number): number {
  return objetivo + (actual - objetivo) * Math.exp(-rapidez * dt)
}

/** Normaliza un ángulo a (-π, π]. */
export function normalizarAngulo(a: number): number {
  const dosPi = Math.PI * 2
  let r = a % dosPi
  if (r > Math.PI) r -= dosPi
  else if (r <= -Math.PI) r += dosPi
  return r
}

/** Diferencia angular con signo de `desde` a `hasta` por el camino más corto, en (-π, π]. */
export function diferenciaAngular(desde: number, hasta: number): number {
  return normalizarAngulo(hasta - desde)
}

/**
 * Ángulo de giro (rotación Y de three.js) que mira hacia (dx, dz). El modelo mira a +z:
 * giro 0 avanza hacia +z (sur) y π/2 hacia +x (este). Sin movimiento conserva `anguloActual`.
 */
export function anguloObjetivo(
  dx: number,
  dz: number,
  velocidad: number,
  velocidadMinima: number,
  anguloActual: number,
): number {
  if (velocidad <= velocidadMinima || (dx === 0 && dz === 0)) return anguloActual
  return Math.atan2(dx, dz)
}

/** Gira `actual` hacia `objetivo` por el camino más corto con rapidez exponencial (1/s). */
export function girarHacia(actual: number, objetivo: number, rapidez: number, dt: number): number {
  const dif = diferenciaAngular(actual, objetivo)
  return normalizarAngulo(actual + dif * (1 - Math.exp(-rapidez * dt)))
}
