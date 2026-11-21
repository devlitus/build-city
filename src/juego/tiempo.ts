import { CONFIG_TIEMPO, type Comando, type EstadoJuego } from '../core'
import type { Almacen } from './almacen'

/** Lo mínimo que se lee de un `KeyboardEvent` (sin DOM, para poder probarlo). */
export interface TeclaEntrada {
  readonly code: string
  readonly altKey: boolean
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly repeat: boolean
}

const DIGITO = /^(?:Digit|Numpad)([1-9])$/

/**
 * Comando de tiempo que corresponde a una tecla (pura), o `undefined`.
 * Espacio alterna pausa; Alt+1/2/3 elige la velocidad (los números solos son herramientas).
 */
export function comandoDeTecla(
  tecla: TeclaEntrada,
  estado: Pick<EstadoJuego, 'pausado'>,
  velocidades: readonly number[] = CONFIG_TIEMPO.velocidades,
): Comando | undefined {
  if (tecla.ctrlKey || tecla.metaKey) return undefined
  if (tecla.code === 'Space') {
    if (tecla.altKey || tecla.repeat) return undefined
    return { tipo: estado.pausado ? 'Reanudar' : 'Pausar' }
  }
  if (!tecla.altKey) return undefined
  const m = DIGITO.exec(tecla.code)
  if (!m) return undefined
  const velocidad = velocidades[Number(m[1]) - 1]
  if (velocidad === undefined) return undefined
  return { tipo: 'CambiarVelocidad', velocidad }
}

function enCampoDeTexto(destino: EventTarget | null): boolean {
  const el = destino as { tagName?: string; isContentEditable?: boolean } | null
  const etiqueta = el?.tagName?.toUpperCase()
  return (
    etiqueta === 'INPUT' ||
    etiqueta === 'TEXTAREA' ||
    etiqueta === 'SELECT' ||
    !!el?.isContentEditable
  )
}

/** Escucha `keydown` y despacha pausa y velocidad. Devuelve la función que quita el oyente. */
export function instalarTeclasTiempo(
  almacen: Almacen,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (enCampoDeTexto(e.target)) return
    const comando = comandoDeTecla(e, almacen.estado)
    if (!comando) return
    e.preventDefault()
    almacen.despachar(comando)
  }
  objetivo.addEventListener('keydown', alPulsar)
  return () => objetivo.removeEventListener('keydown', alPulsar)
}
