import * as v from 'valibot'
import animacionJson from '../../../data/animacion-personaje.json'

const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))
const positivo = v.pipe(v.number(), v.minValue(0))

/** Esquema de `data/animacion-personaje.json`. Velocidades en m/s, ángulos en rad. */
export const esquemaAnimacionPersonaje = v.pipe(
  v.object({
    /** Altura del granjero en la escena (m). */
    altura: estrictoPositivo,
    /** Velocidad a la que el ciclo de Andar se reproduce a ritmo 1. */
    velocidadAndar: estrictoPositivo,
    /** Velocidad a la que el ciclo de Correr se reproduce a ritmo 1. */
    velocidadCorrer: estrictoPositivo,
    /** Por debajo de esta velocidad se considera parado (Reposo puro). */
    umbralParado: positivo,
    /** Rapidez (1/s) con que la velocidad medida sigue a la real. */
    suavizadoVelocidad: estrictoPositivo,
    /** Duración del fundido entre animaciones (s). */
    tiempoFundido: positivo,
    giro: v.object({
      /** Rapidez (1/s) de la aproximación exponencial al ángulo objetivo. */
      velocidadAngular: estrictoPositivo,
      /** Por debajo de esta velocidad (m/s) no se recalcula la dirección objetivo. */
      velocidadMinima: positivo,
    }),
    /** Límites del `timeScale` para que el paso no se vea ni congelado ni frenético. */
    ritmo: v.object({ minimo: estrictoPositivo, maximo: estrictoPositivo }),
  }),
  v.check((d) => d.velocidadAndar < d.velocidadCorrer, 'velocidadAndar debe ser < velocidadCorrer'),
  v.check((d) => d.umbralParado < d.velocidadAndar, 'umbralParado debe ser < velocidadAndar'),
  v.check((d) => d.ritmo.minimo <= d.ritmo.maximo, 'ritmo.minimo no puede superar a ritmo.maximo'),
)

export type DatosAnimacionPersonaje = v.InferOutput<typeof esquemaAnimacionPersonaje>

/** Valida un JSON de animación del personaje; lanza si no cumple el esquema. */
export function cargarAnimacionPersonaje(json: unknown): DatosAnimacionPersonaje {
  const r = v.safeParse(esquemaAnimacionPersonaje, json)
  if (!r.success)
    throw new Error(
      `Animación del personaje inválida: ${r.issues.map((i) => i.message).join('; ')}`,
    )
  return r.output
}

/** Datos de animación del personaje, cargados y validados al importar. */
export const DATOS_ANIMACION: DatosAnimacionPersonaje = cargarAnimacionPersonaje(animacionJson)
