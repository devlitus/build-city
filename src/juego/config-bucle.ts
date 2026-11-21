import * as v from 'valibot'
import datos from '../../data/bucle.json'

/** Esquema de `data/bucle.json`: paso fijo de simulación y tope de pasos por fotograma. */
export const esquemaConfigBucle = v.object({
  pasoFijoMs: v.pipe(v.number(), v.finite(), v.gtValue(0)),
  maxPasosPorFotograma: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type ConfigBucle = v.InferOutput<typeof esquemaConfigBucle>

/** Configuración del bucle, validada al cargar el módulo. */
export const CONFIG_BUCLE: ConfigBucle = v.parse(esquemaConfigBucle, datos)
