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
  estado: Pick<EstadoJuego, 'pausado' | 'velocidad' | 'modo' | 'pausarEnPlano'>,
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

/** Entero con "." cada 3 cifras (1240 -> "1.240"); `toLocaleString('es-ES')` no agrupa 4 cifras. */
export function formatearMonedas(n: number): string {
  const entero = Math.trunc(n)
  const digitos = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return entero < 0 ? `-${digitos}` : digitos
}

export type DireccionCambio = 'sube' | 'baja' | 'igual'

/** Hacia dónde ha cambiado el dinero (decide el color de la animación). */
export function direccionCambio(anterior: number, actual: number): DireccionCambio {
  return actual > anterior ? 'sube' : actual < anterior ? 'baja' : 'igual'
}

/** Duración visual (ms) del destello de las monedas al cambiar; el CSS usa el mismo valor. */
export const DURACION_DESTELLO_MS = 500

export function vistasIguales(a: VistaReloj, b: VistaReloj): boolean {
  return (
    a.hora === b.hora &&
    a.fecha === b.fecha &&
    a.velocidad === b.velocidad &&
    a.detenido === b.detenido
  )
}
