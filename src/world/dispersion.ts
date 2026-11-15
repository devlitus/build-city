import type { Obstaculo, Valle } from '../core'
import { huellasPueblo, zonasLlanasPueblo } from './pueblo-datos'
import type { FuncionAltura } from './terreno/altura'
import { casillaAMetros, ladoMetros, type PuntoMetros } from './terreno/coordenadas'
import { PARAMETROS_TERRENO } from './terreno/parametros'
import { anilloDeTrozos, casillaDeTrozo, todosLosTrozos, type Trozo } from './terreno/trozos'
import type { DatosVegetacion } from './vegetacion-datos'

/*
 * Colocación de la vegetación: funciones puras (sin three.js, sin Math.random). Toda la
 * variación sale de un hash con semilla, así la misma semilla da siempre el mismo valle.
 */

type Rango = { readonly min: number; readonly max: number }

/** Hash entero de (semilla, a, b, c) a un número en [0, 1). Determinista y sin estado. */
export function hash(semilla: number, a: number, b: number, c = 0): number {
  let h = semilla | 0
  for (const n of [a, b, c]) {
    h = Math.imul(h ^ (Math.floor(n) | 0), 0x9e3779b1)
    h ^= h >>> 15
    h = Math.imul(h, 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
  }
  return (h >>> 0) / 4294967296
}

function mezclar(rango: Rango, t: number): number {
  return rango.min + (rango.max - rango.min) * t
}

/** Clave única de una celda de 1 m (casilla global, también fuera del valle). */
export function claveCelda(x: number, y: number): number {
  return (y + 4096) * 8192 + (x + 4096)
}

/** Colocación de una pieza: posición en el plano (m) y variante 0–1. */
export interface Colocacion {
  readonly x: number
  readonly z: number
  readonly variante: number
}

/** Colocación de un obstáculo del núcleo. */
export interface ColocacionObstaculo extends Colocacion {
  readonly tipo: Obstaculo['tipo']
}

/** Posición en metros de un obstáculo: el centro de su casilla. */
export function posicionObstaculo(
  obstaculo: Pick<Obstaculo, 'x' | 'y'>,
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
): PuntoMetros {
  return casillaAMetros(obstaculo.x, obstaculo.y, valle)
}

/** Una colocación por cada obstáculo del núcleo, en el mismo orden y en su casilla exacta. */
export function colocarObstaculos(
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
  obstaculos: readonly Obstaculo[],
): ColocacionObstaculo[] {
  return obstaculos.map((o) => {
    const p = posicionObstaculo(o, valle)
    return { tipo: o.tipo, x: p.x, z: p.z, variante: o.variante }
  })
}

/** Casillas ocupadas por obstáculos del núcleo (claves de `claveCelda`). */
export function celdasOcupadas(obstaculos: readonly Obstaculo[]): Set<number> {
  return new Set(obstaculos.map((o) => claveCelda(o.x, o.y)))
}

/** Forma de copa de un árbol, decidida por su variante y la semilla. */
export function tipoCopa(
  variante: number,
  semilla: number,
  datos: Pick<DatosVegetacion['arbol'], 'proporcionPino'>,
): 'pino' | 'redondo' {
  return hash(semilla, variante * 1e6, 11) < datos.proporcionPino ? 'pino' : 'redondo'
}

/** Escala, giro (rad) y tono (-1 a 1) de una pieza, deterministas por variante y semilla. */
export interface Variacion {
  readonly escala: number
  readonly giro: number
  readonly tono: number
}

export function variacionDe(variante: number, semilla: number, escala: Rango): Variacion {
  const k = variante * 1e6
  return {
    escala: mezclar(escala, hash(semilla, k, 21)),
    giro: hash(semilla, k, 22) * Math.PI * 2,
    tono: hash(semilla, k, 23) * 2 - 1,
  }
}

type Medidas = Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>

/** Claves (`claveCelda`) de las celdas con agua; acepta las de `celdasAgua` (también fuera del valle). */
export function clavesAgua(celdas: readonly { x: number; y: number }[]): Set<number> {
  return new Set(celdas.map((c) => claveCelda(c.x, c.y)))
}

/** ¿Hay una celda de agua a menos de `margen` m del punto (o el punto está en una)? */
export function hayAguaCerca(
  x: number,
  z: number,
  valle: Medidas,
  agua: ReadonlySet<number>,
  margen: number,
): boolean {
  const mitad = ladoMetros(valle) / 2
  const r = Math.ceil(margen)
  const cx = Math.floor(x + mitad)
  const cy = Math.floor(z + mitad)
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (!agua.has(claveCelda(cx + dx, cy + dy))) continue
      // Distancia del punto al rectángulo de la celda.
      const px = Math.max(cx + dx - mitad - x, 0, x - (cx + dx + 1 - mitad))
      const pz = Math.max(cy + dy - mitad - z, 0, z - (cy + dy + 1 - mitad))
      if (Math.hypot(px, pz) <= margen) return true
    }
  return false
}

/**
 * Predicado "el punto (x, z) está en el pueblo o a menos de `margen` m": la explanada llana de la
 * plaza y el camino (cápsulas de `zonasLlanasPueblo`) y el círculo que envuelve cada edificio.
 */
export function crearFiltroPueblo(
  valle: Medidas,
  margen: number,
): (x: number, z: number) => boolean {
  const zonas = zonasLlanasPueblo(valle)
  const circulos = huellasPueblo(valle).map((huella) => {
    const cx = huella.reduce((a, p) => a + p.x, 0) / huella.length
    const cz = huella.reduce((a, p) => a + p.z, 0) / huella.length
    return { cx, cz, r: Math.max(...huella.map((p) => Math.hypot(p.x - cx, p.z - cz))) }
  })
  return (x, z) => {
    for (const zona of zonas) {
      const ex = zona.bx - zona.ax
      const ez = zona.bz - zona.az
      const largo2 = ex * ex + ez * ez
      const t =
        largo2 === 0
          ? 0
          : Math.min(1, Math.max(0, ((x - zona.ax) * ex + (z - zona.az) * ez) / largo2))
      if (Math.hypot(x - (zona.ax + ex * t), z - (zona.az + ez * t)) <= zona.radioLlano + margen)
        return true
    }
    return circulos.some((c) => Math.hypot(x - c.cx, z - c.cz) <= c.r + margen)
  }
}

/** Todo lo que la dispersión decorativa necesita saber del mundo. */
export interface EntornoDispersion {
  readonly valle: Valle
  readonly semilla: number
  readonly altura: FuncionAltura
  /** Celdas con agua (río y su extrusión por las colinas). */
  readonly agua: ReadonlySet<number>
  /** Casillas ocupadas por obstáculos del núcleo. */
  readonly ocupadas: ReadonlySet<number>
  readonly datos: DatosVegetacion
  /** Cota del agua (m); por defecto la de `data/terreno.json`. */
  readonly nivelAgua?: number
}

/** Trozos que cubre la hierba: el valle y el anillo de `anilloMetros` alrededor. */
export function trozosDeHierba(valle: Medidas, datos: DatosVegetacion): Trozo[] {
  return todosLosTrozos(valle, anilloDeTrozos(valle, datos.hierba.anilloMetros))
}

/**
 * Matas de hierba de un trozo. Por casilla se sortean `matasPorCasilla` × el peso de su terreno
 * matas con jitter dentro de la casilla; la hash depende solo de la casilla y la semilla, así el
 * resultado no cambia con el trozo que la contiene. Nunca sobre casillas ocupadas por obstáculos,
 * ni cerca del agua, ni en el pueblo, ni por encima de `alturaMaxima`.
 */
export function matasDeTrozo(trozo: Trozo, entorno: EntornoDispersion): Colocacion[] {
  const { valle, semilla, altura, agua, ocupadas, datos } = entorno
  const h = datos.hierba
  const nivel = entorno.nivelAgua ?? PARAMETROS_TERRENO.nivelAgua
  const mitad = ladoMetros(valle) / 2
  const c = valle.casillasPorParcela
  const lado = valle.parcelasPorLado * c
  const enPueblo = crearFiltroPueblo(valle, h.margenPueblo)
  const s = semilla ^ 0x2c1b3c6d
  const origen = casillaDeTrozo(trozo, valle)
  const salida: Colocacion[] = []
  for (let gy = origen.y; gy < origen.y + c; gy++)
    for (let gx = origen.x; gx < origen.x + c; gx++) {
      if (ocupadas.has(claveCelda(gx, gy))) continue
      const centro = casillaAMetros(gx, gy, valle)
      if (
        Math.abs(centro.x) > mitad + h.anilloMetros ||
        Math.abs(centro.z) > mitad + h.anilloMetros
      )
        continue
      const dentro = gx >= 0 && gy >= 0 && gx < lado && gy < lado
      const terreno = dentro
        ? valle.parcelas[Math.floor(gy / c) * valle.parcelasPorLado + Math.floor(gx / c)]?.terreno
        : undefined
      const peso = terreno ? h.pesoTerreno[terreno] : h.pesoFuera
      const esperado = h.matasPorCasilla * peso
      const cuantas = Math.floor(esperado) + (hash(s, gx, gy, 0) < esperado % 1 ? 1 : 0)
      for (let k = 0; k < cuantas; k++) {
        const x = centro.x - 0.5 + hash(s, gx, gy, 1 + k * 3)
        const z = centro.z - 0.5 + hash(s, gx, gy, 2 + k * 3)
        const y = altura(x, z)
        if (y > h.alturaMaxima || y <= nivel) continue
        if (hayAguaCerca(x, z, valle, agua, h.margenAgua)) continue
        if (enPueblo(x, z)) continue
        salida.push({ x, z, variante: hash(s, gx, gy, 3 + k * 3) })
      }
    }
  return salida
}

/**
 * Bosque decorativo de las colinas: un árbol como mucho por celda de `celda` m, con probabilidad
 * `densidad`, posición con jitter dentro de la celda. Solo fuera del valle (a `margenValle` m del
 * borde), hasta el radio de colinas, nunca sobre el agua, por debajo de `alturaMaxima` y fuera del
 * pueblo. Determinista: depende solo de la semilla y de los datos.
 */
export function dispersarBosque(
  entorno: EntornoDispersion,
  radioMetros: number = PARAMETROS_TERRENO.malla.radioColinas,
): Colocacion[] {
  const { valle, semilla, altura, agua, datos } = entorno
  const d = datos.bosqueColinas
  const nivel = entorno.nivelAgua ?? PARAMETROS_TERRENO.nivelAgua
  const mitad = ladoMetros(valle) / 2
  const limite = mitad + radioMetros
  const enPueblo = crearFiltroPueblo(valle, d.margenPueblo)
  const s = semilla ^ 0x51ed270b
  const n = Math.ceil(limite / d.celda)
  const salida: Colocacion[] = []
  for (let j = -n; j < n; j++)
    for (let i = -n; i < n; i++) {
      if (hash(s, i, j, 1) >= d.densidad) continue
      const x = (i + hash(s, i, j, 2)) * d.celda
      const z = (j + hash(s, i, j, 3)) * d.celda
      if (Math.abs(x) > limite || Math.abs(z) > limite) continue
      if (Math.abs(x) < mitad + d.margenValle && Math.abs(z) < mitad + d.margenValle) continue
      const y = altura(x, z)
      if (y > d.alturaMaxima || y < nivel + d.alturaMinimaSobreAgua) continue
      if (hayAguaCerca(x, z, valle, agua, d.margenAgua)) continue
      if (enPueblo(x, z)) continue
      salida.push({ x, z, variante: hash(s, i, j, 4) })
    }
  return salida
}
