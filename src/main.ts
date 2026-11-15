import { crearEstadoInicial } from './core'
import { crearAlmacen } from './juego/almacen'
import { iniciarBucle } from './juego/bucle'
import { crearEscena } from './world/escena'

/** Semilla provisional hasta que exista la pantalla de nueva partida. */
const SEMILLA_PROVISIONAL = 1

const contenedor = document.getElementById('juego')
if (contenedor) {
  Object.assign(contenedor.style, { position: 'fixed', inset: '0' })
  const { dibujar } = crearEscena(contenedor)
  const almacen = crearAlmacen(crearEstadoInicial({ semilla: SEMILLA_PROVISIONAL }))

  let contarFps: (() => void) | undefined
  if (import.meta.env.DEV) {
    void import('./world/contador-fps').then((m) => {
      contarFps = m.crearContadorFps(contenedor)
    })
  }

  iniciarBucle({
    almacen,
    dibujar: () => {
      dibujar()
      contarFps?.()
    },
  })
}
