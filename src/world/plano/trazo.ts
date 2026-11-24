import type { Casilla } from './rectangulo'

/**
 * ¿Este evento de puntero es el clic derecho que cancela el trazo? Con el izquierdo pulsado, pulsar
 * el derecho no lanza `pointerdown` sino `pointermove` con `button === 2` (Pointer Events), así
 * que también se mira `buttons`. Pura.
 */
export function cancelaTrazoPuntero(e: { button: number; buttons: number }): boolean {
  return e.button === 2 || (e.buttons & 2) !== 0
}

/**
 * Casillas del trazo en L de `a` a `b` (M6-T03): primero el eje más largo desde `a` y luego el
 * otro hasta `b`. Empieza en `a`, acaba en `b`, sin repetir y con casillas contiguas (4-conexas).
 * Con ejes iguales va primero en x. `a = b` da una sola casilla. Pura.
 */
export function casillasTrazo(a: Casilla, b: Casilla): Casilla[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const sx = Math.sign(dx)
  const sy = Math.sign(dy)
  const casillas: Casilla[] = []
  const primeroX = Math.abs(dx) >= Math.abs(dy)
  let { x, y } = a
  casillas.push({ x, y })
  const pasos = (n: number, mover: () => void): void => {
    for (let i = 0; i < n; i++) {
      mover()
      casillas.push({ x, y })
    }
  }
  const enX = (): void => pasos(Math.abs(dx), () => (x += sx))
  const enY = (): void => pasos(Math.abs(dy), () => (y += sy))
  if (primeroX) {
    enX()
    enY()
  } else {
    enY()
    enX()
  }
  return casillas
}
