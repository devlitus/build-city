/**
 * Gesto procedural de golpear del granjero (el glb solo trae Reposo, Andar y Correr): el cuerpo
 * se echa atrás para coger impulso y luego se inclina hacia delante de golpe, y vuelve a su sitio.
 * Devuelve la inclinación (rad, positiva hacia delante) en el instante `t` (s) del gesto.
 */
export function inclinacionGolpe(
  t: number,
  duracion: number,
  inclinacion: number,
  fraccionPreparacion: number,
): number {
  if (!(duracion > 0) || t <= 0 || t >= duracion) return 0
  const u = t / duracion
  if (u < fraccionPreparacion) {
    // Preparación: se echa atrás un 40 % de lo que luego se inclina hacia delante.
    return -0.4 * inclinacion * Math.sin((Math.PI * u) / fraccionPreparacion)
  }
  return inclinacion * Math.sin((Math.PI * (u - fraccionPreparacion)) / (1 - fraccionPreparacion))
}
