import { hash } from '../dispersion'

/*
 * Síntesis procedural de los sonidos provisionales (sin Web Audio, sin Math.random): al generarse
 * por código, no hay ningún archivo de terceros y son CC0 por construcción.
 */

/**
 * Envolvente de volumen (0 a 1) en el instante `t` (s): sube lineal durante `ataque` y baja
 * exponencialmente hasta casi 0 en `duracion`. Fuera de [0, duracion] vale 0.
 */
export function envolvente(t: number, duracion: number, ataque: number): number {
  if (!(duracion > 0) || t < 0 || t >= duracion) return 0
  if (ataque > 0 && t < ataque) return t / ataque
  const u = (t - ataque) / Math.max(1e-9, duracion - ataque)
  // e^(-6u): -52 dB al final, y 0 exacto cuando se acaba el buffer.
  return Math.exp(-6 * u)
}

/**
 * Ruido blanco determinista con la envolvente ya aplicada: `muestras` valores en [-1, 1]. La
 * `semilla` distingue unos sonidos de otros.
 */
export function generarRuido(
  muestras: number,
  frecuenciaMuestreo: number,
  duracion: number,
  ataque: number,
  semilla: number,
): Float32Array<ArrayBuffer> {
  const datos = new Float32Array(new ArrayBuffer(4 * Math.max(0, Math.floor(muestras))))
  for (let i = 0; i < datos.length; i++) {
    const ruido = hash(semilla, i, 0) * 2 - 1
    datos[i] = ruido * envolvente(i / frecuenciaMuestreo, duracion, ataque)
  }
  return datos
}
