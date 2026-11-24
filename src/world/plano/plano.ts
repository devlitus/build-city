import { Group, type Object3D, type PerspectiveCamera } from 'three'
import {
  edificioEnCasilla,
  ladoValle,
  rotacionDe,
  veredictoColocacion,
  veredictoMover,
  type Comando,
} from '../../core'
import type { LectorEstado } from '../../juego/almacen'
import { comandoDeZona, esHerramientaTrazo, herramientaPlano } from '../../juego/herramienta-plano'
import {
  comandoDeTrazo,
  resumenTrazo,
  trazoEnviable,
  trazoPlano,
  type ResumenTrazo,
} from '../../juego/trazo-plano'
import { colocacion } from '../../juego/colocacion'
import { edificioElegido } from '../../juego/edificio-elegido'
import { edicionPlano } from '../../juego/edicion-plano'
import { seleccionParcela } from '../../juego/seleccion-parcela'
import type { FuncionAltura } from '../terreno/altura'
import { metrosACasilla } from '../terreno/coordenadas'
import { filtroDesaturacion } from './geometria-plano'
import { crearFantasma } from './fantasma'
import { crearLindes } from './lindes'
import { DATOS_PLANO } from './plano-datos'
import { crearRejilla } from './rejilla'
import { crearResaltadoParcela } from './resaltado'
import { rectanguloDeArrastre, type Casilla } from './rectangulo'
import { crearSeleccion, type BajoCursor } from './seleccion'
import { cancelaTrazoPuntero, casillasTrazo } from './trazo'
import { crearVistaPreviaTrazo } from './trazo-vista'
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
  const fantasma = crearFantasma(valle, altura)

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
  // Herramientas Vallas, Puertas y Caminos: arrastrar traza una L de A a B (con Mayús, quita).
  let trazo: { desde: Casilla; hasta: Casilla } | null = null
  let mayus = false
  let cacheResumen: { clave: string; estado: unknown; resumen: ResumenTrazo } | null = null
  const resumenActual = (t: { desde: Casilla; hasta: Casilla }): ResumenTrazo | null => {
    const h = herramientaPlano.herramienta
    if (!esHerramientaTrazo(h)) return null
    const clave = `${h}|${mayus}|${t.desde.x},${t.desde.y}|${t.hasta.x},${t.hasta.y}`
    if (cacheResumen?.clave === clave && cacheResumen.estado === lector.estado) {
      return cacheResumen.resumen
    }
    const resumen = resumenTrazo(lector.estado, h, casillasTrazo(t.desde, t.hasta), mayus)
    cacheResumen = { clave, estado: lector.estado, resumen }
    return resumen
  }
  let idPuntero: number | null = null
  const soltarPuntero = (): void => {
    if (idPuntero !== null && lienzo.hasPointerCapture?.(idPuntero)) {
      lienzo.releasePointerCapture(idPuntero)
    }
    idPuntero = null
  }
  const cancelarTrazo = (): void => {
    soltarPuntero()
    trazo = null
    herramientaPlano.fijarTrazoEnCurso(false)
    vistaTrazo.mostrar(null)
    trazoPlano.fijar(null)
  }
  herramientaPlano.alCancelarTrazo(cancelarTrazo)
  const alTeclaMayus = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') mayus = e.type === 'keydown'
  }
  const alPulsar = (e: PointerEvent): void => {
    mayus = e.shiftKey
    if (trazo && cancelaTrazoPuntero(e)) {
      cancelarTrazo()
      return
    }
    inicio = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
    if (
      e.button === 0 &&
      lector.estado.modo === 'plano' &&
      esHerramientaTrazo(herramientaPlano.herramienta)
    ) {
      const c = casillaBajoCursor()
      trazo = c ? { desde: c, hasta: c } : null
      herramientaPlano.fijarTrazoEnCurso(trazo !== null)
      if (trazo) {
        // Captura el puntero: soltar fuera del lienzo o sobre un panel también cierra el trazo.
        idPuntero = e.pointerId
        lienzo.setPointerCapture?.(e.pointerId)
      }
      return
    }
    if (
      e.button !== 0 ||
      lector.estado.modo !== 'plano' ||
      herramientaPlano.herramienta !== 'zonas'
    )
      return
    const c = casillaBajoCursor()
    arrastre = c ? { desde: c, hasta: c } : null
  }
  // Con el izquierdo pulsado, el derecho llega como `pointermove` (no `pointerdown`) o `contextmenu`.
  const alMover = (e: PointerEvent): void => {
    if (trazo && cancelaTrazoPuntero(e)) cancelarTrazo()
  }
  const alMenuContextual = (e: Event): void => {
    if (trazo) cancelarTrazo()
    if (esHerramientaTrazo(herramientaPlano.herramienta)) e.preventDefault()
  }
  const alPerderFoco = (): void => {
    mayus = false
  }
  const alSoltar = (e: PointerEvent): void => {
    const desde = inicio
    inicio = null
    if (e.button === 0 && trazo) {
      const a = trazo
      mayus = e.shiftKey
      const fin = casillaBajoCursor() ?? a.hasta
      cancelarTrazo()
      const h = herramientaPlano.herramienta
      if (lector.estado.modo === 'plano' && esHerramientaTrazo(h)) {
        // Se recalcula con el estado de ahora mismo; en rojo (nada válido, sin material) no se envía.
        const r = resumenTrazo(lector.estado, h, casillasTrazo(a.desde, fin), mayus)
        if (trazoEnviable(r)) lector.despachar(comandoDeTrazo(r))
      }
      return
    }
    if (e.button === 0 && arrastre) {
      const a = arrastre
      arrastre = null
      if (lector.estado.modo === 'plano' && herramientaPlano.herramienta === 'zonas') {
        const fin = casillaBajoCursor() ?? a.hasta
        lector.despachar(comandoDeZona(herramientaPlano.zona, rectanguloDeArrastre(a.desde, fin)))
      }
      return
    }
    if (!desde || e.button !== 0 || lector.estado.modo !== 'plano') return
    if (Math.hypot(e.clientX - desde.x, e.clientY - desde.y) > UMBRAL_ARRASTRE_PX) return
    if (herramientaPlano.herramienta === 'construir') {
      // Clic izquierdo sin arrastre: construye lo que muestra el fantasma, con los mismos
      // parámetros. Tras construir se puede seguir colocando otro igual (Esc o volver a elegir
      // el edificio lo cancela). El núcleo decide; el clic en rojo no envía nada.
      // Se recalcula con el estado de ahora mismo (pudo cambiar desde el último fotograma).
      const f = fantasma.actual
      const ahora = f ? veredictoColocacion(lector.estado, f.tipo, f.x, f.y, f.rotacion) : null
      if (f && ahora?.valida) {
        lector.despachar({
          tipo: 'Construir',
          tipoEdificio: f.tipo,
          x: f.x,
          y: f.y,
          rotacion: f.rotacion,
        })
      }
      return
    }
    if (herramientaPlano.herramienta === 'mover') {
      const cogido = edicionPlano.cogido
      if (cogido === null) {
        // Coger: el edificio bajo el cursor pasa a ser el fantasma, con su tipo y su giro.
        const c = casillaBajoCursor()
        const e = c && edificioEnCasilla(lector.estado, c.x, c.y, ladoValle(lector.estado.valle))
        if (e) {
          colocacion.fijarRotacion(rotacionDe(e))
          edicionPlano.coger(e.id)
        }
        return
      }
      // Soltar: el veredicto sale de `comprobarMover`, la misma comprobación que el comando.
      // Se recalcula con el estado de ahora mismo. En rojo no se envía nada.
      const f = fantasma.actual
      if (f && veredictoMover(lector.estado, cogido, f.x, f.y, f.rotacion).valida) {
        lector.despachar({
          tipo: 'MoverEdificio',
          id: cogido,
          x: f.x,
          y: f.y,
          rotacion: f.rotacion,
        })
        edicionPlano.soltar()
        colocacion.reiniciar()
      }
      return
    }
    if (herramientaPlano.herramienta === 'demoler') {
      // Abre la confirmación del edificio bajo el cursor; un clic en vacío la cierra.
      const c = casillaBajoCursor()
      const e = c && edificioEnCasilla(lector.estado, c.x, c.y, ladoValle(lector.estado.valle))
      if (e) edicionPlano.pedirQuitar(e.id)
      else edicionPlano.descartar()
      return
    }
    if (herramientaPlano.herramienta !== 'parcelas') return
    const bajo = seleccion.actualizar()
    if (bajo) seleccionParcela.seleccionar(bajo.indiceParcela)
  }
  lienzo.addEventListener('pointerdown', alPulsar)
  lienzo.addEventListener('pointerup', alSoltar)
  window.addEventListener('keydown', alTeclaMayus)
  window.addEventListener('keyup', alTeclaMayus)
  window.addEventListener('blur', alPerderFoco)
  lienzo.addEventListener('pointermove', alMover)
  lienzo.addEventListener('contextmenu', alMenuContextual)

  const vistaTrazo = crearVistaPreviaTrazo(valle, altura)
  const zonas = crearCapaZonas(valle, altura)
  const rejilla = crearRejilla(altura)
  const grupo = new Group()
  grupo.name = 'plano'
  const lindes = crearLindes(altura)
  grupo.add(
    zonas.objeto,
    resaltado.objeto,
    rejilla.objeto,
    lindes.objeto,
    fantasma.objeto,
    vistaTrazo.objeto,
  )
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
        if (trazo) cancelarTrazo()
        seleccion.olvidar()
        resaltado.mostrar(null)
        fantasma.actualizar(lector.estado, null, null, 0)
        colocacion.fijarVeredicto(null)
        return
      }
      sincronizar()
      zonas.actualizar(lector.estado.zonas)
      if (herramientaPlano.herramienta !== 'zonas') arrastre = null
      if (trazo && !esHerramientaTrazo(herramientaPlano.herramienta)) cancelarTrazo()
      if (trazo) {
        trazo = { desde: trazo.desde, hasta: casillaBajoCursor() ?? trazo.hasta }
        const resumen = resumenActual(trazo)
        vistaTrazo.mostrar(resumen)
        trazoPlano.fijar(resumen)
      }
      if (arrastre) {
        arrastre = { desde: arrastre.desde, hasta: casillaBajoCursor() ?? arrastre.hasta }
        zonas.vistaPrevia(
          rectanguloDeArrastre(arrastre.desde, arrastre.hasta),
          herramientaPlano.zona,
        )
      } else {
        zonas.vistaPrevia(null, herramientaPlano.zona)
      }
      const bajo = arrastre || trazo ? seleccion.actual : seleccion.actualizar()
      // Herramienta Construir: el fantasma sigue al cursor y publica su veredicto a la UI.
      const construyendo = herramientaPlano.herramienta === 'construir'
      // Herramienta Mover: con un edificio cogido, el fantasma es de su tipo y lleva su id para
      // que el veredicto salga de `comprobarMover`. Si el edificio desapareció, se suelta.
      let cogido = herramientaPlano.herramienta === 'mover' ? edicionPlano.cogido : null
      const origen =
        cogido === null ? undefined : lector.estado.edificios.find((b) => b.id === cogido)
      if (cogido !== null && !origen) {
        edicionPlano.soltar()
        cogido = null
      }
      const f = fantasma.actualizar(
        lector.estado,
        construyendo ? edificioElegido.actual : (origen?.tipo ?? null),
        construyendo || cogido !== null ? casillaBajoCursor() : null,
        colocacion.rotacion,
        cogido,
      )
      colocacion.fijarVeredicto(f?.veredicto ?? null)
      resaltado.mostrar(
        herramientaPlano.herramienta === 'parcelas' ? (bajo?.indiceParcela ?? null) : null,
      )
    },
    destruir() {
      lienzo.removeEventListener('pointerdown', alPulsar)
      lienzo.removeEventListener('pointerup', alSoltar)
      window.removeEventListener('keydown', alTeclaMayus)
      window.removeEventListener('keyup', alTeclaMayus)
      window.removeEventListener('blur', alPerderFoco)
      lienzo.removeEventListener('pointermove', alMover)
      lienzo.removeEventListener('contextmenu', alMenuContextual)
      herramientaPlano.alCancelarTrazo(null)
      cancelarTrazo()
      vistaTrazo.destruir()
      seleccion.destruir()
      resaltado.destruir()
      fantasma.destruir()
      rejilla.destruir()
      lindes.destruir()
      zonas.destruir()
      lienzo.style.filter = ''
      lienzo.style.transition = ''
    },
  }
}
