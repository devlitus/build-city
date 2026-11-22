import type { EventoJuego } from '../../core'

/*
 * Traduce los eventos del núcleo de golpear o quitar un obstáculo en lo que hay que dibujar y
 * hacer sonar. Pura: no sabe de three.js ni de audio.
 */

export type NombreSonido = 'golpe-madera' | 'golpe-piedra' | 'caida' | 'rotura'

export interface DescripcionGolpe {
  /** Casilla del obstáculo en el núcleo. */
  readonly x: number
  readonly y: number
  /** De qué está hecho: decide las partículas. */
  readonly material: 'madera' | 'piedra'
  /** `golpe` si el obstáculo sigue en pie; `quitado` si se acabó con él. */
  readonly fase: 'golpe' | 'quitado'
  /** Efecto sobre el árbol: sacudirlo, tumbarlo o nada (rocas, plantones y tocones). */
  readonly arbol: 'sacudir' | 'caer' | 'ninguno'
  readonly sonido: NombreSonido
}

/** Qué se dibuja y suena para un evento, o `undefined` si el evento no es de golpes. */
export function describirGolpe(e: EventoJuego): DescripcionGolpe | undefined {
  if (e.tipo !== 'obstaculo-golpeado' && e.tipo !== 'obstaculo-quitado') return undefined
  const material = e.obstaculo === 'roca' ? 'piedra' : 'madera'
  const esArbol = e.obstaculo === 'arbol'
  if (e.tipo === 'obstaculo-golpeado') {
    return {
      x: e.x,
      y: e.y,
      material,
      fase: 'golpe',
      arbol: esArbol ? 'sacudir' : 'ninguno',
      sonido: material === 'piedra' ? 'golpe-piedra' : 'golpe-madera',
    }
  }
  return {
    x: e.x,
    y: e.y,
    material,
    fase: 'quitado',
    arbol: esArbol ? 'caer' : 'ninguno',
    sonido: esArbol ? 'caida' : 'rotura',
  }
}
