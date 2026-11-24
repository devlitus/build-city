import {
  parcelaComprable,
  type Agua,
  type EstadoJuego,
  type Fertilidad,
  type MotivoNoComprable,
  type Terreno,
} from '../../core'

export interface DatosPanelParcela {
  readonly indice: number
  readonly terreno: Terreno
  readonly fertilidad: Fertilidad
  readonly agua: Agua
  readonly propia: boolean
  /** Precio que cobraría el núcleo ahora; `undefined` si es propia o el estado es inválido. */
  readonly precio: number | undefined
  readonly comprable: boolean
  readonly motivo: MotivoNoComprable | undefined
  /** Monedas que faltan (solo con `fondos-insuficientes`); 0 en cualquier otro caso. */
  readonly falta: number
}

/** Todo lo que muestra el panel de una parcela, a partir del estado. Pura; no decide reglas. */
export function datosPanelParcela(
  estado: Pick<EstadoJuego, 'valle' | 'comprasHechas' | 'dinero'>,
  indice: number,
): DatosPanelParcela | undefined {
  const parcela = estado.valle.parcelas[indice]
  if (!parcela) return undefined
  const c = parcelaComprable(estado, indice)
  const precio = c.precio
  return {
    indice,
    terreno: parcela.terreno,
    fertilidad: parcela.fertilidad,
    agua: parcela.agua,
    propia: parcela.estado === 'propia',
    precio,
    comprable: c.comprable,
    motivo: c.comprable ? undefined : c.motivo,
    falta:
      !c.comprable && c.motivo === 'fondos-insuficientes' && precio !== undefined
        ? precio - estado.dinero
        : 0,
  }
}
