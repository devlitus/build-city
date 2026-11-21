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
