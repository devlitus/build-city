/**
 * Matemática pura de la cámara en tercera persona (sin three.js).
 *
 * Convención: `yaw` (rad) es hacia dónde mira la cámara en el suelo; 0 mira al norte (-z) y crece
 * hacia la derecha (+x), igual que `direccionRelativa` de `juego/entrada.ts`. `inclinacion` es la
 * elevación de la cámara sobre el horizonte del punto que mira (positiva = cámara más alta).
 */

const DOS_PI = Math.PI * 2

export interface Punto3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Normaliza un ángulo a (-π, π]. Entradas no finitas dan 0. */
export function normalizarAngulo(angulo: number): number {
  if (!Number.isFinite(angulo)) return 0
  let a = angulo % DOS_PI
  if (a > Math.PI) a -= DOS_PI
  else if (a <= -Math.PI) a += DOS_PI
  return a
}

/** Diferencia angular `hasta - desde` por el camino más corto, en (-π, π]. */
export function diferenciaAngular(desde: number, hasta: number): number {
  return normalizarAngulo(hasta - desde)
}

/** Acota la inclinación a [min, max]. */
export function limitarInclinacion(inclinacion: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, inclinacion))
}

/** Gira el yaw `dx` píxeles del ratón (a la derecha = yaw mayor) y lo deja en (-π, π]. */
export function aplicarGiro(yaw: number, dx: number, sensibilidad: number): number {
  return normalizarAngulo(yaw + dx * sensibilidad)
}

/** Inclina `dy` píxeles del ratón (hacia abajo = cámara más alta), acotado. */
export function aplicarInclinacion(
  inclinacion: number,
  dy: number,
  sensibilidad: number,
  min: number,
  max: number,
): number {
  return limitarInclinacion(inclinacion + dy * sensibilidad, min, max)
}

/** Multiplica la distancia por `factor` y la acota a [min, max]. */
export function limitarDistancia(
  distancia: number,
  factor: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, distancia * factor))
}

/** Factor de acercamiento exponencial independiente del fotograma, en [0, 1). */
export function factorSeguimiento(dt: number, rapidez: number): number {
  if (!(dt > 0) || !(rapidez > 0)) return 0
  return 1 - Math.exp(-dt * rapidez)
}

/** Acerca `actual` a `objetivo` un `factor` en [0, 1]. */
export function acercar(actual: number, objetivo: number, factor: number): number {
  return actual + (objetivo - actual) * factor
}

/** Dirección horizontal (x, z) hacia la que mira la cámara. */
export function direccionMirada(yaw: number): { readonly x: number; readonly z: number } {
  return { x: Math.sin(yaw), z: -Math.cos(yaw) }
}

/**
 * Punto que mira la cámara: sobre el hombro del personaje (a su derecha, visto desde la cámara).
 * `pies` es la posición de los pies.
 */
export function puntoHombro(
  pies: Punto3,
  yaw: number,
  alturaHombro: number,
  desplazamientoLateral: number,
): Punto3 {
  // derecha = (cos, sin) en (x, z)
  return {
    x: pies.x + Math.cos(yaw) * desplazamientoLateral,
    y: pies.y + alturaHombro,
    z: pies.z + Math.sin(yaw) * desplazamientoLateral,
  }
}

/** Posición de la cámara en órbita a `distancia` del punto mirado: detrás de donde mira y arriba. */
export function posicionOrbita(
  objetivo: Punto3,
  yaw: number,
  inclinacion: number,
  distancia: number,
): Punto3 {
  const horizontal = distancia * Math.cos(inclinacion)
  const d = direccionMirada(yaw)
  return {
    x: objetivo.x - d.x * horizontal,
    y: objetivo.y + distancia * Math.sin(inclinacion),
    z: objetivo.z - d.z * horizontal,
  }
}

/** Altura mínima de la cámara: nunca por debajo del terreno + margen. Devuelve `max(y, suelo + margen)`. */
export function alturaMinimaCamara(y: number, alturaTerreno: number, margen: number): number {
  return Math.max(y, alturaTerreno + margen)
}
