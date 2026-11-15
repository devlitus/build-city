import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Object3D,
} from 'three'
import { color } from './paleta'
import { PARAMETROS_HORIZONTE, type ParametrosHorizonte } from './horizonte-parametros'
import { hashEnteros, ruidoValor } from './terreno/ruido'

function suavizar(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * Altura (m) del anillo de montañas en el radio `r` y el ángulo `angulo`. Arranca en
 * `-profundidadBase` en el radio interior (bajo el terreno exterior, sin rendijas), sube
 * hasta la cresta (cuya altura varía con el ángulo, con ruido periódico) y vuelve a bajar
 * en la cara de fuera. Pura y determinista.
 */
export function alturaHorizonte(
  r: number,
  angulo: number,
  radioInterior: number,
  p: ParametrosHorizonte = PARAMETROS_HORIZONTE,
): number {
  const t = (r - radioInterior) / p.anchoAnillo
  const perfil =
    t < p.fraccionCresta
      ? suavizar(t / p.fraccionCresta)
      : 1 - suavizar((t - p.fraccionCresta) / (1 - p.fraccionCresta))
  // Ruido sobre un círculo para que sea continuo al dar la vuelta completa.
  const k = p.longitudOndaPicos
  const n =
    0.65 * ruidoValor(Math.cos(angulo) * k, Math.sin(angulo) * k, 11) +
    0.35 * ruidoValor(Math.cos(angulo) * k * 3 + r * 0.01, Math.sin(angulo) * k * 3, 23)
  const pico = Math.min(1, Math.max(0, 0.5 + 0.6 * n))
  const cresta = p.alturaMinima + (p.alturaPicos - p.alturaMinima) * pico
  return -p.profundidadBase + (cresta + p.profundidadBase) * perfil
}

/** Malla del anillo: caras planas con color por cara (roca abajo, nieve en las cimas). */
function crearAnillo(radioInterior: number, p: ParametrosHorizonte): Mesh {
  const na = p.segmentosAngulo
  const nr = p.anillosRadiales
  const pos = new Float32Array(na * (nr + 1) * 3)
  for (let j = 0; j <= nr; j++) {
    for (let i = 0; i < na; i++) {
      const a = (i / na) * Math.PI * 2
      // Pequeño desplazamiento determinista para que no parezca una rejilla perfecta.
      const jr =
        j === 0 || j === nr ? 0 : (hashEnteros(i, j, 5) - 0.5) * (p.anchoAnillo / nr) * 0.5
      const r = radioInterior + (j / nr) * p.anchoAnillo + jr
      const k = j * na + i
      pos[k * 3] = Math.cos(a) * r
      pos[k * 3 + 1] = alturaHorizonte(r, a, radioInterior, p)
      pos[k * 3 + 2] = Math.sin(a) * r
    }
  }
  const indices: number[] = []
  for (let j = 0; j < nr; j++) {
    for (let i = 0; i < na; i++) {
      const i2 = (i + 1) % na
      const a = j * na + i
      const b = j * na + i2
      const c = (j + 1) * na + i
      const d = (j + 1) * na + i2
      indices.push(a, c, b, b, c, d)
    }
  }
  const indexada = new BufferGeometry()
  indexada.setAttribute('position', new BufferAttribute(pos, 3))
  indexada.setIndex(indices)
  const g = indexada.toNonIndexed()
  indexada.dispose()

  const posiciones = g.getAttribute('position')
  const colores = new Float32Array(posiciones.count * 3)
  const roca = new Color(color('montana'))
  const rocaAlta = new Color(color('roca'))
  const nieve = new Color(color('nieve'))
  const c = new Color()
  const limiteNieve = p.alturaPicos * p.umbralNieve
  for (let f = 0; f < posiciones.count; f += 3) {
    const hm = (posiciones.getY(f) + posiciones.getY(f + 1) + posiciones.getY(f + 2)) / 3
    if (hm >= limiteNieve) c.copy(nieve)
    else c.copy(roca).lerp(rocaAlta, Math.min(1, Math.max(0, hm / limiteNieve)))
    for (let v = 0; v < 3; v++) c.toArray(colores, (f + v) * 3)
  }
  g.setAttribute('color', new BufferAttribute(colores, 3))
  g.computeVertexNormals()
  const material = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  })
  return new Mesh(g, material)
}

/** Nubes: una `InstancedMesh` cuyas instancias avanzan hacia +x y reaparecen por el otro lado. */
function crearNubes(p: ParametrosHorizonte): { malla: InstancedMesh; actualizar(dt: number): void } {
  const n = p.nubes
  const material = new MeshStandardMaterial({
    color: color('nube'),
    flatShading: true,
    roughness: 1,
    metalness: 0,
  })
  const malla = new InstancedMesh(new IcosahedronGeometry(1, 1), material, Math.max(1, n.cantidad))
  malla.count = n.cantidad
  malla.instanceMatrix.setUsage(DynamicDrawUsage)
  malla.frustumCulled = false
  const xs = new Float32Array(n.cantidad)
  const ys = new Float32Array(n.cantidad)
  const zs = new Float32Array(n.cantidad)
  const tam = new Float32Array(n.cantidad)
  for (let i = 0; i < n.cantidad; i++) {
    xs[i] = (hashEnteros(i, 1, 31) * 2 - 1) * n.radioMax
    zs[i] = (hashEnteros(i, 2, 31) * 2 - 1) * n.radioMax
    ys[i] = n.alturaMin + hashEnteros(i, 3, 31) * (n.alturaMax - n.alturaMin)
    tam[i] = n.tamanoMin + hashEnteros(i, 4, 31) * (n.tamanoMax - n.tamanoMin)
  }
  const m = new Matrix4()
  const q = new Quaternion()
  const pos = new Vector3()
  const esc = new Vector3()
  const aplicar = (): void => {
    for (let i = 0; i < n.cantidad; i++) {
      pos.set(xs[i] ?? 0, ys[i] ?? 0, zs[i] ?? 0)
      const s = tam[i] ?? 1
      esc.set(s * 1.8, s * 0.5, s)
      m.compose(pos, q, esc)
      malla.setMatrixAt(i, m)
    }
    malla.instanceMatrix.needsUpdate = true
  }
  aplicar()
  return {
    malla,
    actualizar(dt: number) {
      for (let i = 0; i < n.cantidad; i++) {
        let x = (xs[i] ?? 0) + n.velocidad * dt
        if (x > n.radioMax) x -= 2 * n.radioMax
        xs[i] = x
      }
      aplicar()
    },
  }
}

/** Horizonte: anillo de montañas y nubes. `actualizar(dt)` (segundos) mueve las nubes. */
export interface Horizonte {
  readonly objeto: Object3D
  actualizar(dt: number): void
  destruir(): void
}

/**
 * Crea el horizonte que rodea el valle. `radioInterior` es el radio (m, desde el centro) donde
 * arranca el anillo, por debajo del terreno exterior; las montañas suben más allá de las colinas
 * y cierran el horizonte en los 360 grados.
 */
export function crearHorizonte(
  radioInterior: number = PARAMETROS_HORIZONTE.radioInterior,
  p: ParametrosHorizonte = PARAMETROS_HORIZONTE,
): Horizonte {
  const grupo = new Group()
  grupo.name = 'horizonte'
  const anillo = crearAnillo(radioInterior, p)
  const nubes = crearNubes(p)
  grupo.add(anillo, nubes.malla)
  return {
    objeto: grupo,
    actualizar: nubes.actualizar,
    destruir() {
      anillo.geometry.dispose()
      ;(anillo.material as MeshStandardMaterial).dispose()
      nubes.malla.geometry.dispose()
      ;(nubes.malla.material as MeshStandardMaterial).dispose()
      nubes.malla.dispose()
    },
  }
}
