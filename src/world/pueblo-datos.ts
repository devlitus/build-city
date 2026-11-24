import * as v from 'valibot'
import puebloJson from '../../data/pueblo.json'
import { ladoMetros, type PuntoMetros } from './terreno/coordenadas'
import type { ZonaLlana } from './terreno/altura'
import { PARAMETROS_TERRENO } from './terreno/parametros'

const positivo = v.pipe(v.number(), v.minValue(0))
const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))

const esquemaCasa = v.object({
  x: v.number(),
  distanciaAlBorde: estrictoPositivo,
  ancho: estrictoPositivo,
  fondo: estrictoPositivo,
  alto: estrictoPositivo,
  altoTejado: estrictoPositivo,
  giro: v.number(),
})

/** Esquema de `data/pueblo.json`. Medidas en metros; `distanciaAlBorde` hacia el sur desde el borde sur del valle. */
export const esquemaPueblo = v.object({
  plaza: v.object({ x: v.number(), distanciaAlBorde: estrictoPositivo, radio: estrictoPositivo }),
  camino: v.object({ ancho: estrictoPositivo }),
  explanada: v.object({
    margenPlaza: positivo,
    semiAnchoCamino: estrictoPositivo,
    anchoMezcla: estrictoPositivo,
  }),
  campanario: v.object({
    x: v.number(),
    distanciaAlBorde: estrictoPositivo,
    lado: estrictoPositivo,
    alto: estrictoPositivo,
    altoTejado: estrictoPositivo,
    giro: v.number(),
  }),
  casas: v.pipe(v.array(esquemaCasa), v.minLength(1)),
})

export type DatosPueblo = v.InferOutput<typeof esquemaPueblo>
export type DatosCasa = v.InferOutput<typeof esquemaCasa>

/** Valida un JSON de pueblo; lanza si no cumple el esquema. */
export function cargarPueblo(json: unknown): DatosPueblo {
  const r = v.safeParse(esquemaPueblo, json)
  if (!r.success) throw new Error(`Pueblo inválido: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

/** Datos del pueblo, cargados y validados al importar. */
export const DATOS_PUEBLO: DatosPueblo = cargarPueblo(puebloJson)

type Medidas = Parameters<typeof ladoMetros>[0]

/** Coordenada z (m) del borde sur del valle. */
export function bordeSur(valle: Medidas): number {
  return ladoMetros(valle) / 2
}

/** Centro de la plaza en metros. */
export function centroPlaza(valle: Medidas, datos: DatosPueblo = DATOS_PUEBLO): PuntoMetros {
  return { x: datos.plaza.x, z: bordeSur(valle) + datos.plaza.distanciaAlBorde }
}

/** Esquinas (m) de la huella de un edificio rectangular con centro, tamaño y giro (grados). */
export function huellaEdificio(
  valle: Medidas,
  x: number,
  distanciaAlBorde: number,
  ancho: number,
  fondo: number,
  giroGrados: number,
): PuntoMetros[] {
  const cz = bordeSur(valle) + distanciaAlBorde
  const a = (giroGrados * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sz]) => {
    const lx = ((sx ?? 0) * ancho) / 2
    const lz = ((sz ?? 0) * fondo) / 2
    return { x: x + lx * c + lz * s, z: cz - lx * s + lz * c }
  })
}

/** Huellas de todos los edificios del pueblo (casas y campanario). */
export function huellasPueblo(valle: Medidas, datos: DatosPueblo = DATOS_PUEBLO): PuntoMetros[][] {
  const { casas, campanario: k } = datos
  return [
    ...casas.map((c) => huellaEdificio(valle, c.x, c.distanciaAlBorde, c.ancho, c.fondo, c.giro)),
    huellaEdificio(valle, k.x, k.distanciaAlBorde, k.lado, k.lado, k.giro),
  ]
}

/**
 * Línea central del camino de tierra: desde el borde sur del valle hasta el borde de la plaza,
 * recto hacia el sur por la x de la plaza, con un punto cada `paso` m como mucho.
 */
export function puntosCamino(
  valle: Medidas,
  datos: DatosPueblo = DATOS_PUEBLO,
  paso = 2,
): PuntoMetros[] {
  const z0 = bordeSur(valle)
  const z1 = z0 + datos.plaza.distanciaAlBorde - datos.plaza.radio
  const n = Math.max(1, Math.ceil((z1 - z0) / paso))
  const puntos: PuntoMetros[] = []
  for (let i = 0; i <= n; i++) puntos.push({ x: datos.plaza.x, z: z0 + ((z1 - z0) * i) / n })
  return puntos
}

/** Zonas que la altura del terreno aplana: la plaza (con margen) y el camino hasta ella. */
export function zonasLlanasPueblo(valle: Medidas, datos: DatosPueblo = DATOS_PUEBLO): ZonaLlana[] {
  const centro = centroPlaza(valle, datos)
  const { explanada } = datos
  const cota = PARAMETROS_TERRENO.alturaBase
  return [
    {
      ax: centro.x,
      az: centro.z,
      bx: centro.x,
      bz: centro.z,
      radioLlano: datos.plaza.radio + explanada.margenPlaza,
      anchoMezcla: explanada.anchoMezcla,
      cota,
    },
    {
      ax: datos.plaza.x,
      az: bordeSur(valle),
      bx: centro.x,
      bz: centro.z,
      radioLlano: explanada.semiAnchoCamino,
      anchoMezcla: explanada.anchoMezcla,
      cota,
    },
  ]
}
