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
  estado: Pick<EstadoJuego, 'pausado' | 'modo' | 'velocidad'>,
  dtMs: number,
  restoPrevio: number,
): ResultadoMinutos {
  if (tiempoDetenido(estado)) return { minutos: 0, resto: restoPrevio }
  const total = restoPrevio + minutosDeJuegoPorMs(dtMs, estado.velocidad)
  const minutos = Math.floor(total)
  return { minutos, resto: total - minutos }
}

export interface OpcionesBucle {
  readonly almacen: Almacen
  /** Se llama una vez por fotograma, a la frecuencia del navegador, tras la simulación. */
  readonly dibujar: () => void
  readonly config?: ConfigBucle
}

/** Arranca el bucle con `requestAnimationFrame`; devuelve la función que lo detiene. */
export function iniciarBucle({
  almacen,
  dibujar,
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
      const avance = minutosDelPaso(almacen.estado, config.pasoFijoMs, restoMinutos)
      restoMinutos = avance.resto
      if (avance.minutos > 0) almacen.despachar({ tipo: 'AvanzarTiempo', minutos: avance.minutos })
    }
    dibujar()
    id = requestAnimationFrame(fotograma)
  }
  id = requestAnimationFrame(fotograma)
  return () => cancelAnimationFrame(id)
}
