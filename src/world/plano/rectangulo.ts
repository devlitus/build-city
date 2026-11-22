/** Casilla global del núcleo (x al este, y al sur). */
export interface Casilla {
  readonly x: number
  readonly y: number
}

/** Rectángulo de casillas con esquinas inclusivas y ordenadas (`x0 <= x1`, `y0 <= y1`). */
export interface RectanguloCasillas {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** Rectángulo que abarca el arrastre de `a` a `b`, en cualquier dirección. */
export function rectanguloDeArrastre(a: Casilla, b: Casilla): RectanguloCasillas {
  return {
    x0: Math.min(a.x, b.x),
    y0: Math.min(a.y, b.y),
    x1: Math.max(a.x, b.x),
    y1: Math.max(a.y, b.y),
  }
}

/** Todas las casillas del arrastre de `a` a `b`, por filas de norte a sur. */
export function casillasDeArrastre(a: Casilla, b: Casilla): Casilla[] {
  const r = rectanguloDeArrastre(a, b)
  const casillas: Casilla[] = []
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) casillas.push({ x, y })
  return casillas
}
