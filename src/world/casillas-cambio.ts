/**
 * Diferencias entre dos cadenas de casillas (`vallas`, `caminos`) para actualizar el dibujo solo
 * donde hace falta. Funciones puras, sin three.js.
 */

const SIN_CASILLA = '.'

/**
 * Índices (y*lado+x) cuyo carácter difiere entre `antes` y `despues`. Si `antes` es `undefined`
 * (aún no se ha dibujado nada) cuenta como una cadena toda de `.`: salen las casillas no vacías.
 */
export function casillasCambiadas(antes: string | undefined, despues: string): number[] {
  const r: number[] = []
  for (let i = 0; i < despues.length; i++) {
    if ((antes?.[i] ?? SIN_CASILLA) !== despues[i]) r.push(i)
  }
  return r
}

/**
 * Las casillas dadas más sus cuatro vecinas dentro del valle, sin repetir y en orden creciente.
 * Sirve para recalcular la forma de las vallas, que depende de los vecinos.
 */
export function conVecinas(indices: readonly number[], lado: number): number[] {
  const todas = new Set<number>()
  for (const i of indices) {
    const x = i % lado
    const y = Math.floor(i / lado)
    todas.add(i)
    if (y > 0) todas.add(i - lado)
    if (y < lado - 1) todas.add(i + lado)
    if (x > 0) todas.add(i - 1)
    if (x < lado - 1) todas.add(i + 1)
  }
  return [...todas].sort((a, b) => a - b)
}
