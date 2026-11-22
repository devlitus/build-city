import * as v from 'valibot'
import datos from '../../../data/desmayo.json'
import type { Notificacion } from '../../juego/almacen'

/** Esquema de `data/desmayo.json`: duraciones (s) de cada tramo del fundido. */
export const esquemaConfigDesmayo = v.object({
  fundidoASegundos: v.pipe(v.number(), v.finite(), v.minValue(0)),
  negroSegundos: v.pipe(v.number(), v.finite(), v.minValue(0)),
  fundidoDeSegundos: v.pipe(v.number(), v.finite(), v.minValue(0)),
})

export type ConfigDesmayo = v.InferOutput<typeof esquemaConfigDesmayo>

/** Fundido del desmayo, validado al cargar el módulo. */
export const CONFIG_DESMAYO: ConfigDesmayo = v.parse(esquemaConfigDesmayo, datos)

/** Duración total del fundido (s). */
export function duracionDesmayo(c: ConfigDesmayo = CONFIG_DESMAYO): number {
  return c.fundidoASegundos + c.negroSegundos + c.fundidoDeSegundos
}

/**
 * Opacidad de la capa negra (0..1) `s` segundos después del desmayo: sube a negro, se mantiene
 * y vuelve a la escena (que ya muestra al granjero despierto).
 */
export function opacidadDesmayo(s: number, c: ConfigDesmayo = CONFIG_DESMAYO): number {
  if (s <= 0) return 0
  if (s < c.fundidoASegundos) return s / c.fundidoASegundos
  const tras = s - c.fundidoASegundos
  if (tras < c.negroSegundos) return 1
  const sale = tras - c.negroSegundos
  if (sale < c.fundidoDeSegundos) return 1 - sale / c.fundidoDeSegundos
  return 0
}

/** ¿Trae la notificación el evento `desmayo`? */
export function haHabidoDesmayo(n: Notificacion): boolean {
  return n.ok && n.eventos.some((e) => e.tipo === 'desmayo')
}
