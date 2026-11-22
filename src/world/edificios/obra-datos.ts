import * as v from 'valibot'
import obraJson from '../../../data/obra-visual.json'

const positivo = v.pipe(v.number(), v.finite(), v.gtValue(0))
const fraccion = v.pipe(v.number(), v.gtValue(0), v.maxValue(1))

/** Esquema de `data/obra-visual.json`. Longitudes en metros, tiempos en segundos. */
export const esquemaObraVisual = v.object({
  /** Progreso [0, 1] a partir del cual se ve cada etapa (estrictamente crecientes). */
  umbrales: v.object({ andamios: fraccion, paredes: fraccion, terminado: fraccion }),
  aparicion: v.object({ duracion: positivo, escalaInicial: fraccion }),
  /** Medidas de las formas provisionales por código. */
  provisional: v.object({
    alturaCimientos: positivo,
    grosorAndamio: positivo,
    fraccionParedes: fraccion,
    fraccionTejado: fraccion,
    margen: v.pipe(v.number(), v.minValue(0)),
  }),
  /** Nombres de color de `data/paleta.json` de las formas provisionales. */
  colores: v.object({
    cimientos: v.string(),
    andamios: v.string(),
    edificios: v.record(v.string(), v.object({ paredes: v.string(), tejado: v.string() })),
  }),
})

export type DatosObraVisual = v.InferOutput<typeof esquemaObraVisual>

/** Valida un JSON de obra visual; lanza si no cumple el esquema o los umbrales no crecen. */
export function cargarObraVisual(json: unknown): DatosObraVisual {
  const r = v.safeParse(esquemaObraVisual, json)
  if (!r.success) {
    throw new Error(`Obra visual inválida: ${r.issues.map((i) => i.message).join('; ')}`)
  }
  const u = r.output.umbrales
  if (!(u.andamios < u.paredes && u.paredes < u.terminado)) {
    throw new Error('Obra visual inválida: los umbrales deben ser estrictamente crecientes')
  }
  return r.output
}

export const DATOS_OBRA: DatosObraVisual = cargarObraVisual(obraJson)
