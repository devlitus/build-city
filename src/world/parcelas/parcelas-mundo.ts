import {
  BoxGeometry,
  CanvasTexture,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  type Material,
} from 'three'
import { indicesConCartel } from '../../core'
import type { LectorEstado } from '../../juego/almacen'
import { color } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import { centroParcela, escalaAparicion, esquinasPropias } from './geometria-parcelas'
import { DATOS_PARCELAS } from './parcelas-datos'

export interface ParcelasMundo {
  readonly objeto: Object3D
  /** Una vez por fotograma: detecta compras (por referencia) y anima los mojones nuevos. */
  actualizar(dt: number): void
  destruir(): void
}

function texturaCartel(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const lienzo = document.createElement('canvas')
  lienzo.width = 256
  lienzo.height = 128
  const ctx = lienzo.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#' + color('cartelTablilla').toString(16).padStart(6, '0')
  ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#' + color('cartelTexto').toString(16).padStart(6, '0')
  ctx.font = 'bold 44px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(DATOS_PARCELAS.cartel.texto, 128, 66, 236)
  const t = new CanvasTexture(lienzo)
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * Mojones en las esquinas de las parcelas propias y carteles «Se vende» en las comprables.
 * Visibles en Modo Vida y en Modo Plano. Todo con `InstancedMesh`.
 */
export function crearParcelasMundo(lector: LectorEstado, altura: FuncionAltura): ParcelasMundo {
  const dm = DATOS_PARCELAS.mojon
  const dc = DATOS_PARCELAS.cartel
  const capacidad = lector.estado.valle.parcelas.length
  // Cada parcela aporta como mucho 4 esquinas propias.
  const capacidadMojones = capacidad * 4

  const geoMojon = new BoxGeometry(1, 1, 1)
  const matMojon = new MeshStandardMaterial({ color: color('mojon'), roughness: 0.9 })
  const mojones = new InstancedMesh(geoMojon, matMojon, capacidadMojones)
  mojones.name = 'mojones'
  mojones.castShadow = true
  mojones.receiveShadow = true
  mojones.frustumCulled = false

  const geoPoste = new BoxGeometry(dc.grosorPoste, dc.alturaPoste, dc.grosorPoste)
  const matPoste = new MeshStandardMaterial({ color: color('cartelPoste'), roughness: 0.9 })
  const postes = new InstancedMesh(geoPoste, matPoste, capacidad)
  postes.name = 'carteles-postes'
  postes.castShadow = true
  postes.frustumCulled = false

  const geoTablilla = new BoxGeometry(dc.anchoTablilla, dc.altoTablilla, dc.grosorTablilla)
  const textura = texturaCartel()
  const matTablilla = new MeshStandardMaterial(
    textura ? { map: textura, roughness: 0.8 } : { color: color('cartelTablilla'), roughness: 0.8 },
  )
  const tablillas = new InstancedMesh(geoTablilla, matTablilla, capacidad)
  tablillas.name = 'carteles-tablillas'
  tablillas.castShadow = true
  tablillas.frustumCulled = false

  const grupo = new Group()
  grupo.name = 'parcelas-mundo'
  grupo.add(mojones, postes, tablillas)

  const aux = new Object3D()
  /** Tiempo (s) desde que apareció cada mojón nuevo, por clave; los asentados no están. */
  let esquinas = [] as { x: number; z: number; y: number; clave: string }[]
  const edad = new Map<string, number>()
  let parcelasVistas: unknown = null

  const dibujarMojones = (): void => {
    mojones.count = esquinas.length
    esquinas.forEach((e, i) => {
      const s = escalaAparicion(edad.get(e.clave) ?? Infinity, DATOS_PARCELAS.aparicion.duracion)
      aux.position.set(e.x, e.y - dm.hundimiento + (dm.alto * s) / 2, e.z)
      aux.scale.set(dm.ancho * s, dm.alto * s, dm.ancho * s)
      aux.updateMatrix()
      mojones.setMatrixAt(i, aux.matrix)
    })
    mojones.instanceMatrix.needsUpdate = true
  }

  const reconstruir = (): void => {
    const estado = lector.estado
    // Mojones: los de esquinas que no existían antes arrancan la animación.
    const previas = new Set(esquinas.map((e) => e.clave))
    const primera = parcelasVistas === null
    esquinas = esquinasPropias(estado.valle).map((p) => ({
      ...p,
      y: altura(p.x, p.z),
      clave: `${p.x},${p.z}`,
    }))
    for (const e of esquinas) if (!primera && !previas.has(e.clave)) edad.set(e.clave, 0)
    dibujarMojones()

    // Carteles: poste y tablilla en el centro de cada parcela comprable.
    const indices = indicesConCartel(estado)
    postes.count = indices.length
    tablillas.count = indices.length
    indices.forEach((indice, i) => {
      const c = centroParcela(estado.valle, indice)
      if (!c) return
      const y = altura(c.x, c.z)
      aux.scale.set(1, 1, 1)
      aux.position.set(c.x, y + dc.alturaPoste / 2 - 0.05, c.z)
      aux.updateMatrix()
      postes.setMatrixAt(i, aux.matrix)
      aux.position.set(
        c.x,
        y + dc.alturaPoste - dc.altoTablilla / 2,
        c.z + dc.grosorPoste / 2 + dc.grosorTablilla / 2,
      )
      aux.updateMatrix()
      tablillas.setMatrixAt(i, aux.matrix)
    })
    postes.instanceMatrix.needsUpdate = true
    tablillas.instanceMatrix.needsUpdate = true
  }

  return {
    objeto: grupo,
    actualizar(dt) {
      const { valle } = lector.estado
      // El núcleo es inmutable: una compra cambia la referencia de `parcelas`. El dinero no
      // altera los carteles (la regla de cartel no depende de él).
      if (valle.parcelas !== parcelasVistas) {
        reconstruir()
        parcelasVistas = valle.parcelas
      }
      if (edad.size === 0) return
      for (const [clave, t] of edad) {
        const n = t + dt
        if (n >= DATOS_PARCELAS.aparicion.duracion) edad.delete(clave)
        else edad.set(clave, n)
      }
      dibujarMojones()
    },
    destruir() {
      for (const g of [geoMojon, geoPoste, geoTablilla]) g.dispose()
      for (const m of [matMojon, matPoste, matTablilla] as Material[]) m.dispose()
      textura?.dispose()
      mojones.dispose()
      postes.dispose()
      tablillas.dispose()
    },
  }
}
