import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three'
import type { Valle } from '../../core'
import { colorHex, paletaJuego } from '../paleta'
import { casillaAMetros } from './coordenadas'
import { zocalo, type Huella } from './aplanar'
import type { FuncionAltura } from './altura'
import { PARAMETROS_TERRENO } from './parametros'

/**
 * Crea la malla del zócalo (caja low-poly) de una huella, ya colocada en el mundo.
 * El edificio debe ponerse a `alturaAsiento` (= cota superior del zócalo).
 */
export function crearZocalo(
  huella: Huella,
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
  altura: FuncionAltura,
): Mesh {
  const d = zocalo(huella, valle, altura)
  const { voladizo, colorPaleta } = PARAMETROS_TERRENO.zocalo
  const ancho = huella.x1 - huella.x0 + 1 + voladizo * 2
  const fondo = huella.y1 - huella.y0 + 1 + voladizo * 2
  const a = casillaAMetros(huella.x0, huella.y0, valle)
  const b = casillaAMetros(huella.x1, huella.y1, valle)
  const malla = new Mesh(
    new BoxGeometry(ancho, d.alto, fondo),
    new MeshStandardMaterial({ color: colorHex(paletaJuego, colorPaleta), flatShading: true }),
  )
  malla.position.set((a.x + b.x) / 2, d.cotaInferior + d.alto / 2, (a.z + b.z) / 2)
  malla.castShadow = true
  malla.receiveShadow = true
  return malla
}
