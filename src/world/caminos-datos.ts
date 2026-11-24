import * as v from 'valibot'
import dibujoJson from '../../data/caminos-dibujo.json'
import { azarCasilla } from './hash-casilla'
import { paletaJuego } from './paleta'

const positivo = v.pipe(v.number(), v.finite(), v.gtValue(0))

/** Esquema de `data/caminos-dibujo.json`. Medidas en metros. */
export const esquemaDibujoCaminos = v.object({
  losa: v.object({
    /** Lado de la losa (algo menor que 1 m para que se vea el reborde de la casilla). */
    lado: v.pipe(v.number(), v.gtValue(0), v.maxValue(1)),
    grosor: positivo,
    /** Altura de la cara superior sobre el terreno (evita el z-fighting). */
    altura: positivo,
    puntosPorLado: v.pipe(v.number(), v.integer(), v.minValue(1)),
    /** Cuánto puede entrar cada punto del contorno hacia el centro. */
    irregularidad: v.pipe(v.number(), v.minValue(0)),
    semilla: v.pipe(v.number(), v.integer()),
    escalaMin: positivo,
    escalaMax: positivo,
    colorA: v.string(),
    colorB: v.string(),
  }),
  piedras: v.object({
    porCasilla: v.pipe(v.number(), v.integer(), v.minValue(0)),
    radio: positivo,
    /** Fracción del radio que puede variar (0..1). */
    variacionRadio: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    /** Factor de altura de la piedra respecto a su radio. */
    aplastado: positivo,
    /** Distancia mínima al borde de la casilla. */
    margen: v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)),
    colorA: v.string(),
    colorB: v.string(),
  }),
  rugosidad: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  capacidadInicial: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type DatosDibujoCaminos = v.InferOutput<typeof esquemaDibujoCaminos>

/** Valida el JSON del dibujo de caminos; lanza si no cumple el esquema o un color no existe. */
export function cargarDibujoCaminos(json: unknown): DatosDibujoCaminos {
  const r = v.safeParse(esquemaDibujoCaminos, json)
  if (!r.success) {
    throw new Error(`Dibujo de caminos inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  }
  const d = r.output
  const colores = [d.losa.colorA, d.losa.colorB, d.piedras.colorA, d.piedras.colorB]
  for (const n of colores) {
    if (!Object.hasOwn(paletaJuego, n)) {
      throw new Error(`Dibujo de caminos inválido: el color "${n}" no existe en la paleta`)
    }
  }
  if (d.losa.escalaMin > d.losa.escalaMax) {
    throw new Error('Dibujo de caminos inválido: escalaMin mayor que escalaMax')
  }
  if (d.losa.irregularidad >= d.losa.lado / 2) {
    throw new Error('Dibujo de caminos inválido: la irregularidad deforma demasiado la losa')
  }
  return d
}

export const DATOS_DIBUJO_CAMINOS: DatosDibujoCaminos = cargarDibujoCaminos(dibujoJson)

/**
 * Contorno de la losa (x, z) en sentido horario visto desde arriba: `puntosPorLado` puntos por
 * lado sobre el cuadrado de lado `lado`, cada uno desplazado hacia dentro un valor determinista
 * en [0, irregularidad]. Las esquinas se desplazan en diagonal. Pura.
 */
export function contornoLosa(
  d: DatosDibujoCaminos['losa'],
): readonly (readonly [number, number])[] {
  const mitad = d.lado / 2
  const n = d.puntosPorLado
  const puntos: [number, number][] = []
  // Cada lado va de su esquina inicial (incluida) a la siguiente (excluida).
  const esquinas: [number, number][] = [
    [-mitad, -mitad],
    [mitad, -mitad],
    [mitad, mitad],
    [-mitad, mitad],
  ]
  for (let k = 0; k < 4; k++) {
    const [x0, z0] = esquinas[k] as [number, number]
    const [x1, z1] = esquinas[(k + 1) % 4] as [number, number]
    for (let j = 0; j < n; j++) {
      const t = j / n
      const x = x0 + (x1 - x0) * t
      const z = z0 + (z1 - z0) * t
      const dentro = azarCasilla(k * n + j, d.semilla) * d.irregularidad
      const largo = Math.hypot(x, z) || 1
      // Hacia el centro, sin cruzarlo.
      puntos.push([x - (x / largo) * dentro, z - (z / largo) * dentro])
    }
  }
  return puntos
}

export interface ParametrosLosa {
  /** Cuartos de vuelta (0..3). */
  readonly giro: number
  readonly escala: number
  /** 0..1: mezcla entre `colorA` y `colorB`. */
  readonly tono: number
}

/** Variación determinista de la losa de la casilla `indice`. Pura. */
export function parametrosLosa(indice: number, d: DatosDibujoCaminos): ParametrosLosa {
  const { escalaMin, escalaMax } = d.losa
  return {
    giro: Math.floor(azarCasilla(indice, 1) * 4),
    escala: escalaMin + azarCasilla(indice, 2) * (escalaMax - escalaMin),
    tono: azarCasilla(indice, 3),
  }
}

export interface PiedraSuelta {
  /** Clave única entre todas las piedras (casilla * porCasilla + j). */
  readonly clave: number
  /** Desplazamiento desde el centro de la casilla, en metros. */
  readonly dx: number
  readonly dz: number
  readonly radio: number
  /** Giro alrededor de la vertical, en radianes. */
  readonly giro: number
  readonly tono: number
}

/** Piedras sueltas de la casilla `indice`, siempre las mismas para la misma casilla. Pura. */
export function piedrasDeCasilla(indice: number, d: DatosDibujoCaminos): PiedraSuelta[] {
  const { porCasilla, radio, variacionRadio, margen } = d.piedras
  const alcance = 0.5 - margen
  const r: PiedraSuelta[] = []
  for (let j = 0; j < porCasilla; j++) {
    const sal = 10 + j * 5
    r.push({
      clave: indice * porCasilla + j,
      dx: (azarCasilla(indice, sal) * 2 - 1) * alcance,
      dz: (azarCasilla(indice, sal + 1) * 2 - 1) * alcance,
      radio: radio * (1 - variacionRadio + azarCasilla(indice, sal + 2) * variacionRadio),
      giro: azarCasilla(indice, sal + 3) * Math.PI * 2,
      tono: azarCasilla(indice, sal + 4),
    })
  }
  return r
}
