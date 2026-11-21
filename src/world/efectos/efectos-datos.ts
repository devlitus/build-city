import * as v from 'valibot'
import efectosJson from '../../../data/efectos.json'

const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))
const fraccion = v.pipe(v.number(), v.gtValue(0), v.maxValue(1))

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
