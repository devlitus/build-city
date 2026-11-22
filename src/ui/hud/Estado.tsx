import type { FuenteEstado } from '../fuente'
import { BarraEnergia } from './BarraEnergia'
import { Monedas } from './Monedas'

/** Alto reservado arriba a la derecha por la columna de estado (monedas + energía), en px. */
export const ALTO_COLUMNA_ESTADO = 132

/**
 * Columna de estado arriba a la derecha: monedas (M4-T07) y energía (M3), apiladas para que no
 * se solapen. Los paneles que se abren en esa esquina empiezan debajo (`ALTO_COLUMNA_ESTADO`).
 */
export function Estado({ almacen }: { readonly almacen: FuenteEstado }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '14px',
        right: '14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <Monedas almacen={almacen} />
      <BarraEnergia almacen={almacen} />
    </div>
  )
}
