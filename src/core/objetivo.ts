import { CONFIG_HERRAMIENTAS } from './datos/herramientas'
import type { ConfigHerramientas } from './datos/esquemas'
import type { Obstaculo } from './decoracion'
import type { EstadoJuego } from './estado'
import { casillaAlAlcance } from './herramientas'
import type { Herramienta } from './inventario'
import { casillaDeEnfrente, type Orientacion } from './personaje'

/** Lo que apunta el granjero: un obstáculo del cono frontal o, si no hay, la casilla de enfrente. */
export type Objetivo =
  | {
      readonly tipo: 'obstaculo'
      readonly x: number
      readonly y: number
      readonly obstaculo: Obstaculo
    }
  | { readonly tipo: 'casilla'; readonly x: number; readonly y: number }

/** Herramientas que trabajan siempre el suelo de enfrente (ignoran los obstáculos del cono). */
const HERRAMIENTAS_DE_CULTIVO: readonly Herramienta[] = ['azada', 'semillas', 'regadera', 'mano']

/** ¿Es una herramienta de cultivo (azada, semillas, regadera o mano)? */
export const esHerramientaDeCultivo = (h: unknown): boolean =>
  (HERRAMIENTAS_DE_CULTIVO as readonly unknown[]).includes(h)

/** Vector unitario hacia el que mira cada orientación (el eje Y crece hacia el sur). */
const VECTOR: Readonly<Record<Orientacion, { x: number; y: number }>> = {
  norte: { x: 0, y: -1 },
  sur: { x: 0, y: 1 },
  este: { x: 1, y: 0 },
  oeste: { x: -1, y: 0 },
}

/**
 * Objetivo delante del personaje: el obstáculo más cercano (centro de su casilla) dentro del cono
 * frontal (apertura `anguloCono`, distancia ≤ `alcance`); si no hay ninguno, la casilla de enfrente.
 * Solo se eligen casillas que `UsarHerramienta` acepta por alcance (`casillaAlAlcance`). Puro.
 * Con empate de distancia gana el primero de `estado.obstaculos`.
 * Si `estado.herramienta` es de cultivo (azada, semillas, regadera, mano) no se miran los
 * obstáculos: siempre devuelve la casilla de suelo de enfrente (orientación de 4 lados, #107).
 */
export function objetivoDelante(
  posicion: { readonly x: number; readonly y: number },
  direccion: Orientacion,
  estado: Pick<EstadoJuego, 'obstaculos'> & Partial<Pick<EstadoJuego, 'herramienta'>>,
  alcance: ConfigHerramientas = CONFIG_HERRAMIENTAS,
): Objetivo {
  if (esHerramientaDeCultivo(estado.herramienta)) {
    const c = casillaDeEnfrente({ x: posicion.x, y: posicion.y, orientacion: direccion })
    return { tipo: 'casilla', x: c.x, y: c.y }
  }
  const d = VECTOR[direccion]
  const cosMin = Math.cos((alcance.anguloCono / 2) * (Math.PI / 180))
  let mejor: Obstaculo | null = null
  let mejorDist = Infinity
  for (const o of estado.obstaculos) {
    if (!casillaAlAlcance(posicion, o.x, o.y)) continue
    const vx = o.x + 0.5 - posicion.x
    const vy = o.y + 0.5 - posicion.y
    const dist = Math.hypot(vx, vy)
    if (dist > alcance.alcance) continue
    if (dist > 1e-9 && (vx * d.x + vy * d.y) / dist < cosMin - 1e-9) continue
    if (dist < mejorDist) {
      mejor = o
      mejorDist = dist
    }
  }
  if (mejor) return { tipo: 'obstaculo', x: mejor.x, y: mejor.y, obstaculo: mejor }
  const c = casillaDeEnfrente({ x: posicion.x, y: posicion.y, orientacion: direccion })
  return { tipo: 'casilla', x: c.x, y: c.y }
}
