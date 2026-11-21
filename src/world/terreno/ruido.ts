/** Hash de enteros determinista (sin Math.random): devuelve un número en [0, 1). */
export function hashEnteros(ix: number, iz: number, semilla: number): number {
  let h =
    Math.imul(ix | 0, 0x27d4eb2d) ^
    Math.imul(iz | 0, 0x165667b1) ^
    Math.imul(semilla | 0, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

function suave(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Ruido de valor 2D continuo en [-1, 1], con celdas de 1 unidad. */
export function ruidoValor(x: number, z: number, semilla: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const tx = suave(x - ix)
  const tz = suave(z - iz)
  const a = hashEnteros(ix, iz, semilla)
  const b = hashEnteros(ix + 1, iz, semilla)
  const c = hashEnteros(ix, iz + 1, semilla)
  const d = hashEnteros(ix + 1, iz + 1, semilla)
  const arriba = a + (b - a) * tx
  const abajo = c + (d - c) * tx
  return (arriba + (abajo - arriba) * tz) * 2 - 1
}
