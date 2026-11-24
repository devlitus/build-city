import {
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from 'three'
import { CULTIVOS, type Planta } from '../../core'
import type { LectorEstado } from '../../juego/almacen'
import { hash } from '../dispersion'
import type { FuncionAltura } from '../terreno/altura'
import { casillaAMetros, ladoCasillas } from '../terreno/coordenadas'
import { DATOS_VEGETACION } from '../vegetacion-datos'
import {
  agruparPlantas,
  capacidadNecesaria,
  gruposQueCambian,
  planDeMallas,
  type GrupoPlantas,
  type GruposPlantas,
} from './agrupacion'
import { crearModeloCultivo, liberarModelosCultivos } from './modelos'

export interface PlantasMundo {
  readonly objeto: Object3D
  /**
   * Una vez por fotograma: avanza el viento y, si `estado.plantas` cambió (por referencia),
   * reescribe solo los grupos que difieren.
   */
  actualizar(dt: number): void
  destruir(): void
}

const EJE_Y = new Vector3(0, 1, 0)
/** Semilla del giro de cada planta (solo da variedad; no es balance). */
const SEMILLA_GIRO = 17

/** Uniformes del viento compartidos por todos los grupos. */
interface UniformesViento {
  uTiempo: { value: number }
  uAmplitud: { value: number }
  uFrecuencia: { value: number }
  uVelocidad: { value: number }
}

/**
 * Añade el viento al material compartido de los cultivos: cada planta se mece con peso creciente
 * con la altura (la base queda quieta), con los mismos parámetros que la hierba
 * (`data/vegetacion.json`) y la fase según la posición de la planta. Devuelve los uniformes.
 */
function añadirViento(material: Material): UniformesViento {
  const v = DATOS_VEGETACION.hierba.viento
  const uniformes: UniformesViento = {
    uTiempo: { value: 0 },
    uAmplitud: { value: v.amplitud },
    uFrecuencia: { value: v.frecuencia },
    uVelocidad: { value: v.velocidad },
  }
  const mat = material as MeshStandardMaterial
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
  vec3 centroPlanta = vec3( instanceMatrix[ 3 ] );
  float peso = clamp( position.y, 0.0, 1.0 );
  peso *= peso;
  float fase = ( centroPlanta.x + centroPlanta.z * 0.7 ) * uFrecuencia + uTiempo * uVelocidad;
  transformed.x += ( sin( fase ) + 0.5 * sin( fase * 2.3 + centroPlanta.z * 0.5 ) ) * uAmplitud * peso;
  transformed.z += cos( fase * 0.8 ) * uAmplitud * 0.6 * peso;
#endif`,
      )
  }
  mat.customProgramCacheKey = () => 'cultivos-viento'
  return uniformes
}

/**
 * Dibuja las plantas del núcleo: un `InstancedMesh` por (cultivo, fase) con plantas, más uno para
 * las marchitas (como mucho 5 cultivos x 3 fases + 1 llamadas de dibujo). Los grupos vacíos no
 * tienen malla. Cada planta lleva un giro determinista según su casilla.
 */
export function crearPlantasMundo(lector: LectorEstado, altura: FuncionAltura): PlantasMundo {
  const grupo = new Group()
  grupo.name = 'plantas'
  const lado = ladoCasillas(lector.estado.valle)
  const mallas = new Map<string, InstancedMesh>()
  const modelos = new Map<string, { geometria: BufferGeometry; material: Material }>()
  let uniformes: UniformesViento | undefined
  let materialConViento: Material | undefined
  let dibujadas: readonly Planta[] | undefined
  let agrupacion: GruposPlantas = new Map()

  const matriz = new Matrix4()
  const posicion = new Vector3()
  const giro = new Quaternion()
  const escala = new Vector3(1, 1, 1)
  const margenViento = DATOS_VEGETACION.hierba.viento.amplitud * 2

  const escribir = (malla: InstancedMesh, g: GrupoPlantas): void => {
    const { valle } = lector.estado
    g.casillas.forEach((c, i) => {
      const p = casillaAMetros(c.x, c.y, valle)
      posicion.set(p.x, altura(p.x, p.z), p.z)
      giro.setFromAxisAngle(EJE_Y, hash(SEMILLA_GIRO, c.indice, 1) * Math.PI * 2)
      malla.setMatrixAt(i, matriz.compose(posicion, giro, escala))
    })
    malla.count = g.casillas.length
    malla.instanceMatrix.needsUpdate = true
    malla.computeBoundingSphere()
    // El viento desplaza las puntas: se ensancha la esfera para que no se corten en el borde.
    if (malla.boundingSphere) malla.boundingSphere.radius += margenViento
  }

  const crearMalla = (g: GrupoPlantas, capacidad: number): InstancedMesh => {
    let modelo = modelos.get(g.clave)
    if (!modelo) {
      modelo = crearModeloCultivo(g.cultivo ?? CULTIVOS[0], g.fase)
      modelos.set(g.clave, modelo)
    }
    if (modelo.material !== materialConViento) {
      materialConViento = modelo.material
      uniformes = añadirViento(modelo.material)
    }
    const malla = new InstancedMesh(modelo.geometria, modelo.material, capacidad)
    malla.name = `plantas-${g.clave}`
    malla.castShadow = true
    malla.receiveShadow = true
    grupo.add(malla)
    return malla
  }

  const retirar = (clave: string): void => {
    const malla = mallas.get(clave)
    if (!malla) return
    grupo.remove(malla)
    // Geometría y material son compartidos: solo se libera el búfer de instancias.
    malla.dispose()
    mallas.delete(clave)
  }

  const sincronizar = (plantas: readonly Planta[]): void => {
    if (plantas === dibujadas) return
    dibujadas = plantas
    const nueva = agruparPlantas(plantas, lado)
    const cambian = gruposQueCambian(agrupacion, nueva)
    agrupacion = nueva
    const conMalla = new Set(planDeMallas(nueva))
    for (const clave of cambian) {
      const g = nueva.get(clave)
      if (!g || !conMalla.has(clave)) {
        retirar(clave)
        continue
      }
      let malla = mallas.get(clave)
      const actual = malla?.instanceMatrix.count ?? 0
      const capacidad = capacidadNecesaria(g.casillas.length, actual)
      if (!malla || capacidad !== actual) {
        retirar(clave)
        malla = crearMalla(g, capacidad)
        mallas.set(clave, malla)
      }
      escribir(malla, g)
    }
  }
  sincronizar(lector.estado.plantas)

  return {
    objeto: grupo,
    actualizar: (dt) => {
      if (uniformes) uniformes.uTiempo.value += dt
      sincronizar(lector.estado.plantas)
    },
    destruir: () => {
      for (const clave of [...mallas.keys()]) retirar(clave)
      modelos.clear()
      liberarModelosCultivos()
    },
  }
}
