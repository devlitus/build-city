import type { Comando, Valle } from '../core'
import type { Almacen } from './almacen'

type ComandoPintar = Extract<Comando, { tipo: 'PintarZona' }>

/** Tecla del atajo de desarrollo que pinta zona de cultivo en las parcelas propias. */
export const TECLA_PINTAR_CULTIVO = 'F6'

/**
 * Comandos `PintarZona` (zona cultivo) que cubren cada parcela propia entera (esquinas inclusivas
 * en casillas globales). Pura. Solo para el atajo de desarrollo: la UI de zonas llega con M5.
 */
export function comandosCultivoEnParcelasPropias(
  valle: Pick<Valle, 'parcelas' | 'parcelasPorLado' | 'casillasPorParcela'>,
): readonly ComandoPintar[] {
  const c = valle.casillasPorParcela
  const comandos: ComandoPintar[] = []
  for (const p of valle.parcelas) {
    if (p.estado !== 'propia') continue
    comandos.push({
      tipo: 'PintarZona',
      x0: p.columna * c,
      y0: p.fila * c,
      x1: p.columna * c + c - 1,
      y1: p.fila * c + c - 1,
      zona: 'cultivo',
    })
  }
  return comandos
}

/**
 * Solo desarrollo: **F6** pinta zona de cultivo en todas las parcelas propias para poder arar sin
 * la UI de zonas. Devuelve la función que quita el oyente.
 */
export function instalarAtajosDepuracion(
  almacen: Pick<Almacen, 'estado' | 'despachar'>,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (e.code !== TECLA_PINTAR_CULTIVO || e.repeat) return
    e.preventDefault()
    for (const comando of comandosCultivoEnParcelasPropias(almacen.estado.valle)) {
      almacen.despachar(comando)
    }
  }
  objetivo.addEventListener('keydown', alPulsar)
  return () => objetivo.removeEventListener('keydown', alPulsar)
}
