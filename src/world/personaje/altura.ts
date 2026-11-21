import type { FuncionAltura } from '../terreno/altura'
import { PARAMETROS_ALTURA, type ParametrosAltura } from './altura-datos'

/**
 * Acerca la altura de los pies `actual` a la del suelo `objetivo` de forma exponencial e
 * independiente del fotograma (`1 - exp(-dt * rapidez)`). Nunca se pasa de largo. Sube más rápido
 * de lo que baja y nunca deja los pies más de `tolerancia` bajo el suelo. Si la diferencia supera
 * `saltoMaximo` se ajusta de golpe. Con `dt` no válido o ≤ 0 devuelve `actual`. Pura.
 */
export function suavizarAltura(
  actual: number,
  objetivo: number,
  dt: number,
  parametros: ParametrosAltura = PARAMETROS_ALTURA,
): number {
  if (!Number.isFinite(dt) || dt <= 0) return actual
  const diferencia = objetivo - actual
  if (Math.abs(diferencia) > parametros.saltoMaximo) return objetivo
  const rapidez = diferencia > 0 ? parametros.rapidezSubida : parametros.rapidezBajada
  const nuevo = actual + diferencia * (1 - Math.exp(-dt * rapidez))
  // Sigue entre `actual` y `objetivo`: el suelo menos la tolerancia nunca supera al objetivo.
  // Con las pinzas activas la independencia del fotograma es aproximada (acotada por las cotas).
  return Math.min(
    Math.max(nuevo, objetivo - parametros.tolerancia),
    objetivo + parametros.flotacionMaxima,
  )
}

export interface SeguidorAltura {
  /** Devuelve la altura de los pies en (x, z) tras `dt` segundos. La primera llamada es exacta. */
  actualizar(x: number, z: number, dt: number): number
}

/**
 * Seguidor de la altura del terreno para el personaje. Muestrea el suelo en un único punto, el
 * central: el granjero mide ~0,6 m de diámetro y las pendientes del valle son suaves, así que el
 * error en los bordes de los pies es de pocos centímetros y la tolerancia lo absorbe.
 */
export function crearSeguidorAltura(
  altura: FuncionAltura,
  parametros: ParametrosAltura = PARAMETROS_ALTURA,
): SeguidorAltura {
  let actual: number | null = null
  return {
    actualizar(x, z, dt) {
      const objetivo = altura(x, z)
      actual = actual === null ? objetivo : suavizarAltura(actual, objetivo, dt, parametros)
      return actual
    },
  }
}
