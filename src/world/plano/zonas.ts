import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Object3D,
} from 'three'
import { ZONAS, type Valle, type Zona } from '../../core'
import type { ZonaElegida } from '../../juego/herramienta-plano'
import { colorHex, paletaJuego } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import { ladoCasillas } from '../terreno/coordenadas'
import {
  CLAVE_PALETA_ZONA,
  hexARgb,
  pixelesZonas,
  rellenarRectangulo,
  type RGB,
} from './datos-zonas'
import { DATOS_PLANO } from './plano-datos'
import type { RectanguloCasillas } from './rectangulo'

export interface CapaZonas {
  readonly objeto: Object3D
  /** Repinta la textura con `zonas` (cadena de `EstadoJuego.zonas`); no hace nada si no cambió. */
  actualizar(zonas: string): void
  /** Vista previa del rectángulo que se está arrastrando, o `null` para quitarla. */
  vistaPrevia(rect: RectanguloCasillas | null, zona: ZonaElegida): void
  destruir(): void
}

const colorDe = (clave: string): RGB => hexARgb(colorHex(paletaJuego, clave))

function crearTextura(pixeles: Uint8Array, lado: number): DataTexture {
  const textura = new DataTexture(pixeles, lado, lado, RGBAFormat, UnsignedByteType)
  textura.magFilter = NearestFilter
  textura.minFilter = NearestFilter
  textura.colorSpace = SRGBColorSpace
  textura.generateMipmaps = false
  textura.needsUpdate = true
  return textura
}

/**
 * Capa de color de las zonas: una sola malla que sigue el relieve del valle, con una
 * `DataTexture` de un píxel por casilla (sin un objeto por casilla). Una segunda malla con la
 * misma geometría dibuja la vista previa del arrastre. La textura solo se reescribe cuando
 * cambia `estado.zonas` (o el rectángulo de la vista previa).
 */
export function crearCapaZonas(valle: Valle, altura: FuncionAltura): CapaZonas {
  const lado = ladoCasillas(valle)
  const n = lado + 1
  const mitad = lado / 2
  const d = DATOS_PLANO.zonas

  const posiciones = new Float32Array(n * n * 3)
  const uvs = new Float32Array(n * n * 2)
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = i - mitad
      const z = j - mitad
      posiciones.set([x, altura(x, z) + d.separacion, z], (j * n + i) * 3)
      uvs.set([i / lado, j / lado], (j * n + i) * 2)
    }
  const indices = new Uint32Array(lado * lado * 6)
  let t = 0
  for (let j = 0; j < lado; j++)
    for (let i = 0; i < lado; i++) {
      const a = j * n + i
      indices.set([a, a + n, a + n + 1, a, a + n + 1, a + 1], t)
      t += 6
    }
  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometria.setIndex(new BufferAttribute(indices, 1))
  geometria.computeBoundingSphere()

  const colores = Object.fromEntries(
    ZONAS.map((z) => [z, colorDe(CLAVE_PALETA_ZONA[z])]),
  ) as Record<Zona, RGB>

  const pixelesCapa = new Uint8Array(lado * lado * 4)
  const texturaCapa = crearTextura(pixelesCapa, lado)
  const pixelesPrevia = new Uint8Array(lado * lado * 4)
  const texturaPrevia = crearTextura(pixelesPrevia, lado)
  const materialCapa = new MeshBasicMaterial({
    map: texturaCapa,
    transparent: true,
    opacity: d.opacidad,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  })
  const materialPrevia = new MeshBasicMaterial({
    map: texturaPrevia,
    transparent: true,
    opacity: d.opacidadVistaPrevia,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  })
  const capa = new Mesh(geometria, materialCapa)
  capa.name = 'zonas'
  capa.frustumCulled = false
  capa.renderOrder = 1
  const previa = new Mesh(geometria, materialPrevia)
  previa.name = 'zonas-vista-previa'
  previa.frustumCulled = false
  previa.renderOrder = 1.5
  previa.visible = false
  const grupo = new Group()
  grupo.name = 'capa-zonas'
  grupo.add(capa, previa)

  let ultimas: string | null = null
  let ultimaPrevia = ''
  return {
    objeto: grupo,
    actualizar(zonas) {
      if (zonas === ultimas) return
      ultimas = zonas
      pixelesCapa.set(pixelesZonas(zonas, colores))
      texturaCapa.needsUpdate = true
    },
    vistaPrevia(rect, zona) {
      const firma = rect ? `${rect.x0},${rect.y0},${rect.x1},${rect.y1},${zona}` : ''
      if (firma === ultimaPrevia) return
      ultimaPrevia = firma
      previa.visible = rect !== null
      if (!rect) return
      rellenarRectangulo(pixelesPrevia, lado, rect, colorDe(CLAVE_PALETA_ZONA[zona]))
      texturaPrevia.needsUpdate = true
    },
    destruir() {
      geometria.dispose()
      materialCapa.dispose()
      materialPrevia.dispose()
      texturaCapa.dispose()
      texturaPrevia.dispose()
    },
  }
}
