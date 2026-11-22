import { materialesQueFaltan } from './catalogo'
import { MOTIVOS_COLOCACION, type MotivoColocacion } from './construccion'
import { comprobarConstruir } from './comandos'
import type { Coste, Rotacion, TipoEdificio } from './edificios'
import type { EstadoJuego } from './estado'

/**
 * Motivos que puede dar `comprobarConstruir`: los de colocación y los generales del comando
 * (modo, estado mal formado, límite de día, parámetros).
 */
export const MOTIVOS_VEREDICTO = [
  ...MOTIVOS_COLOCACION,
  'solo-en-plano',
  'estado-invalido',
  'limite-de-dia',
  'parametro-invalido',
] as const
export type MotivoVeredicto = MotivoColocacion | (typeof MOTIVOS_VEREDICTO)[number]

const SIN_FALTAN: Coste = { dinero: 0, madera: 0, piedra: 0 }

/** Veredicto de colocar un edificio: válido, o el motivo y lo que falta de dinero y materiales. */
export type Veredicto =
  | { readonly valida: true }
  | { readonly valida: false; readonly motivo: MotivoVeredicto; readonly faltan: Coste }

/**
 * Veredicto que muestra el fantasma del Modo Plano. Sale de `comprobarConstruir`, la misma
 * comprobación que hace el comando `Construir`: el fantasma es azul si y solo si `Construir`
 * tendría éxito. Añade las cantidades que faltan cuando el motivo es de fondos o materiales. Pura.
 */
export function veredictoColocacion(
  estado: EstadoJuego,
  tipo: TipoEdificio,
  x: number,
  y: number,
  rotacion: Rotacion,
): Veredicto {
  const error = comprobarConstruir(estado, tipo, x, y, rotacion)
  if (error === undefined) return { valida: true }
  const motivo: MotivoVeredicto = (MOTIVOS_VEREDICTO as readonly string[]).includes(error)
    ? (error as MotivoVeredicto)
    : 'estado-invalido'
  const falta = motivo === 'fondos-insuficientes' || motivo === 'materiales-insuficientes'
  return { valida: false, motivo, faltan: falta ? materialesQueFaltan(estado, tipo) : SIN_FALTAN }
}

/** ¿Dos veredictos dicen lo mismo? (para avisar a la interfaz solo si cambia) */
export function mismoVeredicto(a: Veredicto | null, b: Veredicto | null): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (a.valida || b.valida) return a.valida === b.valida
  return (
    a.motivo === b.motivo &&
    a.faltan.dinero === b.faltan.dinero &&
    a.faltan.madera === b.faltan.madera &&
    a.faltan.piedra === b.faltan.piedra
  )
}
