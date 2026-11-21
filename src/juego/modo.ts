import type { Comando, EstadoJuego } from '../core'
import type { Almacen } from './almacen'
import type { TeclaEntrada } from './tiempo'

/**
 * Comando de modo que corresponde a una tecla (pura), o `undefined`.
 * Tab alterna entre Modo Vida y Modo Plano; ignora la repetición y las combinaciones con Ctrl/Alt/Meta.
 */
export function comandoDeTeclaModo(
  tecla: TeclaEntrada,
  estado: Pick<EstadoJuego, 'modo'>,
): Comando | undefined {
  if (tecla.code !== 'Tab') return undefined
  if (tecla.repeat || tecla.altKey || tecla.ctrlKey || tecla.metaKey) return undefined
  return { tipo: 'CambiarModo', modo: estado.modo === 'vida' ? 'plano' : 'vida' }
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

/** Escucha `keydown` y despacha el cambio de modo con Tab. Devuelve la función que quita el oyente. */
export function instalarTeclaModo(
  almacen: Almacen,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (enCampoDeTexto(e.target)) return
    // Tab siempre se atrapa (aunque sea repetición) para que el navegador no mueva el foco.
    if (e.code === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) e.preventDefault()
    const comando = comandoDeTeclaModo(e, almacen.estado)
    if (comando) almacen.despachar(comando)
  }
  objetivo.addEventListener('keydown', alPulsar)
  return () => objetivo.removeEventListener('keydown', alPulsar)
}
