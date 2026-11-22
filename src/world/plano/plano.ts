import { Group, type Object3D, type PerspectiveCamera } from 'three'
import { ladoValle, type Comando } from '../../core'
import type { LectorEstado } from '../../juego/almacen'
import { comandoDeZona, herramientaPlano } from '../../juego/herramienta-plano'
import { seleccionParcela } from '../../juego/seleccion-parcela'
import type { FuncionAltura } from '../terreno/altura'
import { metrosACasilla } from '../terreno/coordenadas'
import { filtroDesaturacion } from './geometria-plano'
import { crearLindes } from './lindes'
import { DATOS_PLANO } from './plano-datos'
import { crearRejilla } from './rejilla'
import { crearResaltadoParcela } from './resaltado'
import { rectanguloDeArrastre, type Casilla } from './rectangulo'
import { crearSeleccion, type BajoCursor } from './seleccion'
import { crearCapaZonas } from './zonas'

export interface CapaPlano {
  readonly objeto: Object3D
  /** Parcela y punto bajo el cursor; `null` fuera del Modo Plano o fuera del valle. */
  readonly bajoCursor: BajoCursor | null
  /** Una vez por fotograma: sigue el cursor y resalta la parcela solo en Modo Plano. */
  actualizar(): void
  destruir(): void
}

/** Capa del Modo Plano: selección de parcela, pintado de zonas con el ratón y sus capas. */
export function crearCapaPlano(
  lector: LectorEstado & { despachar(comando: Comando): unknown },
  camara: PerspectiveCamera,
  lienzo: HTMLElement,
  terreno: Object3D,
  altura: FuncionAltura,
): CapaPlano {
  const { valle } = lector.estado
  const seleccion = crearSeleccion(camara, lienzo, terreno, valle)
  const resaltado = crearResaltadoParcela(valle, altura)

  // Clic izquierdo sin arrastre (la cámara del plano se mueve arrastrando) sobre una parcela:
  // la anuncia al canal de selección de la UI. No decide nada de reglas.
  const UMBRAL_ARRASTRE_PX = 5
  let inicio: { x: number; y: number } | null = null
  // Herramienta Zonas: arrastrar con el botón izquierdo pinta un rectángulo de casillas.
  let arrastre: { desde: Casilla; hasta: Casilla } | null = null
  const casillaBajoCursor = (): Casilla | null => {
    const bajo = seleccion.actualizar()
    if (!bajo) return null
    const lado = ladoValle(lector.estado.valle)
    const c = metrosACasilla(bajo.punto.x, bajo.punto.z, lector.estado.valle)
    return { x: Math.min(lado - 1, Math.max(0, c.x)), y: Math.min(lado - 1, Math.max(0, c.y)) }
  }
  const alPulsar = (e: PointerEvent): void => {
    inicio = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
    if (
      e.button !== 0 ||
      lector.estado.modo !== 'plano' ||
      herramientaPlano.herramienta !== 'zonas'
    )
      return
    const c = casillaBajoCursor()
    arrastre = c ? { desde: c, hasta: c } : null
  }
  const alSoltar = (e: PointerEvent): void => {
    const desde = inicio
    inicio = null
    if (e.button === 0 && arrastre) {
      const a = arrastre
      arrastre = null
      if (lector.estado.modo === 'plano' && herramientaPlano.herramienta === 'zonas') {
        const fin = casillaBajoCursor() ?? a.hasta
        lector.despachar(comandoDeZona(herramientaPlano.zona, rectanguloDeArrastre(a.desde, fin)))
      }
      return
    }
    if (
      !desde ||
      e.button !== 0 ||
      lector.estado.modo !== 'plano' ||
      herramientaPlano.herramienta !== 'parcelas'
    )
      return
    if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) > UMBRAL_ARRASTRE_PX) return
    const bajo = seleccion.actualizar()
    if (bajo) seleccionParcela.seleccionar(bajo.indiceParcela)
  }
  lienzo.addEventListener('pointerdown', alPulsar)
  lienzo.addEventListener('pointerup', alSoltar)

  const zonas = crearCapaZonas(valle, altura)
  const rejilla = crearRejilla(altura)
  const grupo = new Group()
  grupo.name = 'plano'
  const lindes = crearLindes(altura)
  grupo.add(zonas.objeto, resaltado.objeto, rejilla.objeto, lindes.objeto)
  // Desaturación: filtro CSS del lienzo (sin coste en la escena; se quita al salir del plano).
  lienzo.style.transition = `filter ${DATOS_PLANO.desaturacion.duracionTransicion}s ease`
  let desaturado = false
  let firmaPropias: string | null = null
  /** Reconstruye la rejilla solo si cambian las parcelas propias (p. ej. al comprar). */
  const sincronizar = (): void => {
    const v = lector.estado.valle
    const firma = v.parcelas.map((p) => (p.estado === 'propia' ? '1' : '0')).join('')
    if (firma === firmaPropias) return
    firmaPropias = firma
    rejilla.actualizar(v)
    lindes.actualizar(v)
  }
  return {
    objeto: grupo,
    get bajoCursor() {
      return seleccion.actual
    },
    actualizar() {
      const enPlano = lector.estado.modo === 'plano'
      grupo.visible = enPlano
      if (enPlano !== desaturado) {
        desaturado = enPlano
        lienzo.style.filter = enPlano ? filtroDesaturacion(DATOS_PLANO.desaturacion.cantidad) : ''
      }
      if (!enPlano) {
        arrastre = null
        seleccion.olvidar()
        resaltado.mostrar(null)
        return
      }
      sincronizar()
      zonas.actualizar(lector.estado.zonas)
      if (herramientaPlano.herramienta !== 'zonas') arrastre = null
      if (arrastre) {
        arrastre = { desde: arrastre.desde, hasta: casillaBajoCursor() ?? arrastre.hasta }
        zonas.vistaPrevia(
          rectanguloDeArrastre(arrastre.desde, arrastre.hasta),
          herramientaPlano.zona,
        )
      } else {
        zonas.vistaPrevia(null, herramientaPlano.zona)
      }
      const bajo = arrastre ? seleccion.actual : seleccion.actualizar()
      resaltado.mostrar(
        herramientaPlano.herramienta === 'zonas' ? null : (bajo?.indiceParcela ?? null),
      )
    },
    destruir() {
      lienzo.removeEventListener('pointerdown', alPulsar)
      lienzo.removeEventListener('pointerup', alSoltar)
      seleccion.destruir()
      resaltado.destruir()
      rejilla.destruir()
      lindes.destruir()
      zonas.destruir()
      lienzo.style.filter = ''
      lienzo.style.transition = ''
    },
  }
}
