import { casillasRio, type Valle } from '../../core'
import { ladoMetros } from './coordenadas'
import { PARAMETROS_TERRENO, type ParametrosTerreno } from './parametros'
import { ruidoValor } from './ruido'

/** Altura (metros) del terreno en el punto (x, z) en metros. */
export type FuncionAltura = (x: number, z: number) => number

function suavizar(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * Distancia (en casillas, entre centros) de cada casilla a la casilla de río más cercana,
 * con una pasada doble de chamfer. Índice = y * lado + x.
 */
function campoDistancias(valle: Valle, lado: number): Float32Array {
  const d = new Float32Array(lado * lado).fill(1e9)
  for (const c of casillasRio(valle)) d[c.y * lado + c.x] = 0
  const relajar = (x: number, y: number, dx: number, dy: number, coste: number): void => {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= lado || ny >= lado) return
    const v = (d[ny * lado + nx] ?? 1e9) + coste
    if (v < (d[y * lado + x] ?? 1e9)) d[y * lado + x] = v
  }
  const D = Math.SQRT2
  for (let y = 0; y < lado; y++)
    for (let x = 0; x < lado; x++) {
      relajar(x, y, -1, 0, 1)
      relajar(x, y, 0, -1, 1)
      relajar(x, y, -1, -1, D)
      relajar(x, y, 1, -1, D)
    }
  for (let y = lado - 1; y >= 0; y--)
    for (let x = lado - 1; x >= 0; x--) {
      relajar(x, y, 1, 0, 1)
      relajar(x, y, 0, 1, 1)
      relajar(x, y, 1, 1, D)
      relajar(x, y, -1, 1, D)
    }
  return d
}

/**
 * Crea la función de altura del terreno para un valle y una semilla. Precalcula un campo de
 * distancias al río (por casilla) y lo interpola de forma bilineal, así el cauce es continuo.
 * Valle central casi llano con ruido suave, cauce hundido bajo `nivelAgua` y colinas que suben
 * desde el borde del valle. Pura y determinista (misma semilla -> mismas alturas).
 */
export function crearAltura(
  valle: Valle,
  semilla: number,
  parametros: ParametrosTerreno = PARAMETROS_TERRENO,
): FuncionAltura {
  const lado = Math.round(ladoMetros(valle))
  const mitad = lado / 2
  const dist = campoDistancias(valle, lado)
  const { alturaBase, ruidoParcela, cauce, colinas } = parametros
  const semillaColinas = (semilla ^ 0x5bd1e995) | 0
  const semillaMacro = (semilla ^ 0x1b873593) | 0
  const onda3 = colinas.longitudOnda * 3

  const distanciaRio = (x: number, z: number): number => {
    // Coordenadas continuas de rejilla: el centro de la casilla i está en i.
    const gx = Math.min(lado - 1, Math.max(0, x + mitad - 0.5))
    const gz = Math.min(lado - 1, Math.max(0, z + mitad - 0.5))
    const x0 = Math.min(lado - 2, Math.floor(gx))
    const z0 = Math.min(lado - 2, Math.floor(gz))
    const fx = gx - x0
    const fz = gz - z0
    const i = z0 * lado + x0
    const d00 = dist[i] ?? 0
    const d10 = dist[i + 1] ?? 0
    const d01 = dist[i + lado] ?? 0
    const d11 = dist[i + lado + 1] ?? 0
    const a = d00 + (d10 - d00) * fx
    const b = d01 + (d11 - d01) * fx
    return a + (b - a) * fz
  }

  return (x, z) => {
    // Distancia al cuadrado del valle (0 dentro): base de las colinas.
    const fuera = Math.hypot(Math.max(Math.abs(x) - mitad, 0), Math.max(Math.abs(z) - mitad, 0))
    const s = suavizar(fuera / colinas.anchoSubida)

    const suelo =
      alturaBase +
      ruidoParcela.amplitud *
        ruidoValor(x / ruidoParcela.longitudOnda, z / ruidoParcela.longitudOnda, semilla)

    const orilla = suavizar((distanciaRio(x, z) - cauce.mesetaRadio) / cauce.anchoTransicion)
    const hundimiento = cauce.profundidad * (1 - orilla)

    const macro = (ruidoValor(x / onda3, z / onda3, semillaMacro) + 1) / 2
    const detalle = ruidoValor(x / colinas.longitudOnda, z / colinas.longitudOnda, semillaColinas)
    const sobreColinas =
      s * (colinas.altura * (0.6 + 0.4 * macro) + colinas.amplitudRuido * detalle)

    return suelo - hundimiento * (1 - s) + sobreColinas
  }
}

/** Altura del terreno en (x, z) metros. Para muchas llamadas usa `crearAltura`. */
export function alturaTerreno(x: number, z: number, valle: Valle, semilla: number): number {
  return crearAltura(valle, semilla)(x, z)
}
