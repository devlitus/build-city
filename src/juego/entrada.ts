import type { Comando, EstadoJuego, ModoJuego } from '../core'
import { HERRAMIENTAS, type Herramienta } from '../core/inventario'
import { objetivoDelante } from '../core/objetivo'
import type { Almacen } from './almacen'

/** Teclas de movimiento pulsadas. Es un objeto mutable: `instalarEntrada` lo rellena. */
export interface Teclas {
  adelante: boolean
  atras: boolean
  izquierda: boolean
  derecha: boolean
  correr: boolean
}

export function crearTeclas(): Teclas {
  return { adelante: false, atras: false, izquierda: false, derecha: false, correr: false }
}

/** Dirección en el plano del núcleo: `dx` al este (+x), `dy` al sur (+z). */
export interface Direccion {
  readonly dx: number
  readonly dy: number
}

/**
 * Dirección de movimiento relativa a la cámara (pura), de longitud 1 (también en diagonal) o
 * cero sin teclas o con teclas opuestas. Convención del `yaw` (rad): 0 mira al norte (-z), crece
 * hacia la derecha (a +x). «Adelante» es hacia donde mira la cámara proyectada en el suelo.
 */
export function direccionRelativa(
  teclas: Pick<Teclas, 'adelante' | 'atras' | 'izquierda' | 'derecha'>,
  yawCamara: number,
): Direccion {
  const avance = (teclas.adelante ? 1 : 0) - (teclas.atras ? 1 : 0)
  const lateral = (teclas.derecha ? 1 : 0) - (teclas.izquierda ? 1 : 0)
  if (avance === 0 && lateral === 0) return { dx: 0, dy: 0 }
  const s = Math.sin(yawCamara)
  const c = Math.cos(yawCamara)
  // adelante = (s, -c); derecha = (c, s) en (x, z).
  const dx = avance * s + lateral * c
  const dy = -avance * c + lateral * s
  const largo = Math.hypot(dx, dy)
  return { dx: dx / largo, dy: dy / largo }
}

const TECLAS: Readonly<Record<string, keyof Teclas>> = {
  KeyW: 'adelante',
  ArrowUp: 'adelante',
  KeyS: 'atras',
  ArrowDown: 'atras',
  KeyA: 'izquierda',
  ArrowLeft: 'izquierda',
  KeyD: 'derecha',
  ArrowRight: 'derecha',
  ShiftLeft: 'correr',
  ShiftRight: 'correr',
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

type Objetivo = Pick<Window, 'addEventListener' | 'removeEventListener'>

/**
 * Escucha el teclado y mantiene `teclas` al día; al perder el foco (`blur`) las suelta todas.
 * Devuelve la función que quita los oyentes. No hace `preventDefault`.
 */
export function instalarEntrada(
  objetivo: Objetivo = window,
  teclas: Teclas = crearTeclas(),
): () => void {
  const poner = (e: KeyboardEvent, valor: boolean): void => {
    const tecla = TECLAS[e.code]
    if (tecla === undefined) return
    if (valor && (e.ctrlKey || e.metaKey || e.altKey || enCampoDeTexto(e.target))) return
    teclas[tecla] = valor
  }
  const alBajar = (e: KeyboardEvent): void => poner(e, true)
  const alSubir = (e: KeyboardEvent): void => poner(e, false)
  const alPerderFoco = (): void => {
    Object.assign(teclas, crearTeclas())
  }
  objetivo.addEventListener('keydown', alBajar)
  objetivo.addEventListener('keyup', alSubir)
  objetivo.addEventListener('blur', alPerderFoco)
  return () => {
    objetivo.removeEventListener('keydown', alBajar)
    objetivo.removeEventListener('keyup', alSubir)
    objetivo.removeEventListener('blur', alPerderFoco)
    alPerderFoco()
  }
}

type ComandoElegir = Extract<Comando, { tipo: 'ElegirHerramienta' }>

/**
 * Tecla -> `ElegirHerramienta` (pura): `Digit1..9` y `Numpad1..9` eligen la herramienta de esa
 * posición. Con Alt/Ctrl/Meta no hace nada (Alt+número es la velocidad) y las teclas sobrantes
 * (más números que herramientas) tampoco.
 */
export function comandoHerramientaDeTecla(
  tecla: Pick<KeyboardEvent, 'code' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  herramientas: readonly Herramienta[] = HERRAMIENTAS,
): ComandoElegir | undefined {
  if (tecla.altKey || tecla.ctrlKey || tecla.metaKey) return undefined
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(tecla.code)
  if (!m) return undefined
  const herramienta = herramientas[Number(m[1]) - 1]
  return herramienta === undefined ? undefined : { tipo: 'ElegirHerramienta', herramienta }
}

/**
 * Rueda -> `ElegirHerramienta` (pura): `deltaY > 0` (hacia abajo) pasa a la siguiente y
 * `deltaY < 0` a la anterior, dando la vuelta en los extremos. Con Alt/Ctrl/Meta (zoom),
 * `deltaY` 0 o en Modo Plano (la rueda es el zoom de la cámara de plano) no hace nada.
 */
export function comandoHerramientaDeRueda(
  rueda: Pick<WheelEvent, 'deltaY' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  actual: Herramienta,
  herramientas: readonly Herramienta[] = HERRAMIENTAS,
  modo: ModoJuego = 'vida',
): ComandoElegir | undefined {
  if (modo === 'plano') return undefined
  if (rueda.altKey || rueda.ctrlKey || rueda.metaKey || rueda.deltaY === 0) return undefined
  const n = herramientas.length
  const i = herramientas.indexOf(actual)
  if (n === 0 || i < 0) return undefined
  const paso = rueda.deltaY > 0 ? 1 : -1
  const herramienta = herramientas[(i + paso + n) % n]
  return herramienta === undefined ? undefined : { tipo: 'ElegirHerramienta', herramienta }
}

/** Instala teclas 1-9 y rueda para elegir herramienta. Devuelve la función que quita los oyentes. */
export function instalarEleccionHerramienta(
  almacen: Pick<Almacen, 'estado' | 'despachar'>,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (e.repeat || enCampoDeTexto(e.target)) return
    const comando = comandoHerramientaDeTecla(e)
    if (!comando) return
    e.preventDefault()
    almacen.despachar(comando)
  }
  const alRodar = (e: WheelEvent): void => {
    if (enCampoDeTexto(e.target)) return
    const { herramienta, modo } = almacen.estado
    const comando = comandoHerramientaDeRueda(e, herramienta, HERRAMIENTAS, modo)
    if (!comando) return
    e.preventDefault()
    almacen.despachar(comando)
  }
  objetivo.addEventListener('keydown', alPulsar)
  objetivo.addEventListener('wheel', alRodar, { passive: false })
  return () => {
    objetivo.removeEventListener('keydown', alPulsar)
    objetivo.removeEventListener('wheel', alRodar)
  }
}

type ComandoUsar = Extract<Comando, { tipo: 'UsarHerramienta' }>

/**
 * Tecla o clic -> `UsarHerramienta` (pura): la casilla sale de `objetivoDelante`. **E** siempre
 * usa la herramienta; el **clic izquierdo** solo con el ratón capturado (*pointer lock*): sin
 * captura el clic sirve para capturarlo (cámara). Con Alt/Ctrl/Meta no hace nada.
 */
export function comandoUsarHerramienta(
  entrada:
    | Pick<KeyboardEvent, 'code' | 'altKey' | 'ctrlKey' | 'metaKey'>
    | Pick<MouseEvent, 'button' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  ratonCapturado: boolean,
  estado: Pick<EstadoJuego, 'obstaculos' | 'personaje'>,
): ComandoUsar | undefined {
  if (entrada.altKey || entrada.ctrlKey || entrada.metaKey) return undefined
  const usa = 'code' in entrada ? entrada.code === 'KeyE' : entrada.button === 0 && ratonCapturado
  if (!usa) return undefined
  const { personaje } = estado
  const objetivo = objetivoDelante(personaje, personaje.orientacion, estado)
  return { tipo: 'UsarHerramienta', x: objetivo.x, y: objetivo.y }
}

/**
 * Instala E (en `objetivo`) y el clic izquierdo (en `lienzo`) para usar la herramienta. Solo
 * envía el comando por el almacén. Devuelve la función que quita los oyentes.
 */
export function instalarUsoHerramienta(
  almacen: Pick<Almacen, 'estado' | 'despachar'>,
  lienzo: Pick<HTMLElement, 'addEventListener' | 'removeEventListener'>,
  ratonCapturado: () => boolean,
  objetivo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const alPulsar = (e: KeyboardEvent): void => {
    if (e.repeat || enCampoDeTexto(e.target)) return
    const comando = comandoUsarHerramienta(e, ratonCapturado(), almacen.estado)
    if (!comando) return
    e.preventDefault()
    almacen.despachar(comando)
  }
  // `mousedown`: el clic que captura el ratón (aún sin captura) no golpea; los siguientes sí.
  const alPulsarRaton = (e: MouseEvent): void => {
    const comando = comandoUsarHerramienta(e, ratonCapturado(), almacen.estado)
    if (comando) almacen.despachar(comando)
  }
  objetivo.addEventListener('keydown', alPulsar)
  lienzo.addEventListener('mousedown', alPulsarRaton)
  return () => {
    objetivo.removeEventListener('keydown', alPulsar)
    lienzo.removeEventListener('mousedown', alPulsarRaton)
  }
}
