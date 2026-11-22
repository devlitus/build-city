/** Caché de modelos sobre una función de carga inyectable: cada clave se carga una sola vez. */
export interface CacheModelos<T> {
  /** Devuelve la promesa memoizada: la carga se lanza solo la primera vez. */
  pedir(clave: string): Promise<T>
  /** El modelo si ya terminó de cargar; `undefined` mientras carga (o si falló). */
  listo(clave: string): T | undefined
}

export function crearCacheModelos<T>(cargar: (clave: string) => Promise<T>): CacheModelos<T> {
  const promesas = new Map<string, Promise<T>>()
  const cargados = new Map<string, T>()
  return {
    pedir(clave) {
      let promesa = promesas.get(clave)
      if (!promesa) {
        promesa = cargar(clave).then(
          (modelo) => {
            cargados.set(clave, modelo)
            return modelo
          },
          (error: unknown) => {
            // Un fallo no se memoiza: se podrá reintentar.
            promesas.delete(clave)
            throw error
          },
        )
        promesas.set(clave, promesa)
      }
      return promesa
    },
    listo(clave) {
      return cargados.get(clave)
    },
  }
}
