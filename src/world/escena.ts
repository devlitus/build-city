import { Color, Fog, PCFShadowMap, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import type { LectorEstado } from '../juego/almacen'
import { añadirLuces } from './luces'
import { color } from './paleta'
import { ladoMetros } from './terreno/coordenadas'
import { crearTerreno } from './terreno/malla'

export interface Escena {
  escena: Scene
  camara: PerspectiveCamera
  renderer: WebGLRenderer
  /** Dibuja un fotograma. */
  dibujar(): void
  destruir(): void
}

/** Crea el lienzo three.js dentro del contenedor, con luces, terreno y redimensionado. */
export function crearEscena(contenedor: HTMLElement, lector: LectorEstado): Escena {
  const { valle, semilla } = lector.estado
  const lado = ladoMetros(valle)

  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  // three 0.187 retiró PCFSoftShadowMap; PCFShadowMap ya filtra suave.
  renderer.shadowMap.type = PCFShadowMap
  renderer.domElement.style.display = 'block'
  contenedor.append(renderer.domElement)

  const escena = new Scene()
  escena.background = new Color(color('cielo'))
  // Provisional (T06 la afina): el valle entero queda por delante de la niebla.
  escena.fog = new Fog(color('niebla'), lado * 1.6, lado * 4.5)
  añadirLuces(escena, lado / 2)

  // Aquí se añaden las capas del mundo, una línea cada una (agua, vegetación, horizonte, pueblo…).
  escena.add(crearTerreno(valle, semilla))

  const camara = new PerspectiveCamera(50, 1, 0.3, lado * 6)
  // Vista inicial: desde el sur y en alto, mirando al centro del valle.
  camara.position.set(0, lado * 0.44, lado * 0.875)
  camara.lookAt(0, 0, 0)

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
    dibujar: () => {
      renderer.render(escena, camara)
    },
    destruir: () => {
      observador.disconnect()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
