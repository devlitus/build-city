import * as v from 'valibot'
import horizonteJson from '../../data/horizonte.json'

const positivo = v.pipe(v.number(), v.minValue(0))
const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))
const entero = v.pipe(v.number(), v.integer(), v.minValue(3))

/** Esquema de `data/horizonte.json`. Medidas en metros. */
export const esquemaHorizonte = v.pipe(
  v.object({
    radioInterior: estrictoPositivo,
    anchoAnillo: estrictoPositivo,
    profundidadBase: positivo,
    segmentosAngulo: entero,
    anillosRadiales: entero,
    fraccionCresta: v.pipe(v.number(), v.gtValue(0), v.ltValue(1)),
    alturaMinima: estrictoPositivo,
    alturaPicos: estrictoPositivo,
    longitudOndaPicos: estrictoPositivo,
    umbralNieve: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    niebla: v.object({ cerca: positivo, lejos: estrictoPositivo }),
    nubes: v.object({
      cantidad: v.pipe(v.number(), v.integer(), v.minValue(0)),
      alturaMin: positivo,
      alturaMax: positivo,
      radioMax: estrictoPositivo,
      tamanoMin: estrictoPositivo,
      tamanoMax: estrictoPositivo,
      velocidad: positivo,
    }),
  }),
  v.check((h) => h.alturaPicos >= h.alturaMinima, 'alturaPicos debe ser >= alturaMinima'),
  v.check((h) => h.niebla.lejos > h.niebla.cerca, 'niebla.lejos debe ser > niebla.cerca'),
  v.check((h) => h.nubes.alturaMax >= h.nubes.alturaMin, 'nubes.alturaMax >= alturaMin'),
  v.check((h) => h.nubes.tamanoMax >= h.nubes.tamanoMin, 'nubes.tamanoMax >= tamanoMin'),
)

export type ParametrosHorizonte = v.InferOutput<typeof esquemaHorizonte>

/** Valida un JSON de horizonte; lanza si no cumple el esquema. */
export function cargarHorizonte(json: unknown): ParametrosHorizonte {
  const r = v.safeParse(esquemaHorizonte, json)
  if (!r.success) {
    throw new Error(`Horizonte inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  }
  return r.output
}

/** Parámetros del horizonte, cargados y validados al importar. */
export const PARAMETROS_HORIZONTE: ParametrosHorizonte = cargarHorizonte(horizonteJson)
