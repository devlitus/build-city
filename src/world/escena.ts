import {
  BoxGeometry,
  Color,
  ConeGeometry,
  Fog,
  IcosahedronGeometry,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
  type BufferGeometry,
} from 'three'
import { añadirLuces } from './luces'
import { materialDe } from './materiales'
import { color } from './paleta'

function objeto(
  geometria: BufferGeometry,
  colorMaterial: string,
  x: number,
  y: number,
  z: number,
): Mesh {
  const malla = new Mesh(geometria, materialDe(colorMaterial))
  malla.position.set(x, y, z)
  malla.castShadow = true
  malla.receiveShadow = true
  return malla
}

export interface Escena {
  escena: Scene
  camara: PerspectiveCamera
  renderer: WebGLRenderer
  /** Dibuja un fotograma. */
  dibujar(): void
  destruir(): void
}

/** Crea el lienzo three.js dentro del contenedor, con luces, objetos de prueba y redimensionado. */
export function crearEscena(contenedor: HTMLElement): Escena {
  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  // three 0.187 retiró PCFSoftShadowMap; PCFShadowMap ya filtra suave.
  renderer.shadowMap.type = PCFShadowMap
  renderer.domElement.style.display = 'block'
  contenedor.append(renderer.domElement)

  const escena = new Scene()
  escena.background = new Color(color('cielo'))
  escena.fog = new Fog(color('niebla'), 40, 120)
  añadirLuces(escena)

  const suelo = new Mesh(new PlaneGeometry(80, 80), materialDe('prado'))
  suelo.rotation.x = -Math.PI / 2
  suelo.receiveShadow = true
  escena.add(suelo)

  escena.add(objeto(new BoxGeometry(3, 3, 3), 'teja', -5, 1.5, 0))
  escena.add(objeto(new ConeGeometry(2, 4, 6), 'bosque', 0, 2, 0))
  escena.add(objeto(new IcosahedronGeometry(1.8, 0), 'roca', 5, 1.8, 0))

  const camara = new PerspectiveCamera(50, 1, 0.3, 300)
  camara.position.set(0, 9, 18)
  camara.lookAt(0, 1.5, 0)

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
