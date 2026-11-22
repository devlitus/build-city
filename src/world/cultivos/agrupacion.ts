import { CULTIVOS, defCultivo, diasHastaMadurar, type Cultivo, type Planta } from '../../core'
import type { FaseVisual } from './modelos'

/** Casilla ocupada por una planta: coordenadas globales y su índice y*lado+x. */
export interface CasillaPlanta {
  readonly x: number
  readonly y: number
  readonly indice: number
}

/** Plantas que comparten modelo: mismo cultivo y fase (el marchito es común a todos los cultivos). */
export interface GrupoPlantas {
  readonly clave: string
  /** `null` en el grupo de marchitas. */
  readonly cultivo: Cultivo | null
  readonly fase: FaseVisual
  readonly casillas: readonly CasillaPlanta[]
}

export type GruposPlantas = ReadonlyMap<string, GrupoPlantas>

/** Clave del grupo de un (cultivo, fase). */
export const claveGrupo = (cultivo: Cultivo | null, fase: FaseVisual): string =>
  fase === 'marchito' || cultivo === null ? 'marchito' : `${cultivo}/${fase}`

/**
 * Fase de arte de una planta: marchita => 'marchito'; si no, según los días de crecimiento
 * acumulados: antes de terminar la primera fase de `diasPorFase` es 'brote', hasta madurar
 * 'crecimiento' y con todos los días cumplidos 'maduro'. La fresa que rebrota vuelve a
 * `dias = maduración - rebrota.dias`, que cae en la última fase de crecimiento: se dibuja como
 * 'crecimiento' (no vuelve a brote) hasta que vuelve a madurar. Un cultivo desconocido da `undefined`.
 */
export function faseVisualDePlanta(planta: Planta): FaseVisual | undefined {
  const def = defCultivo(CULTIVOS[planta[1]])
  if (!def) return undefined
  if (planta[5] === 1) return 'marchito'
  const dias = planta[2]
  if (dias >= diasHastaMadurar(def)) return 'maduro'
  return dias < (def.diasPorFase[0] ?? 0) ? 'brote' : 'crecimiento'
}

/**
 * Agrupa las plantas por (cultivo, fase). Las casillas de cada grupo conservan el orden de la lista
 * (el núcleo la guarda por casilla ascendente). Solo hay grupos con al menos una planta. Las
 * plantas de cultivo desconocido se ignoran.
 */
export function agruparPlantas(plantas: readonly Planta[], lado: number): GruposPlantas {
  const grupos = new Map<
    string,
    { cultivo: Cultivo | null; fase: FaseVisual; casillas: CasillaPlanta[] }
  >()
  for (const p of plantas) {
    const fase = faseVisualDePlanta(p)
    const cultivo = CULTIVOS[p[1]]
    if (!fase || !cultivo) continue
    const clave = claveGrupo(cultivo, fase)
    let g = grupos.get(clave)
    if (!g) {
      g = { cultivo: fase === 'marchito' ? null : cultivo, fase, casillas: [] }
      grupos.set(clave, g)
    }
    g.casillas.push({ x: p[0] % lado, y: Math.floor(p[0] / lado), indice: p[0] })
  }
  return new Map([...grupos].map(([clave, g]) => [clave, { clave, ...g }]))
}

function mismasCasillas(a: readonly CasillaPlanta[], b: readonly CasillaPlanta[]): boolean {
  return a.length === b.length && a.every((c, i) => c.indice === b[i]?.indice)
}

/** Claves de los grupos que difieren entre dos agrupaciones (nuevos, desaparecidos o con otras casillas). */
export function gruposQueCambian(antes: GruposPlantas, despues: GruposPlantas): string[] {
  const cambian: string[] = []
  for (const [clave, g] of despues) {
    const previo = antes.get(clave)
    if (!previo || !mismasCasillas(previo.casillas, g.casillas)) cambian.push(clave)
  }
  for (const clave of antes.keys()) if (!despues.has(clave)) cambian.push(clave)
  return cambian
}

/** Grupos para los que hay que tener malla: solo los que no están vacíos. */
export function planDeMallas(grupos: GruposPlantas): string[] {
  return [...grupos].filter(([, g]) => g.casillas.length > 0).map(([k]) => k)
}

/** Capacidad de un `InstancedMesh` para `n` instancias: se mantiene si basta y, si no, crece con margen. */
export function capacidadNecesaria(n: number, actual: number): number {
  return n <= actual ? actual : Math.ceil(n * 1.5) + 16
}
