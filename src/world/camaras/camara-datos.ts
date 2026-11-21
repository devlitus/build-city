import * as v from 'valibot'
import camaraJson from '../../../data/camara.json'

const estrictoPositivo = v.pipe(v.number(), v.finite(), v.gtValue(0))
const medioPi = Math.PI / 2

/** Esquema de `data/camara.json`. Longitudes en metros, ángulos en radianes. */
export const esquemaCamara = v.pipe(
  v.object({
    /** Radianes de giro por píxel de movimiento del ratón. */
    sensibilidad: estrictoPositivo,
    /** Elevación de la cámara sobre el horizonte del hombro (positiva = cámara más alta). */
    inclinacion: v.object({
      min: v.pipe(v.number(), v.minValue(-medioPi), v.maxValue(medioPi)),
      max: v.pipe(v.number(), v.minValue(-medioPi), v.maxValue(medioPi)),
      inicial: v.number(),
    }),
    /** Distancia al punto del hombro. */
    distancia: v.object({
      inicial: estrictoPositivo,
      min: estrictoPositivo,
      max: estrictoPositivo,
    }),
    /** Factor (> 1) por cada «muesca» de la rueda. */
    pasoZoom: v.pipe(v.number(), v.gtValue(1)),
    /** Altura del punto que mira la cámara sobre los pies. */
    alturaHombro: estrictoPositivo,
    /** Desplazamiento lateral (m, a la derecha) del punto que mira. */
    desplazamientoLateral: v.number(),
    /** Rapidez (1/s) del seguimiento exponencial del personaje. */
    rapidezSeguimiento: estrictoPositivo,
    /** Distancia mínima (m) entre la cámara y el terreno bajo ella. */
    margenTerreno: v.pipe(v.number(), v.minValue(0)),
    /** Duración (s) de la transición de cámara entre Vida y Plano. */
    transicionDuracion: estrictoPositivo,
    /** Cámara orbital del Modo Plano (comparte `sensibilidad` y `pasoZoom`). */
    plano: v.object({
      inclinacion: v.object({
        min: v.pipe(v.number(), v.minValue(0), v.maxValue(medioPi)),
        max: v.pipe(v.number(), v.minValue(0), v.maxValue(medioPi)),
        inicial: v.number(),
      }),
      distancia: v.object({
        inicial: estrictoPositivo,
        min: estrictoPositivo,
        max: estrictoPositivo,
      }),
    }),
  }),
  v.check((c) => c.inclinacion.min < c.inclinacion.max, 'inclinacion.min debe ser menor que max'),
  v.check(
    (c) => c.inclinacion.inicial >= c.inclinacion.min && c.inclinacion.inicial <= c.inclinacion.max,
    'inclinacion.inicial fuera de los límites',
  ),
  v.check(
    (c) =>
      c.plano.inclinacion.min < c.plano.inclinacion.max &&
      c.plano.inclinacion.inicial >= c.plano.inclinacion.min &&
      c.plano.inclinacion.inicial <= c.plano.inclinacion.max,
    'plano.inclinacion inválida',
  ),
  v.check(
    (c) =>
      c.plano.distancia.min <= c.plano.distancia.inicial &&
      c.plano.distancia.inicial <= c.plano.distancia.max,
    'plano.distancia.inicial fuera de [min, max]',
  ),
  v.check(
    (c) => c.distancia.min <= c.distancia.inicial && c.distancia.inicial <= c.distancia.max,
    'distancia.inicial fuera de [min, max]',
  ),
)

export type DatosCamara = v.InferOutput<typeof esquemaCamara>

/** Valida un JSON de cámara; lanza si no cumple el esquema. */
export function cargarCamara(json: unknown): DatosCamara {
  const r = v.safeParse(esquemaCamara, json)
  if (!r.success) throw new Error(`Cámara inválida: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

/** Datos cargados y validados al importar. */
export const DATOS_CAMARA: DatosCamara = cargarCamara(camaraJson)
