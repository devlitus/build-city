import {
  type BufferGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  type Material,
  type Object3D,
} from 'three'
import { RegistroSlots } from './registro-slots'

export interface OpcionesCapa {
  readonly nombre: string
  readonly capacidadInicial: number
  readonly proyectaSombra: boolean
  readonly recibeSombra: boolean
}

/**
 * Un `InstancedMesh` con huecos asignados por clave: añadir, mover o quitar una instancia solo
 * toca su hueco (al quitar, la última ocupa el sitio). La capacidad se duplica al llenarse.
 * No es dueña de la geometría ni del material: los libera quien los creó.
 */
export class CapaInstanciada {
  readonly #raiz: Object3D
  readonly #geometria: BufferGeometry
  readonly #material: Material
  readonly #opciones: OpcionesCapa
  readonly #registro = new RegistroSlots()
  readonly #temporal = new Matrix4()
  #malla: InstancedMesh
  #capacidad: number
  #conColor = false

  constructor(
    raiz: Object3D,
    geometria: BufferGeometry,
    material: Material,
    opciones: OpcionesCapa,
  ) {
    this.#raiz = raiz
    this.#geometria = geometria
    this.#material = material
    this.#opciones = opciones
    this.#capacidad = Math.max(1, opciones.capacidadInicial)
    this.#malla = this.#crearMalla(this.#capacidad)
  }

  get cuenta(): number {
    return this.#registro.cuenta
  }

  /** Coloca (o mueve) la instancia de `clave`; `color` opcional, por instancia. */
  poner(clave: number, matriz: Matrix4, color?: Color): void {
    const { slot, nuevo } = this.#registro.asignar(clave)
    if (nuevo && slot >= this.#capacidad) this.#crecer()
    const m = this.#malla
    m.setMatrixAt(slot, matriz)
    m.instanceMatrix.needsUpdate = true
    if (color) {
      this.#conColor = true
      m.setColorAt(slot, color)
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    m.count = this.#registro.cuenta
  }

  quitar(clave: number): void {
    const r = this.#registro.quitar(clave)
    if (!r) return
    const m = this.#malla
    if (r.desde !== r.hasta) {
      m.getMatrixAt(r.desde, this.#temporal)
      m.setMatrixAt(r.hasta, this.#temporal)
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) {
        const a = m.instanceColor.array
        const k = 3
        for (let j = 0; j < k; j++) a[r.hasta * k + j] = a[r.desde * k + j] as number
        m.instanceColor.needsUpdate = true
      }
    }
    m.count = this.#registro.cuenta
  }

  destruir(): void {
    this.#raiz.remove(this.#malla)
    this.#malla.dispose()
  }

  #crearMalla(capacidad: number): InstancedMesh {
    const m = new InstancedMesh(this.#geometria, this.#material, capacidad)
    m.name = this.#opciones.nombre
    m.count = 0
    m.frustumCulled = false
    m.castShadow = this.#opciones.proyectaSombra
    m.receiveShadow = this.#opciones.recibeSombra
    this.#raiz.add(m)
    return m
  }

  #crecer(): void {
    const vieja = this.#malla
    this.#capacidad *= 2
    const nueva = this.#crearMalla(this.#capacidad)
    nueva.instanceMatrix.array.set(vieja.instanceMatrix.array)
    if (this.#conColor && vieja.instanceColor) {
      nueva.setColorAt(0, new Color()) // reserva el búfer de colores
      nueva.instanceColor?.array.set(vieja.instanceColor.array)
    }
    this.#raiz.remove(vieja)
    vieja.dispose()
    this.#malla = nueva
  }
}
