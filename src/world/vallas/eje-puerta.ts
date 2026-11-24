import { LADO_E, LADO_N, LADO_O, LADO_S, type MascaraVecinos } from './forma'

/**
 * Eje de una puerta según sus vecinas: 0 = a lo largo de x (conecta este/oeste), 1 = a lo largo
 * de z (conecta norte/sur). Si solo conecta norte o sur va en z; en cualquier otro caso, en x.
 */
export function ejePuerta(mascara: MascaraVecinos): 0 | 1 {
  const ns = (mascara & (LADO_N | LADO_S)) !== 0
  const eo = (mascara & (LADO_E | LADO_O)) !== 0
  return ns && !eo ? 1 : 0
}
