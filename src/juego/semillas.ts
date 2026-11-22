import type { Comando, EstadoJuego } from '../core'
import { cantidadDe, esSemilla, type ObjetoId } from '../core/inventario'
import type { Almacen } from './almacen'

type ComandoSemilla = Extract<Comando, { tipo: 'ElegirSemilla' }>

/** Semillas distintas del inventario, en el orden en que aparecen sus ranuras. */
export function semillasDisponibles(inventario: EstadoJuego['inventario']): readonly ObjetoId[] {
  const lista: ObjetoId[] = []
  for (const r of inventario) {
    if (esSemilla(r.objeto) && r.cantidad > 0 && !lista.includes(r.objeto)) lista.push(r.objeto)
  }
  return lista
}

/**
 * Siguiente semilla del inventario tras `actual` (cíclico). Sin semilla actual, o si ya no queda,
 * la primera. `null` si no hay ninguna semilla. Pura.
 */
export function siguienteSemilla(
  inventario: EstadoJuego['inventario'],
  actual: ObjetoId | null,
): ObjetoId | null {
  const lista = semillasDisponibles(inventario)
  if (lista.length === 0) return null
  const i = actual === null ? -1 : lista.indexOf(actual)
  return lista[(i + 1) % lista.length] ?? null
}

type EstadoSemillas = Pick<EstadoJuego, 'herramienta' | 'inventario' | 'semillaElegida' | 'modo'>

/**
 * Tecla -> `ElegirSemilla` (pura): con la herramienta «semillas» y el Modo Vida, **R** pasa a la
 * siguiente semilla del inventario. Con modificadores o sin semillas no hace nada.
 */
export function comandoSemillaDeTecla(
  tecla: Pick<KeyboardEvent, 'code' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  estado: EstadoSemillas,
): ComandoSemilla | undefined {
  if (tecla.altKey || tecla.ctrlKey || tecla.metaKey || tecla.code !== 'KeyR') return undefined
  if (estado.herramienta !== 'semillas' || estado.modo !== 'vida') return undefined
  const siguiente = siguienteSemilla(estado.inventario, estado.semillaElegida)
  if (siguiente === null || siguiente === estado.semillaElegida) return undefined
  return { tipo: 'ElegirSemilla', objeto: siguiente }
}

/**
 * `ElegirSemilla` que falta al tener «semillas» activa (pura): sin semilla elegida, o con una que
 * ya no queda, se elige la primera disponible. `undefined` si no hace falta o no hay semillas.
 */
export function comandoSemillaPorDefecto(estado: EstadoSemillas): ComandoSemilla | undefined {
  if (estado.herramienta !== 'semillas') return undefined
  const { semillaElegida: actual, inventario } = estado
  if (actual !== null && cantidadDe(inventario, actual) >= 1) return undefined
  const primera = semillasDisponibles(inventario)[0]
  return primera === undefined ? undefined : { tipo: 'ElegirSemilla', objeto: primera }
}

/**
 * Instala **R** (siguiente semilla) y mantiene una semilla elegida mientras «semillas» está
 * activa. Solo despacha comandos. Devuelve la función que quita los oyentes.
 */
export function instalarEleccionSemilla(
  almacen: Pick<Almacen, 'estado' | 'despachar' | 'suscribir'>,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (e.repeat) return
    const el = e.target as { tagName?: string; isContentEditable?: boolean } | null
    const etiqueta = el?.tagName?.toUpperCase()
    if (etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT') return
    if (el?.isContentEditable) return
    const comando = comandoSemillaDeTecla(e, almacen.estado)
    if (!comando) return
    e.preventDefault()
    almacen.despachar(comando)
  }
  const quitarSuscripcion = almacen.suscribir(() => {
    const comando = comandoSemillaPorDefecto(almacen.estado)
    if (comando) almacen.despachar(comando)
  })
  objetivo.addEventListener('keydown', alPulsar)
  return () => {
    objetivo.removeEventListener('keydown', alPulsar)
    quitarSuscripcion()
  }
}
