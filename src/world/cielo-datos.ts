import * as v from 'valibot'
import cieloJson from '../../data/cielo.json'

const positivo = v.pipe(v.number(), v.minValue(0))
const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))

/** Esquema de `data/cielo.json`. Ángulos en grados. */
export const esquemaCielo = v.object({
  sol: v.object({
    /** Altura del sol sobre el horizonte (1 a 90). */
    elevacion: v.pipe(v.number(), v.minValue(1), v.maxValue(90)),
    /** Giro horizontal del sol desde el norte (-z), en sentido horario visto desde arriba. */
    azimut: v.pipe(v.number(), v.minValue(0), v.maxValue(360)),
    /** Distancia del sol direccional a su objetivo, relativa al semilado de las sombras / 30. */
    distancia: estrictoPositivo,
  }),
  cielo: v.object({
    turbidez: positivo,
    rayleigh: positivo,
    mie: positivo,
    mieDireccional: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    /** Tamaño de la cúpula del cielo (m). */
    escala: estrictoPositivo,
  }),
  exposicion: estrictoPositivo,
  intensidadSol: positivo,
  intensidadHemisferio: positivo,
  intensidadEntorno: positivo,
})

export type DatosCielo = v.InferOutput<typeof esquemaCielo>

/** Valida un JSON de cielo; lanza si no cumple el esquema. */
export function cargarCielo(json: unknown): DatosCielo {
  const r = v.safeParse(esquemaCielo, json)
  if (!r.success) throw new Error(`Cielo inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

/** Datos del cielo, cargados y validados al importar. */
export const DATOS_CIELO: DatosCielo = cargarCielo(cieloJson)

/**
 * Dirección unitaria hacia el sol (x este, y arriba, z sur) para una elevación y un azimut en
 * grados. Azimut 0 = norte (-z), 90 = este (+x). Pura.
 */
export function direccionDelSol(
  elevacion: number,
  azimut: number,
): { x: number; y: number; z: number } {
  const e = (elevacion * Math.PI) / 180
  const a = (azimut * Math.PI) / 180
  return { x: Math.cos(e) * Math.sin(a), y: Math.sin(e), z: -Math.cos(e) * Math.cos(a) }
}
