import type { Coste, MotivoColocacion } from '../../core'
import { t } from '../textos'

/**
 * Texto del motivo por el que el fantasma está en rojo. Para fondos y materiales dice lo que
 * falta («Falta: 10 madera»); para el resto, el motivo del núcleo. Pura.
 */
export function textoMotivo(motivo: MotivoColocacion, faltan: Coste): string {
  if (motivo === 'fondos-insuficientes' || motivo === 'materiales-insuficientes') {
    const partes: string[] = []
    if (faltan.dinero > 0) partes.push(t('construir.faltaDinero', { n: faltan.dinero }))
    if (faltan.madera > 0) partes.push(t('construir.faltaMadera', { n: faltan.madera }))
    if (faltan.piedra > 0) partes.push(t('construir.faltaPiedra', { n: faltan.piedra }))
    if (partes.length > 0) return t('construir.falta', { lista: partes.join(', ') })
  }
  return t(`construir.motivo.${motivo}`)
}
