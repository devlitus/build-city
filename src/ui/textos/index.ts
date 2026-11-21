import es from './es.json'

/** Busca un texto por clave con puntos (`reloj.pausa`) y sustituye `{nombre}` con `valores`. */
export function t(clave: string, valores: Readonly<Record<string, string | number>> = {}): string {
  let actual: unknown = es
  for (const parte of clave.split('.')) {
    actual =
      typeof actual === 'object' && actual !== null && Object.hasOwn(actual, parte)
        ? (actual as Record<string, unknown>)[parte]
        : undefined
  }
  if (typeof actual !== 'string') return clave
  return actual.replace(/\{(\w+)\}/g, (m, k: string) =>
    Object.hasOwn(valores, k) ? String(valores[k]) : m,
  )
}
