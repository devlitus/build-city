import type { Notificacion } from '../../juego/almacen'
import { t } from '../textos'

/** Segundos que se muestra un aviso en el HUD. */
export const SEGUNDOS_AVISO = 3

/**
 * Texto del aviso que merece una notificación del almacén, o `undefined` si no hay ninguno.
 * Regla de la mochila llena: la madera y la piedra van a los materiales (sin límite de ranuras) y
 * nunca se pierden; si un plantón de un árbol talado no cabe se pierde y se avisa
 * (`planton-perdido`); cosechar con la mochila llena se rechaza (`inventario-lleno`).
 */
export function textoAviso(n: Notificacion): string | undefined {
  if (!n.ok) return n.error === 'inventario-lleno' ? t('avisos.inventarioLleno') : undefined
  if (n.eventos.some((e) => e.tipo === 'planton-perdido')) return t('avisos.plantonPerdido')
  return undefined
}
