import type { EventoJuego } from '../../core'

/** Casilla regada por un evento `tierra-regada`, o `undefined` si el evento es de otra cosa. */
export function describirRiego(
  e: EventoJuego,
): { readonly x: number; readonly y: number } | undefined {
  return e.tipo === 'tierra-regada' ? { x: e.x, y: e.y } : undefined
}

/** Casillas regadas por todos los eventos de una notificación (una por evento, en orden). */
export function casillasRegadas(
  eventos: readonly EventoJuego[],
): { readonly x: number; readonly y: number }[] {
  return eventos.flatMap((e) => {
    const r = describirRiego(e)
    return r ? [r] : []
  })
}
