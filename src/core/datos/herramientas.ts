import * as v from 'valibot'
import datos from '../../../data/herramientas.json'
import { EsquemaConfigHerramientas, type DatosHerramientas } from './esquemas'

/** Alcance y cono de apuntado de las herramientas, validado al cargar el módulo. */
export const CONFIG_HERRAMIENTAS: DatosHerramientas = Object.freeze({
  ...v.parse(EsquemaConfigHerramientas, datos),
})
