import {
  catalogo,
  MATERIALES,
  type EstadoCatalogo,
  type MotivoCatalogo,
  type TipoEdificio,
} from '../../core'

export interface LineaCoste {
  readonly clave: 'dinero' | (typeof MATERIALES)[number]
  readonly cantidad: number
  /** Lo que te falta de esta cosa (0 si llegas); la UI lo pinta en rojo si > 0. */
  readonly falta: number
}

export interface EntradaPanelCatalogo {
  readonly tipo: TipoEdificio
  readonly ancho: number
  readonly alto: number
  readonly dias: number
  /** Solo las partidas con coste > 0 (la casa no muestra líneas). */
  readonly costes: readonly LineaCoste[]
  readonly motivo: MotivoCatalogo | undefined
}

/** Lo que muestra el catálogo de cada edificio, a partir del estado. Pura; no decide reglas. */
export function datosPanelCatalogo(estado: EstadoCatalogo): readonly EntradaPanelCatalogo[] {
  return catalogo(estado).map((e) => {
    const lineas: LineaCoste[] = [
      { clave: 'dinero', cantidad: e.def.coste.dinero, falta: e.faltan.dinero },
      ...MATERIALES.map((m) => ({ clave: m, cantidad: e.def.coste[m], falta: e.faltan[m] })),
    ]
    return {
      tipo: e.tipo,
      ancho: e.def.ancho,
      alto: e.def.alto,
      dias: e.def.dias,
      costes: lineas.filter((l) => l.cantidad > 0),
      motivo: e.motivo,
    }
  })
}
