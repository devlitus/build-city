import { crearEscena } from './world/escena'

const contenedor = document.getElementById('juego')
if (contenedor) {
  Object.assign(contenedor.style, { position: 'fixed', inset: '0' })
  const { dibujar } = crearEscena(contenedor)

  let contarFps: (() => void) | undefined
  if (import.meta.env.DEV) {
    void import('./world/contador-fps').then((m) => {
      contarFps = m.crearContadorFps(contenedor)
    })
  }

  const bucle = (): void => {
    dibujar()
    contarFps?.()
    requestAnimationFrame(bucle)
  }
  requestAnimationFrame(bucle)
}
