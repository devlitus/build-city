import * as v from 'valibot'
import luzJson from '../../data/luz.json'
import { direccionDelSol } from './cielo-datos'

const positivo = v.pipe(v.number(), v.minValue(0))
const hora = v.pipe(v.number(), v.minValue(0), v.maxValue(24))
const colorHex = v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i, 'El color debe ser #rrggbb'))

const esquemaClave = v.object({
  nombre: v.string(),
  /** Hora del día (0 a 24, exclusiva) a la que aplica la clave. */
  hora: v.pipe(v.number(), v.minValue(0), v.ltValue(24)),
  colorSol: colorHex,
  intensidadSol: positivo,
  hemisferioCielo: colorHex,
  hemisferioSuelo: colorHex,
  intensidadHemisferio: positivo,
  intensidadEntorno: positivo,
  colorNiebla: colorHex,
  exposicion: v.pipe(v.number(), v.gtValue(0)),
  /** Intensidad de las luces de ventanas: 0 de día, mayor que 0 de noche. */
  intensidadVentanas: positivo,
  turbidez: positivo,
  rayleigh: positivo,
})

/** Esquema de `data/luz.json`. Ángulos en grados, horas en horas decimales. */
export const esquemaLuz = v.pipe(
  v.object({
    sol: v.object({
      salida: hora,
      puesta: hora,
      /** Altura del sol al mediodía solar (grados). */
      elevacionMaxima: v.pipe(v.number(), v.gtValue(0), v.maxValue(90)),
      /** Profundidad máxima del sol bajo el horizonte a medianoche (grados). */
      profundidadNoche: v.pipe(v.number(), v.gtValue(0), v.maxValue(90)),
    }),
    /** Dirección fija de la luna (luz direccional de noche). */
    luna: v.object({
      elevacion: v.pipe(v.number(), v.minValue(10), v.maxValue(90)),
      azimut: v.pipe(v.number(), v.minValue(0), v.maxValue(360)),
      /** Altura del sol (grados) por encima de la cual la luz es solo el sol. */
      mezclaDesde: v.pipe(v.number(), v.minValue(0), v.maxValue(90)),
      /** Altura del sol (grados, negativa) por debajo de la cual la luz es solo la luna. */
      mezclaHasta: v.pipe(v.number(), v.minValue(-90), v.maxValue(0)),
    }),
    /** Cambio de dirección del sol (grados) que obliga a regenerar el entorno PMREM. */
    umbralEntornoGrados: v.pipe(v.number(), v.gtValue(0)),
    claves: v.pipe(v.array(esquemaClave), v.minLength(2)),
  }),
  v.check((d) => d.sol.salida < d.sol.puesta, 'La salida del sol debe ser anterior a la puesta'),
)

export type DatosLuz = v.InferOutput<typeof esquemaLuz>
export type ClaveLuz = DatosLuz['claves'][number]

/** Valida un JSON de luz; lanza si no cumple el esquema. Ordena las claves por hora. */
export function cargarLuz(json: unknown): DatosLuz {
  const r = v.safeParse(esquemaLuz, json)
  if (!r.success) throw new Error(`Luz inválida: ${r.issues.map((i) => i.message).join('; ')}`)
  return { ...r.output, claves: [...r.output.claves].sort((a, b) => a.hora - b.hora) }
}

/** Datos de luz, cargados y validados al importar (claves ordenadas por hora). */
export const DATOS_LUZ: DatosLuz = cargarLuz(luzJson)

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface LuzDelDia {
  /** Dirección unitaria hacia el sol real (puede estar bajo el horizonte): para el `Sky`. */
  direccionSol: Vec3
  /** Altura del sol en grados (negativa de noche). */
  elevacionSol: number
  /** Dirección unitaria de la luz direccional: sol de día, luna de noche, mezcla en el cambio. */
  direccionLuz: Vec3
  /** Color 0xrrggbb de la luz direccional. */
  colorSol: number
  intensidadSol: number
  hemisferioCielo: number
  hemisferioSuelo: number
  intensidadHemisferio: number
  intensidadEntorno: number
  colorNiebla: number
  exposicion: number
  /** Intensidad de las luces de ventanas (0 de día, > 0 de noche). */
  intensidadVentanas: number
  turbidez: number
  rayleigh: number
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const suave = (t: number): number => t * t * (3 - 2 * t)

function lerpColor(a: string, b: string, t: number): number {
  const na = parseInt(a.slice(1), 16)
  const nb = parseInt(b.slice(1), 16)
  let r = 0
  for (const desp of [16, 8, 0]) {
    const ca = (na >> desp) & 255
    const cb = (nb >> desp) & 255
    r = r * 256 + Math.round(lerp(ca, cb, t))
  }
  return r
}

/** Hora del día (0 a 24) a partir de los minutos del juego; acepta cualquier valor (módulo 24 h). */
export function horaDeMinutos(minutos: number): number {
  return (((minutos / 60) % 24) + 24) % 24
}

/**
 * Posición del sol (grados) a una hora: sale por el este (azimut 90), pasa por el sur (180) y se
 * pone por el oeste (270); de noche sigue bajo el horizonte, continua en la salida y la puesta.
 */
export function posicionSol(
  h: number,
  sol: DatosLuz['sol'] = DATOS_LUZ.sol,
): { elevacion: number; azimut: number } {
  const dia = sol.puesta - sol.salida
  if (h >= sol.salida && h <= sol.puesta) {
    const t = (h - sol.salida) / dia
    return { elevacion: sol.elevacionMaxima * Math.sin(Math.PI * t), azimut: 90 + 180 * t }
  }
  const noche = 24 - dia
  const t = (h > sol.puesta ? h - sol.puesta : h + 24 - sol.puesta) / noche
  return { elevacion: -sol.profundidadNoche * Math.sin(Math.PI * t), azimut: 270 + 180 * t }
}

/**
 * Luz del día para unos minutos del juego (`minutoDelDia`, o cualquier valor: se toma módulo 24 h).
 * Interpola entre las claves de `data/luz.json` de forma cíclica, sin saltos. Pura.
 */
export function luzDelDia(minutos: number, datos: DatosLuz = DATOS_LUZ): LuzDelDia {
  const h = horaDeMinutos(minutos)
  const claves = datos.claves
  let i = claves.length - 1
  while (i > 0 && (claves[i] as ClaveLuz).hora > h) i--
  // Si h es anterior a la primera clave, la clave previa es la última del día anterior.
  const antes = (claves[i] as ClaveLuz).hora > h
  const a = (antes ? claves[claves.length - 1] : claves[i]) as ClaveLuz
  const b = claves[antes ? 0 : (i + 1) % claves.length] as ClaveLuz
  const ha = antes ? a.hora - 24 : a.hora
  const hb = b.hora <= ha ? b.hora + 24 : b.hora
  const t = (h - ha) / (hb - ha)

  const pos = posicionSol(h, datos.sol)
  const dirSol = direccionDelSol(pos.elevacion, pos.azimut)
  const luna = direccionDelSol(datos.luna.elevacion, datos.luna.azimut)
  // De noche la luz direccional es la luna; se mezcla mientras el sol cruza el horizonte.
  const w = suave(
    Math.min(
      1,
      Math.max(
        0,
        (datos.luna.mezclaDesde - pos.elevacion) /
          (datos.luna.mezclaDesde - datos.luna.mezclaHasta),
      ),
    ),
  )
  const dl = {
    x: lerp(dirSol.x, luna.x, w),
    y: lerp(dirSol.y, luna.y, w),
    z: lerp(dirSol.z, luna.z, w),
  }
  const n = Math.hypot(dl.x, dl.y, dl.z)

  return {
    direccionSol: dirSol,
    elevacionSol: pos.elevacion,
    direccionLuz: { x: dl.x / n, y: dl.y / n, z: dl.z / n },
    colorSol: lerpColor(a.colorSol, b.colorSol, t),
    intensidadSol: lerp(a.intensidadSol, b.intensidadSol, t),
    hemisferioCielo: lerpColor(a.hemisferioCielo, b.hemisferioCielo, t),
    hemisferioSuelo: lerpColor(a.hemisferioSuelo, b.hemisferioSuelo, t),
    intensidadHemisferio: lerp(a.intensidadHemisferio, b.intensidadHemisferio, t),
    intensidadEntorno: lerp(a.intensidadEntorno, b.intensidadEntorno, t),
    colorNiebla: lerpColor(a.colorNiebla, b.colorNiebla, t),
    exposicion: lerp(a.exposicion, b.exposicion, t),
    intensidadVentanas: lerp(a.intensidadVentanas, b.intensidadVentanas, t),
    turbidez: lerp(a.turbidez, b.turbidez, t),
    rayleigh: lerp(a.rayleigh, b.rayleigh, t),
  }
}

/** Ángulo (grados) entre dos direcciones unitarias. */
export function anguloEntre(a: Vec3, b: Vec3): number {
  const d = a.x * b.x + a.y * b.y + a.z * b.z
  return (Math.acos(Math.min(1, Math.max(-1, d))) * 180) / Math.PI
}
