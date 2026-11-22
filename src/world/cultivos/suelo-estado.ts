import { CARACTER_REGADA, esCaracterArada } from '../../core/tierra'

/** Casilla arada que hay que dibujar (casilla global del núcleo). */
export interface CasillaSuelo {
  readonly x: number
  readonly y: number
  readonly regada: boolean
}

/** Tono de la tierra: seca (arada sin regar hoy) o regada hoy. */
export type TonoSuelo = 'seca' | 'regada'

export const tonoSuelo = (c: CasillaSuelo): TonoSuelo => (c.regada ? 'regada' : 'seca')

/** Casillas aradas de la cadena `tierra` (en orden de índice) y si están regadas hoy. */
export function casillasSuelo(tierra: string, lado: number): CasillaSuelo[] {
  const lista: CasillaSuelo[] = []
  for (let i = 0; i < tierra.length; i++) {
    const c = tierra[i]
    if (!esCaracterArada(c)) continue
    lista.push({ x: i % lado, y: Math.floor(i / lado), regada: c === CARACTER_REGADA })
  }
  return lista
}
