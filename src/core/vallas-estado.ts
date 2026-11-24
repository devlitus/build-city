/**
 * Vallas y puertas (M6-T01). Representación compacta, como `zonas` y `tierra`:
 * `EstadoJuego.vallas` es una cadena de `lado*lado` caracteres (índice y*lado+x):
 * `.` nada, `v` valla (bloquea el paso) y `p` puerta (ocupa la casilla pero deja pasar).
 *
 * Este módulo solo tiene lo mínimo que comparten `estado`, `construccion` y `labranza`; las reglas
 * y los comandos viven en `vallas.ts`.
 */
export const TIPOS_VALLA = ['valla', 'puerta'] as const
export type TipoValla = (typeof TIPOS_VALLA)[number]

export const CARACTER_SIN_VALLA = '.'
export const CARACTER_VALLA: Readonly<Record<TipoValla, string>> = { valla: 'v', puerta: 'p' }

/** Cadena de vallas vacía para un valle de `lado` casillas por lado. */
export function vallasVacias(lado: number): string {
  return CARACTER_SIN_VALLA.repeat(lado * lado)
}

/** Tipo de lo que hay en la casilla `i` (índice y*lado+x), o `undefined` si no hay nada. */
export function vallaEn(vallas: string | undefined, i: number): TipoValla | undefined {
  const c = vallas?.[i]
  return TIPOS_VALLA.find((t) => CARACTER_VALLA[t] === c)
}

/** ¿Hay valla o puerta en la casilla `i`? (ambas ocupan la casilla). */
export const hayValla = (vallas: string | undefined, i: number): boolean =>
  vallaEn(vallas, i) !== undefined

/** Índices de las casillas con valla (las puertas no bloquean el paso). */
export function casillasConValla(vallas: string | undefined): number[] {
  const r: number[] = []
  if (!vallas) return r
  for (let i = 0; i < vallas.length; i++) if (vallas[i] === CARACTER_VALLA.valla) r.push(i)
  return r
}
