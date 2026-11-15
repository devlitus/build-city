import * as v from 'valibot'
import vegetacionJson from '../../data/vegetacion.json'

const positivo = v.pipe(v.number(), v.minValue(0))
const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))
const fraccion = v.pipe(v.number(), v.minValue(0), v.maxValue(1))
const entero = (minimo: number) => v.pipe(v.number(), v.integer(), v.minValue(minimo))

const rango = v.pipe(
  v.object({ min: estrictoPositivo, max: estrictoPositivo }),
  v.check((r) => r.min <= r.max, 'min no puede superar a max'),
)

/** Esquema de `data/vegetacion.json`. Medidas en metros. */
export const esquemaVegetacion = v.object({
  arbol: v.object({
    /** Fracción de árboles que son pinos (el resto, redondos). */
    proporcionPino: fraccion,
    escala: rango,
    variacionTono: v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)),
    tronco: v.object({ alto: estrictoPositivo, radio: estrictoPositivo, lados: entero(3) }),
    pino: v.object({
      inicioCopa: positivo,
      alto: estrictoPositivo,
      radio: estrictoPositivo,
      niveles: entero(1),
      lados: entero(3),
    }),
    redondo: v.object({
      centroCopa: estrictoPositivo,
      radio: estrictoPositivo,
      detalle: entero(0),
    }),
  }),
  roca: v.object({
    escala: rango,
    variacionTono: v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)),
    radio: estrictoPositivo,
    achatamiento: estrictoPositivo,
    irregularidad: v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)),
    /** Fracción del alto que queda enterrada. */
    hundimiento: fraccion,
  }),
  planton: v.object({ escala: estrictoPositivo }),
  bosqueColinas: v.object({
    /** Lado (m) de la celda de dispersión: una celda lleva como mucho un árbol. */
    celda: estrictoPositivo,
    /** Probabilidad de árbol por celda. */
    densidad: fraccion,
    alturaMaxima: estrictoPositivo,
    alturaMinimaSobreAgua: positivo,
    /** Metros mínimos desde el borde del valle. */
    margenValle: positivo,
    margenAgua: positivo,
    margenPueblo: positivo,
    escala: rango,
  }),
  hierba: v.object({
    matasPorCasilla: positivo,
    pesoTerreno: v.object({ prado: positivo, bosque: positivo, rocoso: positivo }),
    pesoFuera: positivo,
    /** Metros de hierba más allá del borde del valle. */
    anilloMetros: positivo,
    alturaMaxima: estrictoPositivo,
    margenAgua: positivo,
    margenPueblo: positivo,
    alto: rango,
    ancho: estrictoPositivo,
    brotes: entero(1),
    variacionTono: v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)),
    /** No se dibujan los trozos de hierba a más de esta distancia (m) de la cámara. */
    radioDibujo: estrictoPositivo,
    viento: v.object({
      amplitud: positivo,
      /** Radianes por metro. */
      frecuencia: positivo,
      /** Radianes por segundo. */
      velocidad: positivo,
    }),
  }),
})

export type DatosVegetacion = v.InferOutput<typeof esquemaVegetacion>

/** Valida un JSON de vegetación; lanza si no cumple el esquema. */
export function cargarVegetacion(json: unknown): DatosVegetacion {
  const r = v.safeParse(esquemaVegetacion, json)
  if (!r.success)
    throw new Error(`Vegetación inválida: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

/** Datos de vegetación, cargados y validados al importar. */
export const DATOS_VEGETACION: DatosVegetacion = cargarVegetacion(vegetacionJson)
