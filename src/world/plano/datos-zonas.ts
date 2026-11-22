import { CARACTER_SIN_ZONA, CARACTER_ZONA, ZONAS, type Zona } from '../../core'
import type { ZonaElegida } from '../../juego/herramienta-plano'
import type { RectanguloCasillas } from './rectangulo'

export type RGB = readonly [number, number, number]

/** Nombre en `data/paleta.json` del color de cada zona (y del borrado). */
export const CLAVE_PALETA_ZONA: Readonly<Record<ZonaElegida, string>> = {
  cultivo: 'zonaCultivo',
  huerto: 'zonaHuerto',
  vivienda: 'zonaVivienda',
  almacen: 'zonaAlmacen',
  borrar: 'zonaBorrar',
}

/** Color hexadecimal `#rrggbb` como componentes 0–255. */
export function hexARgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Píxeles RGBA (un píxel por casilla, fila 0 al norte) de las zonas pintadas: color de la zona
 * y opaco donde hay zona; transparente donde no. La opacidad final la fija el material. Pura.
 */
export function pixelesZonas(zonas: string, colores: Readonly<Record<Zona, RGB>>): Uint8Array {
  const pixeles = new Uint8Array(zonas.length * 4)
  const porCaracter = new Map<string, RGB>(ZONAS.map((z) => [CARACTER_ZONA[z], colores[z]]))
  for (let i = 0; i < zonas.length; i++) {
    const c = zonas[i] ?? CARACTER_SIN_ZONA
    const rgb = porCaracter.get(c)
    if (!rgb) continue
    pixeles.set([rgb[0], rgb[1], rgb[2], 255], i * 4)
  }
  return pixeles
}

/**
 * Rellena `pixeles` (RGBA, `lado`×`lado`) con `color` en el rectángulo recortado al valle y
 * transparente fuera. `rect` `null` lo deja todo transparente. Pura (muta solo `pixeles`).
 */
export function rellenarRectangulo(
  pixeles: Uint8Array,
  lado: number,
  rect: RectanguloCasillas | null,
  color: RGB,
): void {
  pixeles.fill(0)
  if (!rect) return
  const x0 = Math.max(0, rect.x0)
  const y0 = Math.max(0, rect.y0)
  const x1 = Math.min(lado - 1, rect.x1)
  const y1 = Math.min(lado - 1, rect.y1)
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      pixeles.set([color[0], color[1], color[2], 255], (y * lado + x) * 4)
}
