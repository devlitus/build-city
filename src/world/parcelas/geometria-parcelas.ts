import type { Valle } from '../../core'
import { ladoMetros } from '../terreno/coordenadas'

export interface PuntoSuelo {
  readonly x: number
  readonly z: number
}

/** Centro de una parcela en metros. */
export function centroParcela(valle: Valle, indice: number): PuntoSuelo | undefined {
  const p = valle.parcelas[indice]
  if (!p) return undefined
  const c = valle.casillasPorParcela
  const mitad = ladoMetros(valle) / 2
  return { x: (p.columna + 0.5) * c - mitad, z: (p.fila + 0.5) * c - mitad }
}

/** Esquinas de las parcelas propias en metros, sin repetir las compartidas. Orden estable. */
export function esquinasPropias(valle: Valle): PuntoSuelo[] {
  const c = valle.casillasPorParcela
  const mitad = ladoMetros(valle) / 2
  const vistas = new Set<string>()
  const salida: PuntoSuelo[] = []
  for (const p of valle.parcelas) {
    if (p.estado !== 'propia') continue
    for (const df of [0, 1])
      for (const dc of [0, 1]) {
        const clave = `${p.fila + df},${p.columna + dc}`
        if (vistas.has(clave)) continue
        vistas.add(clave)
        salida.push({ x: (p.columna + dc) * c - mitad, z: (p.fila + df) * c - mitad })
      }
  }
  return salida
}

/** Escala (0..1) de la animación de aparición con `t` s transcurridos; sube con salida suave. */
export function escalaAparicion(t: number, duracion: number): number {
  if (!(t > 0)) return 0
  if (t >= duracion) return 1
  const u = t / duracion
  return 1 - (1 - u) * (1 - u)
}
