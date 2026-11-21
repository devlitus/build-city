import { crearEstadoInicial } from './core'
import { crearAlmacen } from './juego/almacen'
import { iniciarBucle } from './juego/bucle'
import { instalarTeclasTiempo } from './juego/tiempo'
import { crearEscena } from './world/escena'

/** Semilla provisional hasta que exista la pantalla de nueva partida. */
const SEMILLA_PROVISIONAL = 1

const contenedor = document.getElementById('juego')
if (contenedor) {
  Object.assign(contenedor.style, { position: 'fixed', inset: '0' })
  const almacen = crearAlmacen(crearEstadoInicial({ semilla: SEMILLA_PROVISIONAL }))
  const { dibujar, camara, renderer } = crearEscena(contenedor, almacen)

  let contarFps: (() => void) | undefined
  if (import.meta.env.DEV) {
    void import('./world/contador-fps').then((m) => {
      contarFps = m.crearContadorFps(contenedor)
    })
  }

  let actualizarCamaraLibre: ((dt: number) => void) | undefined
  let ultimo = performance.now()
  if (import.meta.env.DEV) {
    void import('./world/camaras/depuracion').then((m) => {
      actualizarCamaraLibre = m.crearCamaraDepuracion(camara, renderer.domElement).actualizar
    })
  }

  instalarTeclasTiempo(almacen)

  iniciarBucle({
    almacen,
    dibujar: () => {
      const ahora = performance.now()
      actualizarCamaraLibre?.((ahora - ultimo) / 1000)
      ultimo = ahora
      dibujar()
      contarFps?.()
    },
  })
}
