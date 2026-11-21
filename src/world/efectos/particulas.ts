import { hash } from '../dispersion'

/*
 * Partículas de astillas y de piedra: simulación pura (sin three.js, sin Math.random). La
 * variación sale de un hash con semilla, así la misma ráfaga da siempre las mismas partículas.
 */

export interface Particula {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** Segundos vividos. */
  edad: number
  /** Segundos que vive. */
  readonly vida: number
  /** Lado inicial del cubito (m). */
  readonly tamano: number
  /** Nombre del color en `data/paleta.json`. */
  readonly color: string
}

export type ParticulaNueva = Omit<Particula, 'edad'>

/** Parámetros de una clase de partículas (`data/efectos.json`). */
export interface TipoParticula {
  readonly cantidadGolpe: number
  readonly cantidadRotura: number
  /** Altura sobre el suelo desde la que salen (m). */
  readonly alturaOrigen: number
  /** Velocidad horizontal máxima (m/s). */
  readonly rapidez: number
  /** Velocidad vertical inicial máxima (m/s); la mínima es la mitad. */
  readonly impulsoVertical: number
  readonly vida: number
  readonly tamano: number
  readonly colores: readonly string[]
}

/**
 * Ráfaga de partículas desde `origen`, repartidas por todo el círculo. `semilla` distingue unas
 * ráfagas de otras. Devuelve `cantidad` partículas (nunca negativo).
 */
export function crearRafaga(
  origen: { readonly x: number; readonly y: number; readonly z: number },
  cantidad: number,
  tipo: TipoParticula,
  semilla: number,
): ParticulaNueva[] {
  const lista: ParticulaNueva[] = []
  for (let i = 0; i < Math.max(0, Math.floor(cantidad)); i++) {
    const angulo = hash(semilla, i, 1) * Math.PI * 2
    const fuerza = tipo.rapidez * (0.4 + 0.6 * hash(semilla, i, 2))
    const colorIndice = Math.min(
      tipo.colores.length - 1,
      Math.floor(hash(semilla, i, 3) * tipo.colores.length),
    )
    lista.push({
      x: origen.x,
      y: origen.y,
      z: origen.z,
      vx: Math.cos(angulo) * fuerza,
      vy: tipo.impulsoVertical * (0.5 + 0.5 * hash(semilla, i, 4)),
      vz: Math.sin(angulo) * fuerza,
      vida: tipo.vida * (0.7 + 0.3 * hash(semilla, i, 5)),
      tamano: tipo.tamano * (0.6 + 0.4 * hash(semilla, i, 6)),
      color: tipo.colores[colorIndice] ?? 'madera',
    })
  }
  return lista
}

/** Escala (1 a 0) de una partícula según su edad: encoge hasta desaparecer. */
export function escalaParticula(edad: number, vida: number): number {
  if (!(vida > 0)) return 0
  return Math.max(0, 1 - edad / vida)
}

/**
 * Conjunto de partículas vivas con tope de capacidad (las nuevas que no caben se descartan, para
 * acotar el coste). Una partícula se retira al agotar su vida o al tocar `sueloY`.
 */
export class SistemaParticulas {
  readonly #vivas: Particula[] = []
  readonly #capacidad: number
  readonly #gravedad: number

  constructor(capacidad: number, gravedad: number) {
    this.#capacidad = capacidad
    this.#gravedad = gravedad
  }

  get vivas(): readonly Particula[] {
    return this.#vivas
  }

  emitir(nuevas: readonly ParticulaNueva[]): void {
    for (const p of nuevas) {
      if (this.#vivas.length >= this.#capacidad) return
      this.#vivas.push({ ...p, edad: 0 })
    }
  }

  actualizar(dt: number, sueloY: (x: number, z: number) => number = () => -Infinity): void {
    let escritas = 0
    for (const p of this.#vivas) {
      p.edad += dt
      p.vy -= this.#gravedad * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      const suelo = sueloY(p.x, p.z)
      if (p.edad >= p.vida || p.y < suelo) continue
      this.#vivas[escritas++] = p
    }
    this.#vivas.length = escritas
  }

  limpiar(): void {
    this.#vivas.length = 0
  }
}
