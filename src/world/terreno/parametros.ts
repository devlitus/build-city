import * as v from 'valibot'
import terrenoJson from '../../../data/terreno.json'

const positivo = v.pipe(v.number(), v.minValue(0))
const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))

/** Esquema de `data/terreno.json`. Todas las medidas en metros. */
export const esquemaTerreno = v.pipe(
  v.object({
    nivelAgua: v.number(),
    alturaBase: v.number(),
    ruidoParcela: v.object({ amplitud: positivo, longitudOnda: estrictoPositivo }),
    cauce: v.object({
      profundidad: estrictoPositivo,
      mesetaRadio: positivo,
      anchoTransicion: estrictoPositivo,
    }),
    colinas: v.object({
      altura: positivo,
      anchoSubida: estrictoPositivo,
      amplitudRuido: positivo,
      longitudOnda: estrictoPositivo,
      alturaMinima: positivo,
    }),
  }),
  v.check(
    (t) => t.alturaBase + t.ruidoParcela.amplitud - t.cauce.profundidad < t.nivelAgua,
    'El fondo del cauce debe quedar por debajo del nivel del agua',
  ),
)

export type ParametrosTerreno = v.InferOutput<typeof esquemaTerreno>

/** Valida un JSON de terreno; lanza si no cumple el esquema. */
export function cargarTerreno(json: unknown): ParametrosTerreno {
  const r = v.safeParse(esquemaTerreno, json)
  if (!r.success) {
    throw new Error(`Terreno inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  }
  return r.output
}

/** Parámetros del terreno, cargados y validados al importar. */
export const PARAMETROS_TERRENO: ParametrosTerreno = cargarTerreno(terrenoJson)
