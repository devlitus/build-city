import { girar, mismoVeredicto, type Rotacion, type Veredicto } from '../core'
import type { CanalEdificioElegido } from './edificio-elegido'
import type { CanalHerramientaPlano } from './herramienta-plano'

/**
 * Estado de interfaz de la colocación de edificios (no es estado de partida): giro elegido y
 * veredicto del fantasma. La escena escribe el veredicto cada vez que cambia y la UI lo lee para
 * mostrar el motivo del rechazo; el teclado (R) gira.
 */
export interface EstadoColocacionUi {
  readonly rotacion: Rotacion
  /** `null` si no hay fantasma (otra herramienta o cursor fuera del valle). */
  readonly veredicto: Veredicto | null
}

export type OyenteColocacion = (estado: EstadoColocacionUi) => void

export interface CanalColocacion extends EstadoColocacionUi {
  girar(): void
  /** Fija el giro (al coger un edificio para moverlo empieza con el que ya tenía). */
  fijarRotacion(rotacion: Rotacion): void
  fijarVeredicto(veredicto: Veredicto | null): void
  /** Quita el veredicto y vuelve al giro 0. */
  reiniciar(): void
  suscribir(oyente: OyenteColocacion): () => void
}

export function crearCanalColocacion(): CanalColocacion {
  let rotacion: Rotacion = 0
  let veredicto: Veredicto | null = null
  const oyentes = new Set<OyenteColocacion>()
  const avisar = (): void => {
    for (const o of [...oyentes]) o({ rotacion, veredicto })
  }
  return {
    get rotacion() {
      return rotacion
    },
    get veredicto() {
      return veredicto
    },
    girar() {
      rotacion = girar(rotacion)
      avisar()
    },
    fijarRotacion(nueva) {
      if (nueva === rotacion) return
      rotacion = nueva
      avisar()
    },
    fijarVeredicto(nuevo) {
      if (mismoVeredicto(veredicto, nuevo)) return
      veredicto = nuevo
      avisar()
    },
    reiniciar() {
      if (rotacion === 0 && veredicto === null) return
      rotacion = 0
      veredicto = null
      avisar()
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
  }
}

/** Canal único de la aplicación, compartido por la escena, el teclado y la UI. */
export const colocacion: CanalColocacion = crearCanalColocacion()

/**
 * Une el catálogo con la herramienta Construir: elegir un edificio activa `construir`; salir de
 * `construir` (Esc, Z, salir del Plano…) o desmarcarlo (volver a elegirlo) limpia el edificio
 * elegido y vuelve a `parcelas`. Devuelve la función que quita los oyentes.
 */
export function enlazarConstruccion(
  edificio: CanalEdificioElegido,
  herramienta: CanalHerramientaPlano,
  canal: CanalColocacion = colocacion,
): () => void {
  const bajaEdificio = edificio.suscribir((tipo) => {
    if (tipo !== null) herramienta.elegirHerramienta('construir')
    else if (herramienta.herramienta === 'construir') herramienta.elegirHerramienta('parcelas')
  })
  const bajaHerramienta = herramienta.suscribir(({ herramienta: h }) => {
    if (h === 'construir') return
    edificio.elegir(null)
    canal.reiniciar()
  })
  return () => {
    bajaEdificio()
    bajaHerramienta()
  }
}
