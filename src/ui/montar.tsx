import { render } from 'preact'
import paletaJson from '../../data/paleta.json'
import type { FuenteDespacho } from './fuente'
import { cargarPaleta, colorHex } from '../world/paleta'
import { herramientaPlano } from '../juego/herramienta-plano'
import { seleccionParcela } from '../juego/seleccion-parcela'
import { Estado } from './hud/Estado'
import { Reloj } from './hud/Reloj'
import { Herramientas } from './hud/Herramientas'
import { Avisos } from './hud/Avisos'
import { Aviso } from './hud/Aviso'
import { Desmayo } from './hud/Desmayo'

const COLORES_UI = [
  'panel',
  'texto',
  'apagado',
  'acento',
  'linea',
  'alerta',
  'sube',
  'baja',
] as const
import { PanelParcela } from './plano/PanelParcela'
import { Catalogo } from './plano/Catalogo'
import { edificioElegido } from '../juego/edificio-elegido'
import { Zonas } from './plano/Zonas'
import { MotivoColocacion } from './plano/MotivoColocacion'
import { colocacion } from '../juego/colocacion'
import { edicionPlano } from '../juego/edicion-plano'
import { trazoPlano } from '../juego/trazo-plano'
import { Trazo } from './plano/Trazo'
import { Acciones } from './plano/Acciones'

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
      <Herramientas almacen={almacen} />
      <Avisos almacen={almacen} />
      <Aviso almacen={almacen} />
      <Estado almacen={almacen} />
      <Desmayo almacen={almacen} />
      <PanelParcela almacen={almacen} canal={seleccionParcela} />
      <Catalogo almacen={almacen} canal={edificioElegido} />
      <Zonas almacen={almacen} canal={herramientaPlano} />
      <Trazo almacen={almacen} canal={herramientaPlano} trazo={trazoPlano} />
      <MotivoColocacion
        colocacion={colocacion}
        herramienta={herramientaPlano}
        edicion={edicionPlano}
      />
      <Acciones almacen={almacen} canal={edicionPlano} herramienta={herramientaPlano} />
    </>,
    contenedor,
  )
}
