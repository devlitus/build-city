import { aplicarComando, CARACTER_CAMINO, type Comando, type EstadoJuego } from '../core'
import type { Almacen } from './almacen'

/** Tecla del atajo de desarrollo que llena el valle de vallas y caminos para medir el rendimiento. */
export const TECLA_VALLAS_CAMINOS_LLENOS = 'F9'

/** Casillas de valla (incluye puertas) y de camino que deja el atajo F9. */
export const VALLAS_LLENAS = 400
export const CAMINOS_LLENOS = 400

/** Periodo en filas: la fila `y % 4 === 0` lleva valla y la `y % 4 === 2`, camino. */
const PERIODO_FILAS = 4
/** Tramos de valla de 7 casillas con un hueco, y una puerta en la casilla 3 de cada tramo de 8. */
const PERIODO_TRAMO = 8

const contar = (cadena: string, esLleno: (c: string) => boolean): number =>
  [...cadena].filter(esLleno).length

/**
 * Comandos que dibujan, en las filas de las parcelas dadas, tramos de valla con puertas y caminos
 * (casillas globales). Pura. Solo para el atajo F9: los comandos validan cada casilla, así que las
 * que estén ocupadas (agua, árboles, edificios…) se omiten solas.
 */
export function comandosVallasCaminosEnParcelas(
  parcelas: readonly { readonly fila: number; readonly columna: number }[],
  casillasPorParcela: number,
): readonly Comando[] {
  const c = casillasPorParcela
  const comandos: Comando[] = []
  for (const p of parcelas) {
    for (let y = p.fila * c; y < p.fila * c + c; y++) {
      const xs = Array.from({ length: c }, (_, k) => p.columna * c + k)
      if (y % PERIODO_FILAS === 2) {
        comandos.push({ tipo: 'ColocarCamino', casillas: xs.map((x) => ({ x, y })) })
      } else if (y % PERIODO_FILAS === 0) {
        const en = (f: (r: number) => boolean) =>
          xs.filter((x) => f(x % PERIODO_TRAMO)).map((x) => ({ x, y }))
        comandos.push({
          tipo: 'ColocarVallas',
          tipoValla: 'valla',
          casillas: en((r) => r !== 7 && r !== 3),
        })
        comandos.push({ tipo: 'ColocarVallas', tipoValla: 'puerta', casillas: en((r) => r === 3) })
      }
    }
  }
  return comandos
}

/**
 * Estado de depuración con al menos `vallas` casillas de valla/puerta y `caminos` de camino,
 * colocadas con comandos (`ColocarVallas`, `ColocarCamino`) en parcelas propias. Compra con
 * `ComprarParcela` (con dinero y materiales de sobra) la parcela adyacente más cercana a la
 * aparición hasta llegar a las cantidades. Devuelve `undefined` si no se consigue en todo el
 * valle. Mantiene el modo de juego del estado base. No toca `src/core`.
 */
export function estadoVallasCaminosLleno(
  base: EstadoJuego,
  vallas: number = VALLAS_LLENAS,
  caminos: number = CAMINOS_LLENOS,
): EstadoJuego | undefined {
  const n = base.valle.parcelasPorLado
  const c = base.valle.casillasPorParcela
  let estado: EstadoJuego = {
    ...base,
    modo: 'plano',
    dinero: 1_000_000_000,
    materiales: { ...base.materiales, madera: 1_000_000, piedra: 1_000_000 },
  }
  const fa = Math.min(n - 1, Math.floor(estado.aparicion.y / c))
  const ca = Math.min(n - 1, Math.floor(estado.aparicion.x / c))
  const hecho = (e: EstadoJuego): boolean =>
    contar(e.vallas, (ch) => ch !== '.') >= vallas &&
    contar(e.caminos, (ch) => ch === CARACTER_CAMINO) >= caminos

  const propiasDe = (e: EstadoJuego) => e.valle.parcelas.filter((p) => p.estado === 'propia')

  for (let intento = 0; intento <= n * n; intento++) {
    // Coloca en todas las parcelas propias; lo ya colocado se rechaza y no cuesta nada.
    for (const comando of comandosVallasCaminosEnParcelas(propiasDe(estado), c)) {
      const r = aplicarComando(estado, comando)
      if (r.ok) estado = r.estado
      if (hecho(estado)) break
    }
    if (hecho(estado)) break
    // Compra la parcela adyacente más cercana a la aparición.
    const propias = new Set(
      estado.valle.parcelas.flatMap((p, i) => (p.estado === 'propia' ? [i] : [])),
    )
    let mejor = -1
    let distMejor = Infinity
    estado.valle.parcelas.forEach((p, i) => {
      if (propias.has(i)) return
      const adyacente =
        propias.size === 0 ||
        [...propias].some(
          (q) => Math.abs(Math.floor(q / n) - p.fila) + Math.abs((q % n) - p.columna) === 1,
        )
      if (!adyacente) return
      const dist = Math.abs(p.fila - fa) + Math.abs(p.columna - ca)
      if (dist >= distMejor) return
      mejor = i
      distMejor = dist
    })
    if (mejor < 0) return undefined
    const r = aplicarComando(estado, { tipo: 'ComprarParcela', indice: mejor })
    if (!r.ok) return undefined
    estado = r.estado
  }
  if (!hecho(estado)) return undefined
  return { ...estado, modo: base.modo }
}

/**
 * Solo desarrollo: **F9** deja el valle con 400 casillas de valla (y puertas) y 400 de camino
 * (prueba de rendimiento del dibujo, M6-T05). Devuelve la función que quita el oyente.
 */
export function instalarAtajoVallasCaminos(
  almacen: Pick<Almacen, 'estado' | 'reemplazarEstadoDepuracion'>,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (e.repeat || e.code !== TECLA_VALLAS_CAMINOS_LLENOS) return
    e.preventDefault()
    const lleno = estadoVallasCaminosLleno(almacen.estado)
    if (lleno) almacen.reemplazarEstadoDepuracion(lleno)
  }
  objetivo.addEventListener('keydown', alPulsar)
  return () => objetivo.removeEventListener('keydown', alPulsar)
}
