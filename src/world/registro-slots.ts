/**
 * Reparto de huecos (slots) de un `InstancedMesh` entre claves. Al quitar una clave el último
 * hueco ocupa su lugar, así los `count` primeros siempre están en uso. Pura, sin three.js.
 */
export class RegistroSlots {
  readonly #slotDe = new Map<number, number>()
  readonly #claves: number[] = []

  get cuenta(): number {
    return this.#claves.length
  }

  slotDe(clave: number): number | undefined {
    return this.#slotDe.get(clave)
  }

  /** Hueco de la clave; si no tenía, le da el siguiente libre (`nuevo: true`). */
  asignar(clave: number): { slot: number; nuevo: boolean } {
    const actual = this.#slotDe.get(clave)
    if (actual !== undefined) return { slot: actual, nuevo: false }
    const slot = this.#claves.length
    this.#claves.push(clave)
    this.#slotDe.set(clave, slot)
    return { slot, nuevo: true }
  }

  /**
   * Libera la clave. Devuelve `undefined` si no estaba; si no, `{ desde, hasta }`: el contenido
   * del hueco `desde` (el último) debe copiarse al hueco `hasta` (iguales si era el último).
   */
  quitar(clave: number): { desde: number; hasta: number } | undefined {
    const hasta = this.#slotDe.get(clave)
    if (hasta === undefined) return undefined
    const desde = this.#claves.length - 1
    const ultima = this.#claves[desde] as number
    this.#claves[hasta] = ultima
    this.#slotDe.set(ultima, hasta)
    this.#claves.pop()
    this.#slotDe.delete(clave)
    return { desde, hasta }
  }
}
