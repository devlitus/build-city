import * as v from 'valibot'
import puertaJson from '../../../data/puerta.json'

/** Esquema de `data/puerta.json`: apertura de la hoja de la puerta cuando el granjero se acerca. */
export const esquemaPuerta = v.strictObject({
  /** Distancia (m) al centro de la puerta por debajo de la cual se abre. */
  radioApertura: v.pipe(v.number(), v.finite(), v.gtValue(0)),
  /** Velocidad de apertura y cierre, en fracción de recorrido por segundo (1 = abrir del todo en 1 s). */
  velocidad: v.pipe(v.number(), v.finite(), v.gtValue(0)),
  /** Ángulo de la hoja totalmente abierta, en grados (0..180). */
  anguloMaximo: v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(180)),
})

export type ConfigPuerta = v.InferOutput<typeof esquemaPuerta>

/** Parámetros de la puerta, validados al cargar el módulo. */
export const CONFIG_PUERTA: ConfigPuerta = v.parse(esquemaPuerta, puertaJson)

/**
 * Nueva apertura de una puerta (0 = cerrada, 1 = abierta del todo) tras `dtMs` milisegundos.
 * Objetivo 1 si el granjero está a menos de `radioApertura` (exclusivo) y 0 si no; la apertura se
 * acerca a él como mucho `velocidad * dt` (no salta). Pura: sin three.js. Entradas no finitas o
 * `dtMs <= 0` dejan la apertura como estaba (acotada a 0..1); una distancia no finita cuenta como lejos.
 */
export function avanzarApertura(
  aperturaActual: number,
  distanciaGranjero: number,
  dtMs: number,
  config: Pick<ConfigPuerta, 'radioApertura' | 'velocidad'> = CONFIG_PUERTA,
): number {
  const actual = Number.isFinite(aperturaActual) ? Math.min(Math.max(aperturaActual, 0), 1) : 0
  if (!(dtMs > 0) || !Number.isFinite(dtMs)) return actual
  const objetivo = distanciaGranjero < config.radioApertura ? 1 : 0
  const paso = (config.velocidad * dtMs) / 1000
  if (objetivo > actual) return Math.min(actual + paso, 1)
  return Math.max(actual - paso, 0)
}

/** Ángulo de la hoja en radianes para una apertura 0..1 (lineal hasta `anguloMaximo`). */
export function anguloHoja(
  apertura: number,
  config: Pick<ConfigPuerta, 'anguloMaximo'> = CONFIG_PUERTA,
): number {
  const a = Math.min(Math.max(apertura, 0), 1)
  return (a * config.anguloMaximo * Math.PI) / 180
}
