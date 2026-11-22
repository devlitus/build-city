import type { Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { crearCacheModelos } from './carga-cache'

export const TIPOS_EDIFICIO = ['tienda', 'caja-envio', 'cobertizo', 'casa'] as const
export type TipoEdificio = (typeof TIPOS_EDIFICIO)[number]

export const ETAPAS_OBRA = ['cimientos', 'andamios', 'paredes', 'terminado'] as const
export type EtapaObra = (typeof ETAPAS_OBRA)[number]

const clave = (tipo: TipoEdificio, etapa: EtapaObra) => `${tipo}_${etapa}`

/** Ruta del `.glb` de un edificio en una etapa, en `public/`. */
export function rutaModeloEdificio(tipo: TipoEdificio, etapa: EtapaObra): string {
  return `${import.meta.env.BASE_URL}modelos/edificios/${clave(tipo, etapa)}.glb`
}

let cargador: GLTFLoader | undefined

function cargarGlb(nombre: string): Promise<Group> {
  if (!cargador) {
    cargador = new GLTFLoader()
    // Los glb llevan EXT_meshopt_compression (ADR 0005): hace falta el decodificador.
    cargador.setMeshoptDecoder(MeshoptDecoder)
  }
  return cargador
    .loadAsync(`${import.meta.env.BASE_URL}modelos/edificios/${nombre}.glb`)
    .then((gltf) => gltf.scene)
}

const cache = crearCacheModelos<Group>(cargarGlb)

/**
 * Carga (una sola vez) el modelo de un edificio en una etapa. Devuelve la escena compartida de la
 * caché: quien la use debe clonarla (`.clone()`), no añadirla tal cual a varias partes de la escena.
 */
export function cargarModeloEdificio(tipo: TipoEdificio, etapa: EtapaObra): Promise<Group> {
  return cache.pedir(clave(tipo, etapa))
}

/** El modelo si ya cargó; `undefined` mientras tanto (entonces se usa la forma por código). */
export function modeloEdificioListo(tipo: TipoEdificio, etapa: EtapaObra): Group | undefined {
  return cache.listo(clave(tipo, etapa))
}

/** Pide todos los modelos por adelantado (p. ej. al arrancar) para que estén listos al construir. */
export function precargarModelosEdificios(): Promise<unknown> {
  return Promise.all(
    TIPOS_EDIFICIO.flatMap((tipo) => ETAPAS_OBRA.map((etapa) => cargarModeloEdificio(tipo, etapa))),
  )
}
