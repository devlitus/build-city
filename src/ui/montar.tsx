import { render } from 'preact'
import paletaJson from '../../data/paleta.json'
import type { FuenteEstado } from './fuente'
import { cargarPaleta, colorHex } from '../world/paleta'
import { Reloj } from './hud/Reloj'
import { Herramientas } from './hud/Herramientas'
import { Avisos } from './hud/Avisos'
import { Estado } from './hud/Estado'

const COLORES_UI = ['panel', 'texto', 'apagado', 'acento', 'linea', 'alerta'] as const

/** Monta el HUD en `contenedor` (`#ui`). Los colores salen de la paleta como variables CSS. */
export function montarUi(contenedor: HTMLElement, almacen: FuenteEstado): void {
  const paleta = cargarPaleta(paletaJson)
  for (const nombre of COLORES_UI) {
    const clave = `ui${nombre[0]?.toUpperCase() ?? ''}${nombre.slice(1)}`
    contenedor.style.setProperty(`--ui-${nombre}`, colorHex(paleta, clave))
  }
  contenedor.style.pointerEvents = 'none'
  render(
    <>
      <Reloj almacen={almacen} />
      <Herramientas almacen={almacen} />
      <Avisos almacen={almacen} />
      <Estado almacen={almacen} />
    </>,
    contenedor,
  )
}
