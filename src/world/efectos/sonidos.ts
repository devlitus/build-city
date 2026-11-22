import { DATOS_EFECTOS, type DatosEfectos } from './efectos-datos'
import type { NombreSonido } from './golpe'
import { generarRuido } from './sonido-sintesis'

export interface Sonidos {
  /** Hace sonar el sonido (si el navegador permite audio). No hace nada si no hay Web Audio. */
  reproducir(nombre: NombreSonido): void
  destruir(): void
}

const SEMILLAS: Readonly<Record<NombreSonido, number>> = {
  'golpe-madera': 11,
  'golpe-piedra': 23,
  caida: 37,
  rotura: 51,
}

/**
 * Sonidos provisionales generados con Web Audio: ruido filtrado más un golpe grave de tono que
 * baja, con envolvente. Sin archivos de audio: son CC0 por construcción. El contexto se crea al
 * primer sonido (siempre tras un clic o tecla del jugador, así el navegador lo permite).
 */
export function crearSonidos(datos: DatosEfectos = DATOS_EFECTOS): Sonidos {
  let contexto: AudioContext | undefined
  const buffers = new Map<NombreSonido, AudioBuffer>()

  const obtenerContexto = (): AudioContext | undefined => {
    if (contexto) return contexto
    if (typeof AudioContext === 'undefined') return undefined
    contexto = new AudioContext()
    return contexto
  }

  return {
    reproducir: (nombre) => {
      const ctx = obtenerContexto()
      if (!ctx) return
      if (ctx.state === 'suspended') void ctx.resume()
      const s = datos.sonidos[nombre]
      let buffer = buffers.get(nombre)
      if (!buffer) {
        const muestras = Math.ceil(s.duracion * ctx.sampleRate)
        buffer = ctx.createBuffer(1, muestras, ctx.sampleRate)
        buffer.copyToChannel(
          generarRuido(muestras, ctx.sampleRate, s.duracion, s.ataque, SEMILLAS[nombre]),
          0,
        )
        buffers.set(nombre, buffer)
      }
      const inicio = ctx.currentTime + s.retraso
      const fin = inicio + s.duracion
      const general = datos.sonidos.volumenGeneral

      const ruido = ctx.createBufferSource()
      ruido.buffer = buffer
      const filtro = ctx.createBiquadFilter()
      filtro.type = 'bandpass'
      filtro.frequency.value = s.frecuenciaRuido
      filtro.Q.value = s.q
      const volumenRuido = ctx.createGain()
      volumenRuido.gain.value = s.volumenRuido * general
      ruido.connect(filtro).connect(volumenRuido).connect(ctx.destination)
      ruido.start(inicio)

      const tono = ctx.createOscillator()
      tono.type = 'sine'
      tono.frequency.setValueAtTime(s.frecuenciaTono, inicio)
      tono.frequency.exponentialRampToValueAtTime(s.caidaTono, fin)
      const volumenTono = ctx.createGain()
      volumenTono.gain.setValueAtTime(0.0001, inicio)
      volumenTono.gain.linearRampToValueAtTime(s.volumenTono * general, inicio + s.ataque)
      volumenTono.gain.exponentialRampToValueAtTime(0.0001, fin)
      tono.connect(volumenTono).connect(ctx.destination)
      tono.start(inicio)
      tono.stop(fin)
      // Los nodos se liberan solos al terminar; no hay nada que retirar a mano.
    },
    destruir: () => {
      buffers.clear()
      void contexto?.close()
      contexto = undefined
    },
  }
}
