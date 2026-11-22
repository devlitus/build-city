import type { Comando, EstadoJuego, Zona } from '../core'
import type { LectorEstado, Suscriptor } from './almacen'
import { colocacion } from './colocacion'
import type { TeclaEntrada } from './tiempo'

/**
 * Herramienta activa del Modo Plano. Es estado de interfaz, no de partida: la UI y el teclado
 * la escriben y la escena la lee para decidir qué hace el ratón. No pasa por el núcleo ni se guarda.
 * Cada tarea implementa las suyas: parcelas y zonas (M5-T01), construir y mover (M5-T03),
 * demoler (M5-T06).
 */
export type HerramientaPlano = 'parcelas' | 'zonas' | 'construir' | 'mover' | 'demoler'

/** Zona que se pinta con la herramienta Zonas, o `'borrar'` para quitarla. */
export type ZonaElegida = Zona | 'borrar'

export const HERRAMIENTA_POR_DEFECTO: HerramientaPlano = 'parcelas'
export const ZONA_POR_DEFECTO: ZonaElegida = 'cultivo'

export interface EstadoHerramientaPlano {
  readonly herramienta: HerramientaPlano
  readonly zona: ZonaElegida
}

export type OyenteHerramienta = (estado: EstadoHerramientaPlano) => void

export interface CanalHerramientaPlano {
  readonly herramienta: HerramientaPlano
  readonly zona: ZonaElegida
  elegirHerramienta(herramienta: HerramientaPlano): void
  elegirZona(zona: ZonaElegida): void
  /** Vuelve a `parcelas` (no cambia la zona elegida). */
  reiniciar(): void
  suscribir(oyente: OyenteHerramienta): () => void
}

export function crearCanalHerramientaPlano(): CanalHerramientaPlano {
  let herramienta: HerramientaPlano = HERRAMIENTA_POR_DEFECTO
  let zona: ZonaElegida = ZONA_POR_DEFECTO
  const oyentes = new Set<OyenteHerramienta>()
  const avisar = (): void => {
    for (const o of [...oyentes]) o({ herramienta, zona })
  }
  return {
    get herramienta() {
      return herramienta
    },
    get zona() {
      return zona
    },
    elegirHerramienta(nueva) {
      if (nueva === herramienta) return
      herramienta = nueva
      avisar()
    },
    elegirZona(nueva) {
      if (nueva === zona) return
      zona = nueva
      avisar()
    },
    reiniciar() {
      if (herramienta === HERRAMIENTA_POR_DEFECTO) return
      herramienta = HERRAMIENTA_POR_DEFECTO
      avisar()
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
  }
}

/** Canal único de la aplicación, compartido por la escena y la UI. */
export const herramientaPlano: CanalHerramientaPlano = crearCanalHerramientaPlano()

/**
 * Herramienta que corresponde a una tecla en Modo Plano (pura), o `undefined` si no hace nada.
 * Z activa Zonas; Esc vuelve a Parcelas. Ignora repetición y combinaciones con Ctrl/Alt/Meta.
 * M, X y 1–9 están reservadas para otras herramientas (R gira el fantasma: `esTeclaGirar`).
 */
export function herramientaDeTecla(
  tecla: TeclaEntrada,
  estado: Pick<EstadoJuego, 'modo'>,
): HerramientaPlano | undefined {
  if (estado.modo !== 'plano') return undefined
  if (tecla.repeat || tecla.altKey || tecla.ctrlKey || tecla.metaKey) return undefined
  if (tecla.code === 'KeyZ') return 'zonas'
  if (tecla.code === 'Escape') return 'parcelas'
  return undefined
}

/**
 * ¿Esta tecla gira el fantasma 90°? Solo R, en Modo Plano con la herramienta Construir; ignora
 * repetición y combinaciones con Ctrl/Alt/Meta. Pura.
 */
export function esTeclaGirar(
  tecla: TeclaEntrada,
  estado: Pick<EstadoJuego, 'modo'>,
  herramienta: HerramientaPlano,
): boolean {
  if (estado.modo !== 'plano' || herramienta !== 'construir') return false
  if (tecla.repeat || tecla.altKey || tecla.ctrlKey || tecla.metaKey) return false
  return tecla.code === 'KeyR'
}

/** Comando `PintarZona` o `BorrarZona` de un rectángulo de casillas según la zona elegida. */
export function comandoDeZona(
  zona: ZonaElegida,
  rect: { x0: number; y0: number; x1: number; y1: number },
): Comando {
  return zona === 'borrar' ? { tipo: 'BorrarZona', ...rect } : { tipo: 'PintarZona', ...rect, zona }
}

function enCampoDeTexto(destino: EventTarget | null): boolean {
  const el = destino as { tagName?: string; isContentEditable?: boolean } | null
  const etiqueta = el?.tagName?.toUpperCase()
  return (
    etiqueta === 'INPUT' ||
    etiqueta === 'TEXTAREA' ||
    etiqueta === 'SELECT' ||
    !!el?.isContentEditable
  )
}

/**
 * Escucha `keydown` para cambiar de herramienta y vuelve a `parcelas` al salir del Modo Plano.
 * Devuelve la función que quita los oyentes.
 */
export function instalarTeclasHerramientaPlano(
  almacen: LectorEstado & { suscribir(suscriptor: Suscriptor): () => void },
  canal: CanalHerramientaPlano = herramientaPlano,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
  girarFantasma: () => void = () => colocacion.girar(),
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (enCampoDeTexto(e.target)) return
    if (esTeclaGirar(e, almacen.estado, canal.herramienta)) {
      girarFantasma()
      return
    }
    const h = herramientaDeTecla(e, almacen.estado)
    if (h) canal.elegirHerramienta(h)
  }
  objetivo.addEventListener('keydown', alPulsar)
  const baja = almacen.suscribir(() => {
    if (almacen.estado.modo !== 'plano') canal.reiniciar()
  })
  return () => {
    objetivo.removeEventListener('keydown', alPulsar)
    baja()
  }
}
