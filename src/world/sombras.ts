import * as v from 'valibot'
import type { DirectionalLight } from 'three'
import sombrasJson from '../../data/sombras.json'

const estrictoPositivo = v.pipe(v.number(), v.gtValue(0))

/** Esquema de `data/sombras.json`. Longitudes en metros. */
export const esquemaSombras = v.object({
  /** Mitad del lado del área cuadrada de sombras alrededor del objetivo. */
  semiancho: estrictoPositivo,
  /** Lado del mapa de sombras en texeles. */
  mapa: estrictoPositivo,
  near: estrictoPositivo,
  far: estrictoPositivo,
  bias: v.number(),
  normalBias: v.pipe(v.number(), v.minValue(0)),
})

export type DatosSombras = v.InferOutput<typeof esquemaSombras>

/** Valida un JSON de sombras; lanza si no cumple el esquema. */
export function cargarSombras(json: unknown): DatosSombras {
  const r = v.safeParse(esquemaSombras, json)
  if (!r.success) throw new Error(`Sombras inválidas: ${r.issues.map((i) => i.message).join('; ')}`)
  return r.output
}

export const DATOS_SOMBRAS: DatosSombras = cargarSombras(sombrasJson)

export interface Punto3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

const producto = (a: Punto3, b: Punto3): Punto3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const punto = (a: Punto3, b: Punto3): number => a.x * b.x + a.y * b.y + a.z * b.z
const normalizar = (a: Punto3): Punto3 => {
  const l = Math.hypot(a.x, a.y, a.z)
  return { x: a.x / l, y: a.y / l, z: a.z / l }
}

/**
 * Centro de la cámara de sombras: el objetivo proyectado en los ejes derecho y arriba de la cámara
 * de luz (la que mira del sol al objetivo, con arriba = +Y) y redondeado a `tamanoTexel` en cada
 * uno; la componente a lo largo de la luz no cambia. Así el mapa solo se desplaza en múltiplos
 * exactos de texel y las sombras no "nadan". `direccionSol` no puede ser vertical. Pura.
 */
export function centroSombraRedondeado(
  objetivo: Punto3,
  direccionSol: Punto3,
  tamanoTexel: number,
): Punto3 {
  const z = normalizar(direccionSol)
  const derecha = normalizar(producto({ x: 0, y: 1, z: 0 }, z))
  const arriba = producto(z, derecha)
  const pd = punto(objetivo, derecha)
  const pa = punto(objetivo, arriba)
  const dd = Math.round(pd / tamanoTexel) * tamanoTexel - pd
  const da = Math.round(pa / tamanoTexel) * tamanoTexel - pa
  return {
    x: objetivo.x + derecha.x * dd + arriba.x * da,
    y: objetivo.y + derecha.y * dd + arriba.y * da,
    z: objetivo.z + derecha.z * dd + arriba.z * da,
  }
}

export interface Sombras {
  /**
   * Centra las sombras en `objetivo` (punto del suelo, en metros, que enfoca la cámara). Llamar
   * cada fotograma DESPUÉS de `luzEscena.actualizar`, que fija `sol.position` como dirección del
   * sol por una distancia (relativa al origen); aquí solo se lee esa dirección y se recoloca el
   * sol. T04 (cámara en tercera persona) debe pasar el punto que mira la cámara (su `lookAt`).
   */
  actualizar(objetivo: Punto3): void
}

/** Configura la cámara de sombras del sol para que siga al objetivo. */
export function crearSombras(sol: DirectionalLight): Sombras {
  const d = DATOS_SOMBRAS
  sol.shadow.mapSize.set(d.mapa, d.mapa)
  const c = sol.shadow.camera
  c.left = -d.semiancho
  c.right = d.semiancho
  c.top = d.semiancho
  c.bottom = -d.semiancho
  c.near = d.near
  c.far = d.far
  c.updateProjectionMatrix()
  sol.shadow.bias = d.bias
  sol.shadow.normalBias = d.normalBias
  const texel = (2 * d.semiancho) / d.mapa
  // El centro del área queda a media profundidad entre near y far.
  const distancia = (d.near + d.far) / 2

  return {
    actualizar(objetivo) {
      const dir = normalizar(sol.position)
      const centro = centroSombraRedondeado(objetivo, dir, texel)
      sol.target.position.set(centro.x, centro.y, centro.z)
      sol.target.updateMatrixWorld()
      sol.position.set(
        centro.x + dir.x * distancia,
        centro.y + dir.y * distancia,
        centro.z + dir.z * distancia,
      )
    },
  }
}
