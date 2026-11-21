/**
 * Parcela seleccionada en Modo Plano. Es estado de interfaz, no de partida: la escena lo escribe
 * al hacer clic y la UI lo lee para abrir el panel. No pasa por el núcleo ni se guarda.
 */
export type OyenteSeleccion = (indice: number | null) => void

export interface CanalSeleccionParcela {
  readonly actual: number | null
  seleccionar(indice: number | null): void
  suscribir(oyente: OyenteSeleccion): () => void
}

export function crearCanalSeleccionParcela(): CanalSeleccionParcela {
  let actual: number | null = null
  const oyentes = new Set<OyenteSeleccion>()
  return {
    get actual() {
      return actual
    },
    seleccionar(indice) {
      if (indice === actual) return
      actual = indice
      for (const o of [...oyentes]) o(actual)
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
  }
}

/** Canal único de la aplicación, compartido por la escena y la UI. */
export const seleccionParcela: CanalSeleccionParcela = crearCanalSeleccionParcela()
