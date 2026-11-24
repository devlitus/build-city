/*
 * Cálculos puros de la caída y la sacudida de un árbol (sin three.js). Ejes de la escena: x al
 * este, z al sur; los ángulos van en radianes.
 */

export interface Punto2 {
  readonly x: number
  readonly z: number
}

/** Dirección en la que cae un árbol si el granjero está justo encima (hacia el norte). */
export const DIRECCION_CAIDA_POR_DEFECTO: Punto2 = { x: 0, z: -1 }

/**
 * Dirección horizontal unitaria en la que cae un árbol: la contraria al granjero (del granjero
 * hacia el árbol). Si ambos están en el mismo punto devuelve `DIRECCION_CAIDA_POR_DEFECTO`.
 */
export function direccionCaida(arbol: Punto2, granjero: Punto2): Punto2 {
  const dx = arbol.x - granjero.x
  const dz = arbol.z - granjero.z
  const largo = Math.hypot(dx, dz)
  if (!(largo > 1e-6)) return DIRECCION_CAIDA_POR_DEFECTO
  return { x: dx / largo, z: dz / largo }
}

/**
 * Inclinación de un árbol que cae en el instante `t` (s), de 0 a `anguloFinal`: acelera como un
 * cuerpo que vuelca (curva cuadrática) y se queda tumbado al pasar `duracionCaida`.
 */
export function anguloCaida(t: number, duracionCaida: number, anguloFinal: number): number {
  if (!(duracionCaida > 0)) return anguloFinal
  const u = Math.min(1, Math.max(0, t / duracionCaida))
  return anguloFinal * u * u
}

/**
 * Eje de giro (horizontal, unitario) para que un árbol vertical se incline hacia `direccion`:
 * arriba × `direccion`. Girar un ángulo positivo alrededor de este eje tumba el árbol hacia ella.
 */
export function ejeCaida(direccion: Punto2): Punto2 {
  // (0, 1, 0) × (dx, 0, dz) = (dz, 0, -dx)
  return { x: direccion.z, z: -direccion.x }
}

/** Ángulo de la sacudida en `t` (s): oscilación que se apaga linealmente hasta `duracion`. */
export function anguloSacudida(
  t: number,
  duracion: number,
  anguloMaximo: number,
  frecuencia: number,
): number {
  if (!(duracion > 0) || t < 0 || t >= duracion) return 0
  return anguloMaximo * (1 - t / duracion) * Math.sin(2 * Math.PI * frecuencia * t)
}

/** Escala (1 a 0) de un árbol caído en `t`: entero hasta `inicioDesvanecer` y encoge hasta `duracion`. */
export function escalaDesvanecer(t: number, duracion: number, inicioDesvanecer: number): number {
  if (t <= inicioDesvanecer) return 1
  if (t >= duracion) return 0
  return 1 - (t - inicioDesvanecer) / (duracion - inicioDesvanecer)
}
