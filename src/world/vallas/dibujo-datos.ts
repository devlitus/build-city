import * as v from 'valibot'
import dibujoJson from '../../../data/vallas-dibujo.json'
import { paletaJuego } from '../paleta'

const positivo = v.pipe(v.number(), v.finite(), v.gtValue(0))
const nombreColor = v.string()

/** Esquema de `data/vallas-dibujo.json`. Medidas en metros. */
export const esquemaDibujoVallas = v.object({
  poste: v.object({
    ancho: positivo,
    alto: positivo,
    /** Cuánto se hunde el poste bajo el terreno (tapa huecos en pendiente). */
    hundimiento: v.pipe(v.number(), v.minValue(0)),
    color: nombreColor,
  }),
  tabla: v.object({
    alto: positivo,
    grosor: positivo,
    /** Altura del centro de cada tabla sobre el terreno. */
    alturas: v.pipe(v.array(positivo), v.minLength(1)),
    color: nombreColor,
  }),
  puerta: v.object({
    /** Distancia del centro de la casilla a cada poste de la puerta. */
    mitadSeparacion: v.pipe(v.number(), v.gtValue(0), v.maxValue(0.5)),
    largoHoja: positivo,
    altoHoja: positivo,
    alturaHoja: v.pipe(v.number(), v.minValue(0)),
    grosorHoja: positivo,
    colorHoja: nombreColor,
  }),
  rugosidad: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  capacidadInicial: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type DatosDibujoVallas = v.InferOutput<typeof esquemaDibujoVallas>

/** Valida el JSON del dibujo de vallas; lanza si no cumple el esquema o un color no existe. */
export function cargarDibujoVallas(json: unknown): DatosDibujoVallas {
  const r = v.safeParse(esquemaDibujoVallas, json)
  if (!r.success) {
    throw new Error(`Dibujo de vallas inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  }
  const d = r.output
  for (const n of [d.poste.color, d.tabla.color, d.puerta.colorHoja]) {
    if (!Object.hasOwn(paletaJuego, n)) {
      throw new Error(`Dibujo de vallas inválido: el color "${n}" no existe en la paleta`)
    }
  }
  if (d.puerta.largoHoja > 2 * d.puerta.mitadSeparacion) {
    throw new Error('Dibujo de vallas inválido: la hoja no cabe entre los postes')
  }
  return d
}

export const DATOS_DIBUJO_VALLAS: DatosDibujoVallas = cargarDibujoVallas(dibujoJson)
