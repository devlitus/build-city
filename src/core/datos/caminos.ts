import * as v from 'valibot'
import datos from '../../../data/caminos.json'
import { EsquemaConfigCaminos } from './esquemas'

/** Configuración de los caminos, validada al cargar el módulo. */
export const CONFIG_CAMINOS = v.parse(EsquemaConfigCaminos, datos)
