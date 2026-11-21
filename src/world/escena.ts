import {
  ACESFilmicToneMapping,
  Fog,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import type { LectorEstado } from '../juego/almacen'
import { crearCielo } from './cielo'
import { DATOS_CIELO } from './cielo-datos'
import { crearHorizonte } from './horizonte'
import { PARAMETROS_HORIZONTE } from './horizonte-parametros'
import { añadirLuces } from './luces'
import { crearLuzEscena } from './luz-escena'
import { crearAgua } from './agua'
import { color } from './paleta'
import { crearGranjero } from './personaje/modelo'
import { crearPueblo } from './pueblo'
import { crearAltura } from './terreno/altura'
import { crearSombras } from './sombras'
import { crearTerceraPersona } from './camaras/tercera-persona'
import { ladoMetros } from './terreno/coordenadas'
import { crearTerreno } from './terreno/malla'
import { crearVegetacion } from './vegetacion'
import { crearCapaPlano } from './plano/plano'

export interface Escena {
  escena: Scene
  camara: PerspectiveCamera
  renderer: WebGLRenderer
  /**
   * Dibuja un fotograma. `alfa` en [0, 1] interpola al personaje entre su posición del paso fijo
   * anterior y la actual (ver `alfaDelAcumulador`).
   */
  dibujar(alfa?: number): void
  /** Para cada paso fijo, antes de mover al personaje: guarda su posición previa para interpolar. */
  marcarPaso(): void
  /** Hacia dónde mira la cámara en el suelo (rad; 0 = norte, crece a la derecha). */
  yawCamara(): number
  /**
   * Activa o desactiva el seguimiento de la cámara en tercera persona (se desactiva mientras
   * manda la cámara libre de depuración).
   */
  fijarCamaraSeguimiento(activa: boolean): void
  destruir(): void
}

/** Crea el lienzo three.js dentro del contenedor, con luces, terreno y redimensionado. */
export function crearEscena(contenedor: HTMLElement, lector: LectorEstado): Escena {
  const { valle, semilla } = lector.estado
  const lado = ladoMetros(valle)

  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = DATOS_CIELO.exposicion
  renderer.shadowMap.enabled = true
  // three 0.187 retiró PCFSoftShadowMap; PCFShadowMap ya filtra suave.
  renderer.shadowMap.type = PCFShadowMap
  renderer.domElement.style.display = 'block'
  contenedor.append(renderer.domElement)

  const escena = new Scene()
  // El cielo físico dibuja el fondo y, con su entorno PMREM, ilumina los materiales PBR.
  const cielo = crearCielo(renderer)
  escena.add(cielo.objeto)
  escena.environment = cielo.entorno
  escena.environmentIntensity = DATOS_CIELO.intensidadEntorno
  escena.fog = new Fog(
    color('niebla'),
    PARAMETROS_HORIZONTE.niebla.cerca,
    PARAMETROS_HORIZONTE.niebla.lejos,
  )
  const luces = añadirLuces(escena)
  const luzEscena = crearLuzEscena(escena, renderer, cielo, luces)
  const sombras = crearSombras(luces.sol)
  const horizonte = crearHorizonte(lado)
  let instanteAnterior = performance.now()

  // Aquí se añaden las capas del mundo, una línea cada una (agua, vegetación, horizonte, pueblo…).
  const terreno = crearTerreno(valle, semilla)
  escena.add(terreno)
  escena.add(horizonte.objeto)
  const altura = crearAltura(valle, semilla)
  escena.add(crearPueblo(valle, altura))
  const agua = crearAgua(valle, altura)
  escena.add(agua)
  const vegetacion = crearVegetacion(valle, lector.estado.obstaculos, altura, semilla)
  escena.add(vegetacion.objeto)
  const granjero = crearGranjero(lector, altura)
  escena.add(granjero.objeto)

  const camara = new PerspectiveCamera(
    50,
    1,
    0.3,
    Math.max(lado * 6, PARAMETROS_HORIZONTE.niebla.lejos),
  )
  // La pose real la fija la cámara en tercera persona en cada fotograma.
  const terceraPersona = crearTerceraPersona(camara, renderer.domElement, altura)

  const plano = crearCapaPlano(lector, camara, renderer.domElement, terreno, altura)
  escena.add(plano.objeto)

  const ajustar = (ancho: number, alto: number): void => {
    if (ancho === 0 || alto === 0) return
    renderer.setSize(ancho, alto)
    camara.aspect = ancho / alto
    camara.updateProjectionMatrix()
  }
  ajustar(contenedor.clientWidth, contenedor.clientHeight)
  const observador = new ResizeObserver(() => {
    ajustar(contenedor.clientWidth, contenedor.clientHeight)
  })
  observador.observe(contenedor)

  return {
    escena,
    camara,
    renderer,
    marcarPaso: () => granjero.marcarPaso(),
    yawCamara: () => terceraPersona.yaw,
    fijarCamaraSeguimiento: (activa) => {
      terceraPersona.habilitada = activa
    },
    dibujar: (alfa = 1) => {
      const ahora = performance.now()
      const dt = Math.min(0.1, (ahora - instanteAnterior) / 1000)
      horizonte.actualizar(dt)
      agua.actualizar(dt)
      const pies = granjero.actualizar(dt, alfa)
      // Antes que la vegetación, que usa la cámara ya colocada.
      const mirado = terceraPersona.actualizar(dt, pies)
      vegetacion.actualizar(dt, camara)
      plano.actualizar()
      instanteAnterior = ahora
      luzEscena.actualizar(lector.estado.minutoDelDia)
      // Las sombras siguen al punto que mira la cámara.
      sombras.actualizar(mirado)
      renderer.render(escena, camara)
    },
    destruir: () => {
      terceraPersona.destruir()
      plano.destruir()
      observador.disconnect()
      horizonte.destruir()
      cielo.destruir()
      vegetacion.destruir()
      granjero.destruir()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
