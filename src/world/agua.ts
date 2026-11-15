import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Vector4,
} from 'three'
import { casillasRio, type Valle } from '../core'
import { color } from './paleta'
import type { FuncionAltura } from './terreno/altura'
import { casillaAMetros, ladoCasillas } from './terreno/coordenadas'
import { PARAMETROS_TERRENO, type ParametrosTerreno } from './terreno/parametros'

/** Celda de agua de 1 m: casilla global (x, y); puede quedar fuera del valle (río hacia las colinas). */
export interface CeldaAgua {
  readonly x: number
  readonly y: number
}

/**
 * Celdas que llevan agua. Dentro del valle, exactamente las casillas de río. Fuera, las casillas
 * por las que el río sale "extruido" (la casilla del borde más cercana es de río) mientras el
 * terreno de la celda (centro y esquinas) quede por debajo de `nivelAgua`: donde sube más, lo
 * tapan las colinas. Nunca incluye casillas de tierra. Pura y determinista.
 */
export function celdasAgua(
  valle: Valle,
  altura: FuncionAltura,
  parametros: ParametrosTerreno = PARAMETROS_TERRENO,
): CeldaAgua[] {
  const lado = ladoCasillas(valle)
  const rio = new Set(casillasRio(valle).map((c) => c.y * lado + c.x))
  const tope = Math.ceil(parametros.malla.radioColinas)
  const celdas: CeldaAgua[] = []
  for (const k of [...rio].sort((a, b) => a - b)) {
    const x = k % lado
    const y = Math.floor(k / lado)
    celdas.push({ x, y })
    // Extrusión hacia fuera solo desde las casillas del borde del valle.
    const salidas: [number, number][] = []
    if (x === 0) salidas.push([-1, 0])
    if (x === lado - 1) salidas.push([1, 0])
    if (y === 0) salidas.push([0, -1])
    if (y === lado - 1) salidas.push([0, 1])
    for (const [dx, dy] of salidas) {
      for (let d = 1; d <= tope; d++) {
        const cx = x + dx * d
        const cy = y + dy * d
        const c = casillaAMetros(cx, cy, valle)
        const bajo = [-0.5, 0, 0.5].every((ox) =>
          [-0.5, 0, 0.5].every((oz) => altura(c.x + ox, c.z + oz) < parametros.nivelAgua),
        )
        if (!bajo) break
        celdas.push({ x: cx, y: cy })
      }
    }
  }
  return celdas
}

/**
 * Geometría de la superficie: un cuadrado por celda a `nivel`. En los lados sin celda vecina
 * se amplía `margen` m para cubrir el talud de la orilla (queda bajo el agua unos centímetros
 * y sube por encima enseguida, así el solape no se ve sobre la tierra).
 */
export function geometriaAgua(
  celdas: readonly CeldaAgua[],
  valle: Valle,
  nivel: number,
  margen: number,
): BufferGeometry {
  const hay = new Set(celdas.map((c) => `${c.x},${c.y}`))
  const pos: number[] = []
  const mitad = ladoCasillas(valle) / 2
  for (const { x, y } of celdas) {
    const x0 = x - mitad - (hay.has(`${x - 1},${y}`) ? 0 : margen)
    const x1 = x + 1 - mitad + (hay.has(`${x + 1},${y}`) ? 0 : margen)
    const z0 = y - mitad - (hay.has(`${x},${y - 1}`) ? 0 : margen)
    const z1 = y + 1 - mitad + (hay.has(`${x},${y + 1}`) ? 0 : margen)
    // Sentido antihorario visto desde arriba (+y).
    pos.push(x0, nivel, z0, x0, nivel, z1, x1, nivel, z1)
    pos.push(x0, nivel, z0, x1, nivel, z1, x1, nivel, z0)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}

/** Objeto de agua con su animación por fotograma. */
export type Agua = Object3D & {
  /** Avanza la ondulación `dt` segundos. */
  actualizar(dt: number): void
}

/**
 * Superficie de agua solo sobre el cauce: una malla, un material, una draw call. Semitransparente,
 * con brillo suave y una ondulación de brillo en el shader dependiente del tiempo.
 */
export function crearAgua(
  valle: Valle,
  altura: FuncionAltura,
  parametros: ParametrosTerreno = PARAMETROS_TERRENO,
): Agua {
  const { agua, nivelAgua } = parametros
  const celdas = celdasAgua(valle, altura, parametros)
  const geometria = geometriaAgua(celdas, valle, nivelAgua, agua.margen)
  const tiempo = { value: 0 }
  const material = new MeshStandardMaterial({
    color: color('agua'),
    emissive: color('agua'),
    emissiveIntensity: agua.brillo,
    roughness: agua.rugosidad,
    metalness: 0,
    transparent: true,
    opacity: agua.opacidad,
    depthWrite: false,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = tiempo
    shader.uniforms.uAmplitud = { value: agua.onda.amplitud }
    shader.uniforms.uForma = {
      value: new Vector4(
        agua.onda.estiramientoZ,
        agua.onda.armonicoFrecuencia,
        agua.onda.armonicoVelocidad,
        agua.onda.cruzadaVelocidad,
      ),
    }
    shader.uniforms.uFrecuencia = { value: (Math.PI * 2) / agua.onda.longitudOnda }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPlano;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlano = position.xz;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec2 vPlano;\nuniform float uTiempo;\nuniform float uAmplitud;\nuniform float uFrecuencia;
uniform vec4 uForma;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float onda = sin(vPlano.x * uFrecuencia + uTiempo) * sin(vPlano.y * uFrecuencia * uForma.x - uTiempo * uForma.w)
          + 0.5 * sin((vPlano.x + vPlano.y) * uFrecuencia * uForma.y + uTiempo * uForma.z);
        diffuseColor.rgb *= 1.0 + uAmplitud * onda;`,
      )
  }
  const malla = new Mesh(geometria, material)
  malla.name = 'agua'
  malla.renderOrder = 1
  const actualizar = (dt: number): void => {
    tiempo.value += dt * agua.onda.velocidad * Math.PI * 2
  }
  return Object.assign(malla, { actualizar })
}
