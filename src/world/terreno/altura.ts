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

/** Distancia (chamfer de dos pasadas, en casillas) de cada casilla a la fuente más cercana. */
function distanciaAFuentes(esFuente: Uint8Array, lado: number): Float32Array {
  const d = new Float32Array(lado * lado)
  for (let i = 0; i < d.length; i++) d[i] = esFuente[i] ? 0 : 1e9
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
 * Distancia con signo al borde del río sobre la rejilla de VÉRTICES de casilla, de lado + 1
 * por lado (índice = j * (lado + 1) + i, vértice i en x = i - lado/2). Un vértice es borde
 * (0) si lo tocan casillas de río y de tierra, interior (negativo) si solo de río y exterior
 * (positivo) si solo de tierra; fuera del valle se repite la casilla más cercana. Así todo
 * punto dentro de una casilla de río (sus 4 vértices son borde o interior) tiene signo <= 0.
 */
function campoSigno(valle: Valle, lado: number): Float32Array {
  const rio = new Uint8Array(lado * lado)
  for (const c of casillasRio(valle)) rio[c.y * lado + c.x] = 1
  const n = lado + 1
  const esRio = (x: number, y: number): number =>
    rio[Math.min(lado - 1, Math.max(0, y)) * lado + Math.min(lado - 1, Math.max(0, x))] ?? 0
  const borde = new Uint8Array(n * n)
  const dentro = new Uint8Array(n * n)
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const cuenta = esRio(i - 1, j - 1) + esRio(i, j - 1) + esRio(i - 1, j) + esRio(i, j)
      borde[j * n + i] = cuenta > 0 && cuenta < 4 ? 1 : 0
      dentro[j * n + i] = cuenta === 4 ? 1 : 0
    }
  const dist = distanciaAFuentes(borde, n)
  const sd = new Float32Array(n * n)
  for (let k = 0; k < sd.length; k++) sd[k] = dentro[k] ? -(dist[k] ?? 0) : (dist[k] ?? 0)
  return sd
}

/**
 * Crea la función de altura del terreno para un valle y una semilla. Precalcula la distancia
 * con signo al borde del río (por vértice de casilla) y la interpola de forma bilineal, así el
 * cauce es continuo y la bajada ocurre dentro del río y en la orilla inmediata (`anchoOrilla`).
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
  const sdCampo = campoSigno(valle, lado)
  const { alturaBase, ruidoParcela, cauce, colinas } = parametros
  const semillaColinas = (semilla ^ 0x5bd1e995) | 0
  const semillaMacro = (semilla ^ 0x1b873593) | 0
  const onda3 = colinas.longitudOnda * 3

  const distanciaConSigno = (x: number, z: number): number => {
    // Coordenadas continuas en la rejilla de vértices (n = lado + 1 por lado).
    const gx = Math.min(lado, Math.max(0, x + mitad))
    const gz = Math.min(lado, Math.max(0, z + mitad))
    const x0 = Math.min(lado - 1, Math.floor(gx))
    const z0 = Math.min(lado - 1, Math.floor(gz))
    const fx = gx - x0
    const fz = gz - z0
    const n = lado + 1
    const i = z0 * n + x0
    const d00 = sdCampo[i] ?? 0
    const d10 = sdCampo[i + 1] ?? 0
    const d01 = sdCampo[i + n] ?? 0
    const d11 = sdCampo[i + n + 1] ?? 0
    const a = d00 + (d10 - d00) * fx
    const b = d01 + (d11 - d01) * fx
    return a + (b - a) * fz
  }

  return (x, z) => {
    const dx = Math.max(Math.abs(x) - mitad, 0)
    const dz = Math.max(Math.abs(z) - mitad, 0)
    // Dentro del valle s = 0: no hay colinas (se evitan hypot y ruidos).
    const s = dx === 0 && dz === 0 ? 0 : suavizar(Math.hypot(dx, dz) / colinas.anchoSubida)

    const suelo =
      alturaBase +
      ruidoParcela.amplitud *
        ruidoValor(x / ruidoParcela.longitudOnda, z / ruidoParcela.longitudOnda, semilla)

    // A fondo hasta `bordeFondo` m dentro del río; sube hasta cero en `anchoOrilla` m.
    const orilla = suavizar((distanciaConSigno(x, z) + cauce.bordeFondo) / cauce.anchoOrilla)
    const hundimiento = cauce.profundidad * (1 - orilla)
    if (s === 0) return suelo - hundimiento

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
