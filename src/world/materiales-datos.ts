import * as v from 'valibot'
import materialesJson from '../../data/materiales.json'
import { paletaJuego, type Paleta } from './paleta'

const colorHex = v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i, 'El color debe ser #rrggbb'))

const esquemaMaterial = v.pipe(
  v.object({
    /** Nombre base de la textura en `public/texturas/` (`<nombre>_diff|_nor_gl|_rough.jpg`). */
    textura: v.optional(v.pipe(v.string(), v.minLength(1))),
    /** Color medio (sRGB) de la textura difusa: el tinte se reparte sobre él. */
    colorMedio: v.optional(colorHex),
    /** Metros que cubre una repetición de la textura. */
    metrosPorRepeticion: v.optional(v.pipe(v.number(), v.gtValue(0))),
    /** Nombre de color de `data/paleta.json` que el material debe mostrar. */
    tinte: v.string(),
    rugosidad: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    /** Si es `true`, el color sale de los vértices de la malla (la fábrica deja el color en blanco). */
    colorPorVertice: v.optional(v.boolean()),
  }),
  v.check(
    (m) =>
      m.textura === undefined ||
      (m.metrosPorRepeticion !== undefined && m.colorMedio !== undefined),
    'un material con textura necesita metrosPorRepeticion y colorMedio',
  ),
)

/** Esquema de `data/materiales.json`. */
export const esquemaMateriales = v.object({
  anisotropia: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(16)),
  materiales: v.record(v.string(), esquemaMaterial),
})

export type CatalogoMateriales = v.InferOutput<typeof esquemaMateriales>
export type DatosMaterial = CatalogoMateriales['materiales'][string]

/** Valida un JSON de materiales y comprueba que cada tinte existe en la paleta. */
export function cargarMateriales(json: unknown, paleta: Paleta = paletaJuego): CatalogoMateriales {
  const r = v.safeParse(esquemaMateriales, json)
  if (!r.success) {
    throw new Error(`Materiales inválidos: ${r.issues.map((i) => i.message).join('; ')}`)
  }
  for (const [nombre, m] of Object.entries(r.output.materiales)) {
    if (!Object.hasOwn(paleta, m.tinte)) {
      throw new Error(`Materiales inválidos: "${nombre}" usa el tinte "${m.tinte}", que no existe`)
    }
  }
  return r.output
}

/** Catálogo del juego, cargado y validado al importar. */
export const CATALOGO_MATERIALES: CatalogoMateriales = cargarMateriales(materialesJson)

/** Escala de repetición (repeticiones por metro) de una textura de `metros` metros. */
export function escalaRepeticion(metros: number): number {
  return 1 / metros
}

/** Color con componentes 0..1. */
export type Rgb = readonly [number, number, number]

/** Componentes 0..1 de un `#rrggbb`. */
export function hexARgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Componente sRGB (0..1) a lineal. */
export function srgbALineal(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * Multiplicador lineal por canal que, aplicado a una textura de color medio `media`, la deja
 * con el color medio `objetivo` (ambos sRGB 0..1) conservando su detalle. Puede superar 1.
 */
export function tinteSobreTextura(objetivo: Rgb, media: Rgb): Rgb {
  const f = (o: number, m: number): number => srgbALineal(o) / Math.max(srgbALineal(m), 1e-4)
  return [f(objetivo[0], media[0]), f(objetivo[1], media[1]), f(objetivo[2], media[2])]
}
