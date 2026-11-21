import type { Object3D } from 'three'
import type { Valle } from '../../core'
import { color } from '../paleta'
import type { FuncionAltura } from '../terreno/altura'
import { DATOS_PLANO } from './plano-datos'
import { aristasRejilla, segmentosSobreTerreno } from './geometria-plano'
import { crearLineas } from './lineas'

export interface Rejilla {
  readonly objeto: Object3D
  /** Reconstruye la rejilla con las parcelas propias de `valle`. */
  actualizar(valle: Valle): void
  destruir(): void
}

/** Rejilla de 1 m sobre las parcelas propias, pegada al terreno. */
export function crearRejilla(altura: FuncionAltura): Rejilla {
  const d = DATOS_PLANO.rejilla
  const lineas = crearLineas('rejilla-plano', color('rejillaPlano'), d.opacidad, 1)
  return {
    objeto: lineas.objeto,
    actualizar(valle) {
      // Cada arista mide 1 m: una muestra de altura por extremo.
      lineas.fijar(segmentosSobreTerreno(aristasRejilla(valle), altura, 1, d.separacion))
    },
    destruir: lineas.destruir,
  }
}
