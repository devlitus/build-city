import * as v from 'valibot'
import alturaJson from '../../../data/altura-personaje.json'

const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))

/** Esquema de `data/altura-personaje.json`. */
export const esquemaAlturaPersonaje = v.object({
  /** Rapidez (1/s) con la que los pies suben hacia un suelo más alto. */
  rapidezSubida: estrictoPositivo,
  /** Rapidez (1/s) con la que bajan hacia un suelo más bajo (más suave que la subida). */
  rapidezBajada: estrictoPositivo,
  /** Diferencia (m) a partir de la cual se ajusta de golpe (teletransporte, desmayo). */
  saltoMaximo: estrictoPositivo,
  /** Cuánto (m) pueden quedar los pies por debajo del suelo antes de forzar la subida. */
  tolerancia: v.pipe(v.number(), v.minValue(0)),
})

export type ParametrosAltura = v.InferOutput<typeof esquemaAlturaPersonaje>

/** Valida un JSON de altura del personaje; lanza si no cumple el esquema. */
export function cargarAlturaPersonaje(json: unknown): ParametrosAltura {
  const r = v.safeParse(esquemaAlturaPersonaje, json)
  if (!r.success)
    throw new Error(`Altura del personaje inválida: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

/** Parámetros cargados y validados al importar. */
export const PARAMETROS_ALTURA: ParametrosAltura = cargarAlturaPersonaje(alturaJson)
