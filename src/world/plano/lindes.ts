import { Group, type Object3D } from 'three'
import type { Valle } from '../../core'
import { color } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import { DATOS_PLANO } from './plano-datos'
import { aristasLindes, segmentosSobreTerreno } from './geometria-plano'
import { crearLineas } from './lineas'

export interface Lindes {
  readonly objeto: Object3D
  /** Reconstruye las lindes según el estado actual de las parcelas. */
  actualizar(valle: Valle): void
  destruir(): void
}

/** Lindes de todas las parcelas siguiendo el terreno; las de las propias, resaltadas. */
export function crearLindes(altura: FuncionAltura): Lindes {
  const d = DATOS_PLANO.lindes
  const otras = crearLineas('lindes-otras', color('lindeParcela'), d.opacidadOtras, 1)
  const propias = crearLineas('lindes-propias', color('lindePropia'), d.opacidadPropias, 2)
  const grupo = new Group()
  grupo.name = 'lindes'
  grupo.add(otras.objeto, propias.objeto)
  return {
    objeto: grupo,
    actualizar(valle) {
      const a = aristasLindes(valle)
      otras.fijar(segmentosSobreTerreno(a.otras, altura, d.pasoMuestreo, d.separacion))
      propias.fijar(segmentosSobreTerreno(a.propias, altura, d.pasoMuestreo, d.separacion))
    },
    destruir() {
      otras.destruir()
      propias.destruir()
    },
  }
}
