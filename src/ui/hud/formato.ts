import { tiempoDetenido, type EstadoJuego } from '../../core'
import { fechaDe, horaDe } from '../../core/tiempo'
import { t } from '../textos'

const dos = (n: number) => String(n).padStart(2, '0')

/** "06:15" a partir de los minutos del día (1500 -> "01:00"). */
export function formatearHora(minutoDelDia: number): string {
  const { horas, minutos } = horaDe({ minutoDelDia })
  return `${dos(horas)}:${dos(minutos)}`
}

/** Nombre visible de la estación a partir de su clave de `data/tiempo.json`. */
export function nombreEstacion(clave: string): string {
  return t(`estacion.${clave}`)
}

/** "Día 3 · Primavera · Año 1". */
export function textoFecha(estado: Pick<EstadoJuego, 'dia'>): string {
  const f = fechaDe(estado)
  return t('reloj.fecha', {
    dia: f.diaDeEstacion,
    estacion: nombreEstacion(f.estacion),
    anio: f.año,
  })
}

/** "Pausa" si el tiempo está detenido; si no, "x1", "x2"... */
export function textoVelocidad(
  estado: Pick<EstadoJuego, 'pausado' | 'velocidad' | 'modo'>,
): string {
  return tiempoDetenido(estado)
    ? t('reloj.pausa')
    : t('reloj.velocidad', { velocidad: estado.velocidad })
}

export interface VistaReloj {
  readonly hora: string
  readonly fecha: string
  readonly velocidad: string
  readonly detenido: boolean
}

/** Todo lo que muestra el reloj; el componente solo re-renderiza si algún campo cambia. */
export function vistaReloj(estado: EstadoJuego): VistaReloj {
  return {
    hora: formatearHora(estado.minutoDelDia),
    fecha: textoFecha(estado),
    velocidad: textoVelocidad(estado),
    detenido: tiempoDetenido(estado),
  }
}

export function vistasIguales(a: VistaReloj, b: VistaReloj): boolean {
  return (
    a.hora === b.hora &&
    a.fecha === b.fecha &&
    a.velocidad === b.velocidad &&
    a.detenido === b.detenido
  )
}
