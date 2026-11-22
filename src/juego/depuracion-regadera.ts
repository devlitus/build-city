import type { Comando } from '../core'
import type { Almacen } from './almacen'
import type { TeclaEntrada } from './tiempo'

/** Comando que corresponde a la tecla de depuración (F8: mejorar la regadera), o `undefined`. */
export function comandoDeTeclaRegadera(tecla: TeclaEntrada): Comando | undefined {
  if (tecla.code !== 'F8') return undefined
  if (tecla.repeat || tecla.altKey || tecla.ctrlKey || tecla.metaKey) return undefined
  return { tipo: 'MejorarRegadera' }
}

/**
 * Atajo SOLO de desarrollo: F8 sube la regadera al nivel 2 (3×3). Provisional hasta M8, cuando
 * se compre en el pueblo. Devuelve la función que quita el oyente.
 */
export function instalarAtajoRegadera(
  almacen: Almacen,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    const comando = comandoDeTeclaRegadera(e)
    if (!comando) return
    e.preventDefault()
    almacen.despachar(comando)
  }
  objetivo.addEventListener('keydown', alPulsar)
  return () => objetivo.removeEventListener('keydown', alPulsar)
}
