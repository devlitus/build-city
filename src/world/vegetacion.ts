import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Camera,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Obstaculo, Valle } from '../core'
import {
  celdasOcupadas,
  clavesAgua,
  colocarObstaculos,
  dispersarBosque,
  hash,
  tipoCopa,
  variacionDe,
  type Colocacion,
  type EntornoDispersion,
  type Variacion,
} from './dispersion'
import { celdasAgua } from './agua'
import { color } from './paleta'
import type { FuncionAltura } from './terreno/altura'
import { DATOS_VEGETACION, type DatosVegetacion } from './vegetacion-datos'

/** Resultado de `crearVegetacion`: el objeto a añadir a la escena y su ciclo de vida. */
export interface Vegetacion {
  readonly objeto: Object3D
  /** Llamar una vez por fotograma. */
  actualizar(dt: number, camara: Camera): void
  destruir(): void
}

const EJE_Y = new Vector3(0, 1, 0)

/** Matriz de una instancia: posición, giro sobre Y y escala (uniforme o por eje). */
function matriz(
  x: number,
  y: number,
  z: number,
  giro: number,
  sx: number,
  sy = sx,
  sz = sx,
): Matrix4 {
  return new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromAxisAngle(EJE_Y, giro),
    new Vector3(sx, sy, sz),
  )
}

/** Gris (multiplicador de brillo) de una instancia a partir de su tono -1..1. */
function sombra(tono: number, variacion: number): Color {
  const s = 1 + tono * variacion
  return new Color(s, s, s)
}

/** Une varias geometrías con los mismos atributos en una sola. */
function unir(geometrias: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(geometrias)
  for (const parcial of geometrias) parcial.dispose()
  if (!g) throw new Error('No se pudieron unir las geometrías')
  return g
}

function geometriaTronco(d: DatosVegetacion['arbol']['tronco']): BufferGeometry {
  const g = new CylinderGeometry(d.radio * 0.7, d.radio, d.alto + 0.2, d.lados)
  // Base 0,1 m bajo el suelo para que no flote en las pendientes.
  g.translate(0, (d.alto + 0.2) / 2 - 0.1, 0)
  return g
}

function geometriaCopaPino(d: DatosVegetacion['arbol']['pino']): BufferGeometry {
  const conos: BufferGeometry[] = []
  for (let i = 0; i < d.niveles; i++) {
    const t = i / d.niveles
    const altoCono = (d.alto / d.niveles) * 1.6
    const cono = new ConeGeometry(d.radio * (1 - t * 0.55), altoCono, d.lados)
    cono.translate(0, d.inicioCopa + t * d.alto + altoCono / 2, 0)
    conos.push(cono)
  }
  return unir(conos)
}

function geometriaCopaRedonda(d: DatosVegetacion['arbol']['redondo']): BufferGeometry {
  const g = new IcosahedronGeometry(d.radio, d.detalle)
  g.scale(1, 0.85, 1)
  g.translate(0, d.centroCopa, 0)
  return g
}

/** Icosaedro irregular de forma determinista (cada vértice se desplaza según su posición). */
function geometriaRoca(d: DatosVegetacion['roca']): BufferGeometry {
  const g = new IcosahedronGeometry(d.radio, 1)
  const pos = g.getAttribute('position')
  const desplazados = new Map<string, number>()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    // Los vértices repetidos (caras sueltas) reciben el mismo desplazamiento: sin grietas.
    const clave = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`
    let f = desplazados.get(clave)
    if (f === undefined) {
      f = 1 + (hash(7, x * 1000, y * 1000, z * 1000) - 0.5) * 2 * d.irregularidad
      desplazados.set(clave, f)
    }
    pos.setXYZ(i, x * f, y * f * d.achatamiento, z * f)
  }
  g.computeVertexNormals()
  return g
}

function material(nombre: string): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: color(nombre),
    flatShading: true,
    roughness: 1,
    metalness: 0,
  })
}

/** Geometrías y materiales compartidos, uno por tipo de pieza. */
interface Piezas {
  readonly troncoGeo: BufferGeometry
  readonly pinoGeo: BufferGeometry
  readonly redondoGeo: BufferGeometry
  readonly rocaGeo: BufferGeometry
  readonly troncoMat: MeshStandardMaterial
  readonly pinoMat: MeshStandardMaterial
  readonly redondoMat: MeshStandardMaterial
  readonly rocaMat: MeshStandardMaterial
}

function crearPiezas(datos: DatosVegetacion): Piezas {
  return {
    troncoGeo: geometriaTronco(datos.arbol.tronco),
    pinoGeo: geometriaCopaPino(datos.arbol.pino),
    redondoGeo: geometriaCopaRedonda(datos.arbol.redondo),
    rocaGeo: geometriaRoca(datos.roca),
    troncoMat: material('maderaOscura'),
    pinoMat: material('pino'),
    redondoMat: material('copa'),
    rocaMat: material('roca'),
  }
}

/** Instancias de una pieza: matrices y tonos acumulados antes de crear el `InstancedMesh`. */
class Lote {
  readonly matrices: Matrix4[] = []
  readonly colores: Color[] = []

  añadir(m: Matrix4, c: Color): void {
    this.matrices.push(m)
    this.colores.push(c)
  }

  crear(
    nombre: string,
    geo: BufferGeometry,
    mat: MeshStandardMaterial,
    sombras: boolean,
  ): InstancedMesh {
    const malla = new InstancedMesh(geo, mat, Math.max(1, this.matrices.length))
    malla.name = nombre
    malla.count = this.matrices.length
    this.matrices.forEach((m, i) => {
      malla.setMatrixAt(i, m)
      malla.setColorAt(i, this.colores[i] ?? new Color(1, 1, 1))
    })
    malla.instanceMatrix.needsUpdate = true
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true
    malla.castShadow = sombras
    malla.receiveShadow = sombras
    malla.frustumCulled = true
    malla.computeBoundingSphere()
    malla.computeBoundingBox()
    return malla
  }
}

/** Troncos y copas de los árboles de una lista de colocaciones. */
interface LotesArbol {
  tronco: Lote
  pino: Lote
  redondo: Lote
}

function lotesArbol(): LotesArbol {
  return { tronco: new Lote(), pino: new Lote(), redondo: new Lote() }
}

function añadirArbol(
  lotes: LotesArbol,
  c: Colocacion,
  y: number,
  v: Variacion,
  semilla: number,
  datos: DatosVegetacion['arbol'],
  factorEscala = 1,
): void {
  const s = v.escala * factorEscala
  const tono = sombra(v.tono, datos.variacionTono)
  lotes.tronco.añadir(matriz(c.x, y, c.z, v.giro, s), tono)
  const copa = tipoCopa(c.variante, semilla, datos) === 'pino' ? lotes.pino : lotes.redondo
  copa.añadir(matriz(c.x, y, c.z, v.giro, s), tono)
}

/**
 * Dibuja los obstáculos del núcleo (árboles, rocas y plantones) en la casilla de cada uno, sobre
 * el terreno, con escala, giro y tono variables por `variante`. Un `InstancedMesh` por tipo de
 * pieza (troncos y copas por separado, para poder sustituir la copa por tarjetas de hojas).
 */
export function crearVegetacion(
  valle: Valle,
  obstaculos: readonly Obstaculo[],
  altura: FuncionAltura,
  semilla: number,
  datos: DatosVegetacion = DATOS_VEGETACION,
): Vegetacion {
  const piezas = crearPiezas(datos)
  const grupo = new Group()
  grupo.name = 'vegetacion'

  const arboles = lotesArbol()
  const rocas = new Lote()
  for (const c of colocarObstaculos(valle, obstaculos)) {
    const y = altura(c.x, c.z)
    if (c.tipo === 'roca') {
      const v = variacionDe(c.variante, semilla, datos.roca.escala)
      const s = v.escala
      const hundido = datos.roca.radio * datos.roca.achatamiento * s * datos.roca.hundimiento
      rocas.añadir(
        matriz(c.x, y + datos.roca.radio * datos.roca.achatamiento * s - hundido, c.z, v.giro, s),
        sombra(v.tono, datos.roca.variacionTono),
      )
    } else {
      const v = variacionDe(c.variante, semilla, datos.arbol.escala)
      const factor = c.tipo === 'planton' ? datos.planton.escala : 1
      añadirArbol(arboles, c, y, v, semilla, datos.arbol, factor)
    }
  }

  const agua = clavesAgua(celdasAgua(valle, altura))
  const entorno: EntornoDispersion = {
    valle,
    semilla,
    altura,
    agua,
    ocupadas: celdasOcupadas(obstaculos),
    datos,
  }

  // Bosque decorativo de las colinas: mismas piezas, sin sombras (queda lejos del juego).
  const bosque = lotesArbol()
  for (const c of dispersarBosque(entorno)) {
    const v = variacionDe(c.variante, semilla, datos.bosqueColinas.escala)
    añadirArbol(bosque, c, altura(c.x, c.z), v, semilla, datos.arbol)
  }

  grupo.add(
    bosque.tronco.crear('bosque-tronco', piezas.troncoGeo, piezas.troncoMat, false),
    bosque.pino.crear('bosque-copa-pino', piezas.pinoGeo, piezas.pinoMat, false),
    bosque.redondo.crear('bosque-copa-redonda', piezas.redondoGeo, piezas.redondoMat, false),
    arboles.tronco.crear('arboles-tronco', piezas.troncoGeo, piezas.troncoMat, true),
    arboles.pino.crear('arboles-copa-pino', piezas.pinoGeo, piezas.pinoMat, true),
    arboles.redondo.crear('arboles-copa-redonda', piezas.redondoGeo, piezas.redondoMat, true),
    rocas.crear('rocas', piezas.rocaGeo, piezas.rocaMat, true),
  )

  return {
    objeto: grupo,
    actualizar: () => {},
    destruir: () => {
      for (const hijo of grupo.children) (hijo as InstancedMesh).dispose()
      for (const g of [piezas.troncoGeo, piezas.pinoGeo, piezas.redondoGeo, piezas.rocaGeo])
        g.dispose()
      for (const m of [piezas.troncoMat, piezas.pinoMat, piezas.redondoMat, piezas.rocaMat])
        m.dispose()
    },
  }
}
