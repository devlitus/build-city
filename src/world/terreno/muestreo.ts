import type { FuncionAltura } from './altura'

/**
 * Alturas de la rejilla de vértices de un trozo: (celdas + 1)² valores, índice = j * (celdas + 1) + i,
 * con el vértice (i, j) en (xMin + i, zMin + j) metros. Se usa la rejilla global de 1 m, así los
 * bordes compartidos por dos trozos vecinos dan exactamente las mismas alturas.
 */
export function alturasDeTrozo(
  altura: FuncionAltura,
  xMin: number,
  zMin: number,
  celdas: number,
): Float32Array {
  const n = celdas + 1
  const a = new Float32Array(n * n)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) a[j * n + i] = altura(xMin + i, zMin + j)
  return a
}
