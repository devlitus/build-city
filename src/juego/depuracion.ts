import {
  aguaDe,
  aplicarComando,
  casillaConEdificio,
  CARACTER_ARADA,
  CARACTER_REGADA,
  CONFIG_CULTIVOS,
  CULTIVOS,
  ladoValle,
  obstaculosDe,
  tierraValida,
  type Comando,
  type EstadoJuego,
  type Planta,
  type Valle,
} from '../core'
import type { Almacen } from './almacen'

type ComandoPintar = Extract<Comando, { tipo: 'PintarZona' }>

/** Tecla del atajo de desarrollo que pinta zona de cultivo en las parcelas propias. */
export const TECLA_PINTAR_CULTIVO = 'F6'

/** Tecla del atajo de desarrollo que llena la granja de cultivos para medir el rendimiento. */
export const TECLA_GRANJA_LLENA = 'F7'

/** Número de plantas que deja el atajo F7. */
export const PLANTAS_GRANJA_LLENA = 2000

/** Una de cada `N` plantas está marchita. */
const CADA_MARCHITA = 20
/** Una de cada `N` plantas (no marchitas) está regada. */
const CADA_REGADA = 3

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
 * Estado de depuración con `cantidad` plantas válidas en casillas propias distintas. Pura.
 * Compra (con comandos y dinero de sobra) las parcelas adyacentes necesarias empezando por la de
 * la aparición, pinta zona de cultivo, ara y siembra los 5 cultivos en fases variadas (sembrado,
 * brote, joven, maduro) y marchita una de cada `CADA_MARCHITA`; parte de la tierra queda regada.
 * Deja al personaje junto a la granja. Devuelve `undefined` si no caben `cantidad` plantas en todo
 * el valle. No toca `src/core`.
 */
export function estadoGranjaLlena(
  base: EstadoJuego,
  cantidad: number = PLANTAS_GRANJA_LLENA,
): EstadoJuego | undefined {
  const { valle } = base
  const lado = ladoValle(valle)
  const c = valle.casillasPorParcela
  const n = valle.parcelasPorLado
  let estado: EstadoJuego = { ...base, dinero: 1_000_000_000 }
  const agua = aguaDe(valle, estado.cauce.ancho, lado)
  const obstaculos = obstaculosDe(estado, lado)
  const libre = (x: number, y: number): boolean =>
    !agua.has(y * lado + x) && !obstaculos.has(y * lado + x) && !casillaConEdificio(estado, x, y)

  const libres = (indice: number): number => {
    const f = Math.floor(indice / n)
    const col = indice % n
    let k = 0
    for (let y = f * c; y < f * c + c; y++) {
      for (let x = col * c; x < col * c + c; x++) if (libre(x, y)) k++
    }
    return k
  }

  // Se parte de la parcela de la aparición y se compra siempre la adyacente más cercana a ella.
  const fa = Math.min(n - 1, Math.floor(estado.aparicion.y / c))
  const ca = Math.min(n - 1, Math.floor(estado.aparicion.x / c))
  const propias = new Set(valle.parcelas.flatMap((p, i) => (p.estado === 'propia' ? [i] : [])))
  let disponibles = 0
  for (const i of propias) disponibles += libres(i)
  while (disponibles < cantidad) {
    let mejor = -1
    let distMejor = Infinity
    valle.parcelas.forEach((p, i) => {
      if (propias.has(i)) return
      const dist = Math.abs(p.fila - fa) + Math.abs(p.columna - ca)
      if (dist >= distMejor) return
      const adyacente =
        propias.size === 0 ||
        [...propias].some(
          (q) => Math.abs(Math.floor(q / n) - p.fila) + Math.abs((q % n) - p.columna) === 1,
        )
      if (!adyacente) return
      mejor = i
      distMejor = dist
    })
    if (mejor < 0) return undefined
    const r = aplicarComando(estado, { tipo: 'ComprarParcela', indice: mejor })
    if (!r.ok) return undefined
    estado = r.estado
    propias.add(mejor)
    disponibles += libres(mejor)
  }

  for (const comando of comandosCultivoEnParcelasPropias(estado.valle)) {
    const r = aplicarComando(estado, comando)
    // Una parcela de puro río no tiene casillas pintables (`sin-casillas-validas`): se omite.
    if (r.ok) estado = r.estado
  }

  const candidatas: number[] = []
  for (let i = 0; i < lado * lado; i++) {
    if (estado.zonas[i] === 'c' && libre(i % lado, Math.floor(i / lado))) candidatas.push(i)
  }
  if (candidatas.length < cantidad) return undefined

  const tierra = estado.tierra.split('')
  const plantas: Planta[] = []
  for (let k = 0; k < cantidad; k++) {
    const casilla = candidatas[k] as number
    const cultivo = k % CULTIVOS.length
    const def = CONFIG_CULTIVOS.cultivos[CULTIVOS[cultivo] as (typeof CULTIVOS)[number]]
    const fase = Math.floor(k / CULTIVOS.length) % 4
    let dias = 0
    for (let f = 0; f < fase; f++) dias += def.diasPorFase[f] ?? 0
    const marchita = k % CADA_MARCHITA === CADA_MARCHITA - 1
    const sinAgua = marchita ? def.necesidadAgua.diasSinRegar : 0
    plantas.push([casilla, cultivo, dias, 0, sinAgua, marchita ? 1 : 0])
    tierra[casilla] = !marchita && k % CADA_REGADA === 0 ? CARACTER_REGADA : CARACTER_ARADA
  }

  // Personaje: en la casilla libre siguiente a las plantas (o en la última planta si no hay más).
  const sitio = candidatas[cantidad] ?? (candidatas[cantidad - 1] as number)
  const resultado: EstadoJuego = {
    ...estado,
    tierra: tierra.join(''),
    plantas,
    personaje: {
      ...estado.personaje,
      x: (sitio % lado) + 0.5,
      y: Math.floor(sitio / lado) + 0.5,
    },
  }
  return tierraValida(resultado) ? resultado : undefined
}

/**
 * Solo desarrollo: **F6** pinta zona de cultivo en todas las parcelas propias para poder arar sin
 * la UI de zonas; **F7** deja la granja con 2.000 cultivos (prueba de rendimiento). Devuelve la
 * función que quita el oyente.
 */
export function instalarAtajosDepuracion(
  almacen: Pick<Almacen, 'estado' | 'despachar' | 'reemplazarEstadoDepuracion'>,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (e.repeat) return
    if (e.code === TECLA_GRANJA_LLENA) {
      e.preventDefault()
      const lleno = estadoGranjaLlena(almacen.estado)
      if (lleno) almacen.reemplazarEstadoDepuracion(lleno)
      return
    }
    if (e.code !== TECLA_PINTAR_CULTIVO) return
    e.preventDefault()
    for (const comando of comandosCultivoEnParcelasPropias(almacen.estado.valle)) {
      almacen.despachar(comando)
    }
  }
  objetivo.addEventListener('keydown', alPulsar)
  return () => objetivo.removeEventListener('keydown', alPulsar)
}
