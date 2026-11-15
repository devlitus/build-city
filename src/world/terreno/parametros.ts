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
      bordeFondo: positivo,
      anchoOrilla: estrictoPositivo,
    }),
    colinas: v.object({
      altura: positivo,
      anchoSubida: estrictoPositivo,
      amplitudRuido: positivo,
      longitudOnda: estrictoPositivo,
      alturaMinima: positivo,
    }),
    malla: v.object({
      /** Metros de colinas dibujados más allá del borde del valle (se redondea a trozos enteros). */
      radioColinas: positivo,
    }),
    colores: v.object({
      /** Por debajo de esta altura (m) la cara es arena de orilla. */
      alturaArena: v.number(),
      /** Por encima de esta altura (m) la roca sustituye al verde en las colinas. */
      alturaRoca: positivo,
      /** Por encima de esta altura (m) hay nieve. */
      alturaNieve: positivo,
      /** Pendiente (desnivel/avance) a partir de la cual la cara es roca. */
      pendienteRoca: estrictoPositivo,
      /** Margen relativo de variación del brillo por cara (0,06 = ±6 %). */
      variacion: v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)),
    }),
  }),
  v.check(
    (t) => t.colores.alturaRoca < t.colores.alturaNieve,
    'alturaRoca debe ser menor que alturaNieve',
  ),
  v.check(
    (t) => t.colinas.altura * 0.6 - t.colinas.amplitudRuido > t.colinas.alturaMinima,
    'Las colinas deben superar alturaMinima: altura*0,6 - amplitudRuido > alturaMinima',
  ),
  v.check(
    (t) => t.cauce.anchoOrilla - t.cauce.bordeFondo <= 1,
    'La orilla en tierra (anchoOrilla - bordeFondo) no debe pasar de 1 m',
  ),
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
