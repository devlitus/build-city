import { render } from 'preact'
import paletaJson from '../../data/paleta.json'
import type { FuenteDespacho } from './fuente'
import { cargarPaleta, colorHex } from '../world/paleta'
import { seleccionParcela } from '../juego/seleccion-parcela'
import { Reloj } from './hud/Reloj'
import { PanelParcela } from './plano/PanelParcela'

const COLORES_UI = ['panel', 'texto', 'apagado', 'acento', 'linea'] as const

/** Monta el HUD en `contenedor` (`#ui`). Los colores salen de la paleta como variables CSS. */
export function montarUi(contenedor: HTMLElement, almacen: FuenteDespacho): void {
  const paleta = cargarPaleta(paletaJson)
  for (const nombre of COLORES_UI) {
    const clave = `ui${nombre[0]?.toUpperCase() ?? ''}${nombre.slice(1)}`
    contenedor.style.setProperty(`--ui-${nombre}`, colorHex(paleta, clave))
  }
  contenedor.style.pointerEvents = 'none'
  render(
    <>
      <Reloj almacen={almacen} />
      <PanelParcela almacen={almacen} canal={seleccionParcela} />
    </>,
    contenedor,
  )
}
