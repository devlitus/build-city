import * as v from 'valibot'
import paletaJson from '../../data/paleta.json'

/** Color en hexadecimal `#rrggbb`. */
const esquemaColor = v.pipe(
  v.string(),
  v.regex(/^#[0-9a-f]{6}$/i, 'El color debe tener formato #rrggbb'),
)

/** Esquema de `data/paleta.json`: nombre de color -> hexadecimal. */
export const esquemaPaleta = v.record(v.string(), esquemaColor)

export type Paleta = v.InferOutput<typeof esquemaPaleta>

/** Valida un JSON de paleta; lanza si no cumple el esquema. */
export function cargarPaleta(json: unknown): Paleta {
  const resultado = v.safeParse(esquemaPaleta, json)
  if (!resultado.success) {
    throw new Error(`Paleta inválida: ${resultado.issues.map((i) => i.message).join('; ')}`)
  }
  return resultado.output
}

/** Hexadecimal `#rrggbb` de un color con nombre; lanza si no existe. */
export function colorHex(paleta: Paleta, nombre: string): string {
  const hex = Object.hasOwn(paleta, nombre) ? paleta[nombre] : undefined
  if (hex === undefined) {
    throw new Error(`Color "${nombre}" no existe en la paleta`)
  }
  return hex
}

/** Color con nombre como número 0xrrggbb. */
export function colorNumero(paleta: Paleta, nombre: string): number {
  return parseInt(colorHex(paleta, nombre).slice(1), 16)
}

/** Paleta del juego, cargada y validada al importar. */
export const paletaJuego: Paleta = cargarPaleta(paletaJson)

/** Color (0xrrggbb) de la paleta del juego. */
export function color(nombre: string): number {
  return colorNumero(paletaJuego, nombre)
}
