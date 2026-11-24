import type { ResumenTrazo } from '../../juego/trazo-plano'
import { t } from '../textos'
import { textoMotivoTrazo } from './texto-motivo'

/** Líneas del cartel del trazo: la ayuda sin trazo, o coste/reembolso, casillas y avisos. */
export interface VistaTrazo {
  /** «Coste: 6 madera» o «Devuelve: 3 piedra»; vacía sin trazo. */
  readonly importe: string
  readonly casillas: string
  /** Por qué hay casillas en rojo, o por qué no se podría soltar; vacía si todo va bien. */
  readonly aviso: string
  /** El trazo no se puede soltar tal cual (nada válido, sin material o cierra el paso). */
  readonly rojo: boolean
}

/** Vista del cartel para un resumen (o `null` sin trazo en curso). Pura. */
export function vistaTrazo(r: ResumenTrazo | null): VistaTrazo {
  if (!r) return { importe: '', casillas: '', aviso: '', rojo: false }
  const recurso = t(`trazo.${r.recurso}`)
  const importe = t(r.quitar ? 'trazo.reembolso' : 'trazo.coste', { n: r.cantidad, recurso })
  const casillas = t('trazo.casillas', { validas: r.validas, invalidas: r.invalidas })
  let aviso = ''
  if (r.sinFondos) aviso = t('trazo.sinMaterial', { recurso })
  else if (r.bloqueaPaso) aviso = t('trazo.bloqueaPaso')
  else if (r.motivo !== undefined) aviso = textoMotivoTrazo(r.motivo)
  const rojo = r.validas === 0 || r.sinFondos || r.bloqueaPaso
  return { importe, casillas, aviso, rojo }
}
