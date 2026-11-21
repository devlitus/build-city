import { minutosDeJuegoPorMs, tiempoDetenido, type EstadoJuego } from '../core'
import type { Almacen } from './almacen'
import { CONFIG_BUCLE, type ConfigBucle } from './config-bucle'

export interface ResultadoAcumulador {
  /** Pasos fijos de simulación a ejecutar en este fotograma. */
  readonly pasos: number
  /** Tiempo (ms) que sobra para el siguiente fotograma, siempre en [0, dtFijo). */
  readonly resto: number
}

/**
 * Acumulador de paso fijo (pura). Suma `dtReal` al acumulado y da los pasos enteros de `dtFijo`.
 * Si hacen falta más de `maxPasos` (pestaña en segundo plano), se ejecutan `maxPasos` y se descarta
 * el tiempo sobrante: así no hay "espiral de la muerte". Entradas no válidas cuentan como 0.
 */
export function avanzarAcumulador(
  acumulado: number,
  dtReal: number,
  dtFijo: number,
  maxPasos: number,
): ResultadoAcumulador {
  if (!(dtFijo > 0) || !(maxPasos >= 1)) return { pasos: 0, resto: 0 }
  const previo = Number.isFinite(acumulado) && acumulado > 0 ? acumulado : 0
  const delta = Number.isFinite(dtReal) && dtReal > 0 ? dtReal : 0
  const total = previo + delta
  const pasos = Math.floor(total / dtFijo)
  if (pasos > maxPasos) return { pasos: maxPasos, resto: 0 }
  return { pasos, resto: total - pasos * dtFijo }
}

export interface ResultadoMinutos {
  /** Minutos enteros de juego a enviar en `AvanzarTiempo` (0 si no hay que enviar nada). */
  readonly minutos: number
  /** Fracción de minuto pendiente, en [0, 1). */
  readonly resto: number
}

/**
 * Convierte un paso de tiempo real en minutos enteros de juego según la velocidad y la pausa
 * del estado (pura). Si el tiempo está detenido no avanza y el resto se conserva.
 */
export function minutosDelPaso(
  estado: Pick<EstadoJuego, 'pausado' | 'modo' | 'velocidad' | 'pausarEnPlano'>,
  dtMs: number,
  restoPrevio: number,
): ResultadoMinutos {
  if (tiempoDetenido(estado)) return { minutos: 0, resto: restoPrevio }
  const total = restoPrevio + minutosDeJuegoPorMs(dtMs, estado.velocidad)
  const minutos = Math.floor(total)
  return { minutos, resto: total - minutos }
}

/**
 * Factor de interpolación visual (pura): fracción del paso fijo ya transcurrida, en [0, 1].
 * Con 0 se dibuja el estado del paso anterior y con 1 el actual.
 */
export function alfaDelAcumulador(resto: number, dtFijo: number): number {
  if (!(dtFijo > 0) || !Number.isFinite(resto)) return 1
  return Math.min(1, Math.max(0, resto / dtFijo))
}

export interface OpcionesBucle {
  readonly almacen: Almacen
  /**
   * Se llama una vez por fotograma, a la frecuencia del navegador, tras la simulación.
   * `alfa` en [0, 1] es la fracción del paso fijo transcurrida (para interpolar lo dibujado).
   */
  readonly dibujar: (alfa: number) => void
  /** Se llama en cada paso fijo, antes de `AvanzarTiempo` (p. ej. para enviar `MoverPersonaje`). */
  readonly alPaso?: () => void
  readonly config?: ConfigBucle
}

/** Arranca el bucle con `requestAnimationFrame`; devuelve la función que lo detiene. */
export function iniciarBucle({
  almacen,
  dibujar,
  alPaso,
  config = CONFIG_BUCLE,
}: OpcionesBucle): () => void {
  let acumulado = 0
  let restoMinutos = 0
  let ultimo: number | undefined
  let id = 0

  const fotograma = (ahora: number): void => {
    const dtReal = ultimo === undefined ? 0 : ahora - ultimo
    ultimo = ahora
    const { pasos, resto } = avanzarAcumulador(
      acumulado,
      dtReal,
      config.pasoFijoMs,
      config.maxPasosPorFotograma,
    )
    acumulado = resto
    for (let i = 0; i < pasos; i++) {
      alPaso?.()
      const avance = minutosDelPaso(almacen.estado, config.pasoFijoMs, restoMinutos)
      restoMinutos = avance.resto
      if (avance.minutos > 0) almacen.despachar({ tipo: 'AvanzarTiempo', minutos: avance.minutos })
    }
    dibujar(alfaDelAcumulador(resto, config.pasoFijoMs))
    id = requestAnimationFrame(fotograma)
  }
  id = requestAnimationFrame(fotograma)
  return () => cancelAnimationFrame(id)
}
