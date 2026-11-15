import {
  BoxGeometry,
  Color,
  ConeGeometry,
  Fog,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
  type BufferGeometry,
} from 'three'
import { añadirLuces } from './luces'

// Colores provisionales de la escena: se sustituyen por la paleta en M0-T06.
const COLORES_PROVISIONALES = {
  cielo: 0xbcdcec,
  niebla: 0xbcdcec,
  suelo: 0x8fbf5c,
  caja: 0xc4553b,
  cono: 0x6a9a4a,
  icosaedro: 0x9a9583,
} as const

function material(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, flatShading: true, roughness: 1, metalness: 0 })
}

function objeto(geometria: BufferGeometry, color: number, x: number, y: number, z: number): Mesh {
  const malla = new Mesh(geometria, material(color))
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
  escena.background = new Color(COLORES_PROVISIONALES.cielo)
  escena.fog = new Fog(COLORES_PROVISIONALES.niebla, 40, 120)
  añadirLuces(escena)

  const suelo = new Mesh(new PlaneGeometry(80, 80), material(COLORES_PROVISIONALES.suelo))
  suelo.rotation.x = -Math.PI / 2
  suelo.receiveShadow = true
  escena.add(suelo)

  escena.add(objeto(new BoxGeometry(3, 3, 3), COLORES_PROVISIONALES.caja, -5, 1.5, 0))
  escena.add(objeto(new ConeGeometry(2, 4, 6), COLORES_PROVISIONALES.cono, 0, 2, 0))
  escena.add(objeto(new IcosahedronGeometry(1.8, 0), COLORES_PROVISIONALES.icosaedro, 5, 1.8, 0))

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
