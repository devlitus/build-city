import {
  Color,
  ExtrudeGeometry,
  IcosahedronGeometry,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Shape,
  Vector3,
  type BufferGeometry,
} from 'three'
import { CARACTER_CAMINO, ladoValle } from '../core'
import type { LectorEstado } from '../juego/almacen'
import { CapaInstanciada } from './capa-instanciada'
import { casillasCambiadas } from './casillas-cambio'
import {
  contornoLosa,
  DATOS_DIBUJO_CAMINOS,
  parametrosLosa,
  piedrasDeCasilla,
  type DatosDibujoCaminos,
} from './caminos-datos'
import { color } from './paleta'
import type { FuncionAltura } from './terreno/altura'
import { casillaAMetros } from './terreno/coordenadas'

export interface CaminosMundo {
  readonly objeto: Object3D
  /** Una vez por fotograma: redibuja solo las casillas de `estado.caminos` que han cambiado. */
  actualizar(): void
  destruir(): void
}

/**
 * Losa de grava de una casilla: contorno irregular, cara superior `altura` sobre el terreno y
 * bajando `grosor` para tapar huecos en pendiente. Origen en el centro de la casilla.
 */
export function crearGeometriaLosa(d: DatosDibujoCaminos): BufferGeometry {
  const forma = new Shape()
  // Tras girar la extrusión a la horizontal, el eje y de la forma pasa a ser -z.
  contornoLosa(d.losa).forEach(([x, z], k) => {
    if (k === 0) forma.moveTo(x, -z)
    else forma.lineTo(x, -z)
  })
  forma.closePath()
  const g = new ExtrudeGeometry(forma, { depth: d.losa.grosor, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, d.losa.altura - d.losa.grosor, 0)
  return g
}

/**
 * Caminos de grava. Solo dibuja: lee `estado.caminos`. Una capa instanciada de losas y otra de
 * piedras sueltas (2 llamadas de dibujo en total); cada casilla varía según un hash de su índice.
 */
export function crearCaminosMundo(
  lector: LectorEstado,
  altura: FuncionAltura,
  datos: DatosDibujoCaminos = DATOS_DIBUJO_CAMINOS,
): CaminosMundo {
  const raiz = new Object3D()
  raiz.name = 'caminos'
  const material = new MeshStandardMaterial({ roughness: datos.rugosidad, metalness: 0 })
  const geometriaLosa = crearGeometriaLosa(datos)
  const geometriaPiedra = new IcosahedronGeometry(1, 0)
  const losas = new CapaInstanciada(raiz, geometriaLosa, material, {
    nombre: 'camino-losas',
    capacidadInicial: datos.capacidadInicial,
    proyectaSombra: false,
    recibeSombra: true,
  })
  const piedras = new CapaInstanciada(raiz, geometriaPiedra, material, {
    nombre: 'camino-piedras',
    capacidadInicial: datos.capacidadInicial * Math.max(1, datos.piedras.porCasilla),
    proyectaSombra: false,
    recibeSombra: true,
  })

  const colorLosaA = new Color(color(datos.losa.colorA))
  const colorLosaB = new Color(color(datos.losa.colorB))
  const colorPiedraA = new Color(color(datos.piedras.colorA))
  const colorPiedraB = new Color(color(datos.piedras.colorB))
  const tono = new Color()
  const matriz = new Matrix4()
  const q = new Quaternion()
  const eje = new Vector3(0, 1, 0)
  const pos = new Vector3()
  const escala = new Vector3()

  let dibujados: string | undefined

  const quitarCasilla = (i: number): void => {
    losas.quitar(i)
    for (const p of piedrasDeCasilla(i, datos)) piedras.quitar(p.clave)
  }

  const ponerCasilla = (i: number, lado: number): void => {
    const c = casillaAMetros(i % lado, Math.floor(i / lado), lector.estado.valle)
    const suelo = altura(c.x, c.z)
    const p = parametrosLosa(i, datos)
    q.setFromAxisAngle(eje, (p.giro * Math.PI) / 2)
    pos.set(c.x, suelo, c.z)
    escala.set(p.escala, 1, p.escala)
    matriz.compose(pos, q, escala)
    losas.poner(i, matriz, tono.copy(colorLosaA).lerp(colorLosaB, p.tono))
    for (const s of piedrasDeCasilla(i, datos)) {
      q.setFromAxisAngle(eje, s.giro)
      pos.set(c.x + s.dx, suelo + datos.losa.altura, c.z + s.dz)
      escala.set(s.radio, s.radio * datos.piedras.aplastado, s.radio)
      matriz.compose(pos, q, escala)
      piedras.poner(s.clave, matriz, tono.copy(colorPiedraA).lerp(colorPiedraB, s.tono))
    }
  }

  const sincronizar = (): void => {
    const { caminos, valle } = lector.estado
    const lado = ladoValle(valle)
    for (const i of casillasCambiadas(dibujados, caminos)) {
      if (caminos[i] === CARACTER_CAMINO) ponerCasilla(i, lado)
      else quitarCasilla(i)
    }
    dibujados = caminos
  }

  return {
    objeto: raiz,
    actualizar: () => {
      if (lector.estado.caminos !== dibujados) sincronizar()
    },
    destruir: () => {
      raiz.removeFromParent()
      losas.destruir()
      piedras.destruir()
      geometriaLosa.dispose()
      geometriaPiedra.dispose()
      material.dispose()
    },
  }
}
