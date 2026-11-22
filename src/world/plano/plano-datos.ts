import * as v from 'valibot'
import planoJson from '../../../data/plano.json'

const opacidad = v.pipe(v.number(), v.minValue(0), v.maxValue(1))
const positivo = v.pipe(v.number(), v.finite(), v.gtValue(0))

/** Esquema de `data/plano.json`. Longitudes en metros, tiempos en segundos. */
export const esquemaPlano = v.object({
  rejilla: v.object({
    opacidad,
    /** Altura (m) de la rejilla sobre el suelo. */
    separacion: v.pipe(v.number(), v.minValue(0)),
  }),
  lindes: v.object({
    opacidadOtras: opacidad,
    opacidadPropias: opacidad,
    /** Altura (m) de las lindes sobre el suelo. */
    separacion: v.pipe(v.number(), v.minValue(0)),
    /** Distancia (m) entre muestras de altura a lo largo de una linde. */
    pasoMuestreo: positivo,
  }),
  desaturacion: v.object({
    /** Fracción de saturación que se quita al mundo en Modo Plano (0 = nada, 1 = gris). */
    cantidad: opacidad,
    duracionTransicion: v.pipe(v.number(), v.minValue(0)),
  }),
})

export type DatosPlano = v.InferOutput<typeof esquemaPlano>

/** Valida un JSON del plano; lanza si no cumple el esquema. */
export function cargarPlano(json: unknown): DatosPlano {
  const r = v.safeParse(esquemaPlano, json)
  if (!r.success) throw new Error(`Plano inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

export const DATOS_PLANO: DatosPlano = cargarPlano(planoJson)
