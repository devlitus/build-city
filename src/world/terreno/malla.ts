import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Object3D,
} from 'three'
import { parcelaEn, type Valle } from '../../core'
import { paletaJuego } from '../paleta'
import { crearAltura, type FuncionAltura } from './altura'
import { colorDeCara } from './colores'
import { ladoMetros } from './coordenadas'
import { alturasDeTrozo } from './muestreo'
import { PARAMETROS_TERRENO } from './parametros'
import { anilloDeTrozos, esquinaDeTrozo, ladoTrozo, todosLosTrozos, type Trozo } from './trozos'

/** Vértice (x, y, z) de una cara. */
type Vertice = readonly [number, number, number]

/**
 * Geometría de un trozo con caras planas: vértices no compartidos (2 triángulos por celda de
 * 1 m) y color por cara. La rejilla de muestreo es la global de 1 m, así los trozos vecinos
 * comparten exactamente las alturas de su borde.
 */
function geometriaDeTrozo(
  trozo: Trozo,
  valle: Valle,
  altura: FuncionAltura,
  semilla: number,
): BufferGeometry {
  const celdas = ladoTrozo(valle)
  const { x: x0, z: z0 } = esquinaDeTrozo(trozo, valle)
  const alturas = alturasDeTrozo(altura, x0, z0, celdas)
  const n = celdas + 1
  const posiciones = new Float32Array(celdas * celdas * 18)
  const colores = new Float32Array(celdas * celdas * 18)
  const mitad = ladoMetros(valle) / 2
  const color = new Color()
  let k = 0

  const cara = (a: Vertice, b: Vertice, c: Vertice): void => {
    // Normal de la cara (producto vectorial) para la pendiente.
    const ux = b[0] - a[0]
    const uy = b[1] - a[1]
    const uz = b[2] - a[2]
    const vx = c[0] - a[0]
    const vy = c[1] - a[1]
    const vz = c[2] - a[2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const pendiente = Math.hypot(nx, nz) / Math.max(Math.abs(ny), 1e-9)
    const px = (a[0] + b[0] + c[0]) / 3
    const pz = (a[2] + b[2] + c[2]) / 3
    const fila = Math.floor((pz + mitad) / valle.casillasPorParcela)
    const columna = Math.floor((px + mitad) / valle.casillasPorParcela)
    const [r, g, bl] = colorDeCara(
      {
        terreno: parcelaEn(valle, fila, columna)?.terreno,
        altura: (a[1] + b[1] + c[1]) / 3,
        pendiente,
        x: px,
        z: pz,
      },
      semilla,
      paletaJuego,
    )
    color.setRGB(r, g, bl, SRGBColorSpace)
    for (const v of [a, b, c]) {
      posiciones[k] = v[0]
      posiciones[k + 1] = v[1]
      posiciones[k + 2] = v[2]
      colores[k] = color.r
      colores[k + 1] = color.g
      colores[k + 2] = color.b
      k += 3
    }
  }

  for (let j = 0; j < celdas; j++)
    for (let i = 0; i < celdas; i++) {
      const xa = x0 + i
      const za = z0 + j
      const p00: Vertice = [xa, alturas[j * n + i] ?? 0, za]
      const p10: Vertice = [xa + 1, alturas[j * n + i + 1] ?? 0, za]
      const p01: Vertice = [xa, alturas[(j + 1) * n + i] ?? 0, za + 1]
      const p11: Vertice = [xa + 1, alturas[(j + 1) * n + i + 1] ?? 0, za + 1]
      // Diagonal alterna según la paridad global de la celda (aspecto menos regular).
      if ((trozo.cx * celdas + i + trozo.cz * celdas + j) % 2 === 0) {
        cara(p00, p01, p11)
        cara(p00, p11, p10)
      } else {
        cara(p00, p01, p10)
        cara(p10, p01, p11)
      }
    }

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  g.setAttribute('color', new Float32BufferAttribute(colores, 3))
  g.computeVertexNormals()
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}

/**
 * Terreno del valle y su anillo de colinas: un `Mesh` por trozo (con bounding box y esfera
 * propios, así three.js oculta los que no se ven) y un único material con color por vértice.
 */
export function crearTerreno(valle: Valle, semilla: number): Object3D {
  const altura = crearAltura(valle, semilla)
  const anillo = anilloDeTrozos(valle, PARAMETROS_TERRENO.malla.radioColinas)
  const material = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  })
  const grupo = new Group()
  grupo.name = 'terreno'
  for (const trozo of todosLosTrozos(valle, anillo)) {
    const malla = new Mesh(geometriaDeTrozo(trozo, valle, altura, semilla), material)
    malla.name = `trozo-${trozo.cx}-${trozo.cz}`
    malla.receiveShadow = true
    malla.frustumCulled = true
    grupo.add(malla)
  }
  return grupo
}
