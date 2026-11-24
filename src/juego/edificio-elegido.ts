import type { TipoEdificio } from '../core'

/**
 * Edificio elegido en el catálogo del Modo Plano. Es estado de interfaz, no de partida: la UI
 * lo escribe al hacer clic en una entrada y la colocación (M5-T03) lo lee. No pasa por el
 * núcleo ni se guarda.
 */
export type OyenteEdificioElegido = (tipo: TipoEdificio | null) => void

export interface CanalEdificioElegido {
  readonly actual: TipoEdificio | null
  elegir(tipo: TipoEdificio | null): void
  suscribir(oyente: OyenteEdificioElegido): () => void
}

export function crearCanalEdificioElegido(): CanalEdificioElegido {
  let actual: TipoEdificio | null = null
  const oyentes = new Set<OyenteEdificioElegido>()
  return {
    get actual() {
      return actual
    },
    elegir(tipo) {
      if (tipo === actual) return
      actual = tipo
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

/** Canal único de la aplicación, compartido por la UI y la escena. */
export const edificioElegido: CanalEdificioElegido = crearCanalEdificioElegido()
