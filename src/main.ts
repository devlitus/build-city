import { crearEstadoInicial } from './core'
import { crearAlmacen } from './juego/almacen'
import { iniciarBucle } from './juego/bucle'
import { CONFIG_BUCLE } from './juego/config-bucle'
import {
  crearTeclas,
  direccionRelativa,
  instalarEleccionHerramienta,
  instalarEntrada,
} from './juego/entrada'
import { instalarTeclasTiempo } from './juego/tiempo'
import { montarUi } from './ui/montar'
import type { CamaraDepuracion } from './world/camaras/depuracion'
import { crearEscena } from './world/escena'

/** Semilla provisional hasta que exista la pantalla de nueva partida. */
const SEMILLA_PROVISIONAL = 1

const contenedor = document.getElementById('juego')
if (contenedor) {
  Object.assign(contenedor.style, { position: 'fixed', inset: '0' })
  const almacen = crearAlmacen(crearEstadoInicial({ semilla: SEMILLA_PROVISIONAL }))
  const escena = crearEscena(contenedor, almacen)
  const { dibujar, camara, renderer } = escena

  let contarFps: (() => void) | undefined
  if (import.meta.env.DEV) {
    void import('./world/contador-fps').then((m) => {
      contarFps = m.crearContadorFps(contenedor)
    })
  }

  // Con F2 manda la cámara libre de depuración: la de tercera persona se detiene y WASD solo
  // mueve la cámara libre (el personaje se queda quieto).
  let camaraLibre: CamaraDepuracion | undefined
  let ultimo = performance.now()
  if (import.meta.env.DEV) {
    void import('./world/camaras/depuracion').then((m) => {
      camaraLibre = m.crearCamaraDepuracion(camara, renderer.domElement)
    })
  }

  // Se guarda para quitar el oyente al volver al menú (aún sin usar).
  const quitarTeclasTiempo = instalarTeclasTiempo(almacen)
  void quitarTeclasTiempo
  instalarEleccionHerramienta(almacen)
  const teclas = crearTeclas()
  instalarEntrada(window, teclas)
  const ui = document.getElementById('ui')
  if (ui) montarUi(ui, almacen)

  iniciarBucle({
    almacen,
    // En cada paso fijo: guarda la posición previa (para interpolar) y envía el movimiento.
    alPaso: () => {
      escena.marcarPaso()
      if (camaraLibre?.activa) return
      const { dx, dy } = direccionRelativa(teclas, escena.yawCamara())
      if (dx === 0 && dy === 0) return
      almacen.despachar({
        tipo: 'MoverPersonaje',
        dx,
        dy,
        ms: CONFIG_BUCLE.pasoFijoMs,
        corre: teclas.correr,
      })
    },
    dibujar: (alfa) => {
      const ahora = performance.now()
      escena.fijarCamaraSeguimiento(!camaraLibre?.activa)
      camaraLibre?.actualizar((ahora - ultimo) / 1000)
      ultimo = ahora
      dibujar(alfa)
      contarFps?.()
    },
  })
}
