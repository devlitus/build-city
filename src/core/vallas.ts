import { CONFIG_VALLAS } from './datos/vallas'
import { CONFIG_PERSONAJE } from './datos/personaje'
import { bloqueaPasoCasillas, obstaculosDe } from './construccion'
import { casillasOcupadas } from './edificios'
import type { EstadoJuego } from './estado'
import { ladoValle } from './mapa'
import { esCaracterArada } from './tierra'
import { aguaDe } from './zonas'
import {
  CARACTER_SIN_VALLA,
  CARACTER_VALLA,
  TIPOS_VALLA,
  vallaEn,
  type TipoValla,
} from './vallas-estado'

export { TIPOS_VALLA, vallasVacias, vallaEn, hayValla, casillasConValla } from './vallas-estado'
export type { TipoValla } from './vallas-estado'

/**
 * Vallas y puertas (M6-T01, crítica). Reglas, validación y reembolso; los comandos
 * `ColocarVallas` y `QuitarVallas` (en `comandos.ts`) solo llaman a estas funciones.
 *
 * Decisiones (documentadas en la PR):
 * - Línea parcialmente inválida: se colocan SOLO las casillas válidas y se cobra solo por ellas;
 *   las casillas repetidas cuentan una vez. Si ninguna es válida, error.
 * - Sin madera para todas las válidas: error, no se coloca ni se cobra nada.
 * - Las vallas bloquean el paso; las puertas no. Si las vallas válidas encerraran una casilla
 *   que hoy se alcanza desde la aparición se rechaza TODO el comando (`bloquea-paso`): el
 *   jugador pone la puerta antes de cerrar el cercado. Las vallas aún no entran en la colisión
 *   del personaje (M6-T06).
 */

/** Por qué una casilla no admite valla ni puerta, en orden de prioridad. */
export const MOTIVOS_CASILLA_VALLA = [
  'fuera-del-valle',
  'no-propia',
  'agua',
  'obstaculo',
  'ocupada',
  'cultivo',
  'ya-hay-valla',
  'personaje',
] as const
export type MotivoCasillaValla = (typeof MOTIVOS_CASILLA_VALLA)[number]

export interface CasillaValla {
  readonly x: number
  readonly y: number
  /** `undefined` si se puede colocar. */
  readonly motivo: MotivoCasillaValla | undefined
}

export interface CasillaXY {
  readonly x: number
  readonly y: number
}

/** Coste de una cantidad de casillas de un tipo. */
export const costeVallas = (tipo: TipoValla, casillas: number): number =>
  CONFIG_VALLAS.coste[tipo].madera * casillas

export interface ValidacionVallas {
  readonly tipo: TipoValla
  /** Una entrada por casilla distinta (la primera aparición manda), en el orden recibido. */
  readonly casillas: readonly CasillaValla[]
  /** Las casillas válidas, en el mismo orden. */
  readonly validas: readonly CasillaXY[]
  /** Madera que costaría colocar las válidas (la UI muestra el coste total). */
  readonly costeMadera: number
  /** Las vallas válidas encerrarían alguna casilla alcanzable desde la aparición (nunca con puertas). */
  readonly bloqueaPaso: boolean
  /** Falta madera para todas las válidas. */
  readonly sinMadera: boolean
}

const esEntero = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n)

/** ¿Es `vallas` una cadena del tamaño del valle sin caracteres desconocidos? */
export function vallasValidas(estado: Pick<EstadoJuego, 'vallas' | 'valle'>): boolean {
  const { vallas } = estado
  if (typeof vallas !== 'string' || vallas.length !== ladoValle(estado.valle) ** 2) return false
  const ok = new Set<string>([CARACTER_SIN_VALLA, ...TIPOS_VALLA.map((t) => CARACTER_VALLA[t])])
  for (const c of vallas) if (!ok.has(c)) return false
  return true
}

/**
 * Función pura de consulta (la usa el comando y la vista previa de la interfaz): por cada casilla
 * distinta, si admite `tipo` o por qué no; el coste total de las válidas y si cerrarían el paso.
 * No comprueba el modo de juego ni el día (eso es del comando). Nunca lanza: lo que no sean
 * coordenadas enteras cuenta como `fuera-del-valle`.
 */
export function validarVallas(
  estado: EstadoJuego,
  casillas: readonly unknown[],
  tipo: TipoValla,
): ValidacionVallas {
  const lado = ladoValle(estado.valle)
  const v = estado.valle
  const c = v.casillasPorParcela
  const agua = aguaDe(v, estado.cauce.ancho, lado)
  const obstaculos = obstaculosDe(estado, lado)
  const ocupadas = casillasOcupadas(estado.edificios, lado)
  const conPlanta = new Set(estado.plantas.map((p) => p[0]))
  // Misma caja que `moverPersonaje` y `colocacionValida`; solo importa para las vallas.
  const m = CONFIG_PERSONAJE.tamanoCaja / 2
  const { x: px, y: py } = estado.personaje
  const caja = {
    x0: Math.floor(px - m),
    x1: Math.ceil(px + m) - 1,
    y0: Math.floor(py - m),
    y1: Math.ceil(py + m) - 1,
  }

  const vistas = new Set<number>()
  const lista: CasillaValla[] = []
  for (const q of casillas) {
    const { x, y } = (q ?? {}) as { x?: unknown; y?: unknown }
    if (!esEntero(x) || !esEntero(y) || x < 0 || y < 0 || x >= lado || y >= lado) {
      // Fuera del valle o no entera: se conserva en la lista (en rojo) sin deduplicar.
      lista.push({ x: Number(x), y: Number(y), motivo: 'fuera-del-valle' })
      continue
    }
    const i = y * lado + x
    if (vistas.has(i)) continue
    vistas.add(i)
    let motivo: MotivoCasillaValla | undefined
    const parcela = v.parcelas[Math.floor(y / c) * v.parcelasPorLado + Math.floor(x / c)]
    if (parcela?.estado !== 'propia') motivo = 'no-propia'
    else if (agua.has(i)) motivo = 'agua'
    else if (obstaculos.has(i)) motivo = 'obstaculo'
    else if (ocupadas.has(i)) motivo = 'ocupada'
    else if (esCaracterArada(estado.tierra[i]) || conPlanta.has(i)) motivo = 'cultivo'
    else if (vallaEn(estado.vallas, i) !== undefined) motivo = 'ya-hay-valla'
    else if (tipo === 'valla' && x >= caja.x0 && x <= caja.x1 && y >= caja.y0 && y <= caja.y1) {
      // Una valla bajo los pies dejaría al personaje atrapado (la puerta no).
      motivo = 'personaje'
    }
    lista.push({ x: x + 0, y: y + 0, motivo })
  }
  const validas = lista.filter((q) => q.motivo === undefined).map(({ x, y }) => ({ x, y }))
  const costeMadera = costeVallas(tipo, validas.length)
  const bloqueaPaso =
    tipo === 'valla' &&
    validas.length > 0 &&
    bloqueaPasoCasillas(
      estado,
      lado,
      validas.map((q) => q.y * lado + q.x),
    )
  return {
    tipo,
    casillas: lista,
    validas,
    costeMadera,
    bloqueaPaso,
    sinMadera: !(estado.materiales.madera >= costeMadera),
  }
}

/** Reembolso de quitar `n` casillas de `tipo`: fracción de lo pagado, redondeada como dicen los datos. */
export function reembolsoVallas(tipo: TipoValla, n: number): number {
  const pagado = costeVallas(tipo, n)
  const r = Math.floor(pagado * CONFIG_VALLAS.reembolsoQuitar)
  return Math.min(pagado, Math.max(0, r))
}

export interface ValidacionQuitar {
  /** Casillas distintas que tienen valla o puerta. */
  readonly casillas: readonly (CasillaXY & { readonly tipo: TipoValla })[]
  readonly reembolsoMadera: number
}

/** Qué se quita y cuánto madera se devuelve; ignora las casillas sin valla/puerta o fuera del valle. */
export function validarQuitarVallas(
  estado: Pick<EstadoJuego, 'vallas' | 'valle'>,
  casillas: readonly unknown[],
): ValidacionQuitar {
  const lado = ladoValle(estado.valle)
  const vistas = new Set<number>()
  const lista: (CasillaXY & { tipo: TipoValla })[] = []
  for (const q of casillas) {
    const { x, y } = (q ?? {}) as { x?: unknown; y?: unknown }
    if (!esEntero(x) || !esEntero(y) || x < 0 || y < 0 || x >= lado || y >= lado) continue
    const i = y * lado + x
    if (vistas.has(i)) continue
    vistas.add(i)
    const t = vallaEn(estado.vallas, i)
    if (t) lista.push({ x: x + 0, y: y + 0, tipo: t })
  }
  let reembolsoMadera = 0
  for (const t of TIPOS_VALLA) {
    reembolsoMadera += reembolsoVallas(t, lista.filter((q) => q.tipo === t).length)
  }
  return { casillas: lista, reembolsoMadera }
}

/** `vallas` con `tipo` (o nada, si es `undefined`) en las casillas dadas. */
export function escribirVallas(
  vallas: string,
  lado: number,
  casillas: readonly CasillaXY[],
  tipo: TipoValla | undefined,
): string {
  const car = tipo === undefined ? CARACTER_SIN_VALLA : CARACTER_VALLA[tipo]
  const a = vallas.split('')
  for (const q of casillas) a[q.y * lado + q.x] = car
  return a.join('')
}
