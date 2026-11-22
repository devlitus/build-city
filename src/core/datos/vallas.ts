import * as v from 'valibot'
import datos from '../../../data/vallas.json'
import { EsquemaConfigVallas, type ConfigVallas } from './esquemas'

/** Coste y reembolso de vallas y puertas, validados al cargar el módulo. */
export const CONFIG_VALLAS: ConfigVallas = v.parse(EsquemaConfigVallas, datos)
