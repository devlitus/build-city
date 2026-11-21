import {
  AnimationMixer,
  Box3,
  Group,
  LoopRepeat,
  type AnimationAction,
  type Mesh,
  type Object3D,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { LectorEstado } from '../../juego/almacen'
import type { FuncionAltura } from '../terreno/altura'
import {
  anguloObjetivo,
  elegirAnimacion,
  girarHacia,
  suavizar,
  velocidadHorizontal,
} from './animacion'
import { DATOS_ANIMACION } from './animacion-datos'
import { crearSeguidorAltura } from './altura'
import { inclinacionGolpe } from './gesto'
import { DATOS_EFECTOS } from '../efectos/efectos-datos'
import { escalaParaAltura, personajeAMetros } from './medidas'
import type { Punto3 } from '../camaras/orbita'

/** Ruta del modelo «Farmer» de Grab3D (CC0), en `public/`. */
const RUTA_MODELO = `${import.meta.env.BASE_URL}modelos/granjero.glb`

export interface Granjero {
  /** Raíz en la posición del personaje; vacía hasta que carga el modelo. */
  readonly objeto: Group
  /**
   * Fija como «posición previa» la que tiene ahora el estado. Se llama en cada paso fijo, antes
   * de despachar el movimiento, para poder interpolar entre pasos.
   */
  marcarPaso(): void
  /**
   * Coloca y anima al granjero. Dibuja entre la posición previa (`alfa` 0) y la actual del estado
   * (`alfa` 1); con 20 Hz de simulación esto evita los tirones a 60 fps. Devuelve la posición de
   * los pies.
   */
  actualizar(dt: number, alfa?: number): Punto3
  /**
   * Gesto de golpear (hacha o pico) mirando al punto (x, z) en metros: gira hacia él y hace un
   * balanceo procedural del cuerpo (el glb no trae clip de golpe). Un golpe nuevo reinicia el gesto.
   */
  golpear(haciaX: number, haciaZ: number): void
  destruir(): void
}

/** Dibuja al granjero donde dice el estado, con el glb de Grab3D y su animación según la velocidad. */
export function crearGranjero(lector: LectorEstado, altura: FuncionAltura): Granjero {
  const raiz = new Group()
  raiz.name = 'granjero'
  const { valle, personaje } = lector.estado
  const inicio = personajeAMetros(personaje.x, personaje.y, valle)
  const seguidorAltura = crearSeguidorAltura(altura)
  raiz.position.set(inicio.x, seguidorAltura.actualizar(inicio.x, inicio.z, 0), inicio.z)
  let previoX = inicio.x
  let previoZ = inicio.z

  let mezclador: AnimationMixer | null = null
  let acciones: {
    reposo: AnimationAction
    andar: AnimationAction
    correr: AnimationAction
  } | null = null
  let modelo: Object3D | null = null
  let destruido = false

  let xAnterior = inicio.x
  let zAnterior = inicio.z
  let velocidad = 0
  let giro = 0
  /** Segundos desde el último golpe; `Infinity` si no hay gesto en curso. */
  let tiempoGolpe = Infinity

  new GLTFLoader()
    .loadAsync(RUTA_MODELO)
    .then((gltf) => {
      if (destruido) return
      modelo = gltf.scene
      // Escala por la caja para que mida lo que dicen los datos (el glb ya viene a 1,75 m).
      const caja = new Box3().setFromObject(modelo)
      modelo.scale.setScalar(escalaParaAltura(caja.max.y - caja.min.y, DATOS_ANIMACION.altura))
      modelo.traverse((o) => {
        const malla = o as Mesh
        if (malla.isMesh) {
          malla.castShadow = true
          malla.receiveShadow = true
          malla.frustumCulled = false // malla con esqueleto: la caja del reposo no vale
        }
      })
      raiz.add(modelo)
      const m = new AnimationMixer(modelo)
      const clip = (nombre: string): AnimationAction | null => {
        const c = gltf.animations.find((a) => a.name === nombre)
        return c ? m.clipAction(c) : null
      }
      const reposo = clip('Reposo')
      const andar = clip('Andar')
      const correr = clip('Correr')
      if (!reposo || !andar || !correr) {
        console.warn('Al granjero le faltan animaciones (Reposo, Andar, Correr)')
        return
      }
      for (const a of [reposo, andar, correr]) {
        a.setLoop(LoopRepeat, Infinity)
        a.setEffectiveWeight(a === reposo ? 1 : 0)
        a.play()
      }
      mezclador = m
      acciones = { reposo, andar, correr }
    })
    .catch((e: unknown) => {
      console.warn('Sin modelo del granjero', e)
    })

  return {
    objeto: raiz,
    marcarPaso: () => {
      const { personaje: p, valle: v } = lector.estado
      const actual = personajeAMetros(p.x, p.y, v)
      previoX = actual.x
      previoZ = actual.z
    },
    actualizar: (dt, alfa = 1) => {
      const { personaje: p, valle: v } = lector.estado
      const actual = personajeAMetros(p.x, p.y, v)
      const t = Math.min(1, Math.max(0, alfa))
      const pos = {
        x: previoX + (actual.x - previoX) * t,
        z: previoZ + (actual.z - previoZ) * t,
      }
      const y = seguidorAltura.actualizar(pos.x, pos.z, dt)
      raiz.position.set(pos.x, y, pos.z)
      const pies = { x: pos.x, y, z: pos.z }

      if (dt <= 0) return pies
      const dx = pos.x - xAnterior
      const dz = pos.z - zAnterior
      xAnterior = pos.x
      zAnterior = pos.z
      const real = velocidadHorizontal(dx, dz, dt)
      velocidad = suavizar(velocidad, real, DATOS_ANIMACION.suavizadoVelocidad, dt)

      const objetivo = anguloObjetivo(dx, dz, real, DATOS_ANIMACION.giro.velocidadMinima, giro)
      giro = girarHacia(giro, objetivo, DATOS_ANIMACION.giro.velocidadAngular, dt)
      raiz.rotation.y = giro

      // Gesto de golpear: inclinación procedural del modelo sobre sus pies (la animación no la toca).
      const gesto = DATOS_EFECTOS.golpeGranjero
      if (modelo && tiempoGolpe < gesto.duracion) {
        tiempoGolpe += dt
        modelo.rotation.x = inclinacionGolpe(
          tiempoGolpe,
          gesto.duracion,
          (gesto.inclinacion * Math.PI) / 180,
          gesto.fraccionPreparacion,
        )
      } else if (modelo && modelo.rotation.x !== 0) {
        modelo.rotation.x = 0
      }

      if (!mezclador || !acciones) return pies
      const { pesos, timeScale } = elegirAnimacion(velocidad, DATOS_ANIMACION)
      // Fundido: los pesos siguen a los objetivos con la duración configurada.
      const rapidez = DATOS_ANIMACION.tiempoFundido > 0 ? 3 / DATOS_ANIMACION.tiempoFundido : 1000
      for (const nombre of ['reposo', 'andar', 'correr'] as const) {
        const accion = acciones[nombre]
        accion.setEffectiveWeight(suavizar(accion.getEffectiveWeight(), pesos[nombre], rapidez, dt))
        accion.setEffectiveTimeScale(nombre === 'reposo' ? 1 : timeScale)
      }
      mezclador.update(dt)
      return pies
    },
    golpear: (haciaX, haciaZ) => {
      const dx = haciaX - raiz.position.x
      const dz = haciaZ - raiz.position.z
      if (dx !== 0 || dz !== 0) giro = Math.atan2(dx, dz)
      tiempoGolpe = 0
    },
    destruir: () => {
      destruido = true
      mezclador?.stopAllAction()
      if (modelo) mezclador?.uncacheRoot(modelo)
      raiz.traverse((o) => {
        const malla = o as Mesh
        if (!malla.isMesh) return
        malla.geometry.dispose()
        const materiales = Array.isArray(malla.material) ? malla.material : [malla.material]
        for (const mat of materiales) {
          for (const valor of Object.values(mat)) {
            if (valor && typeof valor === 'object' && 'isTexture' in valor)
              (valor as { dispose(): void }).dispose()
          }
          mat.dispose()
        }
      })
      raiz.removeFromParent()
    },
  }
}
