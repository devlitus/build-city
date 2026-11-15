import { MeshStandardMaterial } from 'three'
import { color } from './paleta'

const cache = new Map<string, MeshStandardMaterial>()

/**
 * Material compartido de un color de la paleta, creado una sola vez por nombre.
 * Sombreado plano y sin brillo (`roughness: 1`, `metalness: 0`). Se usa
 * `MeshStandardMaterial` para que reaccione igual que los futuros `.glb` (PBR)
 * a la luz de hemisferio y al sol.
 */
export function materialDe(nombre: string): MeshStandardMaterial {
  let material = cache.get(nombre)
  if (!material) {
    material = new MeshStandardMaterial({
      color: color(nombre),
      flatShading: true,
      roughness: 1,
      metalness: 0,
    })
    cache.set(nombre, material)
  }
  return material
}
