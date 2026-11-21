import type { Notificacion } from '../../juego/almacen'
import type { EstadoJuego } from '../../core/estado'
import { comprobarUsarHerramienta } from '../../core/herramientas'
import { objetivoDelante } from '../../core/objetivo'
import { golpearia, golpesNecesarios, terrenoDeCasilla } from '../../core/recursos'
import { t } from '../textos'

/**
 * Aviso contextual (abajo, sobre la barra): qué hará **E** con la herramienta activa, o `undefined`
 * si no hay acción posible. Usa `objetivoDelante` (la casilla a la que apunta E) y
 * `comprobarUsarHerramienta` (la misma regla que el comando), así que nunca miente.
 * El núcleo no distingue especies de árbol (solo `variante` numérica): se dice «árbol».
 */
export function avisoContextual(estado: EstadoJuego): string | undefined {
  const { personaje } = estado
  const objetivo = objetivoDelante(personaje, personaje.orientacion, estado)
  if (objetivo.tipo !== 'obstaculo') return undefined
  const { x, y, obstaculo: o } = objetivo
  if (!golpearia(estado, x, y)) return undefined
  const error = comprobarUsarHerramienta(estado, x, y)
  if (error === 'sin-energia') return t('aviso.cansancio')
  if (error) return undefined
  if (o.tipo === 'roca') return t('aviso.picarRoca')
  if (o.tipo === 'tocon') return t('aviso.quitarTocon')
  if (o.tipo === 'planton') return t('aviso.arrancarPlanton')
  const terreno = terrenoDeCasilla(estado, x, y)
  if (!terreno) return undefined
  const dados = Number.isSafeInteger(o.golpes) ? (o.golpes as number) : 0
  const restantes = Math.max(1, golpesNecesarios(o, terreno) - dados)
  return restantes === 1 ? t('aviso.talarArbolUno') : t('aviso.talarArbol', { golpes: restantes })
}

/** Mensaje flotante al recoger («+4 madera, +1 plantón») a partir de `obstaculo-quitado`, o `undefined`. */
export function textoRecogida(n: Notificacion): string | undefined {
  if (!n.ok) return undefined
  let madera = 0
  let piedra = 0
  let plantones = 0
  for (const e of n.eventos) {
    if (e.tipo !== 'obstaculo-quitado') continue
    madera += e.madera
    piedra += e.piedra
    plantones += e.plantones
  }
  const partes: string[] = []
  if (madera > 0) partes.push(t('aviso.madera', { n: madera }))
  if (piedra > 0) partes.push(t('aviso.piedra', { n: piedra }))
  if (plantones > 0) partes.push(t('aviso.planton', { n: plantones }))
  return partes.length > 0 ? partes.join(', ') : undefined
}
