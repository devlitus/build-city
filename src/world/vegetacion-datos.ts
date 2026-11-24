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
    tronco: v.object({
      alto: estrictoPositivo,
      radio: estrictoPositivo,
      lados: entero(3),
      /** Radio de la punta respecto al de la base (0 a 1). */
      afilado: v.pipe(v.number(), v.gtValue(0), v.maxValue(1)),
      /** Metros extra de tronco, para que asome bajo la copa. */
      extra: positivo,
      /** Metros de la base bajo el suelo, para que no flote en las pendientes. */
      hundimiento: positivo,
    }),
    pino: v.object({
      inicioCopa: positivo,
      alto: estrictoPositivo,
      radio: estrictoPositivo,
      niveles: entero(1),
      lados: entero(3),
      /** Alto de cada cono respecto al reparto uniforme de la copa. */
      alargamiento: estrictoPositivo,
      /** Cuánto se estrecha el último cono respecto al primero (0 a 1). */
      estrechamiento: fraccion,
    }),
    redondo: v.object({
      centroCopa: estrictoPositivo,
      radio: estrictoPositivo,
      detalle: entero(0),
      /** Escala vertical de la copa (1 = esfera). */
      achatamiento: estrictoPositivo,
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
  /** Plantón: escala del árbol en cada fase de crecimiento, de la más joven a la más madura. */
  planton: v.object({
    escalas: v.pipe(
      v.array(estrictoPositivo),
      v.minLength(1),
      v.check(
        (e) => e.every((x, i) => i === 0 || x >= (e[i - 1] as number)),
        'las escalas no pueden decrecer',
      ),
    ),
  }),
  /** Tocón que deja un árbol talado: cilindro bajo. */
  tocon: v.object({
    radio: estrictoPositivo,
    alto: estrictoPositivo,
    lados: entero(3),
    /** Radio de la parte alta respecto al de la base (0 a 1). */
    afilado: v.pipe(v.number(), v.gtValue(0), v.maxValue(1)),
    /** Metros de la base bajo el suelo. */
    hundimiento: positivo,
    escala: rango,
  }),
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
    /** Distancia (m) del arranque de cada hoja al centro de la mata. */
    radioBrote: rango,
    /** Cuánto se abre la punta de cada hoja hacia fuera (m). */
    inclinacion: rango,
    /** Multiplicador del ancho de la mata. */
    anchoMata: rango,
    /** Metros que la mata se hunde bajo el suelo. */
    hundimiento: positivo,
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
