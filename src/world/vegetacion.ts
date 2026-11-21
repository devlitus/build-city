import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Camera,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CONFIG_RECURSOS, type Obstaculo, type Valle } from '../core'
import {
  celdasOcupadas,
  claveCelda,
  clavesAgua,
  crearFiltroPueblo,
  colocarObstaculos,
  dispersarBosque,
  matasDeTrozo,
  trozoCercano,
  trozosDeHierba,
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
import { rangoDeTrozo, type RangoMetros } from './terreno/trozos'
import { obstaculosCambiaron } from './obstaculos-cambio'
import { faseDePlanton } from './planton-fase'
import { DATOS_VEGETACION, type DatosVegetacion } from './vegetacion-datos'

/** Resultado de `crearVegetacion`: el objeto a añadir a la escena y su ciclo de vida. */
export interface Vegetacion {
  readonly objeto: Object3D
  /** Llamar una vez por fotograma. */
  actualizar(dt: number, camara: Camera): void
  /**
   * Pone al día los modelos de árboles, rocas y tocones con `estado.obstaculos` (talar, picar,
   * plantar o crecer). `dia` es el día actual: fija la fase de crecimiento de cada plantón. Barato si nada visible cambió: se puede llamar en cada fotograma.
   */
  sincronizar(obstaculos: readonly Obstaculo[], dia: number): void
  /**
   * Oculta (o vuelve a mostrar) el árbol de la casilla (x, y) del núcleo, para que un efecto lo
   * sustituya por una copia animada. No cambia el estado del juego.
   */
  ocultarArbol(x: number, y: number, oculto: boolean): void
  /**
   * Copia suelta de un árbol (mismo modelo y tono que el instanciado de esa `variante`), con la
   * base en el origen; quien la pide la coloca. Comparte geometrías y es dueña de sus materiales
   * (clones): hay que llamar a `liberar` al retirarla.
   */
  crearArbolSuelto(variante: number): ArbolSuelto
  destruir(): void
}

/** Copia de un árbol fuera de los lotes instanciados (ver `Vegetacion.crearArbolSuelto`). */
export interface ArbolSuelto {
  readonly objeto: Group
  /** Quita el objeto de su padre y libera los materiales propios (las geometrías son compartidas). */
  liberar(): void
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

/** Valor del rango en la posición `t` (0 a 1). */
function mezcla(rango: { readonly min: number; readonly max: number }, t: number): number {
  return rango.min + (rango.max - rango.min) * t
}

/** Une varias geometrías con los mismos atributos en una sola. */
function unir(geometrias: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(geometrias)
  for (const parcial of geometrias) parcial.dispose()
  if (!g) throw new Error('No se pudieron unir las geometrías')
  return g
}

function geometriaTronco(d: DatosVegetacion['arbol']['tronco']): BufferGeometry {
  const alto = d.alto + d.extra
  const g = new CylinderGeometry(d.radio * d.afilado, d.radio, alto, d.lados)
  // Base bajo el suelo para que no flote en las pendientes.
  g.translate(0, alto / 2 - d.hundimiento, 0)
  return g
}

function geometriaCopaPino(d: DatosVegetacion['arbol']['pino']): BufferGeometry {
  const conos: BufferGeometry[] = []
  for (let i = 0; i < d.niveles; i++) {
    const t = i / d.niveles
    const altoCono = (d.alto / d.niveles) * d.alargamiento
    const cono = new ConeGeometry(d.radio * (1 - t * d.estrechamiento), altoCono, d.lados)
    cono.translate(0, d.inicioCopa + t * d.alto + altoCono / 2, 0)
    conos.push(cono)
  }
  return unir(conos)
}

function geometriaCopaRedonda(d: DatosVegetacion['arbol']['redondo']): BufferGeometry {
  const g = new IcosahedronGeometry(d.radio, d.detalle)
  g.scale(1, d.achatamiento, 1)
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

/** Tocón: cilindro bajo con la base hundida para que no flote en las pendientes. */
function geometriaTocon(d: DatosVegetacion['tocon']): BufferGeometry {
  const alto = d.alto + d.hundimiento
  const g = new CylinderGeometry(d.radio * d.afilado, d.radio, alto, d.lados)
  g.translate(0, alto / 2 - d.hundimiento, 0)
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
  readonly toconGeo: BufferGeometry
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
    toconGeo: geometriaTocon(datos.tocon),
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
    recibir = sombras,
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
    malla.receiveShadow = recibir
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
 * Mata de hierba de altura 1: `brotes` hojas triangulares repartidas en círculo, inclinadas hacia
 * fuera, con color por vértice (base oscura, punta clara). Las normales apuntan arriba.
 */
function geometriaMata(datos: DatosVegetacion['hierba']): BufferGeometry {
  const base = new Color(color('hierba'))
  const punta = new Color(color('hierbaPunta'))
  const posiciones: number[] = []
  const colores: number[] = []
  const normales: number[] = []
  for (let i = 0; i < datos.brotes; i++) {
    const a = (i / datos.brotes) * Math.PI * 2 + hash(3, i, 1) * 0.6
    const cx = Math.cos(a)
    const cz = Math.sin(a)
    const radio = mezcla(datos.radioBrote, hash(3, i, 2))
    const inclinacion = mezcla(datos.inclinacion, hash(3, i, 3))
    const mitad = datos.ancho / 2
    // Base: dos vértices a lo ancho de la tangente; punta: desplazada hacia fuera.
    posiciones.push(
      cx * radio - cz * mitad,
      0,
      cz * radio + cx * mitad,
      cx * radio + cz * mitad,
      0,
      cz * radio - cx * mitad,
      cx * (radio + inclinacion),
      1,
      cz * (radio + inclinacion),
    )
    colores.push(base.r, base.g, base.b, base.r, base.g, base.b, punta.r, punta.g, punta.b)
    normales.push(0, 1, 0, 0, 1, 0, 0, 1, 0)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  g.setAttribute('color', new Float32BufferAttribute(colores, 3))
  g.setAttribute('normal', new Float32BufferAttribute(normales, 3))
  g.computeBoundingSphere()
  return g
}

/** Uniformes del viento compartidos por todos los trozos de hierba. */
interface UniformesViento {
  uTiempo: { value: number }
  uAmplitud: { value: number }
  uFrecuencia: { value: number }
  uVelocidad: { value: number }
}

/**
 * Material de la hierba: estándar con color por vértice, de doble cara, con la punta de cada
 * hoja mecida por el viento en el *vertex shader* (la fase depende de la posición de la mata) y
 * la normal fija hacia arriba para que ambas caras reciban la misma luz.
 */
function materialHierba(uniformes: UniformesViento): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({
    vertexColors: true,
    side: DoubleSide,
    roughness: 1,
    metalness: 0,
  })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTiempo;
uniform float uAmplitud;
uniform float uFrecuencia;
uniform float uVelocidad;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 centroMata = vec3( instanceMatrix[ 3 ] );
  float peso = clamp( position.y, 0.0, 1.0 );
  peso *= peso;
  float fase = ( centroMata.x + centroMata.z * 0.7 ) * uFrecuencia + uTiempo * uVelocidad;
  transformed.x += ( sin( fase ) + 0.5 * sin( fase * 2.3 + centroMata.z * 0.5 ) ) * uAmplitud * peso;
  transformed.z += cos( fase * 0.8 ) * uAmplitud * 0.6 * peso;
#endif`,
      )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
  normal = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );`,
    )
  }
  mat.customProgramCacheKey = () => 'hierba-viento'
  return mat
}

/** Un trozo de hierba: su malla instanciada y el rectángulo que ocupa (para ocultarlo). */
interface TrozoHierba {
  readonly malla: InstancedMesh
  readonly rango: RangoMetros
}

/**
 * Hierba: un `InstancedMesh` por trozo, con bounding sphere correcta (frustum culling de three.js).
 * Los trozos sin matas no se crean.
 */
function crearHierba(
  entorno: EntornoDispersion,
  geometria: BufferGeometry,
  material: MeshStandardMaterial,
): TrozoHierba[] {
  const { valle, semilla, altura, datos } = entorno
  const h = datos.hierba
  const trozos: TrozoHierba[] = []
  // El filtro del pueblo es caro de crear: uno para todos los trozos.
  const conFiltro: EntornoDispersion = {
    ...entorno,
    enPueblo: crearFiltroPueblo(valle, h.margenPueblo),
  }
  for (const trozo of trozosDeHierba(valle, datos)) {
    const matas = matasDeTrozo(trozo, conFiltro)
    if (matas.length === 0) continue
    const lote = new Lote()
    for (const m of matas) {
      const v = variacionDe(m.variante, semilla, h.alto)
      const ancho = mezcla(h.anchoMata, hash(semilla, m.variante * 1e6, 31))
      lote.añadir(
        matriz(m.x, altura(m.x, m.z) - h.hundimiento, m.z, v.giro, ancho, v.escala, ancho),
        sombra(v.tono, h.variacionTono),
      )
    }
    const malla = lote.crear(`hierba-${trozo.cx}-${trozo.cz}`, geometria, material, false, false)
    malla.visible = false
    // El viento desplaza las puntas: se ensancha la esfera para que no se corten en el borde.
    if (malla.boundingSphere) malla.boundingSphere.radius += h.viento.amplitud * 2
    trozos.push({ malla, rango: rangoDeTrozo(trozo, valle) })
  }
  return trozos
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
  dia = 1,
  datos: DatosVegetacion = DATOS_VEGETACION,
): Vegetacion {
  const piezas = crearPiezas(datos)
  const grupo = new Group()
  grupo.name = 'vegetacion'

  /** Casillas (`claveCelda`) cuyo árbol se oculta mientras lo sustituye un efecto. */
  const ocultos = new Set<number>()

  /** Mallas de árboles, plantones, tocones y rocas del núcleo (se reconstruyen al sincronizar). */
  const mallasDeObstaculos = (lista: readonly Obstaculo[], dia: number): InstancedMesh[] => {
    const arboles = lotesArbol()
    const fasesPlanton = datos.planton.escalas.map(lotesArbol)
    const rocas = new Lote()
    const tocones = new Lote()
    colocarObstaculos(valle, lista).forEach((c, i) => {
      const origen = lista[i]
      if (
        origen &&
        (c.tipo === 'arbol' || c.tipo === 'planton') &&
        ocultos.has(claveCelda(origen.x, origen.y))
      )
        return
      const y = altura(c.x, c.z)
      if (c.tipo === 'tocon') {
        const v = variacionDe(c.variante, semilla, datos.tocon.escala)
        tocones.añadir(
          matriz(c.x, y, c.z, v.giro, v.escala),
          sombra(v.tono, datos.arbol.variacionTono),
        )
      } else if (c.tipo === 'roca') {
        const v = variacionDe(c.variante, semilla, datos.roca.escala)
        const s = v.escala
        const hundido = datos.roca.radio * datos.roca.achatamiento * s * datos.roca.hundimiento
        rocas.añadir(
          matriz(c.x, y + datos.roca.radio * datos.roca.achatamiento * s - hundido, c.z, v.giro, s),
          sombra(v.tono, datos.roca.variacionTono),
        )
      } else {
        const v = variacionDe(c.variante, semilla, datos.arbol.escala)
        if (c.tipo === 'planton') {
          const fase = faseDeObstaculo(lista[i], dia)
          const escala = datos.planton.escalas[fase] ?? 1
          añadirArbol(fasesPlanton[fase] ?? arboles, c, y, v, semilla, datos.arbol, escala)
        } else {
          añadirArbol(arboles, c, y, v, semilla, datos.arbol)
        }
      }
    })
    const plantones = fasesPlanton.flatMap((l, f) =>
      l.tronco.matrices.length === 0
        ? []
        : [
            l.tronco.crear(`planton-${f}-tronco`, piezas.troncoGeo, piezas.troncoMat, true),
            l.pino.crear(`planton-${f}-copa-pino`, piezas.pinoGeo, piezas.pinoMat, true),
            l.redondo.crear(
              `planton-${f}-copa-redonda`,
              piezas.redondoGeo,
              piezas.redondoMat,
              true,
            ),
          ],
    )
    return [
      ...plantones,
      arboles.tronco.crear('arboles-tronco', piezas.troncoGeo, piezas.troncoMat, true),
      arboles.pino.crear('arboles-copa-pino', piezas.pinoGeo, piezas.pinoMat, true),
      arboles.redondo.crear('arboles-copa-redonda', piezas.redondoGeo, piezas.redondoMat, true),
      tocones.crear('tocones', piezas.toconGeo, piezas.troncoMat, true),
      rocas.crear('rocas', piezas.rocaGeo, piezas.rocaMat, true),
    ]
  }
  /** Fase de crecimiento de un plantón según el día actual. */
  const faseDeObstaculo = (o: Obstaculo | undefined, dia: number): number =>
    faseDePlanton(
      o?.diaPlantado,
      dia,
      CONFIG_RECURSOS.planton.diasCrecimiento,
      datos.planton.escalas.length,
    )
  /** Fases de los plantones de la lista, en orden: si cambian hay que redibujar. */
  const fasesDe = (lista: readonly Obstaculo[], dia: number): string =>
    lista
      .filter((o) => o.tipo === 'planton')
      .map((o) => faseDeObstaculo(o, dia))
      .join(',')
  let mallasActuales = mallasDeObstaculos(obstaculos, dia)
  let obstaculosDibujados = obstaculos
  let fasesDibujadas = fasesDe(obstaculos, dia)
  let diaDibujado = dia
  const reconstruir = (): void => {
    // Geometrías y materiales son compartidos: solo se liberan los búferes de instancias.
    for (const m of mallasActuales) {
      grupo.remove(m)
      m.dispose()
    }
    mallasActuales = mallasDeObstaculos(obstaculosDibujados, diaDibujado)
    grupo.add(...mallasActuales)
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
    ...mallasActuales,
  )

  const viento = datos.hierba.viento
  const uniformes: UniformesViento = {
    uTiempo: { value: 0 },
    uAmplitud: { value: viento.amplitud },
    uFrecuencia: { value: viento.frecuencia },
    uVelocidad: { value: viento.velocidad },
  }
  const geometriaHierba = geometriaMata(datos.hierba)
  const materialDeHierba = materialHierba(uniformes)
  const hierba = crearHierba(entorno, geometriaHierba, materialDeHierba)
  for (const t of hierba) grupo.add(t.malla)
  const posicionCamara = new Vector3()
  const alturaMaximaHierba = datos.hierba.alturaMaxima + datos.hierba.alto.max

  return {
    objeto: grupo,
    actualizar: (dt, camara) => {
      uniformes.uTiempo.value += dt
      // Solo se dibujan los trozos de hierba cercanos a la cámara (unas 100 comprobaciones baratas).
      camara.getWorldPosition(posicionCamara)
      for (const t of hierba)
        t.malla.visible = trozoCercano(
          t.rango,
          posicionCamara,
          datos.hierba.radioDibujo,
          alturaMaximaHierba,
        )
    },
    sincronizar: (lista, diaActual) => {
      const fases = fasesDe(lista, diaActual)
      if (!obstaculosCambiaron(obstaculosDibujados, lista) && fases === fasesDibujadas) {
        obstaculosDibujados = lista
        return
      }
      obstaculosDibujados = lista
      diaDibujado = diaActual
      fasesDibujadas = fases
      reconstruir()
    },
    ocultarArbol: (x, y, oculto) => {
      const clave = claveCelda(x, y)
      if (ocultos.has(clave) === oculto) return
      if (oculto) ocultos.add(clave)
      else ocultos.delete(clave)
      reconstruir()
    },
    crearArbolSuelto: (variante) => {
      const v = variacionDe(variante, semilla, datos.arbol.escala)
      const gris = sombra(v.tono, datos.arbol.variacionTono)
      const copaPino = tipoCopa(variante, semilla, datos.arbol) === 'pino'
      const propios: MeshStandardMaterial[] = []
      const pieza = (geo: BufferGeometry, base: MeshStandardMaterial): Mesh => {
        const mat = base.clone()
        mat.color.multiply(gris)
        propios.push(mat)
        const malla = new Mesh(geo, mat)
        malla.castShadow = true
        return malla
      }
      const objeto = new Group()
      objeto.name = 'arbol-suelto'
      objeto.add(
        pieza(piezas.troncoGeo, piezas.troncoMat),
        copaPino
          ? pieza(piezas.pinoGeo, piezas.pinoMat)
          : pieza(piezas.redondoGeo, piezas.redondoMat),
      )
      objeto.scale.setScalar(v.escala)
      objeto.rotation.y = v.giro
      return {
        objeto,
        liberar: () => {
          objeto.removeFromParent()
          for (const m of propios) m.dispose()
        },
      }
    },
    destruir: () => {
      geometriaHierba.dispose()
      materialDeHierba.dispose()
      for (const hijo of grupo.children) (hijo as InstancedMesh).dispose()
      for (const g of [
        piezas.troncoGeo,
        piezas.pinoGeo,
        piezas.redondoGeo,
        piezas.rocaGeo,
        piezas.toconGeo,
      ])
        g.dispose()
      for (const m of [piezas.troncoMat, piezas.pinoMat, piezas.redondoMat, piezas.rocaMat])
        m.dispose()
    },
  }
}
