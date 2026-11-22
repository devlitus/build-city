import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { LectorEstado } from '../../juego/almacen'
import { ladoCasillas, casillaAMetros } from '../terreno/coordenadas'
import type { FuncionAltura } from '../terreno/altura'
import { color } from '../paleta'
import { DATOS_SUELO_CULTIVO, type DatosSueloCultivo } from './suelo-datos'
import { casillasSuelo, tonoSuelo } from './suelo-estado'

export interface SueloCultivo {
  readonly objeto: Object3D
  /** Llamar una vez por fotograma: redibuja solo si `estado.tierra` ha cambiado. */
  actualizar(): void
  destruir(): void
}

/**
 * Losa de tierra de una casilla con surcos (prismas bajos a lo largo del eje x). Origen en el
 * centro de la casilla y a ras de terreno; la cara superior de la losa queda `alturaLosa` por
 * encima y la losa baja `grosor` para tapar huecos en pendiente.
 */
export function crearGeometriaSurcos(d: DatosSueloCultivo): BufferGeometry {
  const losa = new BoxGeometry(d.lado, d.grosor, d.lado)
  losa.translate(0, d.alturaLosa - d.grosor / 2, 0)
  const piezas: BufferGeometry[] = [losa]
  const radio = d.anchoSurco / 2
  for (let k = 0; k < d.surcos; k++) {
    // Prisma de sección en rombo; su mitad inferior queda dentro de la losa.
    const surco = new CylinderGeometry(radio, radio, d.lado, 4, 1)
    surco.rotateZ(Math.PI / 2)
    surco.scale(1, d.altoSurco / radio, 1)
    const z = ((k + 0.5) / d.surcos) * d.lado - d.lado / 2
    surco.translate(0, d.alturaLosa, z)
    piezas.push(surco)
  }
  const g = mergeGeometries(piezas, false)
  piezas.forEach((p) => p.dispose())
  return g
}

/**
 * Tierra arada y regada. Solo dibuja: lee `estado.tierra`, y un `InstancedMesh` (una llamada de
 * dibujo) pinta cada casilla arada; la regada hoy, con un tono más oscuro (color por instancia).
 */
export function crearSueloCultivo(
  lector: LectorEstado,
  altura: FuncionAltura,
  datos: DatosSueloCultivo = DATOS_SUELO_CULTIVO,
): SueloCultivo {
  const raiz = new Object3D()
  raiz.name = 'suelo-cultivo'
  const geometria = crearGeometriaSurcos(datos)
  const material = new MeshStandardMaterial({ roughness: datos.rugosidad, metalness: 0 })
  const tonoSeca = new Color(color(datos.colorSeca))
  const tonoRegada = new Color(color(datos.colorRegada))
  const matriz = new Matrix4()

  let malla: InstancedMesh | undefined
  let capacidad = 0
  let tierraDibujada: string | undefined

  const crearMalla = (n: number): InstancedMesh => {
    if (malla) {
      raiz.remove(malla)
      malla.dispose()
    }
    capacidad = Math.max(datos.capacidadInicial, n)
    const nueva = new InstancedMesh(geometria, material, capacidad)
    nueva.name = 'suelo-arado'
    nueva.frustumCulled = false
    nueva.castShadow = false
    nueva.receiveShadow = true
    raiz.add(nueva)
    malla = nueva
    return nueva
  }

  const sincronizar = (): void => {
    const { tierra, valle } = lector.estado
    const casillas = casillasSuelo(tierra, ladoCasillas(valle))
    const m = malla && casillas.length <= capacidad ? malla : crearMalla(casillas.length * 2)
    casillas.forEach((c, i) => {
      const p = casillaAMetros(c.x, c.y, valle)
      matriz.makeTranslation(p.x, altura(p.x, p.z), p.z)
      m.setMatrixAt(i, matriz)
      m.setColorAt(i, tonoSuelo(c) === 'regada' ? tonoRegada : tonoSeca)
    })
    m.count = casillas.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    tierraDibujada = tierra
  }

  return {
    objeto: raiz,
    actualizar: () => {
      if (lector.estado.tierra !== tierraDibujada) sincronizar()
    },
    destruir: () => {
      raiz.removeFromParent()
      malla?.dispose()
      geometria.dispose()
      material.dispose()
    },
  }
}
