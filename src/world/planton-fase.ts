/**
 * Fase de crecimiento visual de un plantón: función pura (sin three.js). Las `fases` se reparten a
 * partes iguales entre el día de plantado y `diasCrecimiento`; al cumplirse esos días el núcleo lo
 * convierte en árbol. Un plantón de un día futuro o sin día vale la fase más joven.
 */
export function faseDePlanton(
  diaPlantado: number | undefined,
  diaActual: number,
  diasCrecimiento: number,
  fases: number,
): number {
  if (fases <= 1 || diaPlantado === undefined || !Number.isFinite(diaPlantado)) return 0
  const dias = Math.max(0, diaActual - diaPlantado)
  const fase = Math.floor((dias / Math.max(1, diasCrecimiento)) * fases)
  return Math.min(fases - 1, Math.max(0, fase))
}
