/**
 * Hash entero determinista para variar el dibujo por casilla sin `Math.random`.
 * Mezcla de bits tipo murmur3 (finalizador); devuelve un entero sin signo de 32 bits.
 */
export function hashEntero(a: number, b = 0): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca6b)) >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** Número en [0, 1) determinista según la casilla (`indice`) y una sal. */
export function azarCasilla(indice: number, sal = 0): number {
  return hashEntero(indice, sal) / 4294967296
}
