import * as v from 'valibot'
import parcelasJson from '../../../data/parcelas.json'

const positivo = v.pipe(v.number(), v.finite(), v.gtValue(0))

/** Esquema de `data/parcelas.json`. Longitudes en metros, tiempos en segundos. */
export const esquemaParcelas = v.object({
  mojon: v.object({
    ancho: positivo,
    alto: positivo,
    /** Cuánto (m) se hunde el mojón en el suelo, para que no flote en las pendientes. */
    hundimiento: v.pipe(v.number(), v.minValue(0)),
  }),
  cartel: v.object({
    alturaPoste: positivo,
    grosorPoste: positivo,
    anchoTablilla: positivo,
    altoTablilla: positivo,
    grosorTablilla: positivo,
    texto: v.pipe(v.string(), v.minLength(1)),
  }),
  aparicion: v.object({ duracion: positivo }),
})

export type DatosParcelas = v.InferOutput<typeof esquemaParcelas>

/** Valida un JSON de parcelas; lanza si no cumple el esquema. */
export function cargarParcelas(json: unknown): DatosParcelas {
  const r = v.safeParse(esquemaParcelas, json)
  if (!r.success)
    throw new Error(`Parcelas inválidas: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

export const DATOS_PARCELAS: DatosParcelas = cargarParcelas(parcelasJson)
