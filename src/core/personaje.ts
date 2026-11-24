import { CONFIG_PERSONAJE } from './datos/personaje'
import type { Casilla, Lado } from './rio'
import { moverCirculo } from './colision'
import { mapaTransitabilidad, type DatosMapa } from './mapa'

export type Orientacion = Lado

/** Posición continua (centro de la caja) en unidades de casilla, y hacia dónde mira. */
export interface Personaje {
  readonly x: number
  readonly y: number
  readonly orientacion: Orientacion
}

/** Orientación con la que aparece (y reaparece tras un desmayo). */
export const ORIENTACION_INICIAL: Orientacion = 'sur'

/** Desplazamiento en casillas hacia el que mira cada orientación (el eje Y crece hacia el sur). */
const HACIA: Readonly<Record<Orientacion, Casilla>> = {
  norte: { x: 0, y: -1 },
  sur: { x: 0, y: 1 },
  este: { x: 1, y: 0 },
  oeste: { x: -1, y: 0 },
}

/**
 * Casilla «de enfrente»: la contigua a la del personaje en la dirección en que mira. Es sobre la
 * que actuarán las herramientas (M5-01). Función pura; no comprueba que esté dentro del valle.
 */
export function casillaDeEnfrente(p: Personaje): Casilla {
  const d = HACIA[p.orientacion]
  return { x: Math.floor(p.x) + d.x, y: Math.floor(p.y) + d.y }
}

export function personajeEnAparicion(aparicion: DatosMapa['aparicion']): Personaje {
  return { x: aparicion.x, y: aparicion.y, orientacion: ORIENTACION_INICIAL }
}

/**
 * Mueve al personaje `ms` milisegundos con la intención `(dx, dy)`, ya validada
 * (componentes en [-1, 1], `ms` finito y ≥ 0). Se normaliza si su módulo supera 1 para que la
 * diagonal no sea más rápida. Velocidad de andar o de correr según `corre`. Colisión círculo contra
 * cajas (`colision.ts`): al chocar se empuja por la normal y se desliza a lo largo de la pared.
 * `factorVelocidad` (por defecto 1) multiplica la velocidad de todo el paso; quien llama lo calcula
 * con `factorVelocidadEn` (camino bajo el centro del personaje al INICIO del paso). El camino no
 * entra en la colisión.
 */
export function moverPersonaje(
  datos: DatosMapa,
  personaje: Personaje,
  dx: number,
  dy: number,
  ms: number,
  config = CONFIG_PERSONAJE,
  corre = false,
  factorVelocidad = 1,
): Personaje {
  const largo = Math.sqrt(dx * dx + dy * dy)
  if (largo === 0) return personaje
  const ux = largo > 1 ? dx / largo : dx
  const uy = largo > 1 ? dy / largo : dy
  const orientacion: Orientacion =
    Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'este' : 'oeste') : dy > 0 ? 'sur' : 'norte'
  const mapa = mapaTransitabilidad(datos)
  const enMs = Math.min(ms, config.maxMsPorComando)
  const velocidad = (corre ? config.velocidadCorrer : config.velocidadAndar) * factorVelocidad
  const distancia = (velocidad * enMs) / 1000
  const { x, y } = moverCirculo(
    mapa,
    personaje.x,
    personaje.y,
    ux * distancia,
    uy * distancia,
    config.radio,
  )
  return { x, y, orientacion }
}
