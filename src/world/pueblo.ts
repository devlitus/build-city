import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  Shape,
  ExtrudeGeometry,
  ConeGeometry,
  type Material,
  type Object3D,
} from 'three'
import type { Valle } from '../core'
import { materialDe } from './materiales'
import { bordeSur, centroPlaza, DATOS_PUEBLO, type DatosPueblo } from './pueblo-datos'
import type { FuncionAltura } from './terreno/altura'

/** Caja unitaria con la base en y = 0 (se escala por edificio). */
function cajaUnitaria(): BoxGeometry {
  const g = new BoxGeometry(1, 1, 1)
  g.translate(0, 0.5, 0)
  return g
}

/** Prisma de tejado a dos aguas de 1 x 1 x 1 (cumbrera a lo largo de z), base en y = 0. */
function tejadoUnitario(): BufferGeometry {
  const perfil = new Shape()
  perfil.moveTo(-0.5, 0)
  perfil.lineTo(0.5, 0)
  perfil.lineTo(0, 1)
  perfil.closePath()
  const g = new ExtrudeGeometry(perfil, { depth: 1, bevelEnabled: false })
  g.translate(0, 0, -0.5)
  return g
}

function malla(geometria: BufferGeometry, material: Material): Mesh {
  const m = new Mesh(geometria, material)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/**
 * Pueblo provisional al sur del valle: plaza, casas (caja + tejado a dos aguas), campanario y
 * camino de tierra desde el borde sur. Todo apoyado en el terreno (`altura`) y con geometrías
 * y materiales compartidos. Las posiciones salen de `data/pueblo.json`.
 */
export function crearPueblo(
  valle: Pick<Valle, 'parcelasPorLado' | 'casillasPorParcela'>,
  altura: FuncionAltura,
  datos: DatosPueblo = DATOS_PUEBLO,
): Object3D {
  const grupo = new Group()
  grupo.name = 'pueblo'
  const z0 = bordeSur(valle)
  const caja = cajaUnitaria()
  const tejado = tejadoUnitario()
  const aRad = (grados: number): number => (grados * Math.PI) / 180

  // Plaza: disco de piedra.
  const c = centroPlaza(valle, datos)
  const plaza = malla(
    new CylinderGeometry(datos.plaza.radio, datos.plaza.radio, 0.2, 24),
    materialDe('piedra'),
  )
  plaza.position.set(c.x, altura(c.x, c.z) + 0.05, c.z)
  plaza.castShadow = false
  grupo.add(plaza)

  // Casas.
  for (const casa of datos.casas) {
    const z = z0 + casa.distanciaAlBorde
    const casaGrupo = new Group()
    casaGrupo.position.set(casa.x, altura(casa.x, z), z)
    casaGrupo.rotation.y = aRad(casa.giro)
    const cuerpo = malla(caja, materialDe('crema'))
    cuerpo.scale.set(casa.ancho, casa.alto, casa.fondo)
    const techo = malla(tejado, materialDe('teja'))
    // Aleros de 0,4 m; la cumbrera corre a lo largo del fondo.
    techo.scale.set(casa.ancho + 0.8, casa.altoTejado, casa.fondo + 0.8)
    techo.position.y = casa.alto
    casaGrupo.add(cuerpo, techo)
    grupo.add(casaGrupo)
  }

  // Campanario: torre de piedra con chapitel.
  const k = datos.campanario
  const kz = z0 + k.distanciaAlBorde
  const campanario = new Group()
  campanario.position.set(k.x, altura(k.x, kz), kz)
  campanario.rotation.y = aRad(k.giro)
  const torre = malla(caja, materialDe('piedra'))
  torre.scale.set(k.lado, k.alto, k.lado)
  // Pirámide de 4 caras: cono de 4 lados girado 45° para alinearla con la torre.
  const chapitel = malla(
    new ConeGeometry((k.lado * Math.SQRT2) / 2 + 0.3, k.altoTejado, 4),
    materialDe('teja'),
  )
  chapitel.rotation.y = Math.PI / 4
  chapitel.position.y = k.alto + k.altoTejado / 2
  campanario.add(torre, chapitel)
  grupo.add(campanario)

  return grupo
}
