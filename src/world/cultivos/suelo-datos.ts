import * as v from 'valibot'
import sueloJson from '../../../data/suelo-cultivo.json'
import { paletaJuego } from '../paleta'

const positivo = v.pipe(v.number(), v.gtValue(0))

/** Esquema de `data/suelo-cultivo.json`. Medidas en metros. */
export const esquemaSueloCultivo = v.object({
  /** Lado de la losa de tierra (algo menor que 1 m para que se vea la casilla). */
  lado: v.pipe(v.number(), v.gtValue(0), v.maxValue(1)),
  /** Cuánto baja la losa bajo su cara superior, para tapar el hueco en terreno inclinado. */
  grosor: positivo,
  /** Altura de la cara superior de la losa sobre el terreno (evita z-fighting). */
  alturaLosa: v.pipe(v.number(), v.minValue(0)),
  surcos: v.pipe(v.number(), v.integer(), v.minValue(1)),
  anchoSurco: positivo,
  altoSurco: positivo,
  rugosidad: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  colorSeca: v.string(),
  colorRegada: v.string(),
  capacidadInicial: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type DatosSueloCultivo = v.InferOutput<typeof esquemaSueloCultivo>

/** Valida el JSON del suelo de cultivo; lanza si no cumple el esquema o un color no existe. */
export function cargarSueloCultivo(json: unknown): DatosSueloCultivo {
  const r = v.safeParse(esquemaSueloCultivo, json)
  if (!r.success)
    throw new Error(`Suelo de cultivo inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  const d = r.output
  if (d.surcos * d.anchoSurco > d.lado)
    throw new Error('Suelo de cultivo inválido: los surcos no caben en la losa')
  for (const n of [d.colorSeca, d.colorRegada])
    if (!Object.hasOwn(paletaJuego, n))
      throw new Error(`Suelo de cultivo inválido: el color "${n}" no existe en la paleta`)
  return d
}

export const DATOS_SUELO_CULTIVO: DatosSueloCultivo = cargarSueloCultivo(sueloJson)
