import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  type Object3D,
} from 'three'
import { parcelaEn, type Valle } from '../../core'
import { fabricaDelJuego } from '../materiales'
import { paletaJuego } from '../paleta'
import { crearAltura, type FuncionAltura } from './altura'
import { colorDeCara } from './colores'
import { ladoMetros } from './coordenadas'
import { alturasDeTrozo } from './muestreo'
import { PARAMETROS_TERRENO } from './parametros'
import { anilloDeTrozos, esquinaDeTrozo, ladoTrozo, todosLosTrozos, type Trozo } from './trozos'
import { normalDeAltura, uvTerreno } from './uv'

/** Material del catálogo que viste todo el terreno (textura de hierba y color por vértice). */
const MATERIAL_TERRENO = 'terreno'

/**
 * Geometría indexada de un trozo con normales suaves: un vértice por punto de la rejilla global
 * de 1 m (2 triángulos por celda). Las alturas, las normales (calculadas desde la función de
 * altura), las UV (metros globales) y los colores dependen solo de la posición, así los trozos
 * vecinos coinciden exactamente en su borde, sin costuras de forma, luz ni textura.
 */
function geometriaDeTrozo(
  trozo: Trozo,
  valle: Valle,
  altura: FuncionAltura,
  semilla: number,
): BufferGeometry {
  const fabrica = fabricaDelJuego()
  const metros = fabrica.datos(MATERIAL_TERRENO).metrosPorRepeticion ?? 1
  const celdas = ladoTrozo(valle)
  const { x: x0, z: z0 } = esquinaDeTrozo(trozo, valle)
  const alturas = alturasDeTrozo(altura, x0, z0, celdas)
  const n = celdas + 1
  const posiciones = new Float32Array(n * n * 3)
  const normales = new Float32Array(n * n * 3)
  const uvs = new Float32Array(n * n * 2)
  const colores = new Float32Array(n * n * 3)
  const mitad = ladoMetros(valle) / 2

  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const x = x0 + i
      const z = z0 + j
      const y = alturas[k] ?? 0
      const [nx, ny, nz] = normalDeAltura(altura, x, z)
      posiciones.set([x, y, z], k * 3)
      normales.set([nx, ny, nz], k * 3)
      uvs.set(uvTerreno(x, z, metros), k * 2)
      // Un vértice de borde de parcela toma la de su lado este/sur.
      const fila = Math.floor((z + mitad) / valle.casillasPorParcela)
      const columna = Math.floor((x + mitad) / valle.casillasPorParcela)
      const rgb = colorDeCara(
        {
          terreno: parcelaEn(valle, fila, columna)?.terreno,
          altura: y,
          pendiente: Math.hypot(nx, nz) / Math.max(ny, 1e-9),
          x,
          z,
        },
        semilla,
        paletaJuego,
      )
      colores.set(fabrica.tinteDeVertice(MATERIAL_TERRENO, rgb), k * 3)
    }

  const indices = new Uint32Array(celdas * celdas * 6)
  let t = 0
  for (let j = 0; j < celdas; j++)
    for (let i = 0; i < celdas; i++) {
      const a = j * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      // Diagonal alterna según la paridad global de la celda (aspecto menos regular).
      if ((trozo.cx * celdas + i + trozo.cz * celdas + j) % 2 === 0) {
        indices.set([a, c, d, a, d, b], t)
      } else {
        indices.set([a, c, b, b, c, d], t)
      }
      t += 6
    }

  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  g.setAttribute('normal', new Float32BufferAttribute(normales, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  g.setAttribute('color', new Float32BufferAttribute(colores, 3))
  g.setIndex(new BufferAttribute(indices, 1))
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}

/**
 * Terreno del valle y su anillo de colinas: un `Mesh` por trozo (con bounding box y esfera
 * propios, así three.js oculta los que no se ven) y un único material PBR del catálogo
 * (textura de hierba tintada por vértice con el color del tipo de parcela, la arena, la roca…).
 */
export function crearTerreno(valle: Valle, semilla: number): Object3D {
  const altura = crearAltura(valle, semilla)
  const anillo = anilloDeTrozos(valle, PARAMETROS_TERRENO.malla.radioColinas)
  const material = fabricaDelJuego().material(MATERIAL_TERRENO)
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
