import * as v from 'valibot'
import efectosJson from '../../../data/efectos.json'

const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))
const positivo = v.pipe(v.number(), v.minValue(0))
const entero = v.pipe(v.number(), v.integer(), v.minValue(0))
const fraccion = v.pipe(v.number(), v.gtValue(0), v.maxValue(1))

const tipoParticula = v.object({
  /** Partículas por golpe que no acaba con el obstáculo. */
  cantidadGolpe: entero,
  /** Partículas al quitar el obstáculo. */
  cantidadRotura: entero,
  /** Altura sobre el suelo desde la que salen (m). */
  alturaOrigen: positivo,
  /** Velocidad horizontal máxima (m/s). */
  rapidez: estrictoPositivo,
  /** Velocidad vertical inicial máxima (m/s). */
  impulsoVertical: estrictoPositivo,
  /** Vida máxima (s). */
  vida: estrictoPositivo,
  /** Lado máximo del cubito (m). */
  tamano: estrictoPositivo,
  /** Nombres de colores de `data/paleta.json`. */
  colores: v.pipe(v.array(v.string()), v.minLength(1)),
})

/**
 * Un sonido sintético: ruido filtrado (crujido) más un golpe grave de tono que baja (cuerpo). Ambos
 * con envolvente de subida rápida y bajada exponencial.
 */
const sonido = v.object({
  /** Duración (s). */
  duracion: estrictoPositivo,
  /** Subida de la envolvente (s); menor que la duración. */
  ataque: positivo,
  /** Frecuencia central del filtro del ruido (Hz). */
  frecuenciaRuido: estrictoPositivo,
  /** Selectividad del filtro. */
  q: estrictoPositivo,
  /** Volumen del ruido (0 a 1). */
  volumenRuido: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Frecuencia inicial del tono grave (Hz). */
  frecuenciaTono: estrictoPositivo,
  /** Frecuencia final del tono grave (Hz). */
  caidaTono: estrictoPositivo,
  /** Volumen del tono (0 a 1). */
  volumenTono: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Espera antes de sonar (s), para ajustar el golpe contra el suelo a la animación. */
  retraso: positivo,
})

/** Esquema de `data/efectos.json`. Tiempos en segundos y ángulos en grados. */
export const esquemaEfectos = v.object({
  sacudida: v.object({
    /** Duración de la sacudida del árbol al recibir un golpe (s). */
    duracion: estrictoPositivo,
    /** Inclinación máxima (grados). */
    anguloMaximo: estrictoPositivo,
    /** Oscilaciones por segundo. */
    frecuencia: estrictoPositivo,
  }),
  caida: v.object({
    /** Duración total del árbol que cae, tumbado y desvaneciéndose (s). */
    duracion: estrictoPositivo,
    /** Fracción de la duración que tarda en llegar al suelo. */
    fraccionCaida: fraccion,
    /** Inclinación con la que queda tumbado (grados). */
    anguloFinal: estrictoPositivo,
    /** Fracción final de la duración en la que encoge hasta desaparecer. */
    fraccionDesvanecer: fraccion,
  }),
  golpeGranjero: v.object({
    /** Duración del gesto de golpear del granjero (s). */
    duracion: estrictoPositivo,
    /** Inclinación del cuerpo hacia delante en el golpe (grados). */
    inclinacion: estrictoPositivo,
    /** Fracción de la duración que dedica a echarse atrás antes de golpear. */
    fraccionPreparacion: fraccion,
  }),
  sonidos: v.object({
    /** Volumen general (0 a 1). */
    volumenGeneral: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    'golpe-madera': sonido,
    'golpe-piedra': sonido,
    caida: sonido,
    rotura: sonido,
  }),
  particulas: v.object({
    /** Tope de partículas vivas a la vez. */
    capacidad: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Aceleración hacia abajo (m/s²). */
    gravedad: estrictoPositivo,
    astillas: tipoParticula,
    piedra: tipoParticula,
  }),
})

export type DatosEfectos = v.InferOutput<typeof esquemaEfectos>

/** Valida un JSON de efectos; lanza si no cumple el esquema. */
export function cargarEfectos(json: unknown): DatosEfectos {
  const r = v.safeParse(esquemaEfectos, json)
  if (!r.success) throw new Error(`Efectos inválidos: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

/** Datos de los efectos, cargados y validados al importar. */
export const DATOS_EFECTOS: DatosEfectos = cargarEfectos(efectosJson)
