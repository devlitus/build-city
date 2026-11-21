/**
 * Un efecto temporal. El gestor lo anima mientras vive y lo termina siempre una sola vez, para
 * que libere lo que haya creado (objetos de la escena, geometrías, materiales).
 */
export interface Efecto {
  /** Segundos que dura. */
  readonly duracion: number
  /** Se llama cada fotograma con el tiempo transcurrido desde el alta (s), entre 0 y `duracion`. */
  actualizar(t: number): void
  /** Se llama una vez al acabar el efecto o al retirarlo: quita y libera todo lo suyo. */
  terminar(): void
}

/**
 * Lleva la cuenta de los efectos vivos. Pura: no sabe de three.js. Un efecto con `clave` sustituye
 * al anterior con la misma clave (p. ej. dos golpes seguidos al mismo árbol).
 */
export class GestorEfectos {
  readonly #vivos = new Map<number | string, { efecto: Efecto; edad: number }>()
  #siguiente = 0

  /** Cuántos efectos siguen vivos. */
  get vivos(): number {
    return this.#vivos.size
  }

  /** Da de alta un efecto; si ya había uno con la misma `clave`, ese se termina primero. */
  alta(efecto: Efecto, clave?: string): void {
    const id = clave ?? this.#siguiente++
    this.#vivos.get(id)?.efecto.terminar()
    this.#vivos.set(id, { efecto, edad: 0 })
    efecto.actualizar(0)
  }

  /** Avanza `dt` segundos y termina los efectos cuya duración se agotó. */
  actualizar(dt: number): void {
    for (const [id, v] of [...this.#vivos]) {
      v.edad += dt
      if (v.edad >= v.efecto.duracion) {
        this.#vivos.delete(id)
        v.efecto.terminar()
      } else {
        v.efecto.actualizar(v.edad)
      }
    }
  }

  /** Termina y retira todos los efectos (al destruir la escena). */
  limpiar(): void {
    const todos = [...this.#vivos.values()]
    this.#vivos.clear()
    for (const v of todos) v.efecto.terminar()
  }
}
